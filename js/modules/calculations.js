/**
 * สูตรคำนวณหลักของ Marshall Mix Design (Asphalt Institute MS-2 / AASHTO T245 / ASTM D6927)
 * หมายเหตุนิยาม: Pb ในฟอร์มกรมทางหลวงคือ "ร้อยละแอสฟัลท์โดยน้ำหนักของมวลรวม" (by wt. of agg.)
 * ต้องแปลงเป็น "ร้อยละโดยน้ำหนักของส่วนผสมทั้งหมด" (by wt. of total mix) ก่อนใช้สูตรมาตรฐาน
 */

// แปลง %AC โดยน้ำหนักมวลรวม -> %AC โดยน้ำหนักส่วนผสมรวม
function pbByTotalMix(pbByAgg) {
  return (100 * pbByAgg) / (100 + pbByAgg);
}

// Gse: Effective Specific Gravity ของมวลรวม จาก Gmm ที่วัดได้ (Rice Test)
// Pb = % โดยน้ำหนักส่วนผสมรวม, Gmm = ค่าที่วัดได้จาก Rice test ที่ %AC นั้น
function effectiveSpecificGravity(gmm, pbTotal, gb) {
  const ps = 100 - pbTotal;
  return ps / (100 / gmm - pbTotal / gb);
}

// Pba: ปริมาณแอสฟัลท์ที่มวลรวมดูดซับ (% โดยน้ำหนักมวลรวม)
function absorbedAsphalt(gse, gsb, gb) {
  return (100 * (gse - gsb) * gb) / (gsb * gse);
}

// Gmm คำนวณ (กรณีไม่ได้วัด Rice test ทุกจุด) จาก Gse คงที่ + Pb ของแต่ละจุด
function calculatedGmm(pbTotal, gse, gb) {
  const ps = 100 - pbTotal;
  return 100 / (ps / gse + pbTotal / gb);
}

// Air Voids (Va) %
function airVoids(gmm, gmb) {
  return (100 * (gmm - gmb)) / gmm;
}

// VMA % : Ps = % มวลรวมโดยน้ำหนักส่วนผสมรวม, Gsb = bulk sp.gr. มวลรวมผสม
function vma(gmb, ps, gsb) {
  return 100 - (gmb * ps) / gsb;
}

// VFA / VFB %
function vfa(vmaValue, vaValue) {
  return (100 * (vmaValue - vaValue)) / vmaValue;
}

// Bulk specific gravity ของตัวอย่างบดอัด (SSD method)
function bulkSpecificGravity(weightAir, weightSSD, weightWater) {
  return weightAir / (weightSSD - weightWater);
}

// ปริมาตรตัวอย่าง (cm3) จากวิธี SSD
function specimenVolume(weightSSD, weightWater) {
  return weightSSD - weightWater;
}

// Marshall Stability ที่แก้ค่าแล้ว = load วัดได้ x correction factor
function correctedStability(measuredLoad, correctionFactor) {
  return measuredLoad * correctionFactor;
}

// เฉลี่ยแบบตัดค่าผิดปกติอย่างง่าย (ไม่ใช้ในเวอร์ชันแรก แต่เผื่อขยาย)
function average(arr) {
  const valid = arr.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (!valid.length) return NaN;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

/**
 * คำนวณผลลัพธ์ครบชุดสำหรับหนึ่งระดับ %AC (ทดลอง)
 * specimens: array ของ { weightAir, weightSSD, weightWater, measuredLoad, flow }
 * gmm: ค่า Gmm ที่ %AC นี้ (วัดจาก Rice test หรือคำนวณ)
 * gsb: Bulk Sp.Gr. มวลรวมผสม, gb: Sp.Gr. ยางแอสฟัลท์
 */
function calculateAtAcLevel({ pbByAgg, specimens, gmm, gsb, gb }) {
  const pbTotal = pbByTotalMix(pbByAgg);
  const ps = 100 - pbTotal;

  const perSpecimen = specimens.map((sp) => {
    const gmb = bulkSpecificGravity(sp.weightAir, sp.weightSSD, sp.weightWater);
    const volume = specimenVolume(sp.weightSSD, sp.weightWater);
    const factor = sp.correctionFactor ?? stabilityCorrectionFactor(volume);
    const stability = correctedStability(sp.measuredLoad, factor);
    return { gmb, volume, correctionFactor: factor, correctedStability: stability, flow: sp.flow };
  });

  const gmbAvg = average(perSpecimen.map((s) => s.gmb));
  const stabilityAvg = average(perSpecimen.map((s) => s.correctedStability));
  const flowAvg = average(perSpecimen.map((s) => s.flow));

  const va = airVoids(gmm, gmbAvg);
  const vmaValue = vma(gmbAvg, ps, gsb);
  const vfaValue = vfa(vmaValue, va);
  const stabilityFlowRatio = stabilityAvg / flowAvg;
  const gse = effectiveSpecificGravity(gmm, pbTotal, gb);
  const pba = absorbedAsphalt(gse, gsb, gb);

  return {
    pbByAgg,
    pbTotal,
    perSpecimen,
    gmbAvg,
    gmmUsed: gmm,
    percentGmm: (100 * gmbAvg) / gmm,
    stabilityAvg,
    flowAvg,
    stabilityFlowRatio,
    airVoids: va,
    vma: vmaValue,
    vfa: vfaValue,
    gse,
    pba,
    unitWeight: gmbAvg, // g/mL แสดงเป็นความหนาแน่นโดยตรง (เทียบเท่า Gmb เมื่ออ้างอิงน้ำ 1.000 g/mL)
  };
}

// Index of Retained Strength / Percent Strength Index (ทดสอบความคงทนต่อน้ำ)
function percentStrengthIndex(stabilityConditionedAvg, stabilityControlAvg) {
  return (100 * stabilityConditionedAvg) / stabilityControlAvg;
}

// สร้าง polynomial regression (least squares) degree ที่กำหนด สำหรับ fit เส้นกราฟ
function polynomialRegression(xs, ys, degree) {
  const n = xs.length;
  const X = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let p = 0; p <= degree; p++) row.push(Math.pow(xs[i], p));
    X.push(row);
  }
  // Normal equations: (X^T X) beta = X^T y
  const XtX = [];
  for (let i = 0; i <= degree; i++) {
    XtX.push(new Array(degree + 1).fill(0));
    for (let j = 0; j <= degree; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) sum += X[k][i] * X[k][j];
      XtX[i][j] = sum;
    }
  }
  const Xty = new Array(degree + 1).fill(0);
  for (let i = 0; i <= degree; i++) {
    let sum = 0;
    for (let k = 0; k < n; k++) sum += X[k][i] * ys[k];
    Xty[i] = sum;
  }
  const beta = solveLinearSystem(XtX, Xty);
  return (x) => beta.reduce((acc, b, p) => acc + b * Math.pow(x, p), 0);
}

function solveLinearSystem(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    const pivotVal = M[col][col];
    if (Math.abs(pivotVal) < 1e-12) continue;
    for (let c = col; c <= n; c++) M[col][c] /= pivotVal;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row) => row[n]);
}
