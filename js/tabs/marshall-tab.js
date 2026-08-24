function renderMarshallTab() {
  $('marshallContainer').innerHTML = `
    <div class="card">
      <h3>ค่าพื้นฐานสำหรับการคำนวณ</h3>
      <div class="grid grid-4">
        <div class="field"><label>รหัสตัวอย่าง (Sample ID)</label><input id="mSampleLabel" value="${state.sampleLabel ?? ''}" placeholder="เช่น MIX-A, S-01" /></div>
        <div class="field"><label>Bulk Sp.Gr. มวลรวมผสม (Gsb)</label><input type="number" step="any" id="mGsb" value="${state.aggregate.gsb ?? ''}" /></div>
        <div class="field"><label>Sp.Gr. ยางแอสฟัลท์ (Gb)</label><input type="number" step="any" id="mGb" value="${state.aggregate.gb ?? ''}" /></div>
        <div class="field"><label>หน่วยแรง Stability</label>
          <select id="mUnit">
            <option value="lbs" ${state.unit === 'lbs' ? 'selected' : ''}>lbs</option>
            <option value="N" ${state.unit === 'N' ? 'selected' : ''}>N</option>
          </select>
        </div>
        <div class="field"><label>หน่วยวัด Flow (ตามเครื่องมือแลบ)</label>
          <select id="mFlowUnit">
            <option value="0.01in" ${state.flowUnit === '0.01in' ? 'selected' : ''}>0.01 นิ้ว (0.01")</option>
            <option value="mm" ${state.flowUnit === 'mm' ? 'selected' : ''}>มิลลิเมตร (มม.)</option>
          </select>
        </div>
      </div>
      <div class="small-note mt-8">โปรแกรมจะแปลง Flow เป็นหน่วย 0.01" ให้อัตโนมัติก่อนคำนวณ/เทียบเกณฑ์ (1 มม. = 3.937 หน่วย 0.01")</div>
    </div>

    <div class="card">
      <h3>เกณฑ์เปรียบเทียบ (อ้างอิง ทล.-ม.408/2532 — แก้ไขได้)</h3>
      <div id="criteriaWrap"></div>
    </div>

    <div class="flex-between mb-0" style="margin-bottom:12px;">
      <h3 class="mb-0">ข้อมูล Marshall Specimen</h3>
      <button class="btn btn-primary btn-sm" id="btnAddTrial">+ เพิ่มจุดทดลอง (%AC)</button>
    </div>
    <div id="trialsWrap"></div>

    <div class="card">
      <h3>ทดสอบความคงทนต่อน้ำ (% Strength Index) — ไม่บังคับ</h3>
      <div id="moistureWrap"></div>
    </div>

    <div id="resultsWrap"></div>
  `;

  $('mSampleLabel').addEventListener('change', (e) => { state.sampleLabel = e.target.value; persist(); });
  $('mGsb').addEventListener('change', (e) => { state.aggregate.gsb = parseFloat(e.target.value) || null; persist(); renderMarshallTab(); });
  $('mGb').addEventListener('change', (e) => { state.aggregate.gb = parseFloat(e.target.value) || null; persist(); renderMarshallTab(); });
  $('mUnit').addEventListener('change', (e) => { state.unit = e.target.value; ensureCriteriaDefaults(); persist(); renderMarshallTab(); });
  $('mFlowUnit').addEventListener('change', (e) => { state.flowUnit = e.target.value; persist(); renderMarshallTab(); });

  $('btnAddTrial').addEventListener('click', () => {
    const lastAc = state.trials.length ? state.trials[state.trials.length - 1].pbByAgg : 4.5;
    state.trials.push({
      pbByAgg: Math.round((lastAc + 0.5) * 10) / 10,
      gmm: null,
      specimens: [
        { weightAir: null, weightSSD: null, weightWater: null, measuredLoad: null, flow: null },
        { weightAir: null, weightSSD: null, weightWater: null, measuredLoad: null, flow: null },
        { weightAir: null, weightSSD: null, weightWater: null, measuredLoad: null, flow: null },
      ],
    });
    persist();
    renderMarshallTab();
  });

  renderCriteriaWrap();
  renderTrials();
  renderMoistureTest();
  renderResultsSection();
}

