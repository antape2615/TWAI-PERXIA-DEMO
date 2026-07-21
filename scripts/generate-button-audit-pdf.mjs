#!/usr/bin/env node
/**
 * Genera evidence/report.pdf para la auditoría de botones a partir de timings.json.
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

function loadTimings() {
  if (!fs.existsSync(TIMINGS_JSON)) {
    throw new Error(`No se encontró ${TIMINGS_JSON}. Ejecute primero: npx playwright test e2e/ficosha/button-audit.spec.ts`);
  }
  return JSON.parse(fs.readFileSync(TIMINGS_JSON, 'utf-8'));
}

function listVideos() {
  if (!fs.existsSync(VIDEO)) return [];
  return fs.readdirSync(VIDEO).filter((f) => f.endsWith('.webm')).map((f) => path.join(VIDEO, f));
}

function truncate(text, max = 80) {
  const s = String(text ?? '');
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

async function generatePdf(report) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(PDF_OUT);
  doc.pipe(stream);

  const { meta, summary, percentiles, buttons } = report;
  const overall = summary.error === 0 && summary.broken === 0 ? 'PASS' : 'REVIEW';

  doc.fontSize(18).text('Auditoría de Botones UI — Evidencia', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(11).text('Cliente: Ficohsa (Grupo Ficohsa)', { align: 'center' });
  doc.text(`BASE_URL: ${meta.baseUrl}`, { align: 'center' });
  doc.text(`Fecha: ${meta.auditedAt}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(13).text('Resumen ejecutivo', { underline: true });
  doc.fontSize(10);
  doc.text(`Resultado global: ${overall}`);
  doc.text(`Total botones inventariados: ${summary.total}`);
  doc.text(`OK: ${summary.ok} | Error: ${summary.error} | Skipped: ${summary.skipped}`);
  doc.text(`Lentos (>${meta.slowThresholdMs}ms): ${summary.slow} | Rotos: ${summary.broken}`);
  doc.text(`Páginas auditadas: ${meta.pagesAudited.length}`);
  doc.moveDown(0.5);

  doc.fontSize(13).text('Percentiles de latencia (ms)', { underline: true });
  doc.fontSize(10);
  doc.text(`p50: ${percentiles.p50 ?? '—'} | p95: ${percentiles.p95 ?? '—'} | min: ${percentiles.min ?? '—'} | max: ${percentiles.max ?? '—'} | avg: ${percentiles.avg ?? '—'}`);
  doc.moveDown();

  const videos = listVideos();
  if (videos.length > 0) {
    doc.fontSize(13).text('Videos de evidencia', { underline: true });
    doc.fontSize(9);
    for (const v of videos) {
      doc.text(`• ${path.relative(ROOT, v)}`);
    }
    doc.moveDown();
  }

  doc.fontSize(13).text('Tabla de botones', { underline: true });
  doc.moveDown(0.3);

  const colWidths = [45, 55, 120, 45, 45, 45];
  const headers = ['ID', 'Status', 'Texto', 'Lat(ms)', 'Lento', 'Roto'];
  let x = doc.x;
  const y = doc.y;
  doc.fontSize(8).font('Helvetica-Bold');
  for (let i = 0; i < headers.length; i++) {
    doc.text(headers[i], x, y, { width: colWidths[i], continued: false });
    x += colWidths[i];
  }
  doc.moveDown(0.2);
  doc.font('Helvetica');

  for (const b of buttons) {
    if (doc.y > 720) doc.addPage();
    x = 40;
    const rowY = doc.y;
    const cells = [
      b.id,
      b.status,
      truncate(b.text, 35),
      b.latencyMs != null ? String(b.latencyMs) : '—',
      b.slow ? 'SÍ' : 'no',
      b.broken ? 'SÍ' : 'no',
    ];
    for (let i = 0; i < cells.length; i++) {
      doc.text(cells[i], x, rowY, { width: colWidths[i], continued: false });
      x += colWidths[i];
    }
    doc.moveDown(0.15);
  }

  const sampleButtons = buttons.filter((b) => b.screenshotBefore || b.screenshotAfter).slice(0, 12);
  if (sampleButtons.length > 0) {
    doc.addPage();
    doc.fontSize(13).text('Capturas de evidencia (muestra)', { underline: true });
    doc.moveDown(0.5);

    for (const b of sampleButtons) {
      if (doc.y > 600) doc.addPage();
      doc.fontSize(10).text(`${b.id} — "${truncate(b.text, 50)}" [${b.status}] ${b.latencyMs ?? '—'}ms`);
      doc.fontSize(8).text(`Página: ${b.pageUrl}`);

      const shots = [b.screenshotBefore, b.screenshotAfter].filter(
        (s) => s && fs.existsSync(path.resolve(ROOT, s)),
      );
      for (const shot of shots) {
        try {
          doc.image(path.resolve(ROOT, shot), { width: 240 });
          doc.moveDown(0.2);
        } catch {
          doc.text(`(captura no disponible: ${shot})`);
        }
      }
      doc.moveDown(0.4);
    }
  }

  doc.addPage();
  doc.fontSize(12).text('Reproducción', { underline: true });
  doc.fontSize(10);
  doc.text('npx playwright test e2e/ficosha/button-audit.spec.ts');
  doc.text('npm run test:button-audit:report');
  doc.moveDown();
  doc.text('Artefactos: evidence/timings.json, evidence/button-audit.csv, evidence/button-audit.md');
  doc.text('Evidencia: evidence/screenshots/, evidence/video/, evidence/report.pdf');

  doc.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function main() {
  const report = loadTimings();
  await generatePdf(report);
  console.log(`PDF generado: ${PDF_OUT}`);
  console.log(`Botones en reporte: ${report.buttons?.length ?? 0}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
