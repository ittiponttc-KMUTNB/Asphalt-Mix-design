function renderAggregateTab() {
  const ap = state.aggregateProperties;
  const asphalt = state.asphalt;

  $('aggregateContainer').innerHTML = `
    <div class="card">
      <h3>คุณสมบัติมวลรวมแยกตามส่วน (Filler / Hot Bin)</h3>
      <div class="card-desc">ค่าความถ่วงจำเพาะและการดูดซึมน้ำของแต่ละส่วน ใช้คำนวณ Bulk Sp.Gr. ของมวลรวมผสม</div>
      <div id="fractionTableWrap"></div>
    </div>

    <div class="card">
      <h3>มวลรวมผสม (Combined)</h3>
      <div class="grid grid-4">
        <div class="field"><label>Bulk Sp.Gr. ของมวลรวมผสม (Gsb)</label><input type="number" step="any" id="combinedBulkSG" value="${ap.combined.bulkSG ?? ''}" /></div>
        <div class="field"><label>Apparent Sp.Gr.</label><input type="number" step="any" id="combinedApparentSG" value="${ap.combined.apparentSG ?? ''}" /></div>
        <div class="field"><label>Effective Sp.Gr. (Gse)</label><input type="number" step="any" id="combinedEffectiveSG" value="${ap.combined.effectiveSG ?? ''}" /><div class="small-note">ใช้ค่าที่คำนวณจาก Gmm อัตโนมัติในแท็บผลลัพธ์ ค่านี้ใช้แสดงอ้างอิงเท่านั้น</div></div>
        <div class="field" style="align-self:end"><button class="btn btn-primary" id="btnAutoCombineSG" style="width:100%">คำนวณจากสัดส่วน Hot Bin</button></div>
      </div>
    </div>

    <div class="card">
      <h3>คุณสมบัติยางแอสฟัลท์ซีเมนต์</h3>
      <div class="grid grid-3">
        <div class="field"><label>เกรดยาง (Penetration)</label><input id="acPenGrade" value="${asphalt.penetrationGrade || ''}" /></div>
        <div class="field"><label>Sp.Gr. ของยางแอสฟัลท์ (Gb)</label><input type="number" step="any" id="acSG" value="${asphalt.specificGravity ?? ''}" /></div>
      </div>
    </div>

    <div class="card">
      <h3>ผลทดสอบคุณภาพมวลรวม (สำหรับแสดงในรายงาน)</h3>
      <div id="qualityTableWrap"></div>
    </div>
  `;

  renderFractionTable();
  renderQualityTable();

  $('btnAutoCombineSG').addEventListener('click', () => {
    const bins = state.hotBin.bins;
    const fr = state.aggregateProperties.fractions;
    const n = Math.min(bins.length, fr.length);
    const components = [];
    for (let i = 0; i < n; i++) {
      components.push({
        proportion: bins[i].proportion || 0,
        bulkSG: fr[i].bulkSG ?? fr[i].apparentSG,
        apparentSG: fr[i].apparentSG ?? fr[i].bulkSG,
      });
    }
    if (!components.length) { showToast('ยังไม่มีข้อมูล Hot Bin หรือคุณสมบัติมวลรวม'); return; }
    ap.combined.bulkSG = Math.round(combinedBulkSG(components) * 1000) / 1000;
    ap.combined.apparentSG = Math.round(combinedApparentSG(components) * 1000) / 1000;
    persist();
    renderAggregateTab();
    showToast('คำนวณ Gsb/Apparent SG จากสัดส่วน Hot Bin แล้ว');
  });

  ['combinedBulkSG', 'combinedApparentSG', 'combinedEffectiveSG'].forEach((id) => {
    $(id).addEventListener('change', (e) => {
      const key = id.replace('combined', '');
      ap.combined[key.charAt(0).toLowerCase() + key.slice(1)] = parseFloat(e.target.value) || null;
      persist();
    });
  });
  $('acPenGrade').addEventListener('change', (e) => { asphalt.penetrationGrade = e.target.value; persist(); });
  $('acSG').addEventListener('change', (e) => { asphalt.specificGravity = parseFloat(e.target.value) || null; persist(); });
}

