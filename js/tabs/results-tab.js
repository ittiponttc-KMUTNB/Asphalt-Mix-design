function renderResultsTab() {
  const results = computeAllResults();
  if (results.length < 3) {
    $('resultsContainer').innerHTML = `<div class="card"><div class="pill pill-fail">ต้องมีจุดทดลองที่คำนวณได้ครบถ้วนอย่างน้อย 3 จุด (แนะนำ 5 จุด) จึงจะพล็อตกราฟและหา OAC ได้</div></div>`;
    return;
  }

  const xs = results.map((r) => r.ac);
  const acRange = [Math.min(...xs), Math.max(...xs)];
  const degree = Math.min(3, xs.length - 1);
  const curves = {
    unitWeight: polynomialRegression(xs, results.map((r) => r.unitWeight), degree),
    stability: polynomialRegression(xs, results.map((r) => r.stabilityAvg), degree),
    flow: polynomialRegression(xs, results.map((r) => r.flowAvg), degree),
    airVoids: polynomialRegression(xs, results.map((r) => r.airVoids), degree),
    vma: polynomialRegression(xs, results.map((r) => r.vma), degree),
    vfa: polynomialRegression(xs, results.map((r) => r.vfa), degree),
  };

  const criteria = getCriteria();
  const targetVa = (criteria.airVoids_min + criteria.airVoids_max) / 2;
  const oac = suggestOAC(curves, acRange, targetVa);

  if (state.designAC == null) state.designAC = Math.round(oac.oacSuggested * 20) / 20;

  $('resultsContainer').innerHTML = `
    <div class="card">
      <h3>การหาปริมาณแอสฟัลท์ที่เหมาะสม (Optimum Asphalt Content)</h3>
      <div class="grid grid-4">
        <div class="stat-tile"><div class="label">%AC ที่ Stability สูงสุด</div><div class="value">${fmt(oac.acAtMaxStability, 2)}</div></div>
        <div class="stat-tile"><div class="label">%AC ที่ Density สูงสุด</div><div class="value">${fmt(oac.acAtMaxDensity, 2)}</div></div>
        <div class="stat-tile"><div class="label">%AC ที่ Air Voids = ${fmt(targetVa, 1)}%</div><div class="value">${oac.acAtTargetVa != null ? fmt(oac.acAtTargetVa, 2) : '-'}</div></div>
        <div class="stat-tile"><div class="label">OAC แนะนำ (ค่าเฉลี่ย)</div><div class="value" style="color:var(--primary)">${fmt(oac.oacSuggested, 2)}</div></div>
      </div>
      <div class="flex mt-14">
        <div class="field" style="max-width:220px"><label>Design AC ที่เลือกใช้จริง (%)</label>
          <input type="number" step="0.1" id="designAcInput" value="${state.designAC ?? ''}" />
        </div>
        <button class="btn btn-ghost btn-sm" id="btnUseSuggested" style="margin-top:18px">ใช้ค่าที่แนะนำ</button>
      </div>
      <div class="small-note mt-8">OAC แนะนำคำนวณตามวิธี Asphalt Institute (MS-2): ค่าเฉลี่ยของ %AC ที่ Stability สูงสุด, Density สูงสุด และที่ Air Voids เท่ากับค่ากึ่งกลางของช่วงที่มาตรฐานกำหนด วิศวกรสามารถปรับค่าสุดท้ายได้ตามดุลยพินิจ โดยต้องตรวจสอบว่าเกณฑ์ทุกข้อผ่านที่ %AC นั้น</div>
    </div>

    <div class="card">
      <h3>ตรวจสอบเกณฑ์ควบคุมที่ Design AC = ${fmt(state.designAC, 2)}%</h3>
      <div id="specCheckWrap"></div>
    </div>

    <div class="card">
      <h3>กราฟความสัมพันธ์ %AC กับคุณสมบัติต่างๆ</h3>
      <div class="grid grid-2">
        <div><div class="chart-box"><canvas id="chart-density"></canvas></div></div>
        <div><div class="chart-box"><canvas id="chart-stability"></canvas></div></div>
        <div><div class="chart-box"><canvas id="chart-airvoids"></canvas></div></div>
        <div><div class="chart-box"><canvas id="chart-vfa"></canvas></div></div>
        <div><div class="chart-box"><canvas id="chart-flow"></canvas></div></div>
        <div><div class="chart-box"><canvas id="chart-vma"></canvas></div></div>
      </div>
    </div>

    <div class="card">
      <h3>ทดสอบความคงทนต่อน้ำ (Index of Retained Strength / % Strength Index)</h3>
      <div class="card-desc">กรอกค่า Stability ของตัวอย่างชุดควบคุม (แห้ง) และชุดแช่น้ำ (Conditioned) ที่ Design AC</div>
      <div id="moistureWrap"></div>
    </div>
  `;

  drawResultsCharts(results, curves, acRange, state.designAC);
  renderSpecCheck(results, curves, criteria);
  renderMoistureTest(criteria);

  $('designAcInput').addEventListener('change', (e) => {
    state.designAC = parseFloat(e.target.value) || null;
    persist();
    renderResultsTab();
  });
  $('btnUseSuggested').addEventListener('click', () => {
    state.designAC = Math.round(oac.oacSuggested * 20) / 20;
    persist();
    renderResultsTab();
  });
}

