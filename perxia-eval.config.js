/**
 * Configuración personalizable del sistema de evaluación
 * 
 * Puedes modificar estos valores según las necesidades de tu equipo
 */

export const config = {
  /**
   * Pesos de las métricas para el cálculo del score final
   * Total debe sumar 1.0 (100%)
   */
  weights: {
    complexity: 0.20,      // 20% - Complejidad del cambio
    fileSize: 0.15,        // 15% - Tamaño de los cambios
    changeRatio: 0.15,     // 15% - Ratio de cambios
    codeQuality: 0.30,     // 30% - Calidad del código
    bestPractices: 0.20    // 20% - Mejores prácticas
  },

  /**
   * Umbrales para las penalizaciones
   */
  thresholds: {
    maxFilesWithoutPenalty: 10,      // Archivos antes de penalizar
    maxChangesWithoutPenalty: 500,   // Líneas antes de penalizar
    minDeletionRatio: 0.1            // Ratio mínimo de eliminaciones
  },

  /**
   * Patrones que indican malas prácticas
   * Formato: 'patrón': penalización_por_ocurrencia
   */
  badPatterns: {
    'console.log': 5,
    'console.debug': 5,
    'console.warn': 3,
    'debugger': 10,
    'TODO': 3,
    'FIXME': 5,
    'XXX': 5,
    'HACK': 10,
    'TEMP': 4,
    'var ': 8,              // Uso de var en lugar de let/const
    '== ': 5,               // Uso de == en lugar de ===
    '!= ': 5,               // Uso de != en lugar de !==
    'any': 3,               // TypeScript any
    'eval\\(': 15,          // Uso de eval
    'with\\(': 10,          // Uso de with
    'document.write': 8,    // document.write
    'innerHTML': 4,         // Posible XSS
    'dangerouslySetInnerHTML': 6  // React dangerous HTML
  },

  /**
   * Patrones que indican buenas prácticas
   * Formato: 'patrón': bonificación_por_ocurrencia
   */
  goodPatterns: {
    'test\\(': 5,           // Tests
    'it\\(': 5,             // Tests
    'describe\\(': 5,       // Tests
    'expect\\(': 3,         // Assertions
    'assert': 3,            // Assertions
    '// ': 2,               // Comentarios
    '/\\*\\*': 4,           // JSDoc
    '\\* @param': 3,        // Documentación de parámetros
    '\\* @returns': 3,      // Documentación de retorno
    'interface ': 3,        // TypeScript interfaces
    'type ': 2,             // TypeScript types
    'const ': 1,            // Uso de const
    'let ': 1,              // Uso de let
    'async ': 2,            // Funciones async
    'await ': 2,            // Uso de await
    'try \\{': 3,           // Manejo de errores
    'catch': 3              // Manejo de errores
  },

  /**
   * Extensiones de archivo a ignorar en el análisis
   */
  ignoredExtensions: [
    '.min.js',
    '.map',
    '.lock',
    '.log',
    '.jpg',
    '.png',
    '.gif',
    '.svg',
    '.ico',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot'
  ],

  /**
   * Archivos/directorios a ignorar completamente
   */
  ignoredPaths: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/',
    '.next/',
    '.nuxt/',
    'vendor/',
    'public/assets/'
  ],

  /**
   * Mensajes personalizados
   */
  messages: {
    pushApproved: '✅ PUSH APROBADO: El código cumple con los estándares de calidad.',
    pushRejected: '❌ PUSH RECHAZADO: La calificación no cumple con el mínimo requerido.',
    warningNonStrict: '⚠️  ADVERTENCIA: La calificación no cumple con el mínimo, pero el modo estricto está desactivado.',
    errorDuringEvaluation: '⚠️  Permitiendo push debido a error en la evaluación...',
    excellentWork: '¡Excelente trabajo! El código cumple con los estándares de calidad.',
    tooManyFiles: 'Demasiados archivos modificados ({count}). Considera dividir en múltiples commits.',
    tooManyChanges: 'Cambios muy extensos ({count} líneas). Los commits más pequeños son más fáciles de revisar.',
    codeQualityIssues: 'Se detectaron patrones de código que deben mejorarse (console.log, debugger, etc.)',
    missingBestPractices: 'Considera agregar tests y documentación para mejorar la calidad del código.'
  },

  /**
   * Configuración de colores para la consola
   */
  colors: {
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
    primary: '#667eea'
  }
};

export default config;

