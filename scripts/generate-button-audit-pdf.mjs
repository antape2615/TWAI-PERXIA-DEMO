#!/usr/bin/env node
/**
 * Genera evidence/report.pdf para la auditoría de botones (tabla + capturas + métricas).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import PDFDocument from 'pdfkit';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = path.join(ROOT, 'evidence');
const TIMINGS_JSON = path.join(EVIDENCE, 'timings.json');
const SCREENSHOTS = path.join(EVIDENCE, 'screenshots', 'button-audit');
const VIDEO = path.join(EVIDENCE, 'video');
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
    throw new Error(`No se encontró ${TIMINGS_JSON}. Ejecute primero la suite button-audit.`);
  }
  return JSON.parse(fs.readFileSync(TIMINGS_JSON, 'utf-8'));
}

function statusColor(status) {
  if (status === 'ok') return '#1a7f37';
  if (status === 'skipped') return '#9a6700';
  return '#cf222e';
}

async function generatePdf(summary, videos) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(PDF_OUT);
  doc.pipe(stream);

  doc.fontSize(18).text('Auditoría de Botones — Performance UI', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).text('Cliente: Ficohsa (Grupo Ficohsa)', { align: 'center' });
  doc.text(`BASE_URL: ${summary.baseUrl}`, { align: 'center' });
  doc.text(`Fecha: ${summary.auditedAt}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(13).text('Resumen ejecutivo', { underline: true });
  doc.fontSize(10);
  doc.text(`Páginas auditadas: ${summary.pagesVisited.length}`);
  doc.text(`Total controles: ${summary.totalButtons}`);
  doc.text(`OK: ${summary.ok} | Error: ${summary.error} | Skipped: ${summary.skipped}`);
  doc.text(`Lentos (>2s): ${summary.slow} | Rotos: ${summary.broken}`);
  doc.text(`p50 global (ok): ${summary.globalP50Ms ?? '—'} ms | p95 global (ok): ${summary.globalP95Ms ?? '—'} ms`);
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

  const colX = { id: 40, page: 130, text: 200, status: 310, ms: 360, flags: 420 };
  doc.fontSize(8).font('Helvetica-Bold');
  doc.text('ID', colX.id, doc.y, { width: 85, continued: false });
  const headerY = doc.y - 10;
  doc.text('Página', colX.page, headerY);
  doc.text('Texto', colX.text, headerY);
  doc.text('Estado', colX.status, headerY);
  doc.text('ms', colX.ms, headerY);
  doc.text('Flags', colX.flags, headerY);
  doc.moveDown(0.8);
  doc.font('Helvetica');

  for (const r of summary.records) {
    if (doc.y > 720) doc.addPage();

    const flags = [r.slow ? 'LENTO' : '', r.broken ? 'ROTO' : ''].filter(Boolean).join(',');
    const rowY = doc.y;

    doc.fillColor('black').fontSize(7);
    doc.text(r.id.slice(0, 22), colX.id, rowY, { width: 85 });
    doc.text(r.pagePath.slice(0, 18), colX.page, rowY, { width: 65 });
    doc.text((r.text || '—').slice(0, 22), colX.text, rowY, { width: 105 });
    doc.fillColor(statusColor(r.status)).text(r.status, colX.status, rowY);
    doc.fillColor('black').text(String(r.latencyMs), colX.ms, rowY);
    doc.fillColor(r.slow || r.broken ? '#cf222e' : 'black').text(flags || '—', colX.flags, rowY);
    doc.fillColor('black');

    doc.moveDown(0.6);
  }

  doc.addPage();
  doc.fontSize(13).text('Capturas por botón (muestra)', { underline: true });
  doc.moveDown(0.5);

  const withShots = summary.records.filter((r) => r.screenshotBefore || r.screenshotAfter).slice(0, 12);
  for (const r of withShots) {
    if (doc.y > 600) doc.addPage();

    doc.fontSize(10).text(`${r.id} — ${r.text} (${r.status}, ${r.latencyMs}ms)`);
    doc.fontSize(8).text(`Antes: ${r.urlBefore}`);
    doc.text(`Después: ${r.urlAfter}`);

    const shots = [r.screenshotBefore, r.screenshotAfter].filter(
      (p) => p && fs.existsSync(p),
    );

    for (const shot of shots) {
      try {
        if (doc.y > 520) doc.addPage();
        doc.image(shot, { width: 460 });
        doc.moveDown(0.3);
      } catch {
        doc.text(`(No se pudo incrustar: ${shot})`);
      }
    }
    doc.moveDown();
  }

  doc.addPage();
  doc.fontSize(12).text('Reproducción', { underline: true });
  doc.fontSize(10);
  doc.text('npx playwright test e2e/ficosha/button-audit.spec.ts');
  doc.text('npm run test:button-audit:report');
  doc.text('');
  doc.text('Artefactos: evidence/timings.json, evidence/button-audit-report.csv, evidence/screenshots/button-audit/');

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  const summary = loadTimings();
  const videos = copyVideosFromTestResults();
  await generatePdf(summary, videos);
  console.log(`PDF generado: ${PDF_OUT}`);
  console.log(`Registros: ${summary.records?.length ?? 0}`);
  console.log(`Videos: ${videos.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
