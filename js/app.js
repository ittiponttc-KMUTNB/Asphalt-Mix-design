/** แอปหลัก: state, การนำทาง, และการ render แต่ละแท็บ
 * ขอบเขต: เครื่องมือวิเคราะห์สำหรับงานวิจัย (ไม่มีข้อมูลโครงการ/รายงานราชการ)
 */

let state = null;
let activeTab = 'gradation';

function $(id) { return document.getElementById(id); }
function fmt(v, d = 2) { return v == null || Number.isNaN(v) ? '-' : Number(v).toFixed(d); }
function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}
function persist() { autosave(state); }

function emptySample() {
  const gradation = {};
  SIEVE_SIZES.forEach(({ mm }) => { gradation[mm] = null; });
  return gradation;
}

function emptyProject() {
  const std = cloneStandardDefaults();
  const criteria = { ...std.designCriteria.wearing_9_5 };
  return {
    courseType: 'wearing_9_5',
    unit: 'lbs',
    flowUnit: '0.01in',
    standard: std,
    criteria,
    gradationSamples: [{ name: 'ตัวอย่างที่ 1', gradation: emptySample() }],
    aggregate: { gsb: null, gb: 1.02, penetrationGrade: '60-70' },
    trials: [],
    moistureTest: { controlStability: [], conditionedStability: [] },
    designAC: null,
  };
}

function ensureCriteriaDefaults() {
  const base = state.standard.designCriteria[state.courseType];
  state.criteria = { ...base, ...(state.criteria || {}) };
  if (state.criteria.acTolerance == null) state.criteria.acTolerance = state.standard.jobMixTolerance.acContent;
}

function getCriteria() { return state.criteria; }
function getEnvelope() { return state.standard.gradationEnvelope[state.courseType]; }
function getACRange() { return state.standard.acContentRange[state.courseType]; }

function init() {
  const saved = loadAutosave();
  state = saved || buildDemoProject();
  ensureCriteriaDefaults();

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', () => switchTab(item.dataset.tab));
  });
  $('btnNewProject').addEventListener('click', () => {
    if (confirm('เริ่มชุดข้อมูลใหม่? ข้อมูลปัจจุบันที่ยังไม่ได้ export จะหายไป')) {
      state = emptyProject();
      persist();
      switchTab('gradation');
      showToast('เริ่มชุดข้อมูลใหม่แล้ว');
    }
  });
  $('btnLoadDemo').addEventListener('click', () => {
    state = buildDemoProject();
    ensureCriteriaDefaults();
    persist();
    switchTab('gradation');
    showToast('โหลดตัวอย่างอ้างอิงแล้ว');
  });
  $('btnSaveProject').addEventListener('click', () => {
    exportProjectAsFile(state, `mixdesign-data-${Date.now()}.json`);
    showToast('บันทึกไฟล์ข้อมูล (.json) แล้ว');
  });
  $('importFileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      state = await importProjectFromFile(file);
      ensureCriteriaDefaults();
      persist();
      switchTab('gradation');
      showToast('นำเข้าข้อมูลสำเร็จ');
    } catch (err) {
      showToast('นำเข้าไฟล์ไม่สำเร็จ: รูปแบบไฟล์ไม่ถูกต้อง');
    }
    e.target.value = '';
  });
  $('btnImportProject').addEventListener('click', () => $('importFileInput').click());

  switchTab('gradation');
}

const TAB_META = {
  gradation: ['วิเคราะห์ขนาดคละมวลรวม', 'เทียบขนาดคละกับช่วงมาตรฐาน พล็อตกราฟและ export ได้'],
  marshall: ['Marshall Test & Optimum Asphalt Content', 'คำนวณ Stability/Flow/Va/VMA/VFA และหา OAC พร้อม export'],
};

function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.nav-item').forEach((i) => i.classList.toggle('active', i.dataset.tab === tab));
  document.querySelectorAll('.tabs-content section').forEach((s) => s.classList.remove('active'));
  $(`tab-${tab}`).classList.add('active');
  const [title, desc] = TAB_META[tab];
  $('pageTitle').textContent = title;
  $('pageDesc').textContent = desc;
  $('courseBadge').textContent = COURSE_TYPES[state.courseType]?.label || '-';
  renderTab(tab);
}

function renderTab(tab) {
  if (tab === 'gradation') renderGradationTab();
  if (tab === 'marshall') renderMarshallTab();
}

function computeTrialResult(trial) {
  const gb = state.aggregate.gb;
  const gsb = state.aggregate.gsb;
  const specimens = trial.specimens.map((s) => ({ ...s, flow: flowToUnit001(s.flow, state.flowUnit) }));
  return calculateAtAcLevel({ pbByAgg: trial.pbByAgg, specimens, gmm: trial.gmm, gsb, gb });
}

function computeAllResults() {
  const gsb = state.aggregate.gsb;
  const gb = state.aggregate.gb;
  if (!gsb || !gb) return [];
  return state.trials
    .filter((t) => t.pbByAgg != null && t.gmm && t.specimens.some((s) => s.weightAir && s.weightSSD != null && s.weightWater != null))
    .map((t) => {
      try {
        return { ac: t.pbByAgg, ...computeTrialResult(t) };
      } catch (e) { return null; }
    })
    .filter(Boolean)
    .sort((a, b) => a.ac - b.ac);
}

document.addEventListener('DOMContentLoaded', init);
