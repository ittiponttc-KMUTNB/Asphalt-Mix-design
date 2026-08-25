/**
 * ชุดข้อมูลตัวอย่างอ้างอิง สร้างจากรายงานผลออกแบบจริงของกรมทางหลวง
 * (วช.P-AC/245/2568, ชั้น Wearing Course, บจก.วนิชชัยก่อสร้าง (1979))
 * ตัวเลขที่ %AC = 5.0 (Design AC) ใช้ค่าที่ตีพิมพ์ในรายงานจริงทั้งหมด เพื่อยืนยันความถูกต้องของสูตรคำนวณ
 * ส่วนจุดทดลองอื่น (4.5, 5.5, 6.0, 6.5%) ประมาณจากกราฟในรายงาน ใช้เพื่อสาธิตการทำงานของโปรแกรมเท่านั้น
 */
function buildDemoProject() {
  const std = cloneStandardDefaults();

  const trialSpecs = [
    { ac: 4.5, gmbTarget: 2.365, vaTarget: 5.5, stabilityTarget: 2140, flow: 11.5 },
    { ac: 5.0, gmbTarget: 2.391, vaTarget: 3.9, stabilityTarget: 2280, flow: 12.7 },
    { ac: 5.5, gmbTarget: 2.398, vaTarget: 2.9, stabilityTarget: 2310, flow: 13.5 },
    { ac: 6.0, gmbTarget: 2.394, vaTarget: 2.3, stabilityTarget: 2300, flow: 15.0 },
    { ac: 6.5, gmbTarget: 2.383, vaTarget: 2.0, stabilityTarget: 2270, flow: 16.0 },
  ];

  const trials = trialSpecs.map((t) => {
    const weightAir = 1200;
    const volume = weightAir / t.gmbTarget;
    const weightSSD = weightAir + 2;
    const weightWater = weightSSD - volume;
    const factor = stabilityCorrectionFactor(volume);
    const measuredLoad = Math.round((t.stabilityTarget / factor) * 10) / 10;
    const gmm = Math.round((t.gmbTarget / (1 - t.vaTarget / 100)) * 1000) / 1000;

    const specimen = {
      weightAir, weightSSD,
      weightWater: Math.round(weightWater * 10) / 10,
      measuredLoad,
      flow: t.flow, // หน่วย 0.01" (flowUnit เริ่มต้นของชุดข้อมูลนี้)
    };
    return { pbByAgg: t.ac, gmm, specimens: [specimen, { ...specimen }, { ...specimen }] };
  });

  return {
    courseType: 'wearing_12_5',
    unit: 'lbs',
    flowUnit: '0.01in',
    gradationChartStyle: 'power045',
    gradationMode: 'compare',
    sampleLabel: 'วช.P-AC/245/2568',
    standard: std,
    criteria: {
      stability_lbs: 2200, stability_N: 9786,
      flow_min: 12, flow_max: 14,
      airVoids_min: 3.2, airVoids_max: 4.8,
      vma_min: 14,
      stabFlow_lbs001: 160, stabFlow_Nmm: 712,
      strengthIndex_min: 75,
      acTolerance: 0.3,
    },
    gradationSamples: [
      {
        id: 'S-01',
        name: 'Hot Bin ผสม (ตัวอย่างอ้างอิง)',
        inputMode: 'percent',
        gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 83.0, 9.5: 57.2, 4.75: 44.6, 2.36: 32.7, 1.18: 22.8, 0.6: 15.3, 0.3: 9.8, 0.15: 6.7, 0.075: 5.3 },
        retainedWeights: emptyRetainedWeights(),
        panWeight: null,
        min: 0, max: 0, proportion: 0,
      },
      {
        id: 'S-02',
        name: 'มวลรวมใหม่ (Virgin Aggregate)',
        inputMode: 'percent',
        gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 92.0, 9.5: 68.0, 4.75: 50.0, 2.36: 34.0, 1.18: 22.0, 0.6: 14.0, 0.3: 9.0, 0.15: 6.0, 0.075: 4.5 },
        retainedWeights: emptyRetainedWeights(),
        panWeight: null,
        min: 40, max: 80, proportion: 60,
      },
      {
        id: 'S-03',
        name: 'RAP (มวลรวมสกัดแล้ว)',
        inputMode: 'weight',
        gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 95.0, 9.5: 85.0, 4.75: 60.0, 2.36: 40.0, 1.18: 28.0, 0.6: 20.0, 0.3: 14.0, 0.15: 9.0, 0.075: 6.0 },
        retainedWeights: { 37.5: null, 25: null, 19: null, 12.5: 60, 9.5: 120, 4.75: 300, 2.36: 240, 1.18: 144, 0.6: 96, 0.3: 72, 0.15: 60, 0.075: 36 },
        panWeight: 72,
        min: 20, max: 60, proportion: 40,
      },
    ],
    aggregate: { gsb: 2.663, gb: 1.02, penetrationGrade: '40-50' },
    trials,
    moistureTest: {
      controlStability: [2280, 2260, 2300],
      conditionedStability: [1790, 1770, 1810],
    },
    designAC: 5.0,
    rapCalc: {
      ingredients: [
        { sampleId: 'S-02', proportion: 60, ownAC: 0 },
        { sampleId: 'S-03', proportion: 40, ownAC: 4.8 },
      ],
      targetTotalAC: 5.2,
      ra5Percent: 0.26,
      // ตัวอย่างสาธิตอ้างอิงสูตรที่ 3 (75% RAP) ทางหลวงหมายเลข 332 — ยืนยันสูตร Virgin AC = Target - RAPOldBinder - RA5
      batching: { specimenWeight: 1200, rapPercent: 75, rapOwnAC: 4.48, targetAC: 5.0, ra5Percent: 0.26 },
    },
  };
}
