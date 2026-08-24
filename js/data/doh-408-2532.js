/**
 * ค่ามาตรฐานอ้างอิงจาก มาตรฐานกรมทางหลวง ทล.-ม. 408/2532 (Asphalt Concrete)
 * หมายเหตุ: ค่าทั้งหมดเป็น "ค่าเริ่มต้น" ที่ผู้ใช้สามารถแก้ไขได้ในโปรแกรม
 * เนื่องจากมาตรฐานอาจมีการปรับปรุง หรือสัญญาจ้างอาจกำหนดเกณฑ์ที่เข้มกว่ามาตรฐานพื้นฐาน
 */

// ---- ตารางที่ 1: ขนาดคละของมวลรวมและปริมาณแอสฟัลท์ซีเมนต์ที่ใช้ ----
const COURSE_TYPES = {
  wearing_9_5: { label: 'Wearing Course (ขนาดใหญ่สุด 9.5 มม.)', nominalSize: 9.5, thickness: '25-35 มม.' },
  wearing_12_5: { label: 'Wearing Course (ขนาดใหญ่สุด 12.5 มม.)', nominalSize: 12.5, thickness: '40-70 มม.' },
  binder_19: { label: 'Binder Course (ขนาดใหญ่สุด 19.0 มม.)', nominalSize: 19.0, thickness: '40-80 มม.' },
  base_25: { label: 'Base Course (ขนาดใหญ่สุด 25.0 มม.)', nominalSize: 25.0, thickness: '70-100 มม.' },
  shoulder: { label: 'Shoulder (อ้างอิงขนาดคละแบบ Base Course)', nominalSize: 25.0, thickness: '-' },
};

// ลำดับตะแกรงมาตรฐาน (มม.) พร้อมชื่อเรียก
const SIEVE_SIZES = [
  { mm: 37.5, label: '1 1/2"' },
  { mm: 25.0, label: '1"' },
  { mm: 19.0, label: '3/4"' },
  { mm: 12.5, label: '1/2"' },
  { mm: 9.5, label: '3/8"' },
  { mm: 4.75, label: '#4' },
  { mm: 2.36, label: '#8' },
  { mm: 1.18, label: '#16' },
  { mm: 0.6, label: '#30' },
  { mm: 0.3, label: '#50' },
  { mm: 0.15, label: '#100' },
  { mm: 0.075, label: '#200' },
];

// ช่วงขนาดคละที่ยอมให้ (ร้อยละผ่านตะแกรงโดยมวล) ต่อชั้นทาง — ค่า null = ไม่กำหนด
const GRADATION_ENVELOPE = {
  wearing_9_5: {
    37.5: null, 25.0: null, 19.0: null, 12.5: [100, 100], 9.5: [90, 100],
    4.75: [55, 85], 2.36: [32, 67], 1.18: null, 0.6: null, 0.3: [7, 23], 0.15: null, 0.075: [2, 10],
  },
  wearing_12_5: {
    37.5: null, 25.0: null, 19.0: [100, 100], 12.5: [80, 100], 9.5: null,
    4.75: [44, 74], 2.36: [28, 58], 1.18: null, 0.6: null, 0.3: [5, 21], 0.15: null, 0.075: [2, 10],
  },
  binder_19: {
    37.5: null, 25.0: [100, 100], 19.0: [90, 100], 12.5: null, 9.5: [56, 80],
    4.75: [35, 65], 2.36: [23, 49], 1.18: null, 0.6: null, 0.3: [5, 19], 0.15: null, 0.075: [2, 8],
  },
  base_25: {
    37.5: [100, 100], 25.0: [90, 100], 19.0: null, 12.5: [56, 80], 9.5: null,
    4.75: [29, 59], 2.36: [19, 45], 1.18: null, 0.6: null, 0.3: [5, 17], 0.15: null, 0.075: [1, 7],
  },
};
GRADATION_ENVELOPE.shoulder = GRADATION_ENVELOPE.base_25;

// ช่วงปริมาณแอสฟัลท์ซีเมนต์ (ร้อยละโดยมวลของมวลรวม)
const AC_CONTENT_RANGE = {
  wearing_9_5: [4.0, 8.0],
  wearing_12_5: [3.0, 7.0],
  binder_19: [3.0, 6.5],
  base_25: [3.0, 6.0],
  shoulder: [3.0, 6.0],
};

// ---- ตารางที่ 2: ขนาดคละของวัสดุผสมแทรก (Filler) ----
const FILLER_GRADATION = {
  0.6: [100, 100],
  0.3: [75, 100],
  0.075: [55, 100],
};

// ---- ตารางที่ 3: ข้อกำหนดในการออกแบบแอสฟัลท์คอนกรีต ----
// หน่วยคู่: SI (N, mm) และหน่วยที่ใช้จริงในแลบไทยส่วนใหญ่ (lbs, 0.01")
const DESIGN_CRITERIA = {
  wearing_9_5: { blows: 75, stability_N: 8006, stability_lbs: 1800, flow_min: 8, flow_max: 16, airVoids_min: 3, airVoids_max: 5, vma_min: 15, stabFlow_Nmm: 712, stabFlow_lbs001: 160, strengthIndex_min: 75 },
  wearing_12_5: { blows: 75, stability_N: 8006, stability_lbs: 1800, flow_min: 8, flow_max: 16, airVoids_min: 3, airVoids_max: 5, vma_min: 14, stabFlow_Nmm: 712, stabFlow_lbs001: 160, strengthIndex_min: 75 },
  binder_19: { blows: 75, stability_N: 8006, stability_lbs: 1800, flow_min: 8, flow_max: 16, airVoids_min: 3, airVoids_max: 6, vma_min: 13, stabFlow_Nmm: 712, stabFlow_lbs001: 160, strengthIndex_min: 75 },
  base_25: { blows: 75, stability_N: 7117, stability_lbs: 1600, flow_min: 8, flow_max: 16, airVoids_min: 3, airVoids_max: 6, vma_min: 12, stabFlow_Nmm: 645, stabFlow_lbs001: 145, strengthIndex_min: 75 },
  shoulder: { blows: 50, stability_N: 7117, stability_lbs: 1600, flow_min: 8, flow_max: 16, airVoids_min: 3, airVoids_max: 5, vma_min: 14, stabFlow_Nmm: 645, stabFlow_lbs001: 145, strengthIndex_min: 75 },
};