function renderFractionTable() {
  const fractions = state.aggregateProperties.fractions;
  const cols = [
    { key: 'bulkSG', label: 'Bulk Sp.Gr.' },
    { key: 'apparentSG', label: 'Apparent Sp.Gr.' },
    { key: 'waterAbsorption', label: 'Water Absorption (%)' },
    { key: 'flakiness', label: 'Flakiness Index (%)' },
    { key: 'elongation', label: 'Elongation Index (%)' },
  ];
  $('fractionTableWrap').innerHTML = `
    <div class="flex" style="margin-bottom:8px; justify-content:flex-end;">
      <button class="btn btn-ghost btn-sm" data-action="add-fraction">+ เพิ่มส่วน</button>
      <button class="btn btn-ghost btn-sm" data-action="remove-fraction">- ลบส่วนล่าสุด</button>
    </div>
    <div class="table-wrap">
      <table>
        <thead><tr><th>ส่วน</th>${cols.map((c) => `<th>${c.label}</th>`).join('')}</tr></thead>
        <tbody>
          ${fractions.map((f, i) => `
            <tr>
              <td><input data-frac-field="name" data-frac-index="${i}" value="${f.name}" /></td>
              ${cols.map((c) => `<td><input type="number" step="any" data-frac-field="${c.key}" data-frac-index="${i}" value="${f[c.key] ?? ''}" /></td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  $('fractionTableWrap').querySelectorAll('[data-frac-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.fracIndex, 10);
      const field = el.dataset.fracField;
      fractions[i][field] = field === 'name' ? el.value : (parseFloat(el.value) || null);
      persist();
    });
  });
  $('fractionTableWrap').querySelector('[data-action="add-fraction"]').addEventListener('click', () => {
    fractions.push({ name: `ส่วนที่ ${fractions.length + 1}`, bulkSG: null, apparentSG: null, waterAbsorption: null, flakiness: null, elongation: null });
    persist();
    renderFractionTable();
  });
  $('fractionTableWrap').querySelector('[data-action="remove-fraction"]').addEventListener('click', () => {
    if (fractions.length > 1) fractions.pop();
    persist();
    renderFractionTable();
  });
}

const QUALITY_FIELDS = [
  { key: 'laAbrasion_34', label: 'Los Angeles Abrasion, Agg. 3/4" (%)' },
  { key: 'soundness_34', label: 'Soundness, Agg. 3/4" (% wt. loss)' },
  { key: 'soundness_fine', label: 'Soundness, Fine Aggregate (% wt. loss)' },
  { key: 'sandEquivalent_fine', label: 'Sand Equivalent, Fine Aggregate (%)' },
  { key: 'sandEquivalent_hotbin1', label: 'Sand Equivalent, Hot Bin 1 (%)' },
  { key: 'flakinessIndex', label: 'Flakiness Index รวม (%)' },
  { key: 'elongationIndex', label: 'Elongation Index รวม (%)' },
  { key: 'polishedStoneValue', label: 'Polished Stone Value (%)' },
  { key: 'aggregateCrushingValue', label: 'Aggregate Crushing Value (%)' },
  { key: 'aggregateImpactValue', label: 'Aggregate Impact Value (%)' },
];

function renderQualityTable() {
  const q = state.aggregateProperties.quality;
  $('qualityTableWrap').innerHTML = `
    <div class="grid grid-2">
      ${QUALITY_FIELDS.map((f) => `
        <div class="field">
          <label>${f.label}</label>
          <input type="number" step="any" data-q="${f.key}" value="${q[f.key] ?? ''}" />
        </div>
      `).join('')}
    </div>
  `;
  $('qualityTableWrap').querySelectorAll('[data-q]').forEach((el) => {
    el.addEventListener('change', () => {
      q[el.dataset.q] = parseFloat(el.value) || null;
      persist();
    });
  });
}
