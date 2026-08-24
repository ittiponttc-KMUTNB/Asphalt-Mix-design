function renderSpecimenTab() {
  const gsb = state.aggregateProperties.combined.bulkSG;
  const gb = state.asphalt.specificGravity;
  const warn = (!gsb || !gb)
    ? `<div class="pill pill-fail" style="margin-bottom:12px;">⚠ กรุณากรอก Bulk Sp.Gr. มวลรวมผสม (Gsb) และ Sp.Gr. ยางแอสฟัลท์ (Gb) ในแท็บ "คุณสมบัติมวลรวม/ยาง" ก่อน</div>`
    : '';

  $('specimenContainer').innerHTML = `
    ${warn}
    <div class="flex-between mb-0" style="margin-bottom:12px;">
      <div class="small-note">หน่วยแรง Stability: <b>${state.meta.unit}</b> (เปลี่ยนได้ในแท็บข้อมูลโครงการ)</div>
      <button class="btn btn-primary btn-sm" id="btnAddTrial">+ เพิ่มจุดทดลอง (%AC)</button>
    </div>
    <div id="trialsWrap"></div>
  `;

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
    renderSpecimenTab();
  });

  renderTrials();
}

function renderTrials() {
  const gsb = state.aggregateProperties.combined.bulkSG;
  const gb = state.asphalt.specificGravity;
  const wrap = $('trialsWrap');
  wrap.innerHTML = state.trials.map((trial, ti) => trialCardHtml(trial, ti)).join('') || '<div class="small-note">ยังไม่มีจุดทดลอง กด "+ เพิ่มจุดทดลอง" เพื่อเริ่มต้น</div>';

  wrap.querySelectorAll('[data-trial-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const ti = parseInt(el.dataset.trialIndex, 10);
      const field = el.dataset.trialField;
      if (field === 'pbByAgg' || field === 'gmm') state.trials[ti][field] = parseFloat(el.value) || null;
      persist();
      renderTrials();
    });
  });

  wrap.querySelectorAll('[data-sp-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const ti = parseInt(el.dataset.trialIndex, 10);
      const si = parseInt(el.dataset.spIndex, 10);
      const field = el.dataset.spField;
      state.trials[ti].specimens[si][field] = parseFloat(el.value) || null;
      persist();
      renderTrials();
    });
  });

  wrap.querySelectorAll('[data-action="add-specimen"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.trialIndex, 10);
      state.trials[ti].specimens.push({ weightAir: null, weightSSD: null, weightWater: null, measuredLoad: null, flow: null });
      persist();
      renderTrials();
    });
  });
  wrap.querySelectorAll('[data-action="remove-specimen"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.trialIndex, 10);
      if (state.trials[ti].specimens.length > 1) state.trials[ti].specimens.pop();
      persist();
      renderTrials();
    });
  });
  wrap.querySelectorAll('[data-action="remove-trial"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const ti = parseInt(btn.dataset.trialIndex, 10);
      state.trials.splice(ti, 1);
      persist();
      renderTrials();
    });
  });
}

function trialCardHtml(trial, ti) {
  const gsb = state.aggregateProperties.combined.bulkSG;
  const gb = state.asphalt.specificGravity;
  const canCalc = gsb && gb && trial.gmm && trial.specimens.some((s) => s.weightAir && s.weightSSD != null && s.weightWater != null);
  let result = null;
  if (canCalc) {
    try {
      result = calculateAtAcLevel({ pbByAgg: trial.pbByAgg, specimens: trial.specimens, gmm: trial.gmm, gsb, gb });
    } catch (e) { result = null; }
  }

  const specimenRows = trial.specimens.map((sp, si) => {
    let gmbTxt = '-', volTxt = '-', factorTxt = '-', corrTxt = '-';
    if (sp.weightAir != null && sp.weightSSD != null && sp.weightWater != null) {
      const gmb = bulkSpecificGravity(sp.weightAir, sp.weightSSD, sp.weightWater);
      const vol = specimenVolume(sp.weightSSD, sp.weightWater);
      const factor = stabilityCorrectionFactor(vol);
      gmbTxt = fmt(gmb, 3); volTxt = fmt(vol, 1); factorTxt = fmt(factor, 2);
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
        <td class="small-note">${gmbTxt}</td>
        <td class="small-note">${volTxt}</td>
        <td class="small-note">${factorTxt}</td>
        <td class="small-note">${corrTxt}</td>
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
      <div class="stat-tile"><div class="label">Flow เฉลี่ย</div><div class="value">${fmt(result.flowAvg, 1)}</div></div>
      <div class="stat-tile"><div class="label">Stability/Flow</div><div class="value">${fmt(result.stabilityFlowRatio, 0)}</div></div>
    </div>
  ` : '<div class="small-note mt-14">กรอกน้ำหนักตัวอย่าง, load, flow และ Gmm ให้ครบเพื่อคำนวณอัตโนมัติ</div>';

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
            <th>#</th><th>Wt. Air (g)</th><th>Wt. SSD (g)</th><th>Wt. Water (g)</th>
            <th>Load วัดได้ (${state.meta.unit})</th><th>Flow (0.01")</th>
            <th>Gmb</th><th>Vol.(cc)</th><th>Factor</th><th>Corr. Stability</th>
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