function drawResultsCharts(results, curves, acRange, designAC) {
  const pts = (key) => results.map((r) => ({ x: r.ac, y: r[key] }));
  drawMarshallChart('chart-density', { title: 'Density (Unit Weight) vs %AC', yLabel: 'g/mL', dataPoints: pts('unitWeight'), fitFn: curves.unitWeight, xRange: acRange, designAC, color: '#2563eb' });
  drawMarshallChart('chart-stability', { title: `Stability vs %AC`, yLabel: `Stability (${state.meta.unit})`, dataPoints: pts('stabilityAvg'), fitFn: curves.stability, xRange: acRange, designAC, color: '#7c3aed' });
  drawMarshallChart('chart-airvoids', { title: 'Air Voids vs %AC', yLabel: 'Air Voids (%)', dataPoints: pts('airVoids'), fitFn: curves.airVoids, xRange: acRange, designAC, color: '#dc2626' });
  drawMarshallChart('chart-vfa', { title: 'VFA vs %AC', yLabel: 'VFA (%)', dataPoints: pts('vfa'), fitFn: curves.vfa, xRange: acRange, designAC, color: '#16a34a' });
  drawMarshallChart('chart-flow', { title: 'Flow vs %AC', yLabel: 'Flow (0.01")', dataPoints: pts('flowAvg'), fitFn: curves.flow, xRange: acRange, designAC, color: '#d97706' });
  drawMarshallChart('chart-vma', { title: 'VMA vs %AC', yLabel: 'VMA (%)', dataPoints: pts('vma'), fitFn: curves.vma, xRange: acRange, designAC, color: '#0891b2' });
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

function renderSpecCheck(results, curves, criteria) {
  const vals = valuesAtDesignAC(curves, state.designAC);
  const moisture = state.moistureTest;
  if (moisture.controlStability.length && moisture.conditionedStability.length) {
    vals.strengthIndex = percentStrengthIndex(average(moisture.conditionedStability), average(moisture.controlStability));
  }
  const checks = checkAgainstCriteria(vals, criteria, state.meta.unit);
  $('specCheckWrap').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>รายการ</th><th>ค่าที่ Design AC</th><th>เกณฑ์</th><th>ผล</th></tr></thead>
        <tbody>
          ${checks.map((c) => `
            <tr>
              <td style="text-align:right">${c.label}</td>
              <td>${fmt(c.value, 2)}</td>
              <td>${c.spec}</td>
              <td><span class="pill ${c.pass ? 'pill-pass' : 'pill-fail'}">${c.pass ? 'ผ่าน' : 'ไม่ผ่าน'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderMoistureTest() {
  const mt = state.moistureTest;
  const renderList = (arr, key) => arr.map((v, i) => `<input type="number" step="any" data-mt="${key}" data-mt-index="${i}" value="${v}" style="width:70px;display:inline-block;margin:2px" />`).join('');
  $('moistureWrap').innerHTML = `
    <div class="grid grid-2">
      <div>
        <label class="small-note">Stability ชุดควบคุม (${state.meta.unit})</label><br/>
        ${renderList(mt.controlStability, 'controlStability')}
        <button class="btn btn-ghost btn-sm" data-action="add-mt" data-key="controlStability">+</button>
      </div>
      <div>
        <label class="small-note">Stability ชุดแช่น้ำ (${state.meta.unit})</label><br/>
        ${renderList(mt.conditionedStability, 'conditionedStability')}
        <button class="btn btn-ghost btn-sm" data-action="add-mt" data-key="conditionedStability">+</button>
      </div>
    </div>
    <div class="mt-8">% Strength Index = ${mt.controlStability.length && mt.conditionedStability.length ? fmt(percentStrengthIndex(average(mt.conditionedStability), average(mt.controlStability)), 1) : '-'}</div>
  `;
  $('moistureWrap').querySelectorAll('[data-mt]').forEach((el) => {
    el.addEventListener('change', () => {
      mt[el.dataset.mt][parseInt(el.dataset.mtIndex, 10)] = parseFloat(el.value) || 0;
      persist();
      renderResultsTab();
    });
  });
  $('moistureWrap').querySelectorAll('[data-action="add-mt"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mt[btn.dataset.key].push(0);
      persist();
      renderResultsTab();
    });
  });
}
