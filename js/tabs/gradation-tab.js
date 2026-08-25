function renderGradationTab() {
  const courseOptions = Object.entries(COURSE_TYPES)
    .map(([key, c]) => `<option value="${key}" ${state.courseType === key ? 'selected' : ''}>${c.label}</option>`)
    .join('');
  const mode = state.gradationMode || 'compare';

  $('gradationContainer').innerHTML = `
    <div class="card">
      <div class="grid grid-4">
        <div class="field"><label>ชั้นทาง / มาตรฐานอ้างอิงสำหรับเทียบ (ทล.-ม. 408/2532)</label>
          <select id="gradCourseType">${courseOptions}</select>
        </div>
        <div class="field"><label>โหมดตาราง</label>
          <select id="gradMode">
            <option value="compare" ${mode === 'compare' ? 'selected' : ''}>เทียบหลายตัวอย่าง</option>
            <option value="blend" ${mode === 'blend' ? 'selected' : ''}>ผสม Cold Bin (หาสัดส่วน)</option>
          </select>
        </div>
        <div class="field"><label>รูปแบบกราฟ</label>
          <select id="gradChartStyle">
            <option value="power045" ${state.gradationChartStyle === 'power045' ? 'selected' : ''}>0.45 Power Chart (Superpave)</option>
            <option value="semilog" ${state.gradationChartStyle === 'semilog' ? 'selected' : ''}>Semi-log (Geotechnical, ASTM D422)</option>
          </select>
        </div>
        <div class="field" style="align-self:end">
          <button class="btn btn-primary btn-sm" id="btnExportGradCsv">⬇ Export CSV</button>
          <button class="btn btn-primary btn-sm" id="btnExportGradPng">🖼 Export PNG</button>
        </div>
      </div>
      <div class="flex mt-8">
        <button class="btn btn-ghost btn-sm" id="btnAddSample">+ เพิ่มตัวอย่าง/กอง</button>
        <button class="btn btn-ghost btn-sm" id="btnRemoveSample">- ลบล่าสุด</button>
        ${mode === 'blend' ? '<button class="btn btn-ghost btn-sm" id="btnAddFiller">+ เพิ่มฟิลเลอร์ (E)</button>' : ''}
        ${mode === 'blend' ? '<button class="btn btn-primary btn-sm" id="btnAutoSolve" style="margin-left:auto">⚙ หาสัดส่วนอัตโนมัติ</button>' : ''}
      </div>
    </div>

    <div class="card">
      <h3>ตารางขนาดคละ</h3>
      <div class="card-desc">
        ${mode === 'compare'
          ? 'แต่ละตัวอย่างเลือกได้ว่าจะกรอก "% ผ่านตะแกรงตรงๆ" หรือ "น้ำหนักค้างตะแกรง (กรัม)" แล้วให้โปรแกรมคำนวณ % ผ่านให้อัตโนมัติตามวิธี ASTM C136/AASHTO T27'
          : 'ใส่ขนาดคละของแต่ละกอง (Cold Bin) พร้อมช่วงสัดส่วนที่ยอมให้ (Min-Max) โปรแกรมจะผสมตามสัดส่วนที่ตั้งไว้ และช่วยหาสัดส่วนที่ดีที่สุดให้อัตโนมัติได้'}
      </div>
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
  $('gradMode').addEventListener('change', (e) => {
    state.gradationMode = e.target.value;
    persist();
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
  $('btnAddFiller')?.addEventListener('click', () => {
    state.gradationSamples.push(newFillerSample(nextSampleId()));
    persist();
    renderGradationTab();
  });
  $('btnAutoSolve')?.addEventListener('click', () => {
    const samples = state.gradationSamples;
    const result = solveColdBinProportions(samples, getEnvelope(), SIEVE_SIZES);
    if (!result.feasible) {
      showToast('ไม่มีคำตอบที่เป็นไปได้ — ผลรวม Min/Max ของแต่ละกองไม่ครอบคลุม 100%');
      return;
    }
    result.proportions.forEach((p, i) => { samples[i].proportion = p; });
    persist();
    renderGradationTab();
    showToast(result.cost < 0.5 ? 'พบสัดส่วนที่เข้าช่วงมาตรฐานทุกตะแกรงแล้ว' : 'ปรับสัดส่วนให้ใกล้เคียงช่วงมาตรฐานที่สุดแล้ว (บางตะแกรงอาจยังไม่เข้าเกณฑ์)');
  });
  $('btnExportGradCsv').addEventListener('click', exportGradationCsv);
  $('btnExportGradPng').addEventListener('click', () => downloadChartPng('gradationCompareChart', 'gradation-chart.png'));

  renderGradTable();
  refreshGradationChart();
}

function renderGradTable() {
  const envelope = getEnvelope();
  const samples = state.gradationSamples;
  const mode = state.gradationMode || 'compare';
  samples.forEach((s, i) => {
    if (!s.id) s.id = `S-${String(i + 1).padStart(2, '0')}`;
    if (!s.inputMode) s.inputMode = 'percent';
    if (!s.retainedWeights) s.retainedWeights = emptyRetainedWeights();
    if (s.min == null) s.min = 0;
    if (s.max == null) s.max = 100;
    if (s.proportion == null) s.proportion = 0;
    recomputeGradationFromWeights(s);
  });
  const anyWeightMode = samples.some((s) => s.inputMode === 'weight');
  const combined = mode === 'blend' ? combinedGradation(samples, SIEVE_SIZES) : null;
  const proportionSum = samples.reduce((a, s) => a + (s.proportion || 0), 0);

  const header = samples.map((s, i) => `
    <th>
      <input data-sample-field="id" data-sample-index="${i}" value="${s.id}" style="text-align:center;font-weight:700;width:70px" title="รหัสตัวอย่าง (Sample ID)" />
      <input data-sample-field="name" data-sample-index="${i}" value="${s.name}" style="text-align:center;margin-top:4px" title="คำอธิบาย" /><br/>
      <select data-sample-field="inputMode" data-sample-index="${i}" style="margin-top:4px;font-size:11px">
        <option value="percent" ${s.inputMode === 'percent' ? 'selected' : ''}>กรอก % ผ่านตะแกรง</option>
        <option value="weight" ${s.inputMode === 'weight' ? 'selected' : ''}>กรอกน้ำหนักค้าง (g)</option>
      </select>
      ${mode === 'blend' ? `
        <div class="flex mt-8" style="justify-content:center;gap:4px;">
          <input type="number" step="any" data-sample-field="min" data-sample-index="${i}" value="${s.min}" title="Min %" style="width:44px;text-align:center" />
          <span class="small-note">-</span>
          <input type="number" step="any" data-sample-field="max" data-sample-index="${i}" value="${s.max}" title="Max %" style="width:44px;text-align:center" />
        </div>
        <input type="number" step="any" data-sample-field="proportion" data-sample-index="${i}" value="${s.proportion}" title="สัดส่วนที่ใช้ (%)" style="margin-top:4px;text-align:center;font-weight:700;background:var(--primary-soft)" />
      ` : ''}
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

    let combinedCell = '';
    if (mode === 'blend') {
      const range = envelope[mm];
      const cv = combined[mm];
      const pass = range && cv != null ? (cv >= range[0] && cv <= range[1]) : null;
      const style = pass === true ? 'background:var(--success-soft)' : pass === false ? 'background:var(--danger-soft)' : '';
      combinedCell = `<td style="font-weight:700;${style}">${cv ?? '-'}</td>`;
    }

    return `
      <tr>
        <td style="text-align:right;font-weight:600">${label}<br/><span class="small-note">${mm} มม.</span></td>
        ${cells}
        ${combinedCell}
        <td class="small-note">${envelope[mm] ? `${envelope[mm][0]} - ${envelope[mm][1]}` : '-'}</td>
      </tr>`;
  }).join('');

  const panRow = anyWeightMode ? `
    <tr>
      <td style="text-align:right;font-weight:600">Pan<br/><span class="small-note">ผ่านสุดท้าย</span></td>
      ${samples.map((s, i) => s.inputMode === 'weight'
        ? `<td><input type="number" step="any" data-sample-field="panWeight" data-sample-index="${i}" value="${s.panWeight ?? ''}" placeholder="g" /></td>`
        : '<td class="small-note">-</td>').join('')}
      ${mode === 'blend' ? '<td></td>' : ''}
      <td></td>
    </tr>
    <tr>
      <td style="text-align:right;font-weight:600">รวมน้ำหนัก</td>
      ${samples.map((s) => {
        if (s.inputMode !== 'weight') return '<td class="small-note">-</td>';
        const total = SIEVE_SIZES.reduce((a, sv) => a + (s.retainedWeights[sv.mm] || 0), 0) + (s.panWeight || 0);
        return `<td style="font-weight:700">${total ? fmt(total, 1) + ' g' : '-'}</td>`;
      }).join('')}
      ${mode === 'blend' ? '<td></td>' : ''}
      <td></td>
    </tr>
  ` : '';

  const proportionRow = mode === 'blend' ? `
    <tr>
      <td style="text-align:right;font-weight:600">รวมสัดส่วน</td>
      <td colspan="${samples.length}">
        <span class="pill ${Math.abs(proportionSum - 100) < 0.05 ? 'pill-pass' : 'pill-fail'}">${fmt(proportionSum, 1)}%</span>
      </td>
      <td></td><td></td>
    </tr>
  ` : '';

  $('gradTableWrap').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ตะแกรง</th>${header}${mode === 'blend' ? '<th>ผสมรวม</th>' : ''}<th>ช่วงมาตรฐาน (Desired)</th></tr></thead>
        <tbody>${proportionRow}${rows}${panRow}</tbody>
      </table>
    </div>
    <div class="small-note mt-8">ช่องสีเขียว = อยู่ในช่วงมาตรฐาน, ช่องสีแดง = อยู่นอกช่วงมาตรฐาน ${mode === 'blend' ? '· แถว Min-Max และสัดส่วน (ช่องสีฟ้า) อยู่ที่หัวตารางแต่ละคอลัมน์' : '· โหมด "น้ำหนักค้าง" จะคำนวณ % ผ่านให้อัตโนมัติจากน้ำหนักรวมทุกตะแกรง + Pan'}</div>
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
      else if (field === 'min') s.min = parseFloat(el.value) || 0;
      else if (field === 'max') s.max = parseFloat(el.value) || 0;
      else if (field === 'proportion') s.proportion = parseFloat(el.value) || 0;
      recomputeGradationFromWeights(s);
      persist();
      renderGradTable();
      refreshGradationChart();
    });
  });
}