function renderCriteriaWrap() {
  const base = state.standard.designCriteria[state.courseType];
  const c = state.criteria;
  const unit = state.unit;
  const rows = [
    { key: unit === 'lbs' ? 'stability_lbs' : 'stability_N', label: `Marshall Stability (${unit})`, baseVal: unit === 'lbs' ? base.stability_lbs : base.stability_N },
    { key: 'flow_min', label: 'Flow ต่ำสุด (0.01")', baseVal: base.flow_min },
    { key: 'flow_max', label: 'Flow สูงสุด (0.01")', baseVal: base.flow_max },
    { key: 'airVoids_min', label: 'Air Voids ต่ำสุด (%)', baseVal: base.airVoids_min },
    { key: 'airVoids_max', label: 'Air Voids สูงสุด (%)', baseVal: base.airVoids_max },
    { key: 'vma_min', label: 'VMA ต่ำสุด (%)', baseVal: base.vma_min },
    { key: unit === 'lbs' ? 'stabFlow_lbs001' : 'stabFlow_Nmm', label: `Stability/Flow ต่ำสุด (${unit}/0.01")`, baseVal: unit === 'lbs' ? base.stabFlow_lbs001 : base.stabFlow_Nmm },
    { key: 'strengthIndex_min', label: '% Strength Index ต่ำสุด', baseVal: base.strengthIndex_min },
  ];
  $('criteriaWrap').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th style="text-align:right">รายการ</th><th>ค่ามาตรฐาน</th><th>ค่าที่ใช้เปรียบเทียบ</th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr><td style="text-align:right">${r.label}</td><td>${fmt(r.baseVal, 2)}</td>
            <td><input type="number" step="any" data-crit="${r.key}" value="${c[r.key] ?? r.baseVal}" /></td></tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  $('criteriaWrap').querySelectorAll('[data-crit]').forEach((el) => {
    el.addEventListener('change', () => { state.criteria[el.dataset.crit] = parseFloat(el.value); persist(); renderResultsSection(); });
  });
}

function renderTrials() {
  const wrap = $('trialsWrap');
  wrap.innerHTML = state.trials.map((trial, ti) => trialCardHtml(trial, ti)).join('') || '<div class="small-note">ยังไม่มีจุดทดลอง กด "+ เพิ่มจุดทดลอง" เพื่อเริ่มต้น</div>';

  wrap.querySelectorAll('[data-trial-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const ti = parseInt(el.dataset.trialIndex, 10);
      state.trials[ti][el.dataset.trialField] = parseFloat(el.value) || null;
      persist();
      renderTrials();
      renderResultsSection();
    });
  });
  wrap.querySelectorAll('[data-sp-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const ti = parseInt(el.dataset.trialIndex, 10);
      const si = parseInt(el.dataset.spIndex, 10);
      state.trials[ti].specimens[si][el.dataset.spField] = parseFloat(el.value) || null;
      persist();
      renderTrials();
      renderResultsSection();
    });
  });
  wrap.querySelectorAll('[data-action="add-specimen"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.trialIndex, 10);
      state.trials[ti].specimens.push({ weightAir: null, weightSSD: null, weightWater: null, measuredLoad: null, flow: null });
      persist(); renderTrials(); renderResultsSection();
    });
  });
  wrap.querySelectorAll('[data-action="remove-specimen"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.trialIndex, 10);
      if (state.trials[ti].specimens.length > 1) state.trials[ti].specimens.pop();
      persist(); renderTrials(); renderResultsSection();
    });
  });
  wrap.querySelectorAll('[data-action="remove-trial"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.trials.splice(parseInt(btn.dataset.trialIndex, 10), 1);
      persist(); renderTrials(); renderResultsSection();
    });
  });
}

