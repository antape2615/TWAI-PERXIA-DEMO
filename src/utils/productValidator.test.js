import assert from 'node:assert';
import { describe, it } from 'node:test';
import { validateProduct, validateProductsArray } from './productValidator.js';

describe('productValidator', () => {
  const valid = {
    id: '99',
    name: 'Producto de prueba con nombre largo',
    description: 'Descripción suficientemente larga para pasar el mínimo requerido.',
    price: 100000,
    category: 'Utensilios',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400',
    stock: 5,
  };

  it('validateProduct acepta un producto válido', () => {
    const r = validateProduct(valid);
    assert.strictEqual(r.valid, true);
    assert.deepStrictEqual(r.errors, []);
  });

  it('validateProduct rechaza categoría inválida', () => {
    const r = validateProduct({ ...valid, category: 'Garaje' });
    assert.strictEqual(r.valid, false);
    assert.ok(r.errors.some((e) => e.includes('category')));
  });

  it('validateProduct rechaza precio no entero', () => {
    const r = validateProduct({ ...valid, price: 99.5 });
    assert.strictEqual(r.valid, false);
  });

  it('validateProductsArray rechaza IDs duplicados', () => {
    const r = validateProductsArray([
      { ...valid, id: '1' },
      { ...valid, id: '1', name: 'Otro nombre para producto de prueba' },
    ]);
    assert.strictEqual(r.valid, false);
    assert.ok(r.errors.some((e) => e.includes('duplicados')));
  });
});