function refreshGradationChart() {
  const mode = state.gradationMode || 'compare';
  const combined = mode === 'blend'
    ? { gradation: combinedGradation(state.gradationSamples, SIEVE_SIZES), label: 'ผสมรวม (Combined)' }
    : null;
  drawGradationCompareChart('gradationCompareChart', {
    samples: state.gradationSamples,
    envelope: getEnvelope(),
    sieveSizes: SIEVE_SIZES,
    mode: state.gradationChartStyle || 'power045',
    combined,
  });
}

function exportGradationCsv() {
  const envelope = getEnvelope();
  const samples = state.gradationSamples;
  const mode = state.gradationMode || 'compare';
  const header = ['Sieve (mm)', 'Sieve Label', ...samples.map((s) => `${s.id} - ${s.name}`)];
  if (mode === 'blend') header.push('Combined');
  header.push('Spec Min', 'Spec Max');
  const rows = [header];
  const combined = mode === 'blend' ? combinedGradation(samples, SIEVE_SIZES) : null;
  SIEVE_SIZES.forEach(({ mm, label }) => {
    const range = envelope[mm] || [null, null];
    const row = [mm, label, ...samples.map((s) => s.gradation[mm] ?? '')];
    if (mode === 'blend') row.push(combined[mm] ?? '');
    row.push(range[0] ?? '', range[1] ?? '');
    rows.push(row);
  });
  downloadCSV('gradation-data.csv', rows);
}
