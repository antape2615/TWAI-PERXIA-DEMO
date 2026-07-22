import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Catalog from './Catalog';
import { CATALOG_VIEW_STORAGE_KEY } from '../utils/catalogViewMode';
import { CATALOG_COLUMNS_STORAGE_KEY } from '../utils/columnValidator';
import { products } from '../data/products';

vi.mock('../components/ProductCard', () => ({
  default: ({ product }) => (
    <article data-testid="product-card-grid">
      {product?.name || 'No disponible'}
    </article>
  ),
}));

vi.mock('../components/ProductListItem', () => ({
  default: ({ product }) => (
    <article data-testid="product-card-list">
      {product?.name || 'No disponible'}
    </article>
  ),
}));

describe('Catalog - view mode switch', () => {
  it('starts in grid mode and tracks initial event', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    render(<Catalog />);

    expect(screen.getByRole('button', { name: 'Cuadrícula' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getAllByTestId('product-card-grid')).toHaveLength(products.length);
    expect(screen.getByText(`Mostrando ${products.length} de ${products.length} productos`)).toBeInTheDocument();

    expect(infoSpy).toHaveBeenCalledWith(
      '[CatalogView]',
      expect.objectContaining({
        action: 'ModoVisualizacionInicial',
        value: 'grid',
      })
    );
  });

  it('switches to list mode, keeps product count and persists preference', async () => {
    const user = userEvent.setup();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    render(<Catalog />);
    await user.click(screen.getByRole('button', { name: 'Lista' }));

    expect(screen.getByRole('button', { name: 'Cuadrícula' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('product-card-list')).toHaveLength(products.length);
    expect(screen.getByText(`Mostrando ${products.length} de ${products.length} productos`)).toBeInTheDocument();
    expect(window.localStorage.getItem(CATALOG_VIEW_STORAGE_KEY)).toBe('list');

    expect(infoSpy).toHaveBeenCalledWith(
      '[CatalogView]',
      expect.objectContaining({
        action: 'CambioModoVisualizacion',
        value: 'list',
        status: 'ok',
      })
    );
  });

  it('loads list mode from localStorage on first render', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    window.localStorage.setItem(CATALOG_VIEW_STORAGE_KEY, 'list');

    render(<Catalog />);

    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByTestId('product-card-list')).toHaveLength(products.length);

    expect(infoSpy).toHaveBeenCalledWith(
      '[CatalogView]',
      expect.objectContaining({
        action: 'PreferenciaModoLeida',
        value: 'list',
        source: 'local_storage',
      })
    );
  });

  it('falls back to grid mode when saving preference fails', async () => {
    const user = userEvent.setup();
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const storagePrototype = Object.getPrototypeOf(window.localStorage);
    const setItemSpy = vi.spyOn(storagePrototype, 'setItem');

    setItemSpy.mockImplementation((key, value) => {
      if (key === CATALOG_VIEW_STORAGE_KEY && value === 'list') {
        throw new Error('storage blocked');
      }
      return undefined;
    });

    render(<Catalog />);
    await user.click(screen.getByRole('button', { name: 'Lista' }));

    expect(screen.getByRole('button', { name: 'Cuadrícula' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('No fue posible guardar tu preferencia de vista.')).toBeInTheDocument();

    expect(infoSpy).toHaveBeenCalledWith(
      '[CatalogView]',
      expect.objectContaining({
        action: 'CambioModoVisualizacion',
        value: 'grid',
        status: 'fallback',
      })
    );
  });

  it('maintains counter and no-results message in both modes', async () => {
    const user = userEvent.setup();
    render(<Catalog />);

    const searchInput = screen.getByRole('searchbox', { name: 'Buscar productos' });
    await user.type(searchInput, 'producto inexistente');

    expect(screen.getByText('Mostrando 0 de 0 productos')).toBeInTheDocument();
    expect(screen.getByText(/No se encontraron productos/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lista' }));

    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Mostrando 0 de 0 productos')).toBeInTheDocument();
    expect(screen.getByText(/No se encontraron productos/i)).toBeInTheDocument();
  });
});

describe('Catalog - column preference', () => {
  beforeEach(() => {
    window.localStorage.removeItem(CATALOG_COLUMNS_STORAGE_KEY);
    window.localStorage.removeItem(CATALOG_VIEW_STORAGE_KEY);
  });

  it('shows column control only in grid mode', async () => {
    const user = userEvent.setup();
    render(<Catalog />);

    expect(screen.getByRole('region', { name: 'Configuración de columnas' })).toBeInTheDocument();
    expect(screen.getByLabelText('Número de columnas (1-5)')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Lista' }));

    expect(screen.queryByRole('region', { name: 'Configuración de columnas' })).not.toBeInTheDocument();
  });

  it('applies data-columns when user sets 4 columns', async () => {
    const user = userEvent.setup();
    render(<Catalog />);

    const columnInput = screen.getByLabelText('Número de columnas (1-5)');
    await user.clear(columnInput);
    await user.type(columnInput, '4');

    const productSection = screen.getByLabelText('Listado de productos con 4 columna(s)');
    expect(productSection).toHaveAttribute('data-columns', '4');
    expect(window.localStorage.getItem(CATALOG_COLUMNS_STORAGE_KEY)).toBe('4');
  });

  it('shows error for invalid column values and does not persist', async () => {
    const user = userEvent.setup();
    render(<Catalog />);

    const columnInput = screen.getByLabelText('Número de columnas (1-5)');
    await user.clear(columnInput);
    await user.type(columnInput, '0');

    expect(screen.getByRole('alert')).toHaveTextContent(/entre 1 y 5/i);
    expect(window.localStorage.getItem(CATALOG_COLUMNS_STORAGE_KEY)).toBeNull();
  });

  it('loads column preference from localStorage on first render', () => {
    window.localStorage.setItem(CATALOG_COLUMNS_STORAGE_KEY, '2');

    render(<Catalog />);

    expect(screen.getByLabelText('Número de columnas (1-5)')).toHaveValue(2);
    expect(screen.getByLabelText('Listado de productos con 2 columna(s)')).toHaveAttribute(
      'data-columns',
      '2'
    );
  });

  it('resets columns to default with Restablecer button', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(CATALOG_COLUMNS_STORAGE_KEY, '5');

    render(<Catalog />);

    await user.click(screen.getByRole('button', { name: 'Restablecer columnas a valor por defecto' }));

    expect(screen.getByLabelText('Número de columnas (1-5)')).toHaveValue(3);
    expect(window.localStorage.getItem(CATALOG_COLUMNS_STORAGE_KEY)).toBe('3');
    expect(screen.getByLabelText('Listado de productos con 3 columna(s)')).toBeInTheDocument();
  });

  it('shows device indicator with breakpoint info', () => {
    render(<Catalog />);

    expect(screen.getByText(/Dispositivo:/i)).toBeInTheDocument();
    expect(screen.getByText(/máx \d+ col/i)).toBeInTheDocument();
  });
});
