/**
 * โมดูลออกแบบส่วนผสมมวลรวม (Aggregate Blend Design)
 * รองรับ 2 ระดับตามหน้างานจริง: Cold Bin (กองวัสดุ/สัดส่วนป้อนเข้าโรงผสม) และ Hot Bin (หลังคัดกรองในโรงผสม)
 */

// bins: array ของ { name, proportion (%), gradation: {sieveMm: %ผ่าน} }
// คืนค่า gradation รวม (Combined) ที่ทุกตะแกรง
function combinedGradation(bins, sieveSizes) {
  const combined = {};
  sieveSizes.forEach(({ mm }) => {
    let sum = 0;
    bins.forEach((bin) => {
      const passing = bin.gradation[mm];
      const prop = bin.proportion || 0;
      if (typeof passing === 'number') sum += (passing * prop) / 100;
    });
    combined[mm] = Math.round(sum * 10) / 10;
  });
  return combined;
}

// ตรวจว่า proportion รวมเป็น 100% หรือไม่ (tolerance เล็กน้อยจาก floating point)
function validateProportionSum(bins) {
  const sum = bins.reduce((a, b) => a + (b.proportion || 0), 0);
  return Math.abs(sum - 100) < 0.05;
}

// ตรวจว่า combined gradation อยู่ใน envelope หรือไม่ (envelope: {mm: [min,max] | null})
function checkEnvelope(combined, envelope) {
  const results = {};
  Object.keys(envelope).forEach((mm) => {
    const range = envelope[mm];
    if (!range) {
      results[mm] = null;
      return;
    }
    const value = combined[mm];
    results[mm] = {
      value,
      min: range[0],
      max: range[1],
      pass: value >= range[0] && value <= range[1],
    };
  });
  return results;
}

// สร้าง Tolerant Limit band จาก Desired gradation +- tolerance ตามตารางที่ 4
function toleranceBand(desired, sieveSizes) {
  const band = {};
  sieveSizes.forEach(({ mm }) => {
    const value = desired[mm];
    if (typeof value !== 'number') {
      band[mm] = null;
      return;
    }
    const tol = toleranceForSieve(mm);
    band[mm] = [Math.max(0, value - tol), Math.min(100, value + tol)];
  });
  return band;
}

// คำนวณ Bulk Specific Gravity ของมวลรวมผสม แบบถ่วงน้ำหนักตามสัดส่วน (วิธี Asphalt Institute)
// components: array ของ { proportion (%), bulkSG }
function combinedBulkSG(components) {
  const totalProportion = components.reduce((a, c) => a + (c.proportion || 0), 0);
  const sumRatio = components.reduce((a, c) => a + (c.proportion || 0) / (c.bulkSG || 1), 0);
  return totalProportion / sumRatio;
}

function combinedApparentSG(components) {
  const totalProportion = components.reduce((a, c) => a + (c.proportion || 0), 0);
  const sumRatio = components.reduce((a, c) => a + (c.proportion || 0) / (c.apparentSG || 1), 0);
  return totalProportion / sumRatio;
}
