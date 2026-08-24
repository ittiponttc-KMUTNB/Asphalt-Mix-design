/**
 * ตัวช่วยคำนวณมิกซ์ที่ใช้ RAP (Reclaimed Asphalt Pavement) แทนมวลรวมบางส่วน
 * ส่วนที่ 1: ผสมขนาดคละ + หา %AC (โดยน้ำหนักมวลรวมรวม) — อ้างอิงตัวอย่างจากแท็บขนาดคละ (by Sample ID)
 * ส่วนที่ 2: แปลงเป็นน้ำหนักจริงสำหรับชั่งตัวอย่าง (Batching) ตามวิธีที่ใช้หน้างานจริง
 *   Total AC (โดยน้ำหนักรวม) = AC เดิมจาก RAP + น้ำยาปรับปรุงคุณภาพ (RA5 ฯลฯ) + Virgin AC ที่เติมใหม่
 */

function findSampleById(id) {
  return state.gradationSamples.find((s) => s.id === id);
}

function renderRapTab() {
  const rc = state.rapCalc;
  if (!rc.ingredients.length && state.gradationSamples.length) {
    rc.ingredients.push({ sampleId: state.gradationSamples[0].id, proportion: 100, ownAC: 0 });
  }
  if (rc.ra5Percent == null) rc.ra5Percent = 0;
  if (!rc.batching) rc.batching = { specimenWeight: 1200, rapPercent: null, rapOwnAC: null, targetAC: null, ra5Percent: null };

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
      <div class="grid grid-3">
        <div class="field"><label>Total AC เป้าหมาย (% โดยน้ำหนักมวลรวมรวม)</label><input type="number" step="any" id="rapTargetAC" value="${rc.targetTotalAC ?? ''}" /></div>
        <div class="field"><label>น้ำยาปรับปรุงคุณภาพ/Rejuvenator เช่น RA5 (% โดยน้ำหนักมวลรวมรวม)</label><input type="number" step="any" id="rapRa5" value="${rc.ra5Percent ?? 0}" /></div>
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

    <div class="card">
      <h3>แปลงเป็นน้ำหนักสำหรับชั่งตัวอย่าง (Batching)</h3>
      <div class="card-desc">ใช้เมื่อรู้สัดส่วน RAP โดยน้ำหนักของ "มิกซ์รวมทั้งก้อน" (ไม่ใช่เฉพาะมวลรวม) ตามวิธีชั่งตัวอย่างหน้างานจริง</div>
      <div id="rapBatchingWrap"></div>
    </div>
  `;

  $('rapTargetAC').addEventListener('change', (e) => { rc.targetTotalAC = parseFloat(e.target.value) || null; persist(); renderRapTab(); });
  $('rapRa5').addEventListener('change', (e) => { rc.ra5Percent = parseFloat(e.target.value) || 0; persist(); renderRapTab(); });
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
  renderRapBatching();
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
  const ra5 = rc.ra5Percent || 0;
  const virginACNeeded = rc.targetTotalAC != null ? rc.targetTotalAC - contributedAC - ra5 : null;

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
    <div class="grid grid-4">
      <div class="stat-tile"><div class="label">AC ที่มาจาก RAP (by wt. มวลรวมรวม)</div><div class="value">${fmt(contributedAC, 2)}%</div></div>
      <div class="stat-tile"><div class="label">น้ำยาปรับปรุงคุณภาพ (RA5 ฯลฯ)</div><div class="value">${fmt(state.rapCalc.ra5Percent || 0, 2)}%</div></div>
      <div class="stat-tile"><div class="label">Virgin AC ที่ต้องเติมเพิ่ม</div><div class="value" style="color:${virginACNeeded != null && virginACNeeded < 0 ? 'var(--danger)' : 'var(--primary)'}">${virginACNeeded != null ? fmt(virginACNeeded, 2) + '%' : '-'}</div></div>
      <div class="stat-tile"><div class="label">Total AC (ใช้ในแท็บ Marshall)</div><div class="value">${state.rapCalc.targetTotalAC != null ? fmt(state.rapCalc.targetTotalAC, 2) + '%' : '-'}</div></div>
    </div>
    ${virginACNeeded != null && virginACNeeded < 0 ? '<div class="pill pill-fail mt-8">Virgin AC ติดลบ — %AC เป้าหมายต่ำกว่ายาง+น้ำยาที่มาจาก RAP อยู่แล้ว ต้องลดสัดส่วน RAP หรือเพิ่มเป้าหมาย %AC</div>' : ''}
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
    const sample = newGradationSample(id, `RAP Blend (${new Date().toLocaleDateString('th-TH')})`);
    sample.gradation = combined;
    state.gradationSamples.push(sample);
    persist();
    showToast(`เพิ่มตัวอย่าง ${id} ในแท็บขนาดคละแล้ว`);
  });
  $('btnSendToMarshall').addEventListener('click', () => {
    if (state.rapCalc.targetTotalAC == null) { showToast('กรุณาใส่ Total AC เป้าหมายก่อน'); return; }
    state.trials.push({
      pbByAgg: state.rapCalc.targetTotalAC,
      gmm: null,
      specimens: [
        { weightAir: null, weightSSD: null, weightWater: null, measuredLoad: null, flow: null },
        { weightAir: null, weightSSD: null, weightWater: null, measuredLoad: null, flow: null },
        { weightAir: null, weightSSD: null, weightWater: null, measuredLoad: null, flow: null },
      ],
    });
    persist();
    showToast(`เพิ่มจุดทดลอง %AC = ${fmt(state.rapCalc.targetTotalAC, 2)} ในแท็บ Marshall แล้ว`);
  });
}

/**
 * Batching: แปลง %RAP โดยน้ำหนักของ "มิกซ์รวมทั้งก้อน" เป็นน้ำหนักจริงที่ต้องชั่ง
 * ตรวจสอบสูตรแล้วตรงกับตัวอย่างจริง (ทางหลวงหมายเลข 332, RAP 75%):
 *   RAP weight = Total x %RAP
 *   RAP old binder = RAP weight x %RAP-own-AC
 *   Target binder = Total x %Target AC
 *   RA5 = Total x %RA5
 *   Virgin AC = Target binder - RAP old binder - RA5
 *   Hotmix (วัสดุใหม่ทั้งหมด) = Total x (100-%RAP)
 *   New rock = Hotmix - Virgin AC - RA5
 */
function computeRapBatching(b) {
  const { specimenWeight: total, rapPercent, rapOwnAC, targetAC, ra5Percent } = b;
  if (!total || rapPercent == null || rapOwnAC == null || targetAC == null) return null;
  const ra5 = ra5Percent || 0;

  const rapWeight = total * (rapPercent / 100);
  const rapOldBinder = rapWeight * (rapOwnAC / 100);
  const rapAggregate = rapWeight - rapOldBinder;
  const targetBinderMass = total * (targetAC / 100);
  const ra5Mass = total * (ra5 / 100);
  const virginACMass = targetBinderMass - rapOldBinder - ra5Mass;
  const hotmixMass = total * ((100 - rapPercent) / 100);
  const newRockMass = hotmixMass - virginACMass - ra5Mass;

  return { rapWeight, rapOldBinder, rapAggregate, targetBinderMass, ra5Mass, virginACMass, hotmixMass, newRockMass };
}

function renderRapBatching() {
  const b = state.rapCalc.batching;
  $('rapBatchingWrap').innerHTML = `
    <div class="grid grid-4">
      <div class="field"><label>น้ำหนักก้อนตัวอย่างรวม (g)</label><input type="number" step="any" id="rbTotal" value="${b.specimenWeight ?? ''}" /></div>
      <div class="field"><label>%RAP (โดยน้ำหนักมิกซ์รวม)</label><input type="number" step="any" id="rbRapPct" value="${b.rapPercent ?? ''}" /></div>
      <div class="field"><label>%AC เดิมใน RAP (by wt. ของ RAP)</label><input type="number" step="any" id="rbRapAC" value="${b.rapOwnAC ?? ''}" /></div>
      <div class="field"><label>Target AC รวม (by wt. มิกซ์รวม)</label><input type="number" step="any" id="rbTargetAC" value="${b.targetAC ?? ''}" /></div>
      <div class="field"><label>น้ำยาปรับปรุงคุณภาพ (% by wt. มิกซ์รวม)</label><input type="number" step="any" id="rbRa5" value="${b.ra5Percent ?? ''}" /></div>
    </div>
    <div id="rapBatchingResult" class="mt-14"></div>
  `;
  ['rbTotal:specimenWeight', 'rbRapPct:rapPercent', 'rbRapAC:rapOwnAC', 'rbTargetAC:targetAC', 'rbRa5:ra5Percent'].forEach((pair) => {
    const [elId, key] = pair.split(':');
    $(elId).addEventListener('change', (e) => {
      b[key] = parseFloat(e.target.value);
      if (Number.isNaN(b[key])) b[key] = null;
      persist();
      renderRapBatchingResult();
    });
  });
  renderRapBatchingResult();
}

function renderRapBatchingResult() {
  const b = state.rapCalc.batching;
  const r = computeRapBatching(b);
  if (!r) {
    $('rapBatchingResult').innerHTML = '<div class="small-note">กรอกข้อมูลให้ครบเพื่อคำนวณน้ำหนักที่ต้องชั่ง</div>';
    return;
  }
  const rows = [
    ['น้ำหนัก RAP', r.rapWeight],
    ['  → ยางเก่าใน RAP', r.rapOldBinder],
    ['  → เนื้อหินเก่าใน RAP', r.rapAggregate],
    ['ปริมาณยางรวมเป้าหมาย (Target Binder)', r.targetBinderMass],
    ['น้ำยาปรับปรุงคุณภาพ', r.ra5Mass],
    ['น้ำหนักวัสดุใหม่ทั้งหมด (Hotmix)', r.hotmixMass],
    ['  → ยางใหม่ที่ต้องเติม (Virgin AC)', r.virginACMass],
    ['  → หินใหม่ที่ต้องเติม', r.newRockMass],
  ];
  $('rapBatchingResult').innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>รายการ</th><th>น้ำหนัก (g)</th></tr></thead>
        <tbody>
          ${rows.map(([label, val]) => `<tr><td style="text-align:right">${label}</td><td style="font-weight:700">${fmt(val, 2)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${r.virginACMass < 0 ? '<div class="pill pill-fail mt-8">ยางใหม่ที่ต้องเติมติดลบ — ตรวจสอบ %RAP/Target AC/น้ำยาอีกครั้ง</div>' : ''}
    ${r.newRockMass < 0 ? '<div class="pill pill-fail mt-8">หินใหม่ที่ต้องเติมติดลบ — Target AC หรือน้ำยาสูงเกินสัดส่วนวัสดุใหม่ที่มี</div>' : ''}
  `;
}
