function computeReportSummary() {
  const results = computeAllResults();
  if (results.length < 3 || state.designAC == null) return null;
  const xs = results.map((r) => r.ac);
  const acRange = [Math.min(...xs), Math.max(...xs)];
  const degree = Math.min(3, xs.length - 1);
  const curves = {
    unitWeight: polynomialRegression(xs, results.map((r) => r.unitWeight), degree),
    stability: polynomialRegression(xs, results.map((r) => r.stabilityAvg), degree),
    flow: polynomialRegression(xs, results.map((r) => r.flowAvg), degree),
    airVoids: polynomialRegression(xs, results.map((r) => r.airVoids), degree),
    vma: polynomialRegression(xs, results.map((r) => r.vma), degree),
    vfa: polynomialRegression(xs, results.map((r) => r.vfa), degree),
    gmm: polynomialRegression(xs, results.map((r) => r.gmmUsed), degree),
  };
  const vals = valuesAtDesignAC(curves, state.designAC);
  const gsb = state.aggregateProperties.combined.bulkSG;
  const gb = state.asphalt.specificGravity;
  const gmmAtDesign = curves.gmm(state.designAC);
  const pbTotal = pbByTotalMix(state.designAC);
  const gse = effectiveSpecificGravity(gmmAtDesign, pbTotal, gb);
  const pba = absorbedAsphalt(gse, gsb, gb);
  const mt = state.moistureTest;
  if (mt.controlStability.length && mt.conditionedStability.length) {
    vals.strengthIndex = percentStrengthIndex(average(mt.conditionedStability), average(mt.controlStability));
  }
  return { results, curves, acRange, vals, gmmAtDesign, gse, pba };
}

function renderReportTab() {
  const summary = computeReportSummary();
  $('reportContainer').innerHTML = `
    <div class="flex no-print" style="margin-bottom:16px;">
      <button class="btn btn-primary" id="btnPrint">🖨 พิมพ์ / บันทึกเป็น PDF (เบราว์เซอร์)</button>
      <button class="btn btn-ghost" id="btnExportPdf">📄 Export PDF</button>
      <button class="btn btn-ghost" id="btnExportJson">⬇ Export JSON</button>
      <button class="btn btn-ghost" id="btnImportJson">⬆ Import JSON</button>
    </div>
    ${summary ? reportPagesHtml(summary) : '<div class="card"><div class="pill pill-fail">ข้อมูลยังไม่ครบสำหรับสร้างรายงาน กรุณากรอกข้อมูลในแท็บ 2-5 ให้ครบก่อน</div></div>'}
  `;

  $('btnPrint').addEventListener('click', () => window.print());
  $('btnExportJson').addEventListener('click', () => exportProjectAsFile(state, `${state.meta.testNo || 'mixdesign'}.json`));
  $('btnImportJson').addEventListener('click', () => $('importFileInput').click());
  $('btnExportPdf').addEventListener('click', exportReportAsPdf);

  if (summary) drawReportCharts(summary);
}

$('importFileInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    state = await importProjectFromFile(file);
    persist();
    switchTab('project');
    showToast('นำเข้าโปรเจกต์สำเร็จ');
  } catch (err) {
    showToast('นำเข้าไฟล์ไม่สำเร็จ: รูปแบบไฟล์ไม่ถูกต้อง');
  }
  e.target.value = '';
});

function courseLabel() { return COURSE_TYPES[state.meta.courseType]?.label || '-'; }

