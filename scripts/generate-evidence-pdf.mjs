#!/usr/bin/env node
/**
 * Genera evidence/report.pdf con resumen de resultados, capturas incrustadas y referencias a video.
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
const RESULTS_JSON = path.join(EVIDENCE, 'test-results.json');
const PW_REPORT = path.join(EVIDENCE, 'playwright-report.json');
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
        fs.copyFileSync(full, dest);
        copied.push(dest);
      }
    }
  };
  walk(testResultsDir);
  return copied;
}

function loadResults() {
  if (fs.existsSync(RESULTS_JSON)) {
    return JSON.parse(fs.readFileSync(RESULTS_JSON, 'utf-8'));
  }
  return [];
}

function loadPlaywrightSummary() {
  if (!fs.existsSync(PW_REPORT)) return { passed: 0, failed: 0, total: 0 };
  const report = JSON.parse(fs.readFileSync(PW_REPORT, 'utf-8'));
  const suites = report.suites ?? [];
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
    for (const child of suite.suites ?? []) {
      countSpecs(child);
    }
  };
  for (const suite of suites) countSpecs(suite);
  return { passed, failed, total: passed + failed };
}

function loadPlaywrightSpecs() {
  if (!fs.existsSync(PW_REPORT)) return [];
  const report = JSON.parse(fs.readFileSync(PW_REPORT, 'utf-8'));
  const specs = [];
  const walk = (suite) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        specs.push({
          title: spec.title,
          status: t.results?.[0]?.status ?? 'unknown',
          duration: t.results?.[0]?.duration ?? 0,
          error: t.results?.[0]?.error?.message ?? null,
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child);
  };
  for (const suite of report.suites ?? []) walk(suite);
  return specs;
}

async function generatePdf(results, videos, pwSpecs) {
  const summary = loadPlaywrightSummary();
  const passed = summary.passed || results.filter((r) => r.status === 'passed').length;
  const failed = summary.failed || results.filter((r) => r.status === 'failed').length;
  const overall = failed === 0 ? 'PASS' : 'FAIL';

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(PDF_OUT);
  doc.pipe(stream);

  doc.fontSize(20).text('Evidencia E2E — Auditoría de Gobernanza', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(12).text('Cliente: Ficohsa (Grupo Ficohsa)', { align: 'center' });
  doc.text('BASE_URL: https://www.grupoficohsa.com', { align: 'center' });
  doc.text('HU: HU-ARQ-001 — Arquitectura SSR / Microfrontends', { align: 'center' });
  doc.text(`Fecha ejecución: ${new Date().toISOString()}`, { align: 'center' });
  doc.moveDown();

  doc.fontSize(14).text('Resumen de resultados', { underline: true });
  doc.fontSize(11);
  doc.text(`Resultado global: ${overall}`);
  doc.text(`Casos ejecutados: ${summary.total || results.length}`);
  doc.text(`Passed: ${passed} | Failed: ${failed}`);
  doc.moveDown();

  doc.fontSize(14).text('Parámetros de negocio', { underline: true });
  doc.fontSize(11);
  doc.text('TiempoCargaMaximoInicial: 8 segundos (configurable vía TIEMPO_CARGA_MAXIMO_INICIAL)');
  doc.text('MaxReintentosIntegracion: 3 (configurable vía MAX_REINTENTOS_INTEGRACION)');
  doc.moveDown();

  if (videos.length > 0) {
    doc.fontSize(14).text('Videos de evidencia (fallos)', { underline: true });
    doc.fontSize(10);
    for (const v of videos) {
      doc.text(`• ${path.relative(ROOT, v)}`);
    }
    doc.moveDown();
  }

  doc.fontSize(14).text('Detalle por caso de prueba', { underline: true });
  doc.moveDown(0.5);

  const resultMap = new Map(results.map((r) => [r.id, r]));
  const testIds = [
    'TC-ARQ-001-01', 'TC-ARQ-001-02', 'TC-ARQ-001-03', 'TC-ARQ-001-04',
    'TC-ARQ-001-05', 'TC-ARQ-001-06', 'TC-ARQ-001-07', 'TC-ARQ-001-08',
  ];

  for (const testId of testIds) {
    const r = resultMap.get(testId);
    const pw = pwSpecs.find((s) => s.title.includes(testId.split('-').slice(-1)[0]) || s.title.includes(testId));
    const status = r?.status ?? (pw?.status === 'passed' ? 'passed' : pw?.status === 'failed' ? 'failed' : 'unknown');

    if (doc.y > 650) doc.addPage();

    doc.fontSize(12).fillColor(status === 'passed' ? 'green' : 'red')
      .text(`${testId} — ${String(status).toUpperCase()}`);
    doc.fillColor('black').fontSize(10);

    if (r) {
      doc.text(`Título: ${r.titulo}`);
      doc.text(`Criterio: ${r.criterio} | Regla: ${r.regla}`);
      doc.text(`Duración: ${r.duracionMs} ms`);
      if (r.error) doc.text(`Error: ${r.error}`);
      if (Object.keys(r.detalles).length > 0) {
        doc.text(`Detalles: ${JSON.stringify(r.detalles).slice(0, 600)}`);
      }
    } else if (pw) {
      doc.text(`Título: ${pw.title}`);
      doc.text(`Duración: ${pw.duration} ms`);
      if (pw.error) doc.text(`Error: ${pw.error.slice(0, 400)}`);
    }

    const shotCandidates = [
      r?.screenshot,
      path.join(SCREENSHOTS, `${testId}-happy-path.png`),
      path.join(SCREENSHOTS, `${testId}-navegacion.png`),
      path.join(SCREENSHOTS, `${testId}-failure.png`),
    ].filter(Boolean);

    const shotPath = shotCandidates.find((p) => fs.existsSync(p));
    if (shotPath) {
      try {
        doc.moveDown(0.3);
        doc.image(shotPath, { width: 480 });
      } catch {
        doc.text(`(No se pudo incrustar captura: ${shotPath})`);
      }
    }

    doc.moveDown();
  }

  doc.addPage();
  doc.fontSize(12).text('Reproducción', { underline: true });
  doc.fontSize(10);
  doc.text('npx playwright test e2e/ficosha/hu-arq-001.spec.ts');
  doc.text('npm run test:e2e:report');
  doc.text('');
  doc.text('Nota: CA-RN03-01 (documentación técnica versionada) requiere validación manual fuera del alcance E2E.');

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
  const results = loadResults();
  const pwSpecs = loadPlaywrightSpecs();

  await generatePdf(results, videos, pwSpecs);
  console.log(`PDF generado: ${PDF_OUT}`);
  console.log(`Videos copiados: ${videos.length}`);
  console.log(`Casos en reporte: ${results.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
