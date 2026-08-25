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

/**
 * หาสัดส่วนกอง (Cold Bin) ที่ทำให้ขนาดคละรวมเข้าใกล้ envelope มาตรฐานมากที่สุด
 * ภายในขอบเขต min-max ของแต่ละกอง ด้วยวิธี local search (hill climbing + random restart)
 * bins: array ของ { gradation, min, max } — ไม่แก้ bins ต้นฉบับ คืนค่าสัดส่วนใหม่เป็น array
 */
function solveColdBinProportions(bins, envelope, sieveSizes, options = {}) {
  const n = bins.length;
  const mins = bins.map((b) => b.min ?? 0);
  const maxs = bins.map((b) => b.max ?? 100);
  const restarts = options.restarts ?? 25;
  const itersPerRestart = options.iterations ?? 800;

  if (mins.reduce((a, b) => a + b, 0) > 100.01 || maxs.reduce((a, b) => a + b, 0) < 99.99) {
    return { feasible: false, proportions: bins.map((b) => b.proportion ?? (mins[bins.indexOf(b)])), cost: Infinity };
  }

  function projectToSum100(values) {
    const v = values.slice();
    for (let pass = 0; pass < 60; pass++) {
      const sum = v.reduce((a, b) => a + b, 0);
      const diff = 100 - sum;
      if (Math.abs(diff) < 1e-6) break;
      const idxs = v.map((_, i) => i).filter((i) => (diff > 0 ? v[i] < maxs[i] - 1e-9 : v[i] > mins[i] + 1e-9));
      if (!idxs.length) break;
      const share = diff / idxs.length;
      idxs.forEach((i) => { v[i] = Math.min(maxs[i], Math.max(mins[i], v[i] + share)); });
    }
    return v;
  }

  function penalty(props) {
    const combined = combinedGradation(bins.map((b, i) => ({ proportion: props[i], gradation: b.gradation })), sieveSizes);
    let cost = 0;
    sieveSizes.forEach(({ mm }) => {
      const range = envelope[mm];
      if (!range) return;
      const v = combined[mm];
      if (v == null) return;
      if (v < range[0]) cost += (range[0] - v) ** 2;
      else if (v > range[1]) cost += (v - range[1]) ** 2;
    });
    return cost;
  }

  let best = null;
  let bestCost = Infinity;

  for (let r = 0; r < restarts; r++) {
    let current = r === 0
      ? projectToSum100(bins.map((b) => b.proportion ?? (mins[bins.indexOf(b)] + maxs[bins.indexOf(b)]) / 2))
      : projectToSum100(mins.map((mn, i) => mn + Math.random() * (maxs[i] - mn)));
    let currentCost = penalty(current);
    let step = 8;
    for (let iter = 0; iter < itersPerRestart; iter++) {
      const i = Math.floor(Math.random() * n);
      let j = Math.floor(Math.random() * n);
      if (j === i) j = (j + 1) % n;
      const maxDelta = Math.min(maxs[i] - current[i], current[j] - mins[j]);
      if (maxDelta <= 0) continue;
      const delta = Math.random() * Math.min(maxDelta, step);
      const candidate = current.slice();
      candidate[i] += delta;
      candidate[j] -= delta;
      const cost = penalty(candidate);
      if (cost < currentCost) {
        current = candidate;
        currentCost = cost;
      }
      if (iter % 100 === 99) step = Math.max(0.2, step * 0.7);
    }
    if (currentCost < bestCost) {
      bestCost = currentCost;
      best = current;
    }
  }

  return { feasible: true, proportions: best.map((v) => Math.round(v * 10) / 10), cost: bestCost };
}
