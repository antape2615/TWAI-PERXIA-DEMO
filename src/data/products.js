// Imágenes: Wikimedia Commons (uso conforme a sus licencias por archivo).
export const products = [
  {
    id: '1',
    name: 'Nonstick Frying Pan Set',
    price: 89.99,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Hahn_29cm_Frying_Pan.jpg/500px-Hahn_29cm_Frying_Pan.jpg',
    category: 'Sartenes',
    description: 'Set de 3 sartenes de aluminio con recubrimiento antiadherente, aptas para inducción.',
    stock: 15,
  },
  {
    id: '2',
    name: 'Professional Stand Mixer',
    price: 129.99,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d9/White_KitchenAid_mixer_%28KSM150PSWH%29.jpg/500px-White_KitchenAid_mixer_%28KSM150PSWH%29.jpg',
    category: 'Electrodomésticos',
    description: '1000W, 5 velocidades + turbo, bowl de acero inoxidable 4.8L.',
    stock: 8,
  },
  {
    id: '3',
    name: 'Japanese Kitchen Knives',
    price: 159.99,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Chef%27s_knife.jpg/500px-Chef%27s_knife.jpg',
    category: 'Cuchillos',
    description: 'Set de 5 piezas en acero inoxidable VG-10, mango ergonómico.',
    stock: 12,
  },
  {
    id: '4',
    name: 'Electric Pressure Cooker',
    price: 79.99,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/Pressure_cooker.jpg/500px-Pressure_cooker.jpg',
    category: 'Ollas',
    description: '6L, panel digital, 11 programas, cocción rápida y segura.',
    stock: 20,
  },
  {
    id: '5',
    name: 'Bamboo Cutting Board',
    price: 34.99,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Cutting_board.jpg/500px-Cutting_board.jpg',
    category: 'Utensilios',
    description: '40x30 cm, antibacteriana, con canal para jugos.',
    stock: 30,
  },
  {
    id: '6',
    name: 'Manual Espresso Maker',
    price: 69.99,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Moka_pot.jpg/500px-Moka_pot.jpg',
    category: 'Café',
    description: 'Moka italiana 6 tazas, aluminio, estufa e inducción.',
    stock: 25,
  },
  {
    id: '7',
    name: 'Cookware Set',
    price: 199.99,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/All-Clad_Copper_Core_pots.jpeg/500px-All-Clad_Copper_Core_pots.jpeg',
    category: 'Ollas',
    description: '12 piezas en acero inoxidable 18/10, incluye tapas y mangos.',
    stock: 10,
  },
  {
    id: '8',
    name: 'Multifunction Food Processor',
    price: 349.99,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Cuisinart_food_processor.jpg/500px-Cuisinart_food_processor.jpg',
    category: 'Electrodomésticos',
    description: 'Amasa, tritura, cocina al vapor. Bowl 2.3L, pantalla táctil.',
    stock: 6,
  },
  {
    id: '9',
    name: 'Marble Mortar',
    price: 44.99,
    image:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Mortar_and_pestle.jpg/500px-Mortar_and_pestle.jpg',
    category: 'Utensilios',
    description: 'Mármol natural, diámetro 15 cm, mano incluida.',
    stock: 18,
  },
  {
    id: '10',
    name: '2-Slice Toaster',
    price: 49.99,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Toaster.jpg/500px-Toaster.jpg',
    category: 'Electrodomésticos',
    description: '6 niveles de tostado, bandeja extraíble, función descongelar.',
    stock: 22,
  },
];

export const getProductById = (id) => products.find((p) => p.id === id);
