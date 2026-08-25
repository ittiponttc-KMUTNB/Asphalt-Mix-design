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

function emptyRetainedWeights() {
  const w = {};
  SIEVE_SIZES.forEach(({ mm }) => { w[mm] = null; });
  return w;
}

function newGradationSample(id, name) {
  return {
    id, name, inputMode: 'percent', gradation: emptySample(), retainedWeights: emptyRetainedWeights(), panWeight: null,
    min: 0, max: 100, proportion: 0,
  };
}

/** ตัวอย่างฟิลเลอร์เพิ่มเติม (Table 2 ทล.-ม.408/2532: ผ่าน#30=100%, ผ่าน#50=75-100%, ผ่าน#200=55-100%) ใช้ค่ากึ่งกลางเป็นค่าเริ่มต้น แก้ไขได้ */
function newFillerSample(id) {
  const s = newGradationSample(id, 'E: ฟิลเลอร์เพิ่มเติม');
  s.min = 0; s.max = 10; s.proportion = 0;
  SIEVE_SIZES.forEach(({ mm }) => { s.gradation[mm] = mm >= 0.6 ? 100 : null; });
  s.gradation[0.3] = 87.5;
  s.gradation[0.15] = 80;
  s.gradation[0.075] = 77.5;
  return s;
}

/** คำนวณ % ผ่านตะแกรงจากน้ำหนักค้างตะแกรง (ASTM C136/AASHTO T27) แล้วเขียนทับ sample.gradation */
function recomputeGradationFromWeights(sample) {
  if (sample.inputMode !== 'weight') return;
  const total = SIEVE_SIZES.reduce((a, s) => a + (sample.retainedWeights[s.mm] || 0), 0) + (sample.panWeight || 0);
  if (!total) return;
  let cumulative = 0;
  SIEVE_SIZES.forEach(({ mm }) => { // เรียงใหญ่->เล็กอยู่แล้วใน SIEVE_SIZES
    cumulative += sample.retainedWeights[mm] || 0;
    sample.gradation[mm] = Math.round((100 - (cumulative / total) * 100) * 10) / 10;
  });
}

function nextSampleId() {
  const n = (state.gradationSamples?.length || 0) + 1;
  return `S-${String(n).padStart(2, '0')}`;
}

function emptyProject() {
  const std = cloneStandardDefaults();
  const criteria = { ...std.designCriteria.wearing_9_5 };
  return {
    courseType: 'wearing_9_5',
    unit: 'lbs',
    flowUnit: '0.01in',
    gradationChartStyle: 'power045',
    gradationMode: 'compare',
    sampleLabel: '',
    standard: std,
    criteria,
    gradationSamples: [newGradationSample('S-01', 'ตัวอย่างที่ 1')],
    aggregate: { gsb: null, gb: 1.02, penetrationGrade: '60-70' },
    trials: [],
    moistureTest: { controlStability: [], conditionedStability: [] },
    designAC: null,
    rapCalc: {
      ingredients: [],
      targetTotalAC: null,
      ra5Percent: 0,
      batching: { specimenWeight: 1200, rapPercent: null, rapOwnAC: null, targetAC: null, ra5Percent: null },
    },
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
  rap: ['ตัวช่วยคำนวณมิกซ์ RAP', 'ผสมขนาดคละและคำนวณ %AC รวม เมื่อใช้ RAP แทนมวลรวมบางส่วน'],
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
  if (tab === 'rap') renderRapTab();
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