function trialCardHtml(trial, ti) {
  const gsb = state.aggregate.gsb;
  const gb = state.aggregate.gb;
  const canCalc = gsb && gb && trial.gmm && trial.specimens.some((s) => s.weightAir && s.weightSSD != null && s.weightWater != null);
  let result = null;
  if (canCalc) {
    try { result = computeTrialResult(trial); } catch (e) { result = null; }
  }

  const flowLabel = state.flowUnit === 'mm' ? 'มม.' : '0.01"';
  const specimenRows = trial.specimens.map((sp, si) => {
    let gmbTxt = '-', volTxt = '-', factorTxt = '-', corrTxt = '-';
    let thickTxt = '-';
    if (sp.weightAir != null && sp.weightSSD != null && sp.weightWater != null) {
      const gmb = bulkSpecificGravity(sp.weightAir, sp.weightSSD, sp.weightWater);
      const vol = specimenVolume(sp.weightSSD, sp.weightWater);
      const factor = stabilityCorrectionFactor(vol);
      gmbTxt = fmt(gmb, 3); volTxt = fmt(vol, 1); factorTxt = fmt(factor, 2);
      thickTxt = fmt(estimatedThicknessMm(vol), 1);
      if (sp.measuredLoad != null) corrTxt = fmt(sp.measuredLoad * factor, 0);
    }
    return `
      <tr>
        <td>${si + 1}</td>
        <td><input type="number" step="any" data-trial-index="${ti}" data-sp-index="${si}" data-sp-field="weightAir" value="${sp.weightAir ?? ''}" /></td>
        <td><input type="number" step="any" data-trial-index="${ti}" data-sp-index="${si}" data-sp-field="weightSSD" value="${sp.weightSSD ?? ''}" /></td>
        <td><input type="number" step="any" data-trial-index="${ti}" data-sp-index="${si}" data-sp-field="weightWater" value="${sp.weightWater ?? ''}" /></td>
        <td><input type="number" step="any" data-trial-index="${ti}" data-sp-index="${si}" data-sp-field="measuredLoad" value="${sp.measuredLoad ?? ''}" /></td>
        <td><input type="number" step="any" data-trial-index="${ti}" data-sp-index="${si}" data-sp-field="flow" value="${sp.flow ?? ''}" /></td>
        <td class="small-note" style="background:var(--surface-2)">${gmbTxt}</td>
        <td class="small-note" style="background:var(--surface-2)">${volTxt}</td>
        <td class="small-note" style="background:var(--surface-2)">${thickTxt}</td>
        <td class="small-note" style="background:var(--surface-2)">${factorTxt}</td>
        <td class="small-note" style="background:var(--surface-2)">${corrTxt}</td>
      </tr>`;
  }).join('');

  const summary = result ? `
    <div class="grid grid-4 mt-14">
      <div class="stat-tile"><div class="label">Gmb เฉลี่ย</div><div class="value">${fmt(result.gmbAvg, 3)}</div></div>
      <div class="stat-tile"><div class="label">% Gmm</div><div class="value">${fmt(result.percentGmm, 1)}</div></div>
      <div class="stat-tile"><div class="label">Air Voids (%)</div><div class="value">${fmt(result.airVoids, 1)}</div></div>
      <div class="stat-tile"><div class="label">VMA (%)</div><div class="value">${fmt(result.vma, 1)}</div></div>
      <div class="stat-tile"><div class="label">VFA (%)</div><div class="value">${fmt(result.vfa, 1)}</div></div>
      <div class="stat-tile"><div class="label">Stability เฉลี่ย</div><div class="value">${fmt(result.stabilityAvg, 0)}</div></div>
      <div class="stat-tile"><div class="label">Flow เฉลี่ย (0.01")</div><div class="value">${fmt(result.flowAvg, 1)}</div></div>
      <div class="stat-tile"><div class="label">Stability/Flow</div><div class="value">${fmt(result.stabilityFlowRatio, 0)}</div></div>
    </div>
  ` : '<div class="small-note mt-14">กรอกน้ำหนักตัวอย่าง, load, flow และ Gmm ให้ครบเพื่อคำนวณอัตโนมัติ (ต้องกรอก Gsb/Gb ด้านบนก่อน)</div>';

  return `
    <div class="card">
      <div class="flex-between">
        <div class="flex">
          <div class="field" style="min-width:110px"><label>% AC (โดยน้ำหนักมวลรวม)</label><input type="number" step="any" data-trial-field="pbByAgg" data-trial-index="${ti}" value="${trial.pbByAgg ?? ''}" /></div>
          <div class="field" style="min-width:150px"><label>Gmm (Rice Test)</label><input type="number" step="any" data-trial-field="gmm" data-trial-index="${ti}" value="${trial.gmm ?? ''}" /></div>
        </div>
        <button class="btn btn-danger btn-sm" data-action="remove-trial" data-trial-index="${ti}">ลบจุดทดลองนี้</button>
      </div>
      <div class="table-wrap mt-8">
        <table>
          <thead><tr>
            <th>#</th><th>นน.ชั่งในอากาศ (g)</th><th>นน.อิ่มตัวผิวแห้ง (g)</th><th>นน.ชั่งในน้ำ (g)</th>
            <th>Load วัดได้ (${state.unit})</th><th>Flow (${flowLabel})</th>
            <th style="background:var(--surface-2)">Gmb</th><th style="background:var(--surface-2)">Vol.(cc)</th><th style="background:var(--surface-2)">ความหนา (มม.)</th><th style="background:var(--surface-2)">Factor</th><th style="background:var(--surface-2)">Corr. Stability</th>
          </tr></thead>
          <tbody>${specimenRows}</tbody>
        </table>
      </div>
      <div class="flex mt-8">
        <button class="btn btn-ghost btn-sm" data-action="add-specimen" data-trial-index="${ti}">+ เพิ่มตัวอย่าง</button>
        <button class="btn btn-ghost btn-sm" data-action="remove-specimen" data-trial-index="${ti}">- ลบตัวอย่างล่าสุด</button>
      </div>
      ${summary}
    </div>
  `;
}

