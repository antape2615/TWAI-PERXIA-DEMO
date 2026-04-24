export const products = [
  {
    id: '1',
    name: 'Juego de Sartenes Antiadherente',
    price: 359000,
    image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400',
    category: 'Sartenes',
    description: 'Set de 3 sartenes de aluminio con recubrimiento antiadherente, aptas para inducción.',
    stock: 15,
  },
  {
    id: '2',
    name: 'Batidora de Pie Profesional',
    price: 519000,
    image: 'https://images.unsplash.com/photo-1570222094112-d2a5b2f4ddbb?w=400',
    category: 'Electrodomésticos',
    description: '1000W, 5 velocidades + turbo, bowl de acero inoxidable 4.8L.',
    stock: 8,
  },
  {
    id: '3',
    name: 'Cuchillos de Cocina Japoneses',
    price: 639000,
    image: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=400',
    category: 'Cuchillos',
    description: 'Set de 5 piezas en acero inoxidable VG-10, mango ergonómico.',
    stock: 12,
  },
  {
    id: '4',
    name: 'Olla a Presión Eléctrica',
    price: 319000,
    image: 'https://images.unsplash.com/photo-1584990347492-2b4252f1b0e6?w=400',
    category: 'Ollas',
    description: '6L, panel digital, 11 programas, cocción rápida y segura.',
    stock: 20,
  },
  {
    id: '5',
    name: 'Tabla de Cortar Bambú',
    price: 139000,
    image: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400',
    category: 'Utensilios',
    description: '40x30 cm, antibacteriana, con canal para jugos.',
    stock: 30,
  },
  {
    id: '6',
    name: 'Cafetera Espresso Manual',
    price: 279000,
    image: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=400',
    category: 'Café',
    description: 'Moka italiana 6 tazas, aluminio, estufa e inducción.',
    stock: 25,
  },
  {
    id: '7',
    name: 'Set de Batería de Cocina',
    price: 799000,
    image: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400',
    category: 'Ollas',
    description: '12 piezas en acero inoxidable 18/10, incluye tapas y mangos.',
    stock: 10,
  },
  {
    id: '8',
    name: 'Robot de Cocina Multifunción',
    price: 1399000,
    image: 'https://images.unsplash.com/photo-1570222094112-d2a5b2f4ddbb?w=400',
    category: 'Electrodomésticos',
    description: 'Amasa, tritura, cocina al vapor. Bowl 2.3L, pantalla táctil.',
    stock: 6,
  },
  {
    id: '9',
    name: 'Mortero de Mármol',
    price: 179000,
    image: 'https://images.unsplash.com/photo-1556909212-d5b604d0c90d?w=400',
    category: 'Utensilios',
    description: 'Mármol natural, diámetro 15 cm, mano incluida.',
    stock: 18,
  },
  {
    id: '10',
    name: 'Tostadora 2 Ranuras',
    price: 199000,
    image: 'https://images.unsplash.com/photo-1565183928294-7d22bb2c1c8e?w=400',
    category: 'Electrodomésticos',
    description: '6 niveles de tostado, bandeja extraíble, función descongelar.',
    stock: 22,
  },
];

export const getProductById = (id) => products.find((p) => p.id === id);

export const getCategories = () => {
  const unique = new Set(products.map((p) => p.category));
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'es'));
};

