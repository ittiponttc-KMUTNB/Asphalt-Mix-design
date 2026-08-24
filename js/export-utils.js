/** Export ข้อมูลเป็น CSV และกราฟเป็น PNG สำหรับนำไปใช้ในบทความวิจัย */

function csvEscape(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCSV(filename, rows) {
  const content = '﻿' + rows.map((r) => r.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Export กราฟ Chart.js เป็น PNG พื้นหลังขาว (ความละเอียดสูง x2) เหมาะสำหรับใส่ในบทความ */
function downloadChartPng(canvasId, filename) {
  const source = document.getElementById(canvasId);
  if (!source) return;
  const out = document.createElement('canvas');
  out.width = source.width;
  out.height = source.height;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(source, 0, 0);
  const url = out.toDataURL('image/png', 1.0);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function flowToUnit001(value, flowUnit) {
  if (value == null) return null;
  return flowUnit === 'mm' ? value / 0.254 : value;
}
function flowFromUnit001(value, flowUnit) {
  if (value == null) return null;
  return flowUnit === 'mm' ? value * 0.254 : value;
}
