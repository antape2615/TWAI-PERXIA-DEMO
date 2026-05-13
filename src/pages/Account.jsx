import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AddressForm from '../components/AddressForm';
import styles from './Account.module.css';

export default function Account() {
  const { user, updateAddresses } = useAuth();
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const addresses = user?.addresses || [];

  const handleSave = (data) => {
    if (editingId) {
      const updated = addresses.map((a) => (a.id === editingId ? { ...a, ...data } : a));
      updateAddresses(updated);
    } else {
      const newAddr = { ...data, id: `a${crypto.randomUUID()}` };
      updateAddresses([...addresses, newAddr]);
    }
    setEditingId(null);
    setAdding(false);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta dirección?')) {
      updateAddresses(addresses.filter((a) => a.id !== id));
      if (editingId === id) setEditingId(null);
    }
  };

  if (!user) {
    return <Navigate to="/login?from=/cuenta" replace />;
  }

  return (
    <div className={styles.wrapper}>
      <h1>Mi cuenta</h1>
      <p className={styles.email}>{user.email}</p>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2>Direcciones</h2>
          {!adding && !editingId && (
            <button type="button" onClick={() => setAdding(true)} className={styles.addBtn}>
              Añadir dirección
            </button>
          )}
        </div>

        {adding && (
          <div className={styles.formCard}>
            <AddressForm
              onSubmit={handleSave}
              onCancel={() => setAdding(false)}
            />
          </div>
        )}

        {editingId && (
          <div className={styles.formCard}>
            <AddressForm
              address={addresses.find((a) => a.id === editingId)}
              onSubmit={handleSave}
              onCancel={() => setEditingId(null)}
            />
          </div>
        )}

        <ul className={styles.addressList}>
          {addresses.filter((a) => a.id !== editingId).map((addr) => (
            <li key={addr.id} className={styles.addressCard}>
              <div>
                <strong>{addr.label}</strong>
                <p className={styles.addressText}>
                  {addr.street}, {addr.city}, {addr.state} {addr.zip}, {addr.country}
                </p>
                {addr.phone && <p className={styles.phone}>{addr.phone}</p>}
              </div>
              <div className={styles.addressActions}>
                <button
                  type="button"
                  onClick={() => setEditingId(addr.id)}
                  className={styles.editBtn}
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(addr.id)}
                  className={styles.deleteBtn}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>

        {addresses.length === 0 && !adding && (
          <p className={styles.empty}>No tienes direcciones. Añade una para el envío.</p>
        )}
      </section>

      <p className={styles.back}>
        <Link to="/">← Volver al catálogo</Link>
      </p>
    </div>
  );
}
