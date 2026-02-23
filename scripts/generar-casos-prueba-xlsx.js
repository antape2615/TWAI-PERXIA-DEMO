/**
 * Genera casos_prueba_funcionales_cocinastore.xlsx desde el CSV (varios pasos por caso).
 * Ejecutar: node scripts/generar-casos-prueba-xlsx.js
 */
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const csvPath = path.join(root, 'casos_prueba_funcionales_cocinastore.csv');

const csvContent = fs.readFileSync(csvPath, 'utf8');
const wb = XLSX.read(csvContent, { type: 'string', raw: true });
const ws = wb.Sheets[wb.SheetNames[0]];

const colWidths = [
  { wch: 12 },  /* Work Item Type */
  { wch: 6 },   /* ID */
  { wch: 42 },  /* Titulo */
  { wch: 10 },  /* State */
  { wch: 14 },  /* Assigned To */
  { wch: 14 },  /* Area Path */
  { wch: 28 },  /* URL Destino */
  { wch: 10 },  /* Prioridad */
  { wch: 14 },  /* Categoria */
  { wch: 55 },  /* Descripcion */
  { wch: 50 },  /* Precondiciones */
  { wch: 10 },  /* Test Step */
  { wch: 22 },  /* Accion */
  { wch: 45 },  /* Valor */
  { wch: 52 },  /* Descripcion del paso */
  { wch: 55 },  /* Resultado Esperado */
];
ws['!cols'] = colWidths;

const outPath = path.join(root, 'casos_prueba_funcionales_cocinastore.xlsx');
const outWb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(outWb, ws, 'Casos de prueba');
XLSX.writeFile(outWb, outPath);

console.log('Generado:', outPath);
