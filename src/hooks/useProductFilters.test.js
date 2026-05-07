import assert from 'node:assert';
import { describe, it } from 'node:test';
import { applyProductFilters } from './useProductFilters.js';

const sample = [
  { id: '1', name: 'Sartén', category: 'Sartenes', price: 100000 },
  { id: '2', name: 'Batidora', category: 'Electrodomésticos', price: 500000 },
];

describe('applyProductFilters', () => {
  it('filtra por nombre sin distinguir mayúsculas', () => {
    const out = applyProductFilters(sample, {
      searchName: 'bat',
      selectedCategory: '',
      priceMin: 0,
      priceMax: 999999,
    });
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].id, '2');
  });

  it('filtra por categoría y rango de precio', () => {
    const out = applyProductFilters(sample, {
      searchName: '',
      selectedCategory: 'Sartenes',
      priceMin: 50000,
      priceMax: 150000,
    });
    assert.strictEqual(out.length, 1);
    assert.strictEqual(out[0].id, '1');
  });

  it('devuelve vacío si el rango de precio excluye todos', () => {
    const out = applyProductFilters(sample, {
      searchName: '',
      selectedCategory: '',
      priceMin: 900000,
      priceMax: 1_000_000,
    });
    assert.strictEqual(out.length, 0);
  });
});
