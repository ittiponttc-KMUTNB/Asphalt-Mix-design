/**
 * ตัวช่วยคำนวณมิกซ์ที่ใช้ RAP (Reclaimed Asphalt Pavement) แทนมวลรวมบางส่วน
 * แนวคิด: ทุก "ส่วนผสม" (RAP หรือมวลรวมใหม่) อ้างอิง gradation จากตัวอย่างที่มีอยู่ในแท็บขนาดคละ (by Sample ID)
 * สัดส่วน (proportion) ทั้งหมดคือ % โดยน้ำหนักของมวลรวมรวมทั้งหมด (รวม RAP) ต้องรวมกันได้ 100%
 * ownAC = % ยางเดิมที่ติดอยู่ใน RAP นั้น (โดยน้ำหนักของ RAP) ส่วนมวลรวมใหม่ใส่ 0
 * Total AC (โดยน้ำหนักมวลรวมรวม) = Σ(proportion/100 × ownAC) + Virgin AC ที่เติมใหม่
 */

function findSampleById(id) {
  return state.gradationSamples.find((s) => s.id === id);
}

function renderRapTab() {
  const rc = state.rapCalc;
  if (!rc.ingredients.length && state.gradationSamples.length) {
    rc.ingredients.push({ sampleId: state.gradationSamples[0].id, proportion: 100, ownAC: 0 });
  }

  $('rapContainer').innerHTML = `
    <div class="card">
      <div class="card-desc">แต่ละแถวอ้างอิงขนาดคละจาก "ตัวอย่าง" ที่กรอกไว้ในแท็บขนาดคละมวลรวม (ตามรหัส Sample ID) — เพิ่ม/แก้ไขขนาดคละของ RAP และมวลรวมใหม่ที่นั่นก่อน แล้วมาผสมสัดส่วนที่นี่</div>
      <div id="rapIngredientsWrap"></div>
      <div class="flex mt-8">
        <button class="btn btn-ghost btn-sm" id="btnAddIngredient">+ เพิ่มส่วนผสม</button>
        <button class="btn btn-ghost btn-sm" id="btnRemoveIngredient">- ลบส่วนผสมล่าสุด</button>
      </div>
    </div>

    <div class="card">
      <h3>เป้าหมาย %AC รวมของมิกซ์</h3>
      <div class="grid grid-2">
        <div class="field"><label>Total AC เป้าหมาย (% โดยน้ำหนักมวลรวมรวม)</label><input type="number" step="any" id="rapTargetAC" value="${rc.targetTotalAC ?? ''}" /></div>
      </div>
      <div id="rapResultWrap" class="mt-14"></div>
    </div>

    <div class="card">
      <h3>ขนาดคละผสม (Combined)</h3>
      <div id="rapGradTableWrap"></div>
      <div class="flex mt-8">
        <button class="btn btn-primary btn-sm" id="btnSendToGradation">→ ส่งเป็นตัวอย่างใหม่ในแท็บขนาดคละ</button>
        <button class="btn btn-primary btn-sm" id="btnSendToMarshall">→ เพิ่มเป็นจุดทดลองใหม่ในแท็บ Marshall (ที่ %AC เป้าหมาย)</button>
      </div>
    </div>
  `;

  $('rapTargetAC').addEventListener('change', (e) => { rc.targetTotalAC = parseFloat(e.target.value) || null; persist(); renderRapTab(); });
  $('btnAddIngredient').addEventListener('click', () => {
    rc.ingredients.push({ sampleId: state.gradationSamples[0]?.id, proportion: 0, ownAC: 0 });
    persist(); renderRapTab();
  });
  $('btnRemoveIngredient').addEventListener('click', () => {
    if (rc.ingredients.length > 1) rc.ingredients.pop();
    persist(); renderRapTab();
  });

  renderRapIngredients();
  renderRapResult();
}

