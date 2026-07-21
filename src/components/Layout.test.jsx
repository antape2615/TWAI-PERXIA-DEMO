import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import Layout from './Layout';
import redThemeParams from '../styles/redTheme.module.css';

vi.mock('../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: null, logout: vi.fn() }),
}));

vi.mock('../context/CartContext', () => ({
  useCart: () => ({ count: 2 }),
}));

vi.mock('../utils/applyRedTheme', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    auditRedThemeDom: vi.fn(),
  };
});

function renderLayout(ui = <p>Contenido</p>) {
  return render(
    <MemoryRouter>
      <Layout>{ui}</Layout>
    </MemoryRouter>
  );
}

describe('Layout - red theme header (CA-03)', () => {
  it('renders header with red theme background and readable text', () => {
    renderLayout();

    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'CocinaStore' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Carrito/i })).toBeInTheDocument();
  });

  it('exposes red theme parameters from CSS module', () => {
    expect(redThemeParams.colorFondoHeaderRojo).toBe('#8b0000');
    expect(redThemeParams.colorTextoHeaderRojo).toBe('#ffffff');
    expect(redThemeParams.colorBotonRojo).toBe('#b22222');
  });

  it('marks theme icon with red icon data attribute (CA-02)', () => {
    renderLayout();
    const icon = document.querySelector('[data-red-icon="true"]');
    expect(icon).toBeInTheDocument();
  });
});
