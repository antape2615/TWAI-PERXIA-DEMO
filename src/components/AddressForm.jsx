import { useState } from 'react';
import styles from './AddressForm.module.css';

const defaultAddress = {
  label: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  country: 'México',
  phone: '',
};

export default function AddressForm({ address = null, onSubmit, onCancel }) {
  const [form, setForm] = useState(address ? { ...address } : { ...defaultAddress });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <label className={styles.label}>
        Etiqueta (ej. Casa, Oficina)
        <input
          type="text"
          name="label"
          value={form.label}
          onChange={handleChange}
          placeholder="Casa"
          required
          className={styles.input}
        />
      </label>
      <label className={styles.label}>
        Calle y número
        <input
          type="text"
          name="street"
          value={form.street}
          onChange={handleChange}
          placeholder="Calle Principal 123"
          required
          className={styles.input}
        />
      </label>
      <div className={styles.row}>
        <label className={styles.label}>
          Ciudad
          <input
            type="text"
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="Ciudad"
            required
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          Estado
          <input
            type="text"
            name="state"
            value={form.state}
            onChange={handleChange}
            placeholder="Estado"
            required
            className={styles.input}
          />
        </label>
      </div>
      <div className={styles.row}>
        <label className={styles.label}>
          Código postal
          <input
            type="text"
            name="zip"
            value={form.zip}
            onChange={handleChange}
            placeholder="12345"
            required
            className={styles.input}
          />
        </label>
        <label className={styles.label}>
          País
          <input
            type="text"
            name="country"
            value={form.country}
            onChange={handleChange}
            required
            className={styles.input}
          />
        </label>
      </div>
      <label className={styles.label}>
        Teléfono
        <input
          type="tel"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="+52 555 123 4567"
          className={styles.input}
        />
      </label>
      <div className={styles.actions}>
        {onCancel && (
          <button type="button" onClick={onCancel} className={styles.cancelBtn}>
            Cancelar
          </button>
        )}
        <button type="submit" className={styles.submitBtn}>
          {address ? 'Guardar cambios' : 'Guardar dirección'}
        </button>
      </div>
    </form>
  );
}