function renderRapIngredients() {
  const rc = state.rapCalc;
  const sampleOptions = (selected) => state.gradationSamples
    .map((s) => `<option value="${s.id}" ${s.id === selected ? 'selected' : ''}>${s.id} - ${s.name}</option>`)
    .join('');

  const sum = rc.ingredients.reduce((a, i) => a + (i.proportion || 0), 0);

  $('rapIngredientsWrap').innerHTML = `
    <div class="pill ${Math.abs(sum - 100) < 0.05 ? 'pill-pass' : 'pill-fail'}" style="margin-bottom:10px;">รวมสัดส่วน ${sum.toFixed(1)}%</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ตัวอย่าง (Sample ID)</th><th>สัดส่วนในมิกซ์ (%)</th><th>%AC เดิมที่ติดอยู่ (by wt. ของส่วนนี้)</th><th></th></tr></thead>
        <tbody>
          ${rc.ingredients.map((ing, i) => `
            <tr>
              <td><select data-rap-field="sampleId" data-rap-index="${i}">${sampleOptions(ing.sampleId)}</select></td>
              <td><input type="number" step="any" data-rap-field="proportion" data-rap-index="${i}" value="${ing.proportion ?? ''}" /></td>
              <td><input type="number" step="any" data-rap-field="ownAC" data-rap-index="${i}" value="${ing.ownAC ?? 0}" /></td>
              <td><span class="small-note">${ing.ownAC > 0 ? 'RAP' : 'มวลรวมใหม่'}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    <div class="small-note mt-8">ใส่ %AC เดิม &gt; 0 สำหรับส่วนที่เป็น RAP (มียางติดอยู่แล้ว) ส่วนมวลรวมใหม่ให้เว้น/ใส่ 0</div>
  `;

  $('rapIngredientsWrap').querySelectorAll('[data-rap-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.rapIndex, 10);
      const field = el.dataset.rapField;
      rc.ingredients[i][field] = field === 'sampleId' ? el.value : (parseFloat(el.value) || 0);
      persist();
      renderRapTab();
    });
  });
}

function computeRapBlend() {
  const rc = state.rapCalc;
  const valid = rc.ingredients.every((i) => findSampleById(i.sampleId));
  if (!valid || !rc.ingredients.length) return null;

  const bins = rc.ingredients.map((i) => ({ proportion: i.proportion || 0, gradation: findSampleById(i.sampleId).gradation }));
  const combined = combinedGradation(bins, SIEVE_SIZES);
  const contributedAC = rc.ingredients.reduce((a, i) => a + ((i.proportion || 0) / 100) * (i.ownAC || 0), 0);
  const virginACNeeded = rc.targetTotalAC != null ? rc.targetTotalAC - contributedAC : null;

  return { combined, contributedAC, virginACNeeded };
}

function renderRapResult() {
  const result = computeRapBlend();
  if (!result) {
    $('rapResultWrap').innerHTML = '<div class="small-note">เพิ่มส่วนผสมและเลือกตัวอย่างให้ครบก่อน</div>';
    $('rapGradTableWrap').innerHTML = '';
    return;
  }
  const { contributedAC, virginACNeeded } = result;
  $('rapResultWrap').innerHTML = `
    <div class="grid grid-3">
      <div class="stat-tile"><div class="label">AC ที่มาจาก RAP (by wt. มวลรวมรวม)</div><div class="value">${fmt(contributedAC, 2)}%</div></div>
      <div class="stat-tile"><div class="label">Virgin AC ที่ต้องเติมเพิ่ม</div><div class="value" style="color:${virginACNeeded != null && virginACNeeded < 0 ? 'var(--danger)' : 'var(--primary)'}">${virginACNeeded != null ? fmt(virginACNeeded, 2) + '%' : '-'}</div></div>
      <div class="stat-tile"><div class="label">Total AC (ใช้ในแท็บ Marshall)</div><div class="value">${state.rapCalc.targetTotalAC != null ? fmt(state.rapCalc.targetTotalAC, 2) + '%' : '-'}</div></div>
    </div>
    ${virginACNeeded != null && virginACNeeded < 0 ? '<div class="pill pill-fail mt-8">Virgin AC ติดลบ — %AC เป้าหมายต่ำกว่ายางที่ RAP นำมาเองแล้ว ต้องลดสัดส่วน RAP หรือเพิ่มเป้าหมาย %AC</div>' : ''}
  `;

  renderRapGradTable(result.combined);
}

function renderRapGradTable(combined) {
  const envelope = getEnvelope();
  $('rapGradTableWrap').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>ตะแกรง</th><th>% ผ่านตะแกรง (ผสมแล้ว)</th><th>ช่วงมาตรฐาน</th></tr></thead>
        <tbody>
          ${SIEVE_SIZES.map(({ mm, label }) => {
            const range = envelope[mm];
            const val = combined[mm];
            const pass = range && val != null ? (val >= range[0] && val <= range[1]) : null;
            const cellStyle = pass === true ? 'style="background:var(--success-soft)"' : pass === false ? 'style="background:var(--danger-soft)"' : '';
            return `<tr><td style="text-align:right">${label} (${mm} มม.)</td><td ${cellStyle}>${val ?? '-'}</td><td class="small-note">${range ? `${range[0]} - ${range[1]}` : '-'}</td></tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;

  $('btnSendToGradation').addEventListener('click', () => {
    const id = nextSampleId();
    state.gradationSamples.push({ id, name: `RAP Blend (${new Date().toLocaleDateString('th-TH')})`, gradation: combined });
    persist();
    showToast(`เพิ่มตัวอย่าง ${id} ในแท็บขนาดคละแล้ว`);
  });
  $('btnSendToMarshall').addEventListener('click', () => {
    if (state.rapCalc.targetTotalAC == null) { showToast('กรุณาใส่ Total AC เป้าหมายก่อน'); return; }
    state.trials.push({
      pbByAgg: state.rapCalc.targetTotalAC,
      gmm: null,
      specimens: [
        { weightAir: null, weightSSD: null, weightWater: null, thicknessMm: null, measuredLoad: null, flow: null },
        { weightAir: null, weightSSD: null, weightWater: null, thicknessMm: null, measuredLoad: null, flow: null },
        { weightAir: null, weightSSD: null, weightWater: null, thicknessMm: null, measuredLoad: null, flow: null },
      ],
    });
    persist();
    showToast(`เพิ่มจุดทดลอง %AC = ${fmt(state.rapCalc.targetTotalAC, 2)} ในแท็บ Marshall แล้ว`);
  });
}
