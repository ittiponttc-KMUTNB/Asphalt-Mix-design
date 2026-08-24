/**
 * การหา Optimum Asphalt Content (OAC) ตามวิธี Asphalt Institute (MS-2)
 * OAC แนะนำ = ค่าเฉลี่ยของ %AC ที่ (1) Stability สูงสุด (2) Density/Unit Weight สูงสุด (3) Air Voids = ค่ากึ่งกลางช่วงที่กำหนด
 * ผู้ใช้สามารถปรับ Design AC สุดท้ายเองได้ (วิศวกรใช้ดุลยพินิจ ปัดเศษ และตรวจสอบให้ผ่านทุกเกณฑ์พร้อมกัน)
 */

// หาตำแหน่ง x ที่ f(x) ค่าสูงสุด ภายในช่วง [xMin,xMax] ด้วยการสุ่มตรวจละเอียด
function findMaxX(fitFn, xMin, xMax, steps = 2000) {
  let bestX = xMin;
  let bestY = -Infinity;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const y = fitFn(x);
    if (y > bestY) {
      bestY = y;
      bestX = x;
    }
  }
  return bestX;
}

// หาตำแหน่ง x ที่ f(x) = targetY (ค่าแรกที่พบเมื่อไล่จาก xMin ไป xMax)
function findXAtY(fitFn, targetY, xMin, xMax, steps = 4000) {
  let prevX = xMin;
  let prevY = fitFn(xMin);
  for (let i = 1; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    const y = fitFn(x);
    if ((prevY - targetY) * (y - targetY) <= 0 && prevY !== y) {
      // interpolate
      const t = (targetY - prevY) / (y - prevY);
      return prevX + t * (x - prevX);
    }
    prevX = x;
    prevY = y;
  }
  return null; // ไม่พบจุดตัดในช่วงที่กำหนด
}

/**
 * curves: { stability: fitFn, unitWeight: fitFn, airVoids: fitFn, vma: fitFn, vfa: fitFn, flow: fitFn }
 * acRange: [min,max] ของ %AC ทดลองทั้งหมด
 * targetAirVoids: ค่ากึ่งกลางช่วง Air Voids ตามเกณฑ์ (เช่น (3+5)/2 = 4)
 */
function suggestOAC(curves, acRange, targetAirVoids) {
  const [acMin, acMax] = acRange;
  const acAtMaxStability = findMaxX(curves.stability, acMin, acMax);
  const acAtMaxDensity = findMaxX(curves.unitWeight, acMin, acMax);
  const acAtTargetVa = findXAtY(curves.airVoids, targetAirVoids, acMin, acMax);

  const candidates = [acAtMaxStability, acAtMaxDensity, acAtTargetVa].filter((v) => v !== null);
  const oacSuggested = candidates.reduce((a, b) => a + b, 0) / candidates.length;

  return {
    acAtMaxStability,
    acAtMaxDensity,
    acAtTargetVa,
    oacSuggested,
  };
}

// ตรวจสอบค่าที่ %AC ที่เลือก (Design AC) เทียบกับเกณฑ์ตารางที่ 3 (คืนค่า pass/fail รายข้อ)
function checkAgainstCriteria(valuesAtOAC, criteria, unit = 'lbs') {
  const stabilitySpec = unit === 'lbs' ? criteria.stability_lbs : criteria.stability_N;
  const stabFlowSpec = unit === 'lbs' ? criteria.stabFlow_lbs001 : criteria.stabFlow_Nmm;

  const checks = [
    {
      label: 'Air Voids (%)',
      value: valuesAtOAC.airVoids,
      spec: `${criteria.airVoids_min} - ${criteria.airVoids_max}`,
      pass: valuesAtOAC.airVoids >= criteria.airVoids_min && valuesAtOAC.airVoids <= criteria.airVoids_max,
    },
    {
      label: 'VMA (%)',
      value: valuesAtOAC.vma,
      spec: `${criteria.vma_min} min`,
      pass: valuesAtOAC.vma >= criteria.vma_min,
    },
    {
      label: `Marshall Stability (${unit})`,
      value: valuesAtOAC.stabilityAvg,
      spec: `${stabilitySpec} min`,
      pass: valuesAtOAC.stabilityAvg >= stabilitySpec,
    },
    {
      label: 'Marshall Flow (0.01")',
      value: valuesAtOAC.flowAvg,
      spec: `${criteria.flow_min} - ${criteria.flow_max}`,
      pass: valuesAtOAC.flowAvg >= criteria.flow_min && valuesAtOAC.flowAvg <= criteria.flow_max,
    },
    {
      label: `Stability/Flow (${unit}/0.01")`,
      value: valuesAtOAC.stabilityFlowRatio,
      spec: `${stabFlowSpec} min`,
      pass: valuesAtOAC.stabilityFlowRatio >= stabFlowSpec,
    },
  ];
  if (typeof valuesAtOAC.strengthIndex === 'number') {
    checks.push({
      label: '% Strength Index',
      value: valuesAtOAC.strengthIndex,
      spec: `${criteria.strengthIndex_min} min`,
      pass: valuesAtOAC.strengthIndex >= criteria.strengthIndex_min,
    });
  }
  return checks;
}
