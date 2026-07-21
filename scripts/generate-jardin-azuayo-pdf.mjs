#!/usr/bin/env node
/**
 * Genera evidence/report.pdf para auditoría de botones Jardín Azuayo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.join(ROOT, 'evidence');
const SCREENSHOTS = path.join(EVIDENCE, 'screenshots');
const VIDEO = path.join(EVIDENCE, 'video');
const TIMINGS_JSON = path.join(EVIDENCE, 'timings.json');
const PW_REPORT = path.join(EVIDENCE, 'playwright-report.json');
const PDF_OUT = path.join(EVIDENCE, 'report.pdf');
const BASE_URL = process.env.BASE_URL ?? 'https://www.jardinazuayo.fin.ec/';
const SLOW_MS = Number(process.env.SLOW_THRESHOLD_MS ?? 2000);

function copyVideosFromTestResults() {
  const testResultsDir = path.join(EVIDENCE, 'test-results');
  fs.mkdirSync(VIDEO, { recursive: true });
  const copied = [];

  if (!fs.existsSync(testResultsDir)) return copied;

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.webm')) {
        const dest = path.join(VIDEO, `jardin-azuayo-${entry.name}`);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(full, dest);
        }
        copied.push(dest);
      }
    }
  };
  walk(testResultsDir);
  return copied;
}

function loadTimings() {
  if (!fs.existsSync(TIMINGS_JSON)) return [];
  return JSON.parse(fs.readFileSync(TIMINGS_JSON, 'utf-8'));
}

function loadPlaywrightSummary() {
  if (!fs.existsSync(PW_REPORT)) return { passed: 0, failed: 0, total: 0 };
  const report = JSON.parse(fs.readFileSync(PW_REPORT, 'utf-8'));
  let passed = 0;
  let failed = 0;
  const countSpecs = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const status = t.results?.[0]?.status;
        if (status === 'passed') passed++;
        else if (status === 'failed') failed++;
      }
    }
    for (const child of suite.suites ?? []) countSpecs(child);
  };
  for (const suite of report.suites ?? []) countSpecs(suite);
  return { passed, failed, total: passed + failed };
}

async function generatePdf(timings, videos) {
  const summary = loadPlaywrightSummary();
  const ok = timings.filter((t) => t.status === 'ok').length;
  const errors = timings.filter((t) => t.status === 'error').length;
  const skipped = timings.filter((t) => t.status === 'skipped').length;
  const slow = timings.filter((t) => t.slow).length;
  const overall = errors === 0 && summary.failed === 0 ? 'PASS' : 'FAIL';

  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(PDF_OUT);
  doc.pipe(stream);

  doc.fontSize(18).text('Auditoría de Botones — Performance UI', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).text('Cliente: Jardín Azuayo', { align: 'center' });
  doc.text(`BASE_URL: ${BASE_URL}`, { align: 'center' });
  doc.text(`Fecha: ${new Date().toISOString()}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(13).text('Resumen ejecutivo', { underline: true });
  doc.fontSize(10);
  doc.text(`Resultado global: ${overall}`);
  doc.text(`Controles inventariados: ${timings.length}`);
  doc.text(`OK: ${ok} | Error: ${errors} | Skipped: ${skipped} | Lentos (>${SLOW_MS}ms): ${slow}`);
  doc.text(`Playwright: ${summary.passed} passed / ${summary.failed} failed`);
  doc.moveDown();

  if (videos.length > 0) {
    doc.fontSize(13).text('Videos de evidencia', { underline: true });
    doc.fontSize(9);
    for (const v of videos) {
      doc.text(`• ${path.relative(ROOT, v)}`);
    }
    doc.moveDown();
  }

  doc.fontSize(13).text('Tabla de latencias por botón', { underline: true });
  doc.moveDown(0.3);

  doc.fontSize(7);
  const colWidths = [45, 35, 45, 35, 35, 30, 120, 80];
  const headers = ['ID', 'Status', 'Lat(ms)', 'p50', 'p95', 'Lento', 'Texto', 'Página'];
  let x = 40;
  const headerY = doc.y;
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x, headerY, { width: colWidths[i], continued: false });
    x += colWidths[i];
  }
  doc.moveDown(0.5);

  for (const t of timings) {
    if (doc.y > 720) doc.addPage();

    const rowY = doc.y;
    x = 40;
    const cells = [
      t.id,
      t.status,
      String(t.latencyMs),
      t.p50Ms != null ? String(t.p50Ms) : '-',
      t.p95Ms != null ? String(t.p95Ms) : '-',
      t.slow ? 'SÍ' : 'NO',
      (t.text || t.selector).slice(0, 35),
      (t.pageUrl || '').replace(BASE_URL, '/').slice(0, 30),
    ];

    for (let i = 0; i < cells.length; i++) {
      const color = t.status === 'error' ? 'red' : t.slow ? 'orange' : 'black';
      doc.fillColor(color).fontSize(7).text(cells[i], x, rowY, { width: colWidths[i], continued: false });
      x += colWidths[i];
    }
    doc.fillColor('black');
    doc.moveDown(0.3);

    if (t.status === 'error' && t.error) {
      doc.fontSize(7).fillColor('red').text(`  Error: ${t.error.slice(0, 120)}`, { indent: 10 });
      doc.fillColor('black');
    }
    if (t.skipReason) {
      doc.fontSize(7).fillColor('gray').text(`  Skip: ${t.skipReason}`, { indent: 10 });
      doc.fillColor('black');
    }
  }

  doc.addPage();
  doc.fontSize(13).text('Capturas de evidencia (muestra)', { underline: true });
  doc.moveDown(0.5);

  const sampleShots = timings
    .filter((t) => t.screenshotBefore || t.screenshotAfter)
    .slice(0, 12);

  for (const t of sampleShots) {
    if (doc.y > 600) doc.addPage();
    doc.fontSize(10).text(`${t.id} — ${(t.text || t.selector).slice(0, 50)} [${t.status}, ${t.latencyMs}ms]`);
    const shot = t.screenshotAfter && fs.existsSync(t.screenshotAfter)
      ? t.screenshotAfter
      : t.screenshotBefore;
    if (shot && fs.existsSync(shot)) {
      try {
        doc.image(shot, { width: 460 });
      } catch {
        doc.fontSize(8).text(`(No se pudo incrustar: ${shot})`);
      }
    }
    doc.moveDown(0.5);
  }

  doc.addPage();
  doc.fontSize(12).text('Reproducción', { underline: true });
  doc.fontSize(10);
  doc.text('npx playwright test e2e/jardin-azuayo/button-audit.spec.ts --project=jardin-azuayo-chromium');
  doc.text('npm run test:jardin-azuayo:report');
  doc.text('');
  doc.text(`Datos crudos: evidence/timings.json`);
  doc.text(`CSV: evidence/button-audit-report.csv`);
  doc.text(`Markdown: evidence/button-audit-report.md`);

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });

  const videos = copyVideosFromTestResults();
  const timings = loadTimings();

  if (timings.length === 0) {
    console.warn('Advertencia: timings.json vacío o inexistente');
  }

  await generatePdf(timings, videos);
  console.log(`PDF generado: ${PDF_OUT}`);
  console.log(`Botones en reporte: ${timings.length}`);
  console.log(`Videos copiados: ${videos.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
