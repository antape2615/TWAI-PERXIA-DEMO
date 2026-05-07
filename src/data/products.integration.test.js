import assert from 'node:assert';
import { describe, it } from 'node:test';
import { products, getProductById } from './products.js';

describe('products data', () => {
  it('exporta catálogo validado con al menos 11 ítems', () => {
    assert.ok(Array.isArray(products));
    assert.ok(products.length >= 11);
  });

  it('getProductById resuelve el nuevo set de utensilios', () => {
    const p = getProductById('11');
    assert.ok(p);
    assert.ok(p.name.includes('Utensilios'));
    assert.strictEqual(p.category, 'Utensilios');
  });
});
