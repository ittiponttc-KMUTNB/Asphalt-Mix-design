/**
 * ชุดข้อมูลตัวอย่างอ้างอิง สร้างจากรายงานผลออกแบบจริงของกรมทางหลวง
 * (วช.P-AC/245/2568, สัญญาที่ ชบ.2/44/2568, ชั้น Wearing Course, บจก.วนิชชัยก่อสร้าง (1979))
 * ตัวเลขที่ %AC = 5.0 (Design AC) ใช้ค่าที่ตีพิมพ์ในรายงานจริงทั้งหมด เพื่อยืนยันความถูกต้องของสูตรคำนวณ
 * ส่วนจุดทดลองอื่น (4.5, 5.5, 6.0, 6.5%) ประมาณจากกราฟในรายงาน ใช้เพื่อสาธิตการทำงานของโปรแกรมเท่านั้น
 */
function buildDemoProject() {
  const std = cloneStandardDefaults();

  // ---- น้ำหนักตัวอย่างสังเคราะห์ (weightAir คงที่ 1200 g) ที่คำนวณย้อนกลับให้ได้ Gmb/Stability ตรงกับค่าที่รายงานจริง/กราฟ ----
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
      weightAir,
      weightSSD,
      weightWater: Math.round(weightWater * 10) / 10,
      measuredLoad,
      flow: t.flow,
    };
    return {
      pbByAgg: t.ac,
      gmmMode: 'input',
      gmm,
      specimens: [specimen, { ...specimen }, { ...specimen }],
    };
  });

  return {
    meta: {
      projectName: 'งานจ้างเหมาทำงานปรับปรุงผิวทางแอสฟัลต์คอนกรีตเดิม นำกลับมาใช้ใหม่ (IN PLANT)',
      highwaySection: 'ทางหลวงหมายเลข 332 ตอน เขาหาดยาว - ทุ่งโปร่ง ตอน 3 ระหว่าง กม.6+000 - กม.7+080 LT,RT',
      contractNo: 'ชบ.2/44/2568',
      testNo: 'วช.P-AC/245/2568',
      sourceOfMaterial: 'หินฝุ่น, หิน 3/8" และหิน 3/4" จาก โรงโม่หิน บจก.สานนท์ ต.หน้าพระลาน อ.เฉลิมพระเกียรติ จ.สระบุรี',
      mixingPlant: 'Plant บจก.วนิชชัยก่อสร้าง (1979) ต.พลูตาหลวง อ.สัตหีบ จ.ชลบุรี',
      sampleOwner: 'บจก.วนิชชัยก่อสร้าง (1979)',
      designer: 'วราวิทย์ คิดส่า',
      officeName: 'สำนักงานทางหลวงที่ 14 (ชลบุรี) กรมทางหลวง',
      dateReceived: '2568-09-09',
      courseType: 'wearing_12_5',
      unit: 'lbs',
      testMethod: 'Marshall Test 75 blows',
    },
    standard: std,
    // เกณฑ์ควบคุมเฉพาะโครงการนี้ (override จากค่ามาตรฐานพื้นฐาน ตามที่ระบุในหนังสือแจ้งผลจริง)
    criteriaOverride: {
      stability_lbs: 2200,
      stability_N: 9786,
      flow_min: 12,
      flow_max: 14,
      airVoids_min: 3.2,
      airVoids_max: 4.8,
      vma_min: 14,
      stabFlow_lbs001: 160,
      stabFlow_Nmm: 712,
      strengthIndex_min: 75,
      density_min: 2.379,
      density_max: 2.397,
      acTolerance: 0.3,
    },
    coldBin: {
      bins: [
        { name: 'Bin 1 (หินฝุ่น)', proportion: 45, gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 100, 9.5: 100, 4.75: 97.1, 2.36: 75.3, 1.18: 51.8, 0.6: 35.2, 0.3: 24.0, 0.15: 17.6, 0.075: 13.4 } },
        { name: 'Bin 2 (หิน 3/8")', proportion: 30, gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 100, 9.5: 100, 4.75: 43.5, 2.36: 13.8, 1.18: 8.2, 0.6: 5.4, 0.3: null, 0.15: null, 0.075: null } },
        { name: 'Bin 3 (หิน 3/4")', proportion: 25, gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 26.5, 9.5: 2.5, 4.75: 0.5, 2.36: 0.3, 1.18: null, 0.6: null, 0.3: null, 0.15: null, 0.075: null } },
      ],
    },
    hotBin: {
      bins: [
        { name: 'Hot Bin 1 (Filler รวม)', proportion: 42, gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 100, 9.5: 100, 4.75: 97.0, 2.36: 77.3, 1.18: 54.3, 0.6: 36.3, 0.3: 23.4, 0.15: 15.9, 0.075: 12.5 } },
        { name: 'Hot Bin 2', proportion: 20, gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 88.4, 9.5: 35.3, 4.75: 16.0, 2.36: 1.1, 1.18: 0.2, 0.6: 0.2, 0.3: 0, 0.15: 0, 0.075: 0 } },
        { name: 'Hot Bin 3', proportion: 18, gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 25.2, 9.5: 0.7, 4.75: 0.4, 2.36: 0.2, 1.18: 0, 0.6: 0, 0.3: 0, 0.15: 0, 0.075: 0 } },
        { name: 'Hot Bin 4', proportion: 20, gradation: { 37.5: 100, 25: 100, 19: 100, 12.5: 94.0, 9.5: 40.0, 4.75: 3.0, 2.36: 0, 1.18: 0, 0.6: 0, 0.3: 0, 0.15: 0, 0.075: 0 } },
      ],
    },
    aggregateProperties: {
      fractions: [
        { name: 'Filler', bulkSG: null, apparentSG: 2.645, waterAbsorption: null, flakiness: null, elongation: null },
        { name: 'Hot Bin 1', bulkSG: 2.622, apparentSG: 2.705, waterAbsorption: 1.16, flakiness: null, elongation: null },
        { name: 'Hot Bin 2', bulkSG: 2.668, apparentSG: 2.733, waterAbsorption: 0.88, flakiness: 40.6, elongation: 26.1 },
        { name: 'Hot Bin 3', bulkSG: 2.692, apparentSG: 2.736, waterAbsorption: 0.60, flakiness: 25.7, elongation: 11.4 },
        { name: 'Hot Bin 4', bulkSG: 2.713, apparentSG: 2.741, waterAbsorption: 0.38, flakiness: 13.5, elongation: 8.8 },
      ],
      combined: { bulkSG: 2.663, apparentSG: 2.720, effectiveSG: 2.679 },
      quality: {
        laAbrasion_34: 22.0,
        soundness_34: 0.3,
        soundness_fine: 2.1,
        sandEquivalent_fine: 63,
        sandEquivalent_hotbin1: 67,
        flakinessIndex: 24.4,
        elongationIndex: 14.1,
      },
    },
    asphalt: {
      penetrationGrade: '40-50',
      specificGravity: 1.02,
    },
    trials,
    moistureTest: {
      controlStability: [2280, 2260, 2300],
      conditionedStability: [1790, 1770, 1810],
    },
    designAC: 5.0,
  };
}