function reportPagesHtml(summary) {
  const { vals, gse, pba } = summary;
  const criteria = getCriteria();
  const unit = state.meta.unit;
  const m = state.meta;
  const ap = state.aggregateProperties;

  return `
  <div class="report-page">
    <h2>${m.officeName || 'สำนักงานทางหลวง'}</h2>
    <div class="sub">Job-Mix Formula for Hot-Mix Asphalt</div>
    <table class="mb-0">
      <tr><td style="text-align:right;width:22%">อันดับการทดลองที่</td><td style="text-align:left">${m.testNo || '-'}</td><td style="text-align:right;width:18%">สัญญาที่</td><td style="text-align:left">${m.contractNo || '-'}</td></tr>
      <tr><td style="text-align:right">โครงการฯ</td><td colspan="3" style="text-align:left">${m.projectName || '-'}<br/>${m.highwaySection || ''}</td></tr>
      <tr><td style="text-align:right">เจ้าของตัวอย่าง</td><td style="text-align:left">${m.sampleOwner || '-'}</td><td style="text-align:right">วันที่รับตัวอย่าง</td><td style="text-align:left">${m.dateReceived || '-'}</td></tr>
      <tr><td style="text-align:right">เจ้าหน้าที่ออกแบบ</td><td colspan="3" style="text-align:left">${m.designer || '-'}</td></tr>
    </table>
    <div class="mt-14"><b>สำหรับชั้น ${courseLabel()}</b> <span class="small-note">(มาตรฐานที่ ทล.-ม.408/2532)</span></div>

    <table class="mt-8">
      <tr><td class="section-label" rowspan="6" style="width:110px">คุณสมบัติทั่วไป</td><td style="text-align:left">1. ออกแบบโดยวิธี ${m.testMethod}</td></tr>
      <tr><td style="text-align:left">2. อัตราส่วน Aggregate สำหรับ Hot Bin, Mix Design Gradation และ Tolerant Gradation ตามที่แสดงในหน้าถัดไป</td></tr>
      <tr><td style="text-align:left">3. แสดงกราฟความสัมพันธ์ %AC กับ Density, Stability, Flow, %Air Voids, %VMA, %VFA ตามหน้าแนบ</td></tr>
      <tr><td style="text-align:left">4. Bulk Sp.Gr. of Mixed Aggregate = <b>${fmt(ap.combined.bulkSG, 3)}</b></td></tr>
      <tr><td style="text-align:left">5. Sp.Gr. of Asphalt Cement = <b>${fmt(state.asphalt.specificGravity, 3)}</b></td></tr>
      <tr><td style="text-align:left">6. Asphalt Absorption by wt. of Aggregate = <b>${fmt(pba, 2)}</b> %</td></tr>
    </table>

    <table class="mt-8">
      <tr><td class="section-label" rowspan="6" style="width:110px">คุณสมบัติควบคุม</td><td style="text-align:left">1. ให้ใช้ปริมาณยาง Asphalt Cement (${state.asphalt.penetrationGrade} pen.) = <b>${fmt(state.designAC, 1)} %</b> (tolerance ± ${fmt(criteria.acTolerance, 1)} %) by weight of agg.</td></tr>
      <tr><td style="text-align:left">2. ความแน่นของการบดทับ Asphalt Concrete ต้องไม่น้อยกว่า 98% ของความแน่นเฉลี่ยประจำวันของ Marshall Compaction ที่ทดลองในห้อง Lab สนาม</td></tr>
      <tr><td style="text-align:left">3. ค่า Marshall Stability ที่ทดลองประจำวันต้องไม่น้อยกว่า <b>${fmt(unit === 'lbs' ? criteria.stability_lbs : criteria.stability_N, 0)} ${unit}</b></td></tr>
      <tr><td style="text-align:left">4. ค่า Marshall Flow (1/100") ที่ทดลองประจำวันต้องอยู่ระหว่าง <b>${criteria.flow_min} - ${criteria.flow_max}</b></td></tr>
      <tr><td style="text-align:left">5. หาก Gradation ของ Mixture ผิดไปจาก Job-Mix Formula เกิน Tolerant Gradation ต้องออกแบบส่วนผสมใหม่หรือปรับปรุงให้เหมาะสม</td></tr>
      <tr><td style="text-align:left">6. หากปริมาณยางแอสฟัลท์ผิดไปจาก ${fmt(state.designAC, 1)} ± ${fmt(criteria.acTolerance, 1)} % ให้นำวัสดุแอสฟัลท์คอนกรีตแปลงที่ผิดนั้นออกเสียแล้วดำเนินการปูทางแทนที่ด้วยวัสดุที่ถูกต้อง</td></tr>
    </table>
    <div class="small-note mt-14">Effective Compaction Temperature ของ Asphalt Concrete อยู่ระหว่าง 175-315°F หรือประมาณภายใน 1 ชั่วโมงหลังจาก Pave</div>
  </div>

  <div class="report-page">
    <h2>${m.officeName || 'สำนักงานทางหลวง'}</h2>
    <div class="sub">Asphalt Concrete ชั้น ${courseLabel()}</div>
    <div class="small-note mb-0">โครงการฯ: ${m.projectName || '-'}</div>
    <div class="small-note mb-0">แหล่งวัสดุ: ${m.sourceOfMaterial || '-'}</div>
    <div class="small-note mt-8">Mixing Plant: ${m.mixingPlant || '-'}</div>

    <div class="table-wrap mt-8">
      <table>
        <thead><tr><th>Description</th>${ap.fractions.map((f) => `<th>${f.name}</th>`).join('')}<th>Combined</th></tr></thead>
        <tbody>
          <tr><td style="text-align:right">Bulk Specific Gravity</td>${ap.fractions.map((f) => `<td>${fmt(f.bulkSG, 3)}</td>`).join('')}<td><b>${fmt(ap.combined.bulkSG, 3)}</b></td></tr>
          <tr><td style="text-align:right">Apparent Specific Gravity</td>${ap.fractions.map((f) => `<td>${fmt(f.apparentSG, 3)}</td>`).join('')}<td><b>${fmt(ap.combined.apparentSG, 3)}</b></td></tr>
          <tr><td style="text-align:right">Water Absorption (%)</td>${ap.fractions.map((f) => `<td>${fmt(f.waterAbsorption, 2)}</td>`).join('')}<td>-</td></tr>
          <tr><td style="text-align:right">Flakiness Index (%)</td>${ap.fractions.map((f) => `<td>${fmt(f.flakiness, 1)}</td>`).join('')}<td>${fmt(ap.quality.flakinessIndex, 1)}</td></tr>
          <tr><td style="text-align:right">Elongation Index (%)</td>${ap.fractions.map((f) => `<td>${fmt(f.elongation, 1)}</td>`).join('')}<td>${fmt(ap.quality.elongationIndex, 1)}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="table-wrap mt-14">
      <table>
        <thead><tr><th style="text-align:right">รายการคุณภาพมวลรวม</th><th>ค่าที่ได้</th></tr></thead>
        <tbody>
          ${QUALITY_FIELDS.map((f) => `<tr><td style="text-align:right">${f.label}</td><td>${fmt(ap.quality[f.key], 2)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>

    ${mixtureVsSpecTableHtml(vals, criteria, unit)}
  </div>

  <div class="report-page">
    <h2>${m.officeName || 'สำนักงานทางหลวง'}</h2>
    <div class="sub">Aggregate Gradation of Cold Bin and Hot Bin — ${courseLabel()}</div>
    <h3 class="mt-14">Cold Bin</h3>
    ${gradationTableHtml(state.coldBin.bins, false)}
    <h3 class="mt-14">Hot Bin</h3>
    ${gradationTableHtml(state.hotBin.bins, true)}
  </div>

  <div class="report-page">
    <h2>${m.officeName || 'สำนักงานทางหลวง'}</h2>
    <div class="sub">MARSHALL TEST METHOD — Design AC = ${fmt(state.designAC, 1)} %</div>
    <div class="grid grid-2 mt-14">
      <div class="chart-box"><canvas id="report-chart-density"></canvas></div>
      <div class="chart-box"><canvas id="report-chart-stability"></canvas></div>
      <div class="chart-box"><canvas id="report-chart-airvoids"></canvas></div>
      <div class="chart-box"><canvas id="report-chart-vfa"></canvas></div>
      <div class="chart-box"><canvas id="report-chart-flow"></canvas></div>
      <div class="chart-box"><canvas id="report-chart-vma"></canvas></div>
    </div>
  </div>
  `;
}

function mixtureVsSpecTableHtml(vals, criteria, unit) {
  const rows = [
    { label: 'Asphalt Content (% By Weight of Agg.)', value: fmt(state.designAC, 1), spec: `± ${fmt(criteria.acTolerance, 1)}` },
    { label: 'Marshall Density (g/mL)', value: fmt(vals.unitWeight, 3), spec: criteria.density_min ? `${criteria.density_min} - ${criteria.density_max}` : '-' },
    { label: 'Air Voids (%)', value: fmt(vals.airVoids, 1), spec: `${criteria.airVoids_min} - ${criteria.airVoids_max}` },
    { label: 'Voids in Mineral Aggregate, VMA (%)', value: fmt(vals.vma, 1), spec: `${criteria.vma_min} min` },
    { label: 'Voids Filled with Bitumen, VFA (%)', value: fmt(vals.vfa, 0), spec: '68 - 78' },
    { label: `Marshall Stability (${unit})`, value: fmt(vals.stabilityAvg, 0), spec: `${unit === 'lbs' ? criteria.stability_lbs : criteria.stability_N} min` },
    { label: 'Marshall Flow (0.01")', value: fmt(vals.flowAvg, 1), spec: `${criteria.flow_min} - ${criteria.flow_max}` },
    { label: `Stability / Flow (${unit}/0.01")`, value: fmt(vals.stabilityFlowRatio, 0), spec: `${unit === 'lbs' ? criteria.stabFlow_lbs001 : criteria.stabFlow_Nmm} min` },
    { label: 'Strength Index (%)', value: vals.strengthIndex != null ? fmt(vals.strengthIndex, 1) : '-', spec: `${criteria.strengthIndex_min} min` },
  ];
  return `
    <div class="table-wrap mt-14">
      <table>
        <thead><tr><th></th><th>Mixture</th><th>Spec. &amp; Tolerant</th></tr></thead>
        <tbody>
          ${rows.map((r) => `<tr><td style="text-align:right">${r.label}</td><td><b>${r.value}</b></td><td>${r.spec}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function gradationTableHtml(bins, showTolerant) {
  const envelope = getEnvelope();
  const combined = combinedGradation(bins, SIEVE_SIZES);
  const tolerant = showTolerant ? toleranceBand(combined, SIEVE_SIZES) : null;
  return `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Sieve</th>${bins.map((b) => `<th>${b.name}</th>`).join('')}<th>Comb'd</th><th>Desired</th>${showTolerant ? '<th>Tolerant</th>' : ''}</tr></thead>
        <tbody>
          <tr><td style="text-align:right">Mix Proportion (%)</td>${bins.map((b) => `<td>${fmt(b.proportion, 0)}</td>`).join('')}<td></td><td></td>${showTolerant ? '<td></td>' : ''}</tr>
          ${SIEVE_SIZES.map(({ mm, label }) => {
            const range = envelope[mm];
            const tol = tolerant ? tolerant[mm] : null;
            return `<tr>
              <td style="text-align:right">${label}</td>
              ${bins.map((b) => `<td>${b.gradation[mm] ?? '-'}</td>`).join('')}
              <td><b>${combined[mm] ?? '-'}</b></td>
              <td>${range ? `${range[0]}-${range[1]}` : '-'}</td>
              ${showTolerant ? `<td>${tol ? `${fmt(tol[0], 1)}-${fmt(tol[1], 1)}` : '-'}</td>` : ''}
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function drawReportCharts(summary) {
  const { results, curves, acRange } = summary;
  const pts = (key) => results.map((r) => ({ x: r.ac, y: r[key] }));
  drawMarshallChart('report-chart-density', { title: 'Density vs %AC', yLabel: 'g/mL', dataPoints: pts('unitWeight'), fitFn: curves.unitWeight, xRange: acRange, designAC: state.designAC, color: '#2563eb' });
  drawMarshallChart('report-chart-stability', { title: 'Stability vs %AC', yLabel: `Stability (${state.meta.unit})`, dataPoints: pts('stabilityAvg'), fitFn: curves.stability, xRange: acRange, designAC: state.designAC, color: '#7c3aed' });
  drawMarshallChart('report-chart-airvoids', { title: 'Air Voids vs %AC', yLabel: 'Air Voids (%)', dataPoints: pts('airVoids'), fitFn: curves.airVoids, xRange: acRange, designAC: state.designAC, color: '#dc2626' });
  drawMarshallChart('report-chart-vfa', { title: 'VFA vs %AC', yLabel: 'VFA (%)', dataPoints: pts('vfa'), fitFn: curves.vfa, xRange: acRange, designAC: state.designAC, color: '#16a34a' });
  drawMarshallChart('report-chart-flow', { title: 'Flow vs %AC', yLabel: 'Flow (0.01")', dataPoints: pts('flowAvg'), fitFn: curves.flow, xRange: acRange, designAC: state.designAC, color: '#d97706' });
  drawMarshallChart('report-chart-vma', { title: 'VMA vs %AC', yLabel: 'VMA (%)', dataPoints: pts('vma'), fitFn: curves.vma, xRange: acRange, designAC: state.designAC, color: '#0891b2' });
}

async function exportReportAsPdf() {
  const pages = document.querySelectorAll('#reportContainer .report-page');
  if (!pages.length) { showToast('ยังไม่มีรายงานให้ Export'); return; }
  showToast('กำลังสร้าง PDF...');
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p', 'mm', 'a4');
  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = (canvas.height * pageWidth) / canvas.width;
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, Math.min(pageHeight, pdf.internal.pageSize.getHeight()));
  }
  pdf.save(`${state.meta.testNo || 'job-mix-formula'}.pdf`);
  showToast('สร้าง PDF สำเร็จ');
}
