// Usuarios de demostración (no reales). Para probar: usuario "demo" / contraseña "demo123"
export const demoUsers = [
  {
    id: 'u1',
    email: 'demo@cocina.com',
    password: 'demo123',
    name: 'Usuario Demo',
    addresses: [
      {
        id: 'a1',
        label: 'Casa',
        street: 'Calle Principal 123',
        city: 'Ciudad',
        state: 'Estado',
        zip: '12345',
        country: 'México',
        phone: '+52 555 123 4567',
      },
      {
        id: 'a2',
        label: 'Oficina',
        street: 'Av. Reforma 456',
        city: 'Ciudad',
        state: 'Estado',
        zip: '12340',
        country: 'México',
        phone: '+52 555 987 6543',
      },
    ],
  },
];

export const findUserByEmail = (email) => demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());

export const validateUser = (email, password) => {
  const user = findUserByEmail(email);
  if (!user || user.password !== password) return null;
  const { password: _, ...safeUser } = user;
  return safeUser;
};