function renderMoistureTest() {
  const mt = state.moistureTest;
  const renderList = (arr, key) => arr.map((v, i) => `<input type="number" step="any" data-mt="${key}" data-mt-index="${i}" value="${v}" style="width:70px;display:inline-block;margin:2px" />`).join('');
  $('moistureWrap').innerHTML = `
    <div class="grid grid-2">
      <div>
        <label class="small-note">Stability ชุดควบคุม (${state.unit})</label><br/>
        ${renderList(mt.controlStability, 'controlStability')}
        <button class="btn btn-ghost btn-sm" data-action="add-mt" data-key="controlStability">+</button>
      </div>
      <div>
        <label class="small-note">Stability ชุดแช่น้ำ (${state.unit})</label><br/>
        ${renderList(mt.conditionedStability, 'conditionedStability')}
        <button class="btn btn-ghost btn-sm" data-action="add-mt" data-key="conditionedStability">+</button>
      </div>
    </div>
    <div class="mt-8">% Strength Index = ${mt.controlStability.length && mt.conditionedStability.length ? fmt(percentStrengthIndex(average(mt.conditionedStability), average(mt.controlStability)), 1) : '-'}</div>
  `;
  $('moistureWrap').querySelectorAll('[data-mt]').forEach((el) => {
    el.addEventListener('change', () => {
      mt[el.dataset.mt][parseInt(el.dataset.mtIndex, 10)] = parseFloat(el.value) || 0;
      persist(); renderMoistureTest(); renderResultsSection();
    });
  });
  $('moistureWrap').querySelectorAll('[data-action="add-mt"]').forEach((btn) => {
    btn.addEventListener('click', () => { mt[btn.dataset.key].push(0); persist(); renderMoistureTest(); renderResultsSection(); });
  });
}

function buildCurves(results) {
  const xs = results.map((r) => r.ac);
  // ใช้ดีกรี 2 (quadratic) เป็นค่าเริ่มต้น — คุณสมบัติ Marshall แต่ละเส้นมีจุดสูงสุด/ต่ำสุดเดียวตามธรรมชาติ
  // ดีกรีสูงกว่านี้กับข้อมูลแค่ไม่กี่จุดจะ overfit จนเส้นบิดเป็นคลื่นไม่เนียนเหมือนกราฟที่วาดด้วยมือ
  const degree = Math.min(2, xs.length - 1);
  return {
    xs,
    acRange: [Math.min(...xs), Math.max(...xs)],
    curves: {
      unitWeight: polynomialRegression(xs, results.map((r) => r.unitWeight), degree),
      stability: polynomialRegression(xs, results.map((r) => r.stabilityAvg), degree),
      flow: polynomialRegression(xs, results.map((r) => r.flowAvg), degree),
      airVoids: polynomialRegression(xs, results.map((r) => r.airVoids), degree),
      vma: polynomialRegression(xs, results.map((r) => r.vma), degree),
      vfa: polynomialRegression(xs, results.map((r) => r.vfa), degree),
    },
  };
}

