/**
 * Categorías válidas del catálogo CocinaStore (alineadas con `products`).
 */
export const VALID_CATEGORIES = [
  'Sartenes',
  'Electrodomésticos',
  'Cuchillos',
  'Ollas',
  'Utensilios',
  'Café',
];

/** Etiquetas de UI (extensible sin tocar el validador) */
export const CATEGORY_LABELS = Object.fromEntries(
  VALID_CATEGORIES.map((c) => [c, c])
);

export function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] ?? category;
}