// ---- ตารางที่ 4: เกณฑ์ความคลาดเคลื่อนที่ยอมให้สำหรับสูตรส่วนผสมเฉพาะงาน (Job-Mix Tolerance) ----
// key = ขนาดตะแกรง (มม.) ที่เป็นจุดแบ่งช่วง, value = ±ร้อยละ
const JOB_MIX_TOLERANCE = {
  ge_2_36: 5,     // 2.36 มม. (เบอร์ 8) และขนาดใหญ่กว่า
  mid_1_18_to_0_3: 4, // 1.18, 0.600, 0.300 มม.
  size_0_15: 3,   // 0.150 มม. (เบอร์ 100)
  size_0_075: 2,  // 0.075 มม. (เบอร์ 200)
  acContent: 0.3, // ปริมาณแอสฟัลท์ ± ร้อยละ
};

function toleranceForSieve(mm) {
  if (mm >= 2.36) return JOB_MIX_TOLERANCE.ge_2_36;
  if (mm === 1.18 || mm === 0.6 || mm === 0.3) return JOB_MIX_TOLERANCE.mid_1_18_to_0_3;
  if (mm === 0.15) return JOB_MIX_TOLERANCE.size_0_15;
  if (mm === 0.075) return JOB_MIX_TOLERANCE.size_0_075;
  return 0;
}

// ---- Marshall Stability Correction Factor (ตามปริมาตรตัวอย่าง, มาตรฐาน 4" diameter) ----
// อ้างอิงตาราง correlation ratio ทั่วไป (Asphalt Institute MS-2 / ASTM D6927)
// volume in cm3 range -> correction factor
const STABILITY_CORRECTION_TABLE = [
  { min: 200, max: 213, factor: 5.56 },
  { min: 214, max: 225, factor: 5.00 },
  { min: 226, max: 237, factor: 4.55 },
  { min: 238, max: 250, factor: 4.17 },
  { min: 251, max: 264, factor: 3.85 },
  { min: 265, max: 276, factor: 3.57 },
  { min: 277, max: 289, factor: 3.33 },
  { min: 290, max: 301, factor: 3.03 },
  { min: 302, max: 316, factor: 2.78 },
  { min: 317, max: 328, factor: 2.50 },
  { min: 329, max: 340, factor: 2.27 },
  { min: 341, max: 353, factor: 2.08 },
  { min: 354, max: 367, factor: 1.92 },
  { min: 368, max: 379, factor: 1.79 },
  { min: 380, max: 392, factor: 1.67 },
  { min: 393, max: 405, factor: 1.56 },
  { min: 406, max: 420, factor: 1.47 },
  { min: 421, max: 431, factor: 1.39 },
  { min: 432, max: 443, factor: 1.32 },
  { min: 444, max: 456, factor: 1.25 },
  { min: 457, max: 470, factor: 1.19 },
  { min: 471, max: 482, factor: 1.14 },
  { min: 483, max: 495, factor: 1.09 },
  { min: 496, max: 508, factor: 1.04 },
  { min: 509, max: 522, factor: 1.00 },
  { min: 523, max: 535, factor: 0.96 },
  { min: 536, max: 546, factor: 0.93 },
  { min: 547, max: 559, factor: 0.89 },
  { min: 560, max: 573, factor: 0.86 },
  { min: 574, max: 585, factor: 0.83 },
  { min: 586, max: 598, factor: 0.81 },
  { min: 599, max: 610, factor: 0.78 },
  { min: 611, max: 625, factor: 0.76 },
];

function stabilityCorrectionFactor(volumeCm3) {
  const row = STABILITY_CORRECTION_TABLE.find((r) => volumeCm3 >= r.min && volumeCm3 <= r.max);
  if (row) return row.factor;
  if (volumeCm3 < STABILITY_CORRECTION_TABLE[0].min) return STABILITY_CORRECTION_TABLE[0].factor;
  return STABILITY_CORRECTION_TABLE[STABILITY_CORRECTION_TABLE.length - 1].factor;
}

// deep clone helper สำหรับให้แต่ละโปรเจกต์แก้ไขค่าเริ่มต้นได้โดยไม่กระทบต้นฉบับ
function cloneStandardDefaults() {
  return JSON.parse(JSON.stringify({
    courseTypes: COURSE_TYPES,
    gradationEnvelope: GRADATION_ENVELOPE,
    acContentRange: AC_CONTENT_RANGE,
    fillerGradation: FILLER_GRADATION,
    designCriteria: DESIGN_CRITERIA,
    jobMixTolerance: JOB_MIX_TOLERANCE,
  }));
}