function valuesAtDesignAC(curves, designAC) {
  return {
    unitWeight: curves.unitWeight(designAC),
    stabilityAvg: curves.stability(designAC),
    flowAvg: curves.flow(designAC),
    airVoids: curves.airVoids(designAC),
    vma: curves.vma(designAC),
    vfa: curves.vfa(designAC),
    stabilityFlowRatio: curves.stability(designAC) / curves.flow(designAC),
  };
}

function renderResultsSection() {
  const results = computeAllResults();
  if (results.length < 3) {
    $('resultsWrap').innerHTML = `<div class="card"><div class="pill pill-fail">ต้องมีจุดทดลองที่คำนวณได้ครบถ้วนอย่างน้อย 3 จุด (แนะนำ 5 จุด) จึงจะพล็อตกราฟและหา OAC ได้</div></div>`;
    return;
  }
  const { acRange, curves } = buildCurves(results);
  const criteria = getCriteria();
  const targetVa = (criteria.airVoids_min + criteria.airVoids_max) / 2;
  const oac = suggestOAC(curves, acRange, targetVa);
  if (state.designAC == null) state.designAC = Math.round(oac.oacSuggested * 20) / 20;

  $('resultsWrap').innerHTML = `
    <div class="card">
      <h3>Optimum Asphalt Content (OAC)</h3>
      <div class="grid grid-4">
        <div class="stat-tile"><div class="label">%AC ที่ Stability สูงสุด</div><div class="value">${fmt(oac.acAtMaxStability, 2)}</div></div>
        <div class="stat-tile"><div class="label">%AC ที่ Density สูงสุด</div><div class="value">${fmt(oac.acAtMaxDensity, 2)}</div></div>
        <div class="stat-tile"><div class="label">%AC ที่ Air Voids = ${fmt(targetVa, 1)}%</div><div class="value">${oac.acAtTargetVa != null ? fmt(oac.acAtTargetVa, 2) : '-'}</div></div>
        <div class="stat-tile"><div class="label">OAC แนะนำ (ค่าเฉลี่ย)</div><div class="value" style="color:var(--primary)">${fmt(oac.oacSuggested, 2)}</div></div>
      </div>
      <div class="flex mt-14">
        <div class="field" style="max-width:220px"><label>Design AC ที่ใช้อ่านค่ากราฟ (%)</label><input type="number" step="0.1" id="designAcInput" value="${state.designAC ?? ''}" /></div>
        <button class="btn btn-ghost btn-sm" id="btnUseSuggested" style="margin-top:18px">ใช้ค่าที่แนะนำ</button>
        <button class="btn btn-primary btn-sm" id="btnExportResultsCsv" style="margin-top:18px;margin-left:auto">⬇ Export ตารางผลลัพธ์ (CSV)</button>
      </div>
    </div>

    <div class="card">
      <h3>ตรวจสอบเกณฑ์ที่ Design AC = ${fmt(state.designAC, 2)}%</h3>
      <div id="specCheckWrap"></div>
    </div>

    <div class="card">
      <h3>กราฟความสัมพันธ์ %AC กับคุณสมบัติต่างๆ</h3>
      <div class="grid grid-2">
        ${chartBlockHtml('chart-density', 'Density')}
        ${chartBlockHtml('chart-stability', 'Stability')}
        ${chartBlockHtml('chart-airvoids', 'Air Voids')}
        ${chartBlockHtml('chart-vfa', 'VFA')}
        ${chartBlockHtml('chart-flow', 'Flow')}
        ${chartBlockHtml('chart-vma', 'VMA')}
      </div>
    </div>
  `;

  drawResultsCharts(results, curves, acRange, state.designAC);
  renderSpecCheck(results, curves, criteria);

  $('designAcInput').addEventListener('change', (e) => { state.designAC = parseFloat(e.target.value) || null; persist(); renderResultsSection(); });
  $('btnUseSuggested').addEventListener('click', () => { state.designAC = Math.round(oac.oacSuggested * 20) / 20; persist(); renderResultsSection(); });
  $('btnExportResultsCsv').addEventListener('click', () => exportResultsCsv(results));
  document.querySelectorAll('[data-export-chart]').forEach((btn) => {
    btn.addEventListener('click', () => downloadChartPng(btn.dataset.exportChart, `${filenamePrefix()}${btn.dataset.exportChart}.png`));
  });
}

