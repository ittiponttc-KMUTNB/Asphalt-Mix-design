/** ตัวช่วยสร้างกราฟด้วย Chart.js (โหลดแบบ offline จาก lib/chart.umd.min.js) */

const chartInstances = {};

function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}

function makeCurvePoints(fitFn, xMin, xMax, steps = 60) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    pts.push({ x, y: fitFn(x) });
  }
  return pts;
}

/**
 * วาดกราฟ scatter จุดข้อมูลจริง + เส้น fit โค้ง + เส้นอ่านค่าที่ Design AC (แนวตั้ง/แนวนอน)
 */
function drawMarshallChart(canvasId, { title, yLabel, dataPoints, fitFn, xRange, designAC, color = '#2563eb' }) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext('2d');
  const curvePts = fitFn ? makeCurvePoints(fitFn, xRange[0], xRange[1]) : [];

  const datasets = [
    {
      label: 'ข้อมูลทดสอบ',
      data: dataPoints,
      showLine: false,
      pointRadius: 4,
      pointBackgroundColor: color,
      pointBorderColor: color,
    },
  ];
  if (curvePts.length) {
    datasets.push({
      label: 'เส้นโค้ง Fit',
      data: curvePts,
      showLine: true,
      borderColor: color,
      backgroundColor: 'transparent',
      pointRadius: 0,
      tension: 0.35,
      borderWidth: 2,
    });
  }
  if (designAC != null && fitFn) {
    const yAtDesign = fitFn(designAC);
    datasets.push({
      label: `Design AC = ${designAC}%`,
      data: [
        { x: designAC, y: 0 },
        { x: designAC, y: yAtDesign },
      ],
      showLine: true,
      borderColor: '#94a3b8',
      borderDash: [4, 4],
      pointRadius: 0,
      borderWidth: 1.5,
    });
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: !!title, text: title, color: '#1e293b', font: { size: 13, weight: '600' } },
        legend: { display: false },
      },
      scales: {
        x: {
          title: { display: true, text: '% Asphalt Cement (by wt. of Agg.)' },
          min: xRange[0],
          max: xRange[1],
          grid: { color: '#e2e8f0' },
        },
        y: {
          title: { display: true, text: yLabel },
          grid: { color: '#e2e8f0' },
        },
      },
    },
  });
}

const SAMPLE_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];

/** เปรียบเทียบหลายตัวอย่างขนาดคละในกราฟเดียว พร้อมแถบ envelope มาตรฐาน */
function drawGradationCompareChart(canvasId, { samples, envelope, sieveSizes }) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext('2d');
  const p045 = (mm) => Math.pow(mm, 0.45);

  const upperPts = [];
  const lowerPts = [];
  sieveSizes.forEach(({ mm }) => {
    const range = envelope[mm];
    if (range) {
      upperPts.push({ x: p045(mm), y: range[1] });
      lowerPts.push({ x: p045(mm), y: range[0] });
    }
  });
  upperPts.sort((a, b) => a.x - b.x);
  lowerPts.sort((a, b) => a.x - b.x);

  const datasets = [
    { label: 'ขอบบน (มาตรฐาน)', data: upperPts, borderColor: '#94a3b8', backgroundColor: 'rgba(148,163,184,0.08)', borderDash: [5, 4], pointRadius: 0, borderWidth: 1.5, fill: '+1' },
    { label: 'ขอบล่าง (มาตรฐาน)', data: lowerPts, borderColor: '#94a3b8', pointRadius: 0, borderDash: [5, 4], borderWidth: 1.5, fill: false },
  ];

  samples.forEach((s, i) => {
    const color = SAMPLE_COLORS[i % SAMPLE_COLORS.length];
    const pts = sieveSizes
      .filter(({ mm }) => typeof s.gradation[mm] === 'number')
      .map(({ mm }) => ({ x: p045(mm), y: s.gradation[mm] }))
      .sort((a, b) => a.x - b.x);
    datasets.push({ label: s.name, data: pts, borderColor: color, backgroundColor: color, pointRadius: 4, borderWidth: 2, tension: 0.1 });
  });

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 11 } } } },
      scales: {
        x: {
          type: 'linear',
          title: { display: true, text: 'ขนาดตะแกรง (mm^0.45)' },
          ticks: {
            callback: (val) => {
              const mm = Math.pow(val, 1 / 0.45);
              const match = sieveSizes.find((s) => Math.abs(s.mm - mm) < 0.5);
              return match ? match.label : mm.toFixed(2);
            },
          },
        },
        y: { title: { display: true, text: '% ผ่านตะแกรง' }, min: 0, max: 100 },
      },
    },
  });
}

