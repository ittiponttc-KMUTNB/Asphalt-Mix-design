function ensureCriteriaOverrideDefaults() {
  const base = state.standard.designCriteria[state.meta.courseType];
  state.criteriaOverride = { ...base, ...(state.criteriaOverride || {}) };
  if (state.criteriaOverride.acTolerance == null) {
    state.criteriaOverride.acTolerance = state.standard.jobMixTolerance.acContent;
  }
}

function renderProjectTab() {
  const m = state.meta;
  const courseOptions = Object.entries(COURSE_TYPES)
    .map(([key, c]) => `<option value="${key}" ${m.courseType === key ? 'selected' : ''}>${c.label}</option>`)
    .join('');

  $('projectContainer').innerHTML = `
    <div class="card">
      <h2>ข้อมูลโครงการ</h2>
      <div class="card-desc">ข้อมูลนี้จะแสดงในหัวรายงาน Job-Mix Formula</div>
      <div class="grid grid-2">
        <div class="field" style="grid-column:1/-1"><label>ชื่อโครงการ</label><textarea rows="2" data-field="projectName">${m.projectName || ''}</textarea></div>
        <div class="field" style="grid-column:1/-1"><label>ทางหลวงหมายเลข / ตอน / กม.</label><input data-field="highwaySection" value="${m.highwaySection || ''}" /></div>
        <div class="field"><label>สัญญาเลขที่</label><input data-field="contractNo" value="${m.contractNo || ''}" /></div>
        <div class="field"><label>อันดับการทดลองที่</label><input data-field="testNo" value="${m.testNo || ''}" /></div>
        <div class="field" style="grid-column:1/-1"><label>แหล่งวัสดุ</label><textarea rows="2" data-field="sourceOfMaterial">${m.sourceOfMaterial || ''}</textarea></div>
        <div class="field" style="grid-column:1/-1"><label>Mixing Plant</label><textarea rows="2" data-field="mixingPlant">${m.mixingPlant || ''}</textarea></div>
        <div class="field"><label>เจ้าของตัวอย่าง</label><input data-field="sampleOwner" value="${m.sampleOwner || ''}" /></div>
        <div class="field"><label>เจ้าหน้าที่ออกแบบ</label><input data-field="designer" value="${m.designer || ''}" /></div>
        <div class="field"><label>หน่วยงาน (ผู้ออกรายงาน)</label><input data-field="officeName" value="${m.officeName || ''}" /></div>
        <div class="field"><label>วันที่รับตัวอย่าง</label><input type="date" data-field="dateReceived" value="${m.dateReceived || ''}" /></div>
      </div>
    </div>

    <div class="card">
      <h2>ชั้นทางและมาตรฐานออกแบบ</h2>
      <div class="grid grid-3">
        <div class="field"><label>ชั้นทาง (Course Type)</label><select data-field="courseType">${courseOptions}</select></div>
        <div class="field"><label>หน่วยแรง Stability</label>
          <select data-field="unit">
            <option value="lbs" ${m.unit === 'lbs' ? 'selected' : ''}>lbs / 0.01" (นิยมใช้ในแลบไทย)</option>
            <option value="N" ${m.unit === 'N' ? 'selected' : ''}>N / mm (SI)</option>
          </select>
        </div>
        <div class="field"><label>วิธีทดสอบ</label><input data-field="testMethod" value="${m.testMethod || ''}" /></div>
      </div>
      <div class="small-note mt-8">ช่วงขนาดคละและปริมาณแอสฟัลท์เริ่มต้นอ้างอิงจากมาตรฐาน ทล.-ม. 408/2532 ตามชั้นทางที่เลือก สามารถปรับ "เกณฑ์ควบคุมเฉพาะโครงการ" ด้านล่างได้หากสัญญากำหนดค่าที่เข้มกว่ามาตรฐานพื้นฐาน</div>
    </div>

    <div class="card" id="criteriaCard"></div>
  `;

  document.querySelectorAll('#projectContainer [data-field]').forEach((el) => {
    el.addEventListener('change', () => {
      state.meta[el.dataset.field] = el.value;
      persist();
      if (el.dataset.field === 'courseType') {
        ensureCriteriaOverrideDefaults();
        $('courseBadge').textContent = COURSE_TYPES[state.meta.courseType]?.label || '-';
        renderCriteriaCard();
      }
    });
  });

  ensureCriteriaOverrideDefaults();
  renderCriteriaCard();
}

function renderCriteriaCard() {
  const base = state.standard.designCriteria[state.meta.courseType];
  const c = state.criteriaOverride;
  const unit = state.meta.unit;
  const rows = [
    { key: unit === 'lbs' ? 'stability_lbs' : 'stability_N', label: `Marshall Stability (${unit})`, baseVal: unit === 'lbs' ? base.stability_lbs : base.stability_N },
    { key: 'flow_min', label: 'Flow ต่ำสุด (0.01")', baseVal: base.flow_min },
    { key: 'flow_max', label: 'Flow สูงสุด (0.01")', baseVal: base.flow_max },
    { key: 'airVoids_min', label: 'Air Voids ต่ำสุด (%)', baseVal: base.airVoids_min },
    { key: 'airVoids_max', label: 'Air Voids สูงสุด (%)', baseVal: base.airVoids_max },
    { key: 'vma_min', label: 'VMA ต่ำสุด (%)', baseVal: base.vma_min },
    { key: unit === 'lbs' ? 'stabFlow_lbs001' : 'stabFlow_Nmm', label: `Stability/Flow ต่ำสุด (${unit}/0.01")`, baseVal: unit === 'lbs' ? base.stabFlow_lbs001 : base.stabFlow_Nmm },
    { key: 'strengthIndex_min', label: '% Strength Index ต่ำสุด', baseVal: base.strengthIndex_min },
    { key: 'acTolerance', label: 'AC Tolerance (±%)', baseVal: state.standard.jobMixTolerance.acContent },
  ];

  $('criteriaCard').innerHTML = `
    <h2>เกณฑ์ควบคุมเฉพาะโครงการ</h2>
    <div class="card-desc">ค่าเริ่มต้นมาจากมาตรฐาน ทล.-ม.408/2532 (ตารางที่ 3) — แก้ไขได้หากสัญญาจ้างกำหนดค่าที่เข้มกว่า</div>
    <div class="table-wrap">
      <table>
        <thead><tr><th style="text-align:right">รายการ</th><th>ค่ามาตรฐานอ้างอิง</th><th>ค่าที่ใช้จริงในโครงการ</th></tr></thead>
        <tbody>
          ${rows.map((r) => `
            <tr>
              <td style="text-align:right">${r.label}</td>
              <td>${fmt(r.baseVal, 2)}</td>
              <td><input type="number" step="any" data-crit="${r.key}" value="${c[r.key] ?? r.baseVal}" /></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  document.querySelectorAll('[data-crit]').forEach((el) => {
    el.addEventListener('change', () => {
      state.criteriaOverride[el.dataset.crit] = parseFloat(el.value);
      persist();
    });
  });
}