function filenamePrefix() {
  const id = (state.sampleLabel || '').trim().replace(/[^a-zA-Z0-9ก-๙_-]+/g, '_');
  return id ? `${id}_` : '';
}

function chartBlockHtml(canvasId, label) {
  return `
    <div>
      <div class="flex-between mb-0">
        <span class="small-note">${label}</span>
        <button class="btn btn-ghost btn-sm" data-export-chart="${canvasId}">🖼 PNG</button>
      </div>
      <div class="chart-box"><canvas id="${canvasId}"></canvas></div>
    </div>
  `;
}

function drawResultsCharts(results, curves, acRange, designAC) {
  const pts = (key) => results.map((r) => ({ x: r.ac, y: r[key] }));
  drawMarshallChart('chart-density', { title: 'Density (Unit Weight) vs %AC', yLabel: 'g/mL', dataPoints: pts('unitWeight'), fitFn: curves.unitWeight, xRange: acRange, designAC, color: '#2563eb' });
  drawMarshallChart('chart-stability', { title: 'Stability vs %AC', yLabel: `Stability (${state.unit})`, dataPoints: pts('stabilityAvg'), fitFn: curves.stability, xRange: acRange, designAC, color: '#7c3aed' });
  drawMarshallChart('chart-airvoids', { title: 'Air Voids vs %AC', yLabel: 'Air Voids (%)', dataPoints: pts('airVoids'), fitFn: curves.airVoids, xRange: acRange, designAC, color: '#dc2626' });
  drawMarshallChart('chart-vfa', { title: 'VFA vs %AC', yLabel: 'VFA (%)', dataPoints: pts('vfa'), fitFn: curves.vfa, xRange: acRange, designAC, color: '#16a34a' });
  drawMarshallChart('chart-flow', { title: 'Flow vs %AC', yLabel: 'Flow (0.01")', dataPoints: pts('flowAvg'), fitFn: curves.flow, xRange: acRange, designAC, color: '#d97706' });
  drawMarshallChart('chart-vma', { title: 'VMA vs %AC', yLabel: 'VMA (%)', dataPoints: pts('vma'), fitFn: curves.vma, xRange: acRange, designAC, color: '#0891b2' });
}

function renderSpecCheck(results, curves, criteria) {
  const vals = valuesAtDesignAC(curves, state.designAC);
  const mt = state.moistureTest;
  if (mt.controlStability.length && mt.conditionedStability.length) {
    vals.strengthIndex = percentStrengthIndex(average(mt.conditionedStability), average(mt.controlStability));
  }
  const checks = checkAgainstCriteria(vals, criteria, state.unit);
  $('specCheckWrap').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>รายการ</th><th>ค่าที่ Design AC</th><th>เกณฑ์</th><th>ผล</th></tr></thead>
        <tbody>
          ${checks.map((c) => `
            <tr>
              <td style="text-align:right">${c.label}</td><td>${fmt(c.value, 2)}</td><td>${c.spec}</td>
              <td><span class="pill ${c.pass ? 'pill-pass' : 'pill-fail'}">${c.pass ? 'ผ่าน' : 'ไม่ผ่าน'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function exportResultsCsv(results) {
  const header = ['Sample ID', '%AC', 'Gmb', '%Gmm', 'Air Voids (%)', 'VMA (%)', 'VFA (%)', `Stability (${state.unit})`, 'Flow (0.01")', `Stability/Flow (${state.unit}/0.01")`];
  const rows = [header, ...results.map((r) => [state.sampleLabel || '', r.ac, fmt(r.gmbAvg, 3), fmt(r.percentGmm, 1), fmt(r.airVoids, 2), fmt(r.vma, 2), fmt(r.vfa, 2), fmt(r.stabilityAvg, 0), fmt(r.flowAvg, 2), fmt(r.stabilityFlowRatio, 1)])];
  downloadCSV(`${filenamePrefix()}marshall-results.csv`, rows);
}
