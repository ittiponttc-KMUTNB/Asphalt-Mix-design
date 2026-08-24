function renderGradationTab() {
  const courseOptions = Object.entries(COURSE_TYPES)
    .map(([key, c]) => `<option value="${key}" ${state.courseType === key ? 'selected' : ''}>${c.label}</option>`)
    .join('');

  $('gradationContainer').innerHTML = `
    <div class="card">
      <div class="grid grid-3">
        <div class="field"><label>ชั้นทาง / มาตรฐานอ้างอิงสำหรับเทียบ (ทล.-ม. 408/2532)</label>
          <select id="gradCourseType">${courseOptions}</select>
        </div>
        <div class="field" style="align-self:end">
          <button class="btn btn-ghost btn-sm" id="btnAddSample">+ เพิ่มตัวอย่าง</button>
          <button class="btn btn-ghost btn-sm" id="btnRemoveSample">- ลบตัวอย่างล่าสุด</button>
        </div>
        <div class="field" style="align-self:end">
          <button class="btn btn-primary btn-sm" id="btnExportGradCsv">⬇ Export CSV</button>
          <button class="btn btn-primary btn-sm" id="btnExportGradPng">🖼 Export PNG</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>ตารางขนาดคละ (% ผ่านตะแกรงโดยมวล)</h3>
      <div id="gradTableWrap"></div>
    </div>

    <div class="card">
      <h3>กราฟขนาดคละ (0.45 Power Chart)</h3>
      <div class="chart-box" style="height:400px;"><canvas id="gradationCompareChart"></canvas></div>
    </div>
  `;

  $('gradCourseType').addEventListener('change', (e) => {
    state.courseType = e.target.value;
    ensureCriteriaDefaults();
    persist();
    $('courseBadge').textContent = COURSE_TYPES[state.courseType]?.label || '-';
    renderGradationTab();
  });
  $('btnAddSample').addEventListener('click', () => {
    state.gradationSamples.push({ name: `ตัวอย่างที่ ${state.gradationSamples.length + 1}`, gradation: emptySample() });
    persist();
    renderGradationTab();
  });
  $('btnRemoveSample').addEventListener('click', () => {
    if (state.gradationSamples.length > 1) state.gradationSamples.pop();
    persist();
    renderGradationTab();
  });
  $('btnExportGradCsv').addEventListener('click', exportGradationCsv);
  $('btnExportGradPng').addEventListener('click', () => downloadChartPng('gradationCompareChart', 'gradation-chart.png'));

  renderGradTable();
  refreshGradationChart();
}

function renderGradTable() {
  const envelope = getEnvelope();
  const samples = state.gradationSamples;

  const header = samples.map((s, i) => `<th><input data-sample-field="name" data-sample-index="${i}" value="${s.name}" style="text-align:center;font-weight:700" /></th>`).join('');

  const rows = SIEVE_SIZES.map(({ mm, label }) => {
    const cells = samples.map((s, i) => {
      const val = s.gradation[mm];
      const range = envelope[mm];
      const pass = range && val != null ? (val >= range[0] && val <= range[1]) : null;
      const cellClass = pass === true ? 'style="background:var(--success-soft)"' : pass === false ? 'style="background:var(--danger-soft)"' : '';
      return `<td ${cellClass}><input type="number" step="any" data-sample-field="gradation" data-sample-index="${i}" data-sieve="${mm}" value="${val ?? ''}" /></td>`;
    }).join('');
    const range = envelope[mm];
    return `
      <tr>
        <td style="text-align:right;font-weight:600">${label}<br/><span class="small-note">${mm} มม.</span></td>
        ${cells}
        <td class="small-note">${range ? `${range[0]} - ${range[1]}` : '-'}</td>
      </tr>`;
  }).join('');

  $('gradTableWrap').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ตะแกรง</th>${header}<th>ช่วงมาตรฐาน (Desired)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <div class="small-note mt-8">ช่องสีเขียว = อยู่ในช่วงมาตรฐาน, ช่องสีแดง = อยู่นอกช่วงมาตรฐาน</div>
  `;

  $('gradTableWrap').querySelectorAll('[data-sample-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.sampleIndex, 10);
      const field = el.dataset.sampleField;
      if (field === 'name') samples[i].name = el.value;
      else if (field === 'gradation') samples[i].gradation[el.dataset.sieve] = el.value === '' ? null : parseFloat(el.value);
      persist();
      renderGradTable();
      refreshGradationChart();
    });
  });
}

function refreshGradationChart() {
  drawGradationCompareChart('gradationCompareChart', { samples: state.gradationSamples, envelope: getEnvelope(), sieveSizes: SIEVE_SIZES });
}

function exportGradationCsv() {
  const envelope = getEnvelope();
  const samples = state.gradationSamples;
  const header = ['Sieve (mm)', 'Sieve Label', ...samples.map((s) => s.name), 'Spec Min', 'Spec Max'];
  const rows = [header];
  SIEVE_SIZES.forEach(({ mm, label }) => {
    const range = envelope[mm] || [null, null];
    rows.push([mm, label, ...samples.map((s) => s.gradation[mm] ?? ''), range[0] ?? '', range[1] ?? '']);
  });
  downloadCSV('gradation-data.csv', rows);
}
