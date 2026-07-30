import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Cobranzas from './Cobranzas';
import { MSG_ACCESO_NO_AUTORIZADO } from '../../utils/cobranzasLogic';

const mockFetch = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '../../context/AuthContext';

function renderCobranzas() {
  return render(
    <MemoryRouter>
      <Cobranzas />
    </MemoryRouter>,
  );
}

describe('Cobranzas — RN-01 acceso', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue({
      status: 403,
      ok: false,
      json: async () => ({ ok: false, error: MSG_ACCESO_NO_AUTORIZADO }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('CA-02: usuario no admin ve Acceso no autorizado', async () => {
    useAuth.mockReturnValue({
      user: { email: 'demo@cocina.com', role: 'user' },
    });

    renderCobranzas();

    expect(await screen.findByRole('alert')).toHaveTextContent(MSG_ACCESO_NO_AUTORIZADO);
    expect(mockFetch).toHaveBeenCalled();
  });

  it('redirige a login si no hay sesión', () => {
    useAuth.mockReturnValue({ user: null });
    renderCobranzas();
    expect(screen.queryByText('Gestiona tus créditos')).not.toBeInTheDocument();
  });
});

describe('Cobranzas — admin', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        ok: true,
        items: [
          {
            id: '1',
            nombreUsuario: 'María López',
            saldoPendiente: 1500000,
            fechaVencimiento: '2030-01-15T00:00:00.000Z',
            estado: 'Pendiente',
          },
        ],
        total: 1,
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('CA-01: admin puede ver el módulo de cobranzas', async () => {
    useAuth.mockReturnValue({
      user: { email: 'admin@cocina.com', role: 'admin' },
    });

    renderCobranzas();

    expect(await screen.findByRole('heading', { name: /Gestiona tus créditos/i })).toBeInTheDocument();
    expect(await screen.findByText('María López')).toBeInTheDocument();
  });

  it('CA-04: muestra mensaje cuando no hay deudas pendientes', async () => {
    mockFetch.mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        ok: true,
        items: [],
        total: 0,
        mensajeVacio: 'No hay deudas pendientes',
      }),
    });
    useAuth.mockReturnValue({
      user: { email: 'admin@cocina.com', role: 'admin' },
    });

    renderCobranzas();

    expect(await screen.findByText('No hay deudas pendientes')).toBeInTheDocument();
  });
});
