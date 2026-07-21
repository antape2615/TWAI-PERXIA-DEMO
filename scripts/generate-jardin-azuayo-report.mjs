#!/usr/bin/env node
/**
 * Genera evidence/report.pdf para la auditoría de botones Jardín Azuayo.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.join(ROOT, 'evidence');
const SCREENSHOTS = path.join(EVIDENCE, 'screenshots', 'jardin-azuayo');
const VIDEO = path.join(EVIDENCE, 'video');
const TIMINGS_JSON = path.join(EVIDENCE, 'timings.json');
const PDF_OUT = path.join(EVIDENCE, 'report.pdf');

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
        const dest = path.join(VIDEO, `jardin-azuayo-${path.basename(path.dirname(full))}-${entry.name}`);
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
  if (!fs.existsSync(TIMINGS_JSON)) {
    throw new Error(`No se encontró ${TIMINGS_JSON}. Ejecuta primero la suite Playwright.`);
  }
  return JSON.parse(fs.readFileSync(TIMINGS_JSON, 'utf-8'));
}

async function generatePdf(report, videos) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(PDF_OUT);
  doc.pipe(stream);

  const { meta, summary, results } = report;

  doc.fontSize(18).text('Auditoría de Botones UI — Performance', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).text(`Cliente: ${meta.cliente}`, { align: 'center' });
  doc.text(`BASE_URL: ${meta.baseUrl}`, { align: 'center' });
  doc.text(`Ejecutado: ${meta.executedAt}`, { align: 'center' });
  doc.text(`Umbral lento: ${meta.slowThresholdMs} ms | Repeticiones: ${meta.repetitions}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(13).text('Resumen ejecutivo', { underline: true });
  doc.fontSize(10);
  doc.text(`Total controles: ${summary.total}`);
  doc.text(`OK: ${summary.ok} | Error: ${summary.error} | Skipped: ${summary.skipped}`);
  doc.text(`Lentos (>${meta.slowThresholdMs}ms): ${summary.slow} | Rotos: ${summary.broken}`);
  doc.text(`p50 global: ${summary.p50Global} ms | p95 global: ${summary.p95Global} ms`);
  doc.moveDown();

  if (videos.length > 0) {
    doc.fontSize(13).text('Video de la pasada completa', { underline: true });
    doc.fontSize(9);
    for (const v of videos) {
      doc.text(`• ${path.relative(ROOT, v)}`);
    }
    doc.moveDown();
  }

  doc.fontSize(13).text('Tabla de botones y tiempos', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(8);

  const colWidths = [42, 55, 95, 38, 38, 42, 70];
  const headers = ['Estado', 'Página', 'Texto', 'p50', 'p95', 'Lat.', 'URL después'];

  const drawRow = (cells, bold = false) => {
    if (doc.y > 760) doc.addPage();
    const y = doc.y;
    let x = 40;
    if (bold) doc.font('Helvetica-Bold');
    for (let i = 0; i < cells.length; i++) {
      doc.text(String(cells[i]).slice(0, i === 2 ? 50 : 30), x, y, { width: colWidths[i], lineBreak: false });
      x += colWidths[i];
    }
    if (bold) doc.font('Helvetica');
    doc.moveDown(0.9);
  };

  drawRow(headers, true);

  for (const row of results) {
    const estado =
      row.broken ? 'ROTO' : row.slow ? 'LENTO' : row.status === 'skipped' ? 'SKIP' : row.status === 'error' ? 'ERROR' : 'OK';
    drawRow([
      estado,
      row.page,
      row.text,
      row.p50,
      row.p95,
      row.latencyMs,
      row.urlAfter?.replace(meta.baseUrl, '/') ?? '',
    ]);
  }

  doc.addPage();
  doc.fontSize(13).text('Capturas representativas', { underline: true });
  doc.moveDown(0.5);

  const sampled = results
    .filter((r) => r.screenshotBefore || r.screenshotAfter)
    .filter((r) => r.status === 'ok' || r.broken || r.slow)
    .slice(0, 12);

  for (const row of sampled) {
    if (doc.y > 600) doc.addPage();
    doc.fontSize(10).text(`${row.page} — ${row.text} (${row.status}, ${row.latencyMs}ms)`);
    const shots = [row.screenshotBefore, row.screenshotAfter].filter(Boolean);
    for (const shot of shots) {
      const abs = path.isAbsolute(shot) ? shot : path.join(ROOT, shot);
      if (fs.existsSync(abs)) {
        try {
          doc.image(abs, { width: 240 });
          doc.moveDown(0.2);
        } catch {
          doc.fontSize(8).text(`(captura no disponible: ${shot})`);
        }
      }
    }
    doc.moveDown();
  }

  doc.addPage();
  doc.fontSize(12).text('Reproducción', { underline: true });
  doc.fontSize(10);
  doc.text('npx playwright test e2e/jardin-azuayo/button-audit.spec.ts --project=jardin-azuayo-chromium');
  doc.text('npm run test:jardin-azuayo:report');
  doc.text('');
  doc.text('Variables opcionales: BASE_URL, SLOW_THRESHOLD_MS, BUTTON_AUDIT_REPETITIONS');

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  const videos = copyVideosFromTestResults();
  const report = loadTimings();
  await generatePdf(report, videos);
  console.log(`PDF generado: ${PDF_OUT}`);
  console.log(`Videos: ${videos.length}`);
  console.log(`Controles en reporte: ${report.results.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
