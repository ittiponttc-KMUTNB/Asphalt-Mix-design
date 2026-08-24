/** แอปหลัก: state, การนำทาง, และการ render แต่ละแท็บ */

let state = null;
let activeTab = 'project';

function $(id) { return document.getElementById(id); }
function fmt(v, d = 2) { return v == null || Number.isNaN(v) ? '-' : Number(v).toFixed(d); }
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
function persist() { autosave(state); }

function emptyProject() {
  const std = cloneStandardDefaults();
  return {
    meta: {
      projectName: '', highwaySection: '', contractNo: '', testNo: '', sourceOfMaterial: '',
      mixingPlant: '', sampleOwner: '', designer: '', officeName: '', dateReceived: '',
      courseType: 'wearing_9_5', unit: 'lbs', testMethod: 'Marshall Test 75 blows',
    },
    standard: std,
    criteriaOverride: {},
    coldBin: { bins: [{ name: 'Bin 1', proportion: 100, gradation: {} }] },
    hotBin: { bins: [{ name: 'Hot Bin 1', proportion: 100, gradation: {} }] },
    aggregateProperties: {
      fractions: [{ name: 'Hot Bin 1', bulkSG: null, apparentSG: null, waterAbsorption: null, flakiness: null, elongation: null }],
      combined: { bulkSG: null, apparentSG: null, effectiveSG: null },
      quality: {},
    },
    asphalt: { penetrationGrade: '60-70', specificGravity: 1.02 },
    trials: [],
    moistureTest: { controlStability: [], conditionedStability: [] },
    designAC: null,
  };
}

function getCriteria() {
  const base = state.standard.designCriteria[state.meta.courseType];
  return { ...base, ...(state.criteriaOverride || {}) };
}
function getEnvelope() { return state.standard.gradationEnvelope[state.meta.courseType]; }
function getACRange() { return state.standard.acContentRange[state.meta.courseType]; }

function init() {
  const saved = loadAutosave();
  state = saved || buildDemoProject();
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });
  $('btnNewProject').addEventListener('click', () => {
    if (confirm('เริ่มโปรเจกต์ใหม่? ข้อมูลปัจจุบันที่ยังไม่บันทึกจะหายไป')) {
      state = emptyProject();
      persist();
      switchTab('project');
      showToast('เริ่มโปรเจกต์ใหม่แล้ว');
    }
  });
  $('btnLoadDemo').addEventListener('click', () => {
    state = buildDemoProject();
    persist();
    switchTab('project');
    showToast('โหลดตัวอย่างอ้างอิงแล้ว');
  });
  $('btnSaveProject').addEventListener('click', () => {
    const name = state.meta.testNo || state.meta.projectName || `project-${Date.now()}`;
    saveProjectToLibrary(name, state);
    showToast(`บันทึกโปรเจกต์ "${name}" แล้ว`);
  });
  switchTab('project');
}

const TAB_META = {
  project: ['ข้อมูลโครงการ', 'กรอกข้อมูลพื้นฐานของโครงการและเลือกชั้นทางที่จะออกแบบ'],
  gradation: ['ออกแบบขนาดคละมวลรวม', 'กำหนดสัดส่วนผสม Cold Bin และ Hot Bin เทียบกับช่วงมาตรฐาน'],
  aggregate: ['คุณสมบัติมวลรวมและยางแอสฟัลท์', 'ค่าความถ่วงจำเพาะและคุณภาพมวลรวมแต่ละส่วน'],
  specimen: ['ข้อมูล Marshall Specimen', 'กรอกผลทดสอบตัวอย่างที่ %AC ต่างๆ'],
  results: ['ผลลัพธ์และการหา OAC', 'กราฟความสัมพันธ์และปริมาณแอสฟัลท์ที่เหมาะสม'],
  report: ['รายงาน / Export', 'สรุปผล Job-Mix Formula พร้อมพิมพ์หรือส่งออก'],
};

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.nav-item').forEach((i) => i.classList.toggle('active', i.dataset.tab === tab));
  document.querySelectorAll('.tabs-content section').forEach((s) => s.classList.remove('active'));
  $(`tab-${tab}`).classList.add('active');
  const [title, desc] = TAB_META[tab];
  $('pageTitle').textContent = title;
  $('pageDesc').textContent = desc;
  $('courseBadge').textContent = COURSE_TYPES[state.meta.courseType]?.label || '-';
  renderTab(tab);
}

function renderTab(tab) {
  if (tab === 'project') renderProjectTab();
  if (tab === 'gradation') renderGradationTab();
  if (tab === 'aggregate') renderAggregateTab();
  if (tab === 'specimen') renderSpecimenTab();
  if (tab === 'results') renderResultsTab();
  if (tab === 'report') renderReportTab();
}

function computeTrialResult(trial) {
  const gb = state.asphalt.specificGravity;
  const gsb = state.aggregateProperties.combined.bulkSG;
  return calculateAtAcLevel({ pbByAgg: trial.pbByAgg, specimens: trial.specimens, gmm: trial.gmm, gsb, gb });
}

function computeAllResults() {
  const gsb = state.aggregateProperties.combined.bulkSG;
  const gb = state.asphalt.specificGravity;
  if (!gsb || !gb) return [];
  return state.trials
    .filter((t) => t.pbByAgg != null && t.gmm && t.specimens.some((s) => s.weightAir && s.weightSSD != null && s.weightWater != null))
    .map((t) => {
      try {
        const r = computeTrialResult(t);
        return { ac: t.pbByAgg, ...r };
      } catch (e) { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => a.ac - b.ac);
}

document.addEventListener('DOMContentLoaded', init);
