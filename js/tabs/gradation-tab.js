function renderGradationTab() {
  const courseOptions = Object.entries(COURSE_TYPES)
    .map(([key, c]) => `<option value="${key}" ${state.courseType === key ? 'selected' : ''}>${c.label}</option>`)
    .join('');

  $('gradationContainer').innerHTML = `
    <div class="card">
      <div class="grid grid-4">
        <div class="field"><label>ชั้นทาง / มาตรฐานอ้างอิงสำหรับเทียบ (ทล.-ม. 408/2532)</label>
          <select id="gradCourseType">${courseOptions}</select>
        </div>
        <div class="field"><label>รูปแบบกราฟ</label>
          <select id="gradChartStyle">
            <option value="power045" ${state.gradationChartStyle === 'power045' ? 'selected' : ''}>0.45 Power Chart (Superpave)</option>
            <option value="semilog" ${state.gradationChartStyle === 'semilog' ? 'selected' : ''}>Semi-log (Geotechnical, ASTM D422)</option>
          </select>
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
      <h3>ตารางขนาดคละ</h3>
      <div class="card-desc">แต่ละตัวอย่างเลือกได้ว่าจะกรอก "% ผ่านตะแกรงตรงๆ" หรือ "น้ำหนักค้างตะแกรง (กรัม)" แล้วให้โปรแกรมคำนวณ % ผ่านให้อัตโนมัติตามวิธี ASTM C136/AASHTO T27</div>
      <div id="gradTableWrap"></div>
    </div>

    <div class="card">
      <h3>กราฟขนาดคละ</h3>
      <div class="chart-box" style="height:420px;"><canvas id="gradationCompareChart"></canvas></div>
    </div>
  `;

  $('gradCourseType').addEventListener('change', (e) => {
    state.courseType = e.target.value;
    ensureCriteriaDefaults();
    persist();
    $('courseBadge').textContent = COURSE_TYPES[state.courseType]?.label || '-';
    renderGradationTab();
  });
  $('gradChartStyle').addEventListener('change', (e) => {
    state.gradationChartStyle = e.target.value;
    persist();
    refreshGradationChart();
  });
  $('btnAddSample').addEventListener('click', () => {
    state.gradationSamples.push(newGradationSample(nextSampleId(), `ตัวอย่างที่ ${state.gradationSamples.length + 1}`));
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
  samples.forEach((s, i) => {
    if (!s.id) s.id = `S-${String(i + 1).padStart(2, '0')}`;
    if (!s.inputMode) s.inputMode = 'percent';
    if (!s.retainedWeights) s.retainedWeights = emptyRetainedWeights();
    recomputeGradationFromWeights(s);
  });
  const anyWeightMode = samples.some((s) => s.inputMode === 'weight');

  const header = samples.map((s, i) => `
    <th>
      <input data-sample-field="id" data-sample-index="${i}" value="${s.id}" style="text-align:center;font-weight:700;width:70px" title="รหัสตัวอย่าง (Sample ID)" />
      <input data-sample-field="name" data-sample-index="${i}" value="${s.name}" style="text-align:center;margin-top:4px" title="คำอธิบาย" /><br/>
      <select data-sample-field="inputMode" data-sample-index="${i}" style="margin-top:4px;font-size:11px">
        <option value="percent" ${s.inputMode === 'percent' ? 'selected' : ''}>กรอก % ผ่านตะแกรง</option>
        <option value="weight" ${s.inputMode === 'weight' ? 'selected' : ''}>กรอกน้ำหนักค้าง (g)</option>
      </select>
    </th>`).join('');

  const rows = SIEVE_SIZES.map(({ mm, label }) => {
    const cells = samples.map((s, i) => {
      const range = envelope[mm];
      const val = s.gradation[mm];
      const pass = range && val != null ? (val >= range[0] && val <= range[1]) : null;
      const cellClass = pass === true ? 'style="background:var(--success-soft)"' : pass === false ? 'style="background:var(--danger-soft)"' : '';
      if (s.inputMode === 'weight') {
        const w = s.retainedWeights[mm];
        return `<td ${cellClass}>
          <input type="number" step="any" data-sample-field="retainedWeight" data-sample-index="${i}" data-sieve="${mm}" value="${w ?? ''}" placeholder="g" />
          <div class="small-note">→ ${val ?? '-'}%</div>
        </td>`;
      }
      return `<td ${cellClass}><input type="number" step="any" data-sample-field="gradation" data-sample-index="${i}" data-sieve="${mm}" value="${val ?? ''}" /></td>`;
    }).join('');
    return `
      <tr>
        <td style="text-align:right;font-weight:600">${label}<br/><span class="small-note">${mm} มม.</span></td>
        ${cells}
        <td class="small-note">${envelope[mm] ? `${envelope[mm][0]} - ${envelope[mm][1]}` : '-'}</td>
      </tr>`;
  }).join('');

  const panRow = anyWeightMode ? `
    <tr>
      <td style="text-align:right;font-weight:600">Pan<br/><span class="small-note">ผ่านสุดท้าย</span></td>
      ${samples.map((s, i) => s.inputMode === 'weight'
        ? `<td><input type="number" step="any" data-sample-field="panWeight" data-sample-index="${i}" value="${s.panWeight ?? ''}" placeholder="g" /></td>`
        : '<td class="small-note">-</td>').join('')}
      <td></td>
    </tr>
    <tr>
      <td style="text-align:right;font-weight:600">รวมน้ำหนัก</td>
      ${samples.map((s) => {
        if (s.inputMode !== 'weight') return '<td class="small-note">-</td>';
        const total = SIEVE_SIZES.reduce((a, sv) => a + (s.retainedWeights[sv.mm] || 0), 0) + (s.panWeight || 0);
        return `<td style="font-weight:700">${total ? fmt(total, 1) + ' g' : '-'}</td>`;
      }).join('')}
      <td></td>
    </tr>
  ` : '';

  $('gradTableWrap').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ตะแกรง</th>${header}<th>ช่วงมาตรฐาน (Desired)</th></tr></thead>
        <tbody>${rows}${panRow}</tbody>
      </table>
    </div>
    <div class="small-note mt-8">ช่องสีเขียว = อยู่ในช่วงมาตรฐาน, ช่องสีแดง = อยู่นอกช่วงมาตรฐาน · โหมด "น้ำหนักค้าง" จะคำนวณ % ผ่านให้อัตโนมัติ (แสดงใต้ช่องกรอก) จากน้ำหนักรวมทุกตะแกรง + Pan</div>
  `;

  $('gradTableWrap').querySelectorAll('[data-sample-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.sampleIndex, 10);
      const field = el.dataset.sampleField;
      const s = samples[i];
      if (field === 'id') s.id = el.value.trim() || s.id;
      else if (field === 'name') s.name = el.value;
      else if (field === 'inputMode') s.inputMode = el.value;
      else if (field === 'gradation') s.gradation[el.dataset.sieve] = el.value === '' ? null : parseFloat(el.value);
      else if (field === 'retainedWeight') s.retainedWeights[el.dataset.sieve] = el.value === '' ? null : parseFloat(el.value);
      else if (field === 'panWeight') s.panWeight = el.value === '' ? null : parseFloat(el.value);
      recomputeGradationFromWeights(s);
      persist();
      renderGradTable();
      refreshGradationChart();
    });
  });
}

function refreshGradationChart() {
  drawGradationCompareChart('gradationCompareChart', {
    samples: state.gradationSamples,
    envelope: getEnvelope(),
    sieveSizes: SIEVE_SIZES,
    mode: state.gradationChartStyle || 'power045',
  });
}

function exportGradationCsv() {
  const envelope = getEnvelope();
  const samples = state.gradationSamples;
  const header = ['Sieve (mm)', 'Sieve Label', ...samples.map((s) => `${s.id} - ${s.name}`), 'Spec Min', 'Spec Max'];
  const rows = [header];
  SIEVE_SIZES.forEach(({ mm, label }) => {
    const range = envelope[mm] || [null, null];
    rows.push([mm, label, ...samples.map((s) => s.gradation[mm] ?? ''), range[0] ?? '', range[1] ?? '']);
  });
  downloadCSV('gradation-data.csv', rows);
}
