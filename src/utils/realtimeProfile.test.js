import {
  buildRealtimeInstructions,
  createDefaultProfile,
  mergeProfile,
  profileLabel,
} from './realtimeProfile';

describe('realtimeProfile', () => {
  it('mergeProfile combina parches sin perder defaults', () => {
    const base = createDefaultProfile();
    const merged = mergeProfile(base, {
      emotion: 'frustrado',
      technicalLevel: 'alto',
      confidence: 0.8,
    });
    expect(merged.emotion).toBe('frustrado');
    expect(merged.technicalLevel).toBe('alto');
    expect(merged.ageBand).toBe('desconocido');
    expect(merged.confidence).toBe(0.8);
    expect(merged.updatedAt).toBeTruthy();
  });

  it('buildRealtimeInstructions adapta tono para usuario frustrado', () => {
    const instructions = buildRealtimeInstructions({
      emotion: 'frustrado',
      speechPace: 'rapido',
      responsePreference: 'corto',
    });
    expect(instructions).toMatch(/calma/i);
    expect(instructions).toMatch(/empatía|frustrante/i);
    expect(instructions).toMatch(/Habla natural/i);
    expect(instructions).toMatch(/Gestiona tus créditos/i);
  });

  it('buildRealtimeInstructions adapta para usuario técnico', () => {
    const instructions = buildRealtimeInstructions({
      technicalLevel: 'alto',
      ageBand: 'adulto',
    });
    expect(instructions).toMatch(/términos técnicos/i);
    expect(instructions).toMatch(/al grano/i);
  });

  it('buildRealtimeInstructions adapta para usuario mayor', () => {
    const instructions = buildRealtimeInstructions({
      ageBand: 'mayor',
      technicalLevel: 'bajo',
    });
    expect(instructions).toMatch(/despacio/i);
    expect(instructions).toMatch(/jerga/i);
    expect(instructions).toMatch(/paso/i);
  });

  it('buildRealtimeInstructions prioriza habla natural no robótica', () => {
    const instructions = buildRealtimeInstructions({});
    expect(instructions).toMatch(/contracciones/i);
    expect(instructions).toMatch(/robot/i);
    expect(instructions).not.toMatch(/pasos numerados/i);
  });

  it('buildRealtimeInstructions adapta para usuario joven', () => {
    const instructions = buildRealtimeInstructions({
      ageBand: 'joven',
      formality: 'cercana',
    });
    expect(instructions).toMatch(/dinámica/i);
    expect(instructions).toMatch(/cercana/i);
  });

  it('profileLabel resume el perfil', () => {
    expect(profileLabel({ emotion: 'neutro', technicalLevel: 'medio', ageBand: 'adulto' })).toBe(
      'neutro · medio · adulto',
    );
  });
});
