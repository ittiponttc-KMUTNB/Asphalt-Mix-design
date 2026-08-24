function renderGradationTab() {
  $('gradationContainer').innerHTML = `
    <div class="card">
      <h3>Cold Bin (สัดส่วนกองวัสดุ / ป้อนเข้าโรงผสม)</h3>
      <div id="coldBinTableWrap"></div>
    </div>
    <div class="card">
      <h3>Hot Bin (หลังคัดกรองในโรงผสม)</h3>
      <div id="hotBinTableWrap"></div>
    </div>
    <div class="card">
      <h3>กราฟขนาดคละ (0.45 Power Chart)</h3>
      <div class="grid grid-2">
        <div><div class="small-note mb-0">Cold Bin</div><div class="chart-box"><canvas id="gradationChartCold"></canvas></div></div>
        <div><div class="small-note mb-0">Hot Bin</div><div class="chart-box"><canvas id="gradationChartHot"></canvas></div></div>
      </div>
    </div>
  `;
  renderBinTable('cold', state.coldBin.bins, 'coldBinTableWrap', false);
  renderBinTable('hot', state.hotBin.bins, 'hotBinTableWrap', true);
  refreshGradationCharts();
}

function renderBinTable(kind, bins, wrapId, showTolerant) {
  const envelope = getEnvelope();
  const combined = combinedGradation(bins, SIEVE_SIZES);
  const envCheck = checkEnvelope(combined, envelope);
  const sumOk = validateProportionSum(bins);
  const tolerant = showTolerant ? toleranceBand(combined, SIEVE_SIZES) : null;

  const header = bins.map((b, i) => `
    <th>
      <input data-bin-field="name" data-bin-index="${i}" value="${b.name}" style="text-align:center;font-weight:700" />
    </th>`).join('');

  const propRow = bins.map((b, i) => `
    <td><input type="number" step="any" data-bin-field="proportion" data-bin-index="${i}" value="${b.proportion ?? ''}" /></td>
  `).join('');

  const sieveRows = SIEVE_SIZES.map(({ mm, label }) => {
    const cells = bins.map((b, i) => `
      <td><input type="number" step="any" data-bin-field="gradation" data-bin-index="${i}" data-sieve="${mm}" value="${b.gradation[mm] ?? ''}" /></td>
    `).join('');
    const c = combined[mm];
    const ev = envCheck[mm];
    const evCell = ev ? `<span class="pill ${ev.pass ? 'pill-pass' : 'pill-fail'}">${ev.min}-${ev.max}</span>` : '<span class="small-note">-</span>';
    const tolCell = tolerant
      ? (tolerant[mm] ? `${fmt(tolerant[mm][0], 1)} - ${fmt(tolerant[mm][1], 1)}` : '-')
      : '';
    return `
      <tr>
        <td style="text-align:right;font-weight:600">${label}<br/><span class="small-note">${mm} มม.</span></td>
        ${cells}
        <td style="font-weight:700">${c ?? '-'}</td>
        <td>${evCell}</td>
        ${showTolerant ? `<td>${tolCell}</td>` : ''}
      </tr>`;
  }).join('');

  $(wrapId).innerHTML = `
    <div class="flex-between mt-8" style="margin-bottom:8px;">
      <span class="pill ${sumOk ? 'pill-pass' : 'pill-fail'}">รวมสัดส่วน ${bins.reduce((a, b) => a + (b.proportion || 0), 0).toFixed(1)}%</span>
      <div class="flex">
        <button class="btn btn-ghost btn-sm" data-action="add-bin">+ เพิ่มกอง/Bin</button>
        <button class="btn btn-ghost btn-sm" data-action="remove-bin">- ลบกองล่าสุด</button>
      </div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr><th>ตะแกรง</th>${header}<th>Comb'd</th><th>Desired</th>${showTolerant ? '<th>Tolerant Limit</th>' : ''}</tr>
        </thead>
        <tbody>
          <tr><td style="text-align:right;font-weight:600">Mix Proportion (%)</td>${propRow}<td></td><td></td>${showTolerant ? '<td></td>' : ''}</tr>
          ${sieveRows}
        </tbody>
      </table>
    </div>
  `;

  $(wrapId).querySelectorAll('[data-bin-field]').forEach((el) => {
    el.addEventListener('change', () => {
      const idx = parseInt(el.dataset.binIndex, 10);
      const field = el.dataset.binField;
      if (field === 'name') bins[idx].name = el.value;
      else if (field === 'proportion') bins[idx].proportion = parseFloat(el.value) || 0;
      else if (field === 'gradation') {
        const mm = el.dataset.sieve;
        bins[idx].gradation[mm] = el.value === '' ? null : parseFloat(el.value);
      }
      persist();
      renderBinTable(kind, bins, wrapId, showTolerant);
      refreshGradationCharts();
    });
  });

  $(wrapId).querySelector('[data-action="add-bin"]').addEventListener('click', () => {
    const gradation = {};
    SIEVE_SIZES.forEach(({ mm }) => { gradation[mm] = null; });
    bins.push({ name: `Bin ${bins.length + 1}`, proportion: 0, gradation });
    persist();
    renderBinTable(kind, bins, wrapId, showTolerant);
    refreshGradationCharts();
  });
  $(wrapId).querySelector('[data-action="remove-bin"]').addEventListener('click', () => {
    if (bins.length > 1) bins.pop();
    persist();
    renderBinTable(kind, bins, wrapId, showTolerant);
    refreshGradationCharts();
  });
}

function refreshGradationCharts() {
  const envelope = getEnvelope();
  const combinedCold = combinedGradation(state.coldBin.bins, SIEVE_SIZES);
  const combinedHot = combinedGradation(state.hotBin.bins, SIEVE_SIZES);
  drawGradationChart('gradationChartCold', { combined: combinedCold, envelope, sieveSizes: SIEVE_SIZES });
  drawGradationChart('gradationChartHot', { combined: combinedHot, envelope, sieveSizes: SIEVE_SIZES });
}
