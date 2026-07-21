#!/usr/bin/env node
/**
 * Genera evidence/report.pdf para la auditoría de botones (tabla + tiempos + capturas).
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
        const dest = path.join(VIDEO, `${path.basename(path.dirname(full))}-${entry.name}`);
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
    return null;
  }
  return JSON.parse(fs.readFileSync(TIMINGS_JSON, 'utf-8'));
}

function statusColor(status) {
  if (status === 'ok') return 'green';
  if (status === 'skipped') return '#888888';
  return 'red';
}

async function generatePdf(report, videos) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(PDF_OUT);
  doc.pipe(stream);

  const { meta, summary, buttons } = report;

  doc.fontSize(18).text('Auditoría de Botones — Performance UI', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).text('Cliente: Ficohsa (Grupo Ficohsa)', { align: 'center' });
  doc.text(`BASE_URL: ${meta.baseUrl}`, { align: 'center' });
  doc.text(`Ejecución: ${meta.runAt}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(13).text('Resumen ejecutivo', { underline: true });
  doc.fontSize(10);
  doc.text(`Botones inventariados: ${summary.total}`);
  doc.text(`OK: ${summary.ok} | Error: ${summary.error} | Skipped: ${summary.skipped}`);
  doc.text(`Lentos (>${meta.slowThresholdMs} ms): ${summary.slow} | Rotos: ${summary.broken}`);
  doc.text(`Latencia global p50: ${summary.latencyP50Ms ?? 'N/A'} ms | p95: ${summary.latencyP95Ms ?? 'N/A'} ms`);
  doc.text(`Páginas auditadas: ${meta.pagesAudited.length}`);
  doc.moveDown();

  if (videos.length > 0) {
    doc.fontSize(12).text('Videos de evidencia', { underline: true });
    doc.fontSize(9);
    for (const v of videos) {
      doc.text(`• ${path.relative(ROOT, v)}`);
    }
    doc.moveDown();
  }

  doc.fontSize(12).text('Tabla de botones (latencias)', { underline: true });
  doc.moveDown(0.3);
  doc.fontSize(7);

  const colWidths = [52, 70, 38, 38, 38, 38, 28, 28];
  const headers = ['ID', 'Texto', 'Status', 'ms', 'p50', 'p95', 'Lento', 'Roto'];
  let x = doc.x;
  const headerY = doc.y;
  headers.forEach((h, i) => {
    doc.text(h, x, headerY, { width: colWidths[i], continued: false });
    x += colWidths[i];
  });
  doc.moveDown(0.5);

  const rowsToShow = buttons.slice(0, 80);
  for (const b of rowsToShow) {
    if (doc.y > 720) {
      doc.addPage();
      doc.fontSize(7);
    }
    x = 40;
    const rowY = doc.y;
    const cells = [
      b.id.slice(0, 18),
      (b.text || '-').slice(0, 28),
      b.status,
      String(b.latencyMs),
      b.p50Ms != null ? String(b.p50Ms) : '-',
      b.p95Ms != null ? String(b.p95Ms) : '-',
      b.slow ? 'Sí' : 'No',
      b.broken ? 'Sí' : 'No',
    ];
    cells.forEach((cell, i) => {
      doc.fillColor(i === 2 ? statusColor(b.status) : 'black')
        .text(cell, x, rowY, { width: colWidths[i], continued: false });
      x += colWidths[i];
    });
    doc.fillColor('black');
    doc.moveDown(0.2);
  }

  if (buttons.length > 80) {
    doc.moveDown();
    doc.fontSize(9).text(`… y ${buttons.length - 80} botones más (ver evidence/timings.json y button-audit-report.csv)`);
  }

  doc.addPage();
  doc.fontSize(12).text('Capturas por botón (muestra)', { underline: true });
  doc.moveDown(0.5);

  const withShots = buttons.filter((b) => b.screenshotBefore || b.screenshotAfter).slice(0, 12);
  for (const b of withShots) {
    if (doc.y > 600) doc.addPage();
    doc.fontSize(9).text(`${b.id} — ${b.text} [${b.status}] ${b.latencyMs} ms`);
    if (b.screenshotBefore && fs.existsSync(b.screenshotBefore)) {
      try {
        doc.image(b.screenshotBefore, { width: 240 });
      } catch {
        doc.text('(captura before no disponible)');
      }
    }
    if (b.screenshotAfter && fs.existsSync(b.screenshotAfter)) {
      try {
        doc.image(b.screenshotAfter, { width: 240 });
      } catch {
        doc.text('(captura after no disponible)');
      }
    }
    doc.moveDown();
  }

  doc.addPage();
  doc.fontSize(11).text('Reproducción', { underline: true });
  doc.fontSize(9);
  doc.text('npx playwright install chromium');
  doc.text('npx playwright test e2e/ficosha/button-audit.spec.ts');
  doc.text('npm run test:button-audit:report');
  doc.moveDown();
  doc.text('Artefactos: evidence/timings.json, evidence/button-audit-report.csv, evidence/screenshots/, evidence/video/');

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  fs.mkdirSync(EVIDENCE, { recursive: true });
  fs.mkdirSync(SCREENSHOTS, { recursive: true });

  const report = loadTimings();
  if (!report) {
    console.error('No se encontró evidence/timings.json — ejecute primero la suite de auditoría.');
    process.exit(1);
  }

  const videos = copyVideosFromTestResults();
  await generatePdf(report, videos);
  console.log(`PDF generado: ${PDF_OUT}`);
  console.log(`Botones en reporte: ${report.buttons?.length ?? 0}`);
  console.log(`Videos copiados: ${videos.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
