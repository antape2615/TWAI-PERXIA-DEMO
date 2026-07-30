/** Perfil temporal del usuario detectado por audio (sin identificación personal). */

export const DEFAULT_PROFILE = Object.freeze({
  ageBand: 'desconocido', // joven | adulto | mayor | desconocido
  technicalLevel: 'medio', // bajo | medio | alto
  emotion: 'neutro', // tranquilo | frustrado | confundido | emocionado | neutro | ansioso
  speechPace: 'normal', // lento | normal | rapido
  responsePreference: 'equilibrado', // corto | equilibrado | detallado
  formality: 'neutral', // cercana | neutral | formal
  confidence: 0.3,
  notes: '',
  updatedAt: null,
});

export const PROFILE_TOOL = {
  type: 'function',
  name: 'update_user_profile',
  description:
    'Actualiza el perfil temporal del interlocutor cuando detectes señales claras en su voz, ritmo, vocabulario o emoción. Llámalo al inicio y cada vez que cambie el perfil. No pidas confirmación al usuario ni digas en voz alta que estás analizándolo.',
  parameters: {
    type: 'object',
    properties: {
      ageBand: {
        type: 'string',
        enum: ['joven', 'adulto', 'mayor', 'desconocido'],
        description: 'Estimación aproximada de franja etaria (sin certeza).',
      },
      technicalLevel: {
        type: 'string',
        enum: ['bajo', 'medio', 'alto'],
        description: 'Nivel técnico aparente del usuario.',
      },
      emotion: {
        type: 'string',
        enum: ['tranquilo', 'frustrado', 'confundido', 'emocionado', 'neutro', 'ansioso'],
      },
      speechPace: {
        type: 'string',
        enum: ['lento', 'normal', 'rapido'],
      },
      responsePreference: {
        type: 'string',
        enum: ['corto', 'equilibrado', 'detallado'],
        description: 'Si prefiere respuestas breves o paso a paso.',
      },
      formality: {
        type: 'string',
        enum: ['cercana', 'neutral', 'formal'],
      },
      confidence: {
        type: 'number',
        description: 'Confianza 0-1 sobre el perfil actual.',
      },
      notes: {
        type: 'string',
        description: 'Notas cortas internas (no se leen al usuario).',
      },
    },
    required: ['ageBand', 'technicalLevel', 'emotion', 'speechPace', 'responsePreference'],
  },
};

export function createDefaultProfile() {
  return { ...DEFAULT_PROFILE, updatedAt: new Date().toISOString() };
}

export function mergeProfile(current, patch = {}) {
  const next = { ...createDefaultProfile(), ...current };
  for (const key of Object.keys(DEFAULT_PROFILE)) {
    if (key === 'updatedAt') continue;
    if (patch[key] !== undefined && patch[key] !== null && patch[key] !== '') {
      next[key] = patch[key];
    }
  }
  if (typeof next.confidence === 'number') {
    next.confidence = Math.min(1, Math.max(0, next.confidence));
  }
  next.updatedAt = new Date().toISOString();
  return next;
}

function voiceStyleFor(profile) {
  const lines = [];

  switch (profile.emotion) {
    case 'frustrado':
      lines.push(
        'Habla más despacio y con calma, como quien acompaña a alguien molesto.',
        'Primero valida con empatía breve («entiendo que es frustrante»), luego ayuda.',
        'Evita sonar alegre, apresurado o de call center.',
      );
      break;
    case 'confundido':
      lines.push(
        'Ve más despacio, con pausas naturales entre ideas (no como diccionario).',
        'Un paso a la vez; confirma si quedó claro antes de seguir.',
      );
      break;
    case 'emocionado':
      lines.push('Energía cálida y cercana; acompaña el entusiasmo sin exagerar ni gritar.');
      break;
    case 'ansioso':
      lines.push('Voz serena y estable; da certezas concretas sin dramatizar.');
      break;
    case 'tranquilo':
      lines.push('Ritmo cómodo, conversacional, como una colega amable.');
      break;
    default:
      lines.push('Tono cálido y profesional, energía media, como una asesora humana.');
  }

  switch (profile.ageBand) {
    case 'mayor':
      lines.push(
        'Un poco más despacio y claro, sin sonar condescendiente ni robótico.',
        'Evita jerga y anglicismos. Explica de a un paso, en oraciones cortas habladas.',
      );
      break;
    case 'joven':
      lines.push(
        'Más dinámica y cercana; ejemplos cotidianos; sin formalidad rígida.',
      );
      break;
    case 'adulto':
      lines.push('Clara y eficiente; vocabulario cotidiano profesional.');
      break;
    default:
      break;
  }

  switch (profile.technicalLevel) {
    case 'alto':
      lines.push(
        'Directa y precisa. Puedes usar términos técnicos si aportan.',
        'Ve al grano; no sobreexpliques lo obvio.',
      );
      break;
    case 'bajo':
      lines.push(
        'Evita tecnicismos; si salen, explícalos en una frase simple.',
        'Usa analogías cotidianas.',
      );
      break;
    default:
      lines.push('Equilibra claridad y precisión sin sonar a manual.');
  }

  switch (profile.speechPace) {
    case 'lento':
      lines.push('Baja un poco la velocidad y alarga las pausas, sin arrastrar sílabas.');
      break;
    case 'rapido':
      lines.push('Habla un poco más rápido y conciso, sin atropellarte.');
      break;
    default:
      lines.push('Ritmo natural de conversación (ni metrónomo ni apresurado).');
  }

  switch (profile.responsePreference) {
    case 'corto':
      lines.push('Muy breve (1-3 oraciones habladas). Pregunta si quiere más detalle.');
      break;
    case 'detallado':
      lines.push(
        'Puedes dar más detalle, pero en prosa hablada: «primero… luego… y al final…», nunca listas numeradas.',
      );
      break;
    default:
      lines.push('Respuestas equilibradas: lo necesario para actuar, sin relleno.');
  }

  switch (profile.formality) {
    case 'formal':
      lines.push('Tratamiento de usted, sin rigidez excesiva.');
      break;
    case 'cercana':
      lines.push('Tratamiento de tú, tono conversacional.');
      break;
    default:
      lines.push('Formalidad media; adapta el tratamiento al del usuario.');
  }

  return lines;
}

