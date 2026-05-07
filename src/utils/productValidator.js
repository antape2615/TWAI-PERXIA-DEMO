import { z } from 'zod';
import { VALID_CATEGORIES } from '../constants/productCategories.js';

const categorySchema = z.string().refine((val) => VALID_CATEGORIES.includes(val), {
  message: `Categoría debe ser una de: ${VALID_CATEGORIES.join(', ')}`,
});

const productSchema = z.object({
  id: z.string().min(1, 'ID requerido'),
  name: z.string().min(3, 'Nombre demasiado corto').max(120),
  description: z.string().min(10, 'Descripción demasiado corta').max(600),
  price: z
    .number()
    .int('El precio debe ser entero (COP)')
    .positive('Precio debe ser mayor a 0')
    .max(50_000_000),
  category: categorySchema,
  image: z.string().url('URL de imagen inválida'),
  stock: z.number().int().nonnegative('Stock no puede ser negativo').max(100_000),
  rating: z.number().min(0).max(5).optional(),
  reviews: z.number().int().nonnegative().optional(),
  features: z.array(z.string()).optional(),
});

const productsArraySchema = z.array(productSchema);

/**
 * @param {unknown} product
 * @returns {{ valid: true, errors: [] } | { valid: false, errors: string[] }}
 */
export function validateProduct(product) {
  const result = productSchema.safeParse(product);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join('.') || 'root'}: ${e.message}`),
  };
}

/**
 * @param {unknown} productsList
 * @returns {{ valid: true, errors: [] } | { valid: false, errors: string[] }}
 */
export function validateProductsArray(productsList) {
  const result = productsArraySchema.safeParse(productsList);
  if (!result.success) {
    return {
      valid: false,
      errors: result.error.issues.map((e) => `${e.path.join('.') || 'root'}: ${e.message}`),
    };
  }
  const ids = productsList.map((p) => p.id);
  const unique = new Set(ids);
  if (ids.length !== unique.size) {
    return { valid: false, errors: ['Existen IDs de productos duplicados'] };
  }
  return { valid: true, errors: [] };
}

export function getProductSchema() {
  return productSchema;
}