/** Reglas fijas para que la voz no suene a TTS / robot. */
export const NATURAL_SPEECH_RULES = [
  'Personalidad: asesora cálida, humana y cercana de cobranzas; no un robot, bot ni locutor de IVR.',
  'Habla como en una llamada real: contracciones naturales (está, vamos, mira, listo), ritmo irregular, pausas breves.',
  'Varía la entonación y la energía; evita el tono plano, monótono o de lectura en voz alta.',
  'Nunca digas viñetas, markdown, asteriscos ni «punto uno / punto dos». Si enumeras, hazlo en prosa.',
  'Prohibido abrir con clichés de IA: «Absolutamente», «Por supuesto», «Claro que sí», «Excelente pregunta», «Como asistente de IA».',
  'Números y montos: dilos de forma natural («un millón quinientos») cuando ayude a la comprensión.',
  'Responde siempre por voz, en español latinoamericano.',
];

function objectivesFor(profile) {
  const goals = [
    'Ayudar a gestionar créditos/deudas del panel: listado, estados (Pendiente, Vencida, Pagada), saldos y registro de pagos.',
    'Guiar al administrador con claridad sobre el flujo del módulo de cobranzas.',
    'No inventes datos de deudas concretas si no te los proporcionan; pide el dato o indica cómo verlo en pantalla.',
  ];

  if (profile.emotion === 'frustrado' || profile.emotion === 'ansioso') {
    goals.unshift('Prioriza calmar y orientar; el objetivo inmediato es reducir fricción, luego completar la tarea.');
  }
  if (profile.technicalLevel === 'alto') {
    goals.push('Puedes ser directo con acciones concretas del panel (filtros, detalle, pago parcial/total).');
  }
  if (profile.ageBand === 'mayor' || profile.technicalLevel === 'bajo') {
    goals.push('Objetivo: que la persona complete un paso seguro a la vez sin abrumarse.');
  }
  return goals;
}

/**
 * Instrucciones dinámicas para session.update.
 * Misma voz; se adaptan velocidad, tono, expresividad y vocabulario vía prompt.
 */
export function buildRealtimeInstructions(profileInput) {
  const profile = mergeProfile(createDefaultProfile(), profileInput);
  const voice = voiceStyleFor(profile);
  const goals = objectivesFor(profile);

  return [
    'Eres el asistente de voz de «Gestiona tus créditos» (módulo de cobranzas de CocinaStore).',
    'No digas que estás analizando al usuario ni menciones el perfil interno.',
    'Cuando detectes cambios claros en edad aproximada, nivel técnico, emoción, ritmo o preferencia de detalle, llama a la función update_user_profile (en silencio respecto al usuario).',
    '',
    '## Habla natural (prioridad alta)',
    ...NATURAL_SPEECH_RULES.map((l) => `- ${l}`),
    '',
    '## Perfil temporal actual',
    `- Edad aproximada: ${profile.ageBand}`,
    `- Nivel técnico: ${profile.technicalLevel}`,
    `- Emoción: ${profile.emotion}`,
    `- Ritmo al hablar: ${profile.speechPace}`,
    `- Preferencia de respuesta: ${profile.responsePreference}`,
    `- Formalidad: ${profile.formality}`,
    `- Confianza del perfil: ${profile.confidence}`,
    profile.notes ? `- Notas: ${profile.notes}` : null,
    '',
    '## Cómo debes sonar ahora (misma voz, distinto estilo)',
    ...voice.map((l) => `- ${l}`),
    '',
    '## Objetivos de esta conversación',
    ...goals.map((g) => `- ${g}`),
  ]
    .filter(Boolean)
    .join('\n');
}

export function profileLabel(profile) {
  if (!profile) return 'Sin perfil';
  return `${profile.emotion} · ${profile.technicalLevel} · ${profile.ageBand}`;
}
