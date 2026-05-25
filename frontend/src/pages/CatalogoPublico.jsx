import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicConfig, getPublicProductos, getPublicCategorias, solicitarPedidoPublico } from '../services/api';
import { formatCurrency } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_BRAND_THEME, getBrandThemeVars, getLogoPalette } from '../utils/brandTheme';

const CatalogoPublico = () => {
  const { usuario } = useAuth();
  const [config, setConfig] = useState(null);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [formData, setFormData] = useState({ nombre: '', email: '', telefono: '', direccion: '' });
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(null);
  const [theme, setTheme] = useState(DEFAULT_BRAND_THEME);

  useEffect(() => {
    Promise.all([getPublicConfig(), getPublicProductos(), getPublicCategorias()])
      .then(([confRes, prodRes, catRes]) => {
        setConfig(confRes.data);
        setProductos(prodRes.data);
        setCategorias(catRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const storeName = config?.SUPERMERCADO_NOMBRE || 'Mercado Pro';
  const storePhone = config?.SUPERMERCADO_TELEFONO || '';
  const storeAddress = config?.SUPERMERCADO_DIRECCION || '';
  const storeEmail = config?.SUPERMERCADO_EMAIL || '';

  useEffect(() => {
    let mounted = true;

    getLogoPalette(config?.SUPERMERCADO_LOGO).then(nextTheme => {
      if (mounted) setTheme(nextTheme);
    });

    return () => {
      mounted = false;
    };
  }, [config?.SUPERMERCADO_LOGO]);

  const themeVars = getBrandThemeVars(theme);

  const addToCart = (producto) => {
    setCarrito(prev => {
      const exists = prev.find(item => item.producto_id === producto.id);
      if (exists) {
        return prev.map(item =>
          item.producto_id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [
        ...prev,
        {
          producto_id: producto.id,
          nombre: producto.nombre,
          precio: producto.precio_unitario,
          cantidad: 1
        }
      ];
    });
  };

  const removeFromCart = (id) => {
    setCarrito(prev => prev.filter(item => item.producto_id !== id));
  };

  const updateCantidad = (id, cantidad) => {
    if (cantidad < 1) return;
    setCarrito(prev =>
      prev.map(item => item.producto_id === id ? { ...item, cantidad } : item)
    );
  };

  const subtotal = carrito.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
  const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  const filteredProductos = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return productos.filter(producto => {
      const matchesCategory =
        categoryFilter === 'all' || producto.categoria_id === Number(categoryFilter);
      const matchesSearch =
        !normalizedSearch ||
        producto.nombre?.toLowerCase().includes(normalizedSearch) ||
        producto.descripcion?.toLowerCase().includes(normalizedSearch) ||
        producto.categoria?.toLowerCase().includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [productos, categoryFilter, search]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (carrito.length === 0) return;

    setSending(true);
    try {
      const response = await solicitarPedidoPublico({ ...formData, carrito });
      setSuccess(response.data.numero);
      setCarrito([]);
      setIsCartOpen(false);
      setFormData({ nombre: '', email: '', telefono: '', direccion: '' });
    } catch (error) {
      alert(error.response?.data?.error || 'No pudimos enviar el pedido. Intenta nuevamente.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-600" style={{ background: theme.surface }}>
        Cargando catalogo...
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900" style={{ ...themeVars, background: 'var(--brand-surface)' }}>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/catalogo" className="flex min-w-0 items-center gap-3">
            {config?.SUPERMERCADO_LOGO ? (
              <img src={config.SUPERMERCADO_LOGO} alt={storeName} className="h-11 w-11 rounded-lg object-contain" />
            ) : (
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg font-black" style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}>
                {storeName.charAt(0)}
              </span>
            )}
            <span className="truncate text-base font-black sm:text-lg">{storeName}</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to={usuario ? '/' : '/login'}
              className="hidden rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:inline-flex"
            >
              {usuario ? 'Panel' : 'Admin'}
            </Link>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative rounded-lg px-4 py-2 text-sm font-bold shadow-sm transition"
              style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
            >
              Pedido
              {totalItems > 0 && (
                <span className="absolute -right-2 -top-2 flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-xs text-slate-950" style={{ background: 'var(--brand-secondary)' }}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <section
        className="border-b border-slate-900/10"
        style={{ background: `linear-gradient(135deg, var(--brand-primary-dark) 0%, var(--brand-primary) 52%, var(--brand-secondary) 100%)` }}
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:py-14">
          <div className="text-white">
            <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-white/80">
              Catalogo online
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
              Compra por catalogo y recibe confirmacion del equipo.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/82">
              Elige productos, envia tu pedido y nosotros confirmamos disponibilidad, entrega y total final.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-white/90">
              {storePhone && <span className="rounded-full bg-white/14 px-4 py-2">Tel: {storePhone}</span>}
              {storeAddress && <span className="rounded-full bg-white/14 px-4 py-2">{storeAddress}</span>}
              {storeEmail && <span className="rounded-full bg-white/14 px-4 py-2">{storeEmail}</span>}
            </div>
          </div>

          <div className="rounded-xl border border-white/20 bg-white/16 p-5 text-white shadow-2xl backdrop-blur">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-white/78">Resumen rapido</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-white/14 p-4">
                <p className="text-2xl font-black">{productos.length}</p>
                <p className="mt-1 text-xs text-white/72">Productos</p>
              </div>
              <div className="rounded-lg bg-white/14 p-4">
                <p className="text-2xl font-black">{categorias.length}</p>
                <p className="mt-1 text-xs text-white/72">Categorias</p>
              </div>
              <div className="rounded-lg bg-white/14 p-4">
                <p className="text-2xl font-black">{totalItems}</p>
                <p className="mt-1 text-xs text-white/72">En pedido</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {success ? (
          <section className="mx-auto max-w-xl rounded-xl border bg-white p-8 text-center shadow-sm" style={{ borderColor: 'var(--brand-soft)' }}>
            <p className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--brand-primary)' }}>Pedido recibido</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">Tu solicitud ya quedo registrada</h2>
            <p className="mt-3 text-slate-600">
              Usaremos este folio para confirmar stock, entrega y total final.
            </p>
            <div className="mx-auto mt-6 w-fit rounded-lg px-5 py-4 font-mono text-2xl font-black" style={{ background: 'var(--brand-soft)', color: 'var(--brand-primary)' }}>
              {success}
            </div>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              className="mt-7 rounded-lg px-5 py-3 font-bold transition"
              style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
            >
              Hacer otro pedido
            </button>
          </section>
        ) : (
          <>
            <section className="mb-6 grid gap-3 md:grid-cols-[1fr_auto]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto, categoria o descripcion"
                className="min-h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm outline-none transition focus:ring-4"
                style={{ '--tw-ring-color': 'var(--brand-soft)', borderColor: search ? 'var(--brand-primary)' : undefined }}
              />
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="min-h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold outline-none transition focus:ring-4"
                style={{ '--tw-ring-color': 'var(--brand-soft)' }}
              >
                <option value="all">Todas las categorias</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </section>

            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--brand-primary)' }}>Productos</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  {categoryFilter === 'all'
                    ? 'Catalogo completo'
                    : categorias.find(categoria => categoria.id === Number(categoryFilter))?.nombre}
                </h2>
              </div>
              <span className="text-sm font-semibold text-slate-500">{filteredProductos.length} resultados</span>
            </div>

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProductos.map(producto => (
                <article key={producto.id} className="group flex overflow-hidden rounded-[1.35rem] border border-white/80 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)] ring-1 ring-slate-900/5 transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_70px_rgba(15,23,42,0.14)]">
                  <div className="flex w-full flex-col">
                    <div className="relative h-56 overflow-hidden bg-slate-100">
                      {producto.imagen_url ? (
                        <img src={producto.imagen_url} alt={producto.nombre} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm font-bold" style={{ background: `linear-gradient(135deg, var(--brand-soft), #ffffff)`, color: 'var(--brand-primary)' }}>
                          Producto premium
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-slate-950/8 to-transparent" />
                      <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-slate-800 shadow-sm backdrop-blur">
                        {producto.categoria || 'Catalogo'}
                      </div>
                      <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
                        <div className="rounded-2xl bg-white/92 px-3 py-2 shadow-sm backdrop-blur">
                          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Precio</p>
                          <p className="text-lg font-black text-slate-950">{formatCurrency(producto.precio_unitario)}</p>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black shadow-sm backdrop-blur ${
                            producto.stock_actual > 10
                              ? 'bg-white/92'
                              : producto.stock_actual > 0
                                ? 'bg-amber-50/95 text-amber-800'
                                : 'bg-rose-50/95 text-rose-700'
                          }`}
                          style={producto.stock_actual > 10 ? { color: 'var(--brand-primary)' } : undefined}
                        >
                          {producto.stock_actual > 0 ? `${producto.stock_actual} disp.` : 'Sin stock'}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-xl font-black leading-tight tracking-[-0.02em] text-slate-950">{producto.nombre}</h3>
                      <p className="mt-3 line-clamp-2 min-h-10 text-sm leading-6 text-slate-600">
                        {producto.descripcion || 'Producto disponible para pedido.'}
                      </p>
                      <div className="mt-4 flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: 'var(--brand-soft)' }}>
                        <span className="text-xs font-black uppercase tracking-[0.14em]" style={{ color: 'var(--brand-primary)' }}>
                          Pedido rapido
                        </span>
                        <span className="text-sm font-bold text-slate-600">{producto.unidad_medida || 'unidad'}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(producto)}
                        disabled={producto.stock_actual <= 0}
                        className="mt-4 min-h-12 rounded-2xl px-4 font-black uppercase tracking-[0.08em] text-white shadow-lg transition disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                        style={producto.stock_actual > 0 ? { background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' } : undefined}
                      >
                        {producto.stock_actual > 0 ? 'Agregar al pedido' : 'Sin stock'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            {filteredProductos.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
                No encontramos productos con esos filtros.
              </div>
            )}
          </>
        )}
      </main>

      {isCartOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar carrito"
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => setIsCartOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--brand-primary)' }}>Checkout</p>
                <h2 className="text-xl font-black text-slate-950">Tu pedido</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                X
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {carrito.length === 0 ? (
                <p className="rounded-lg bg-slate-50 p-5 text-center text-slate-500">El pedido esta vacio.</p>
              ) : (
                <div className="space-y-3">
                  {carrito.map(item => (
                    <div key={item.producto_id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-black leading-snug text-slate-950">{item.nombre}</h3>
                          <p className="mt-1 text-sm font-bold" style={{ color: 'var(--brand-primary)' }}>{formatCurrency(item.precio)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.producto_id)}
                          className="text-sm font-bold text-rose-600 hover:text-rose-700"
                        >
                          Quitar
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-slate-200">
                          <button
                            type="button"
                            onClick={() => updateCantidad(item.producto_id, item.cantidad - 1)}
                            className="h-9 w-9 font-black text-slate-600 hover:bg-slate-50"
                          >
                            -
                          </button>
                          <span className="w-10 text-center text-sm font-black">{item.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => updateCantidad(item.producto_id, item.cantidad + 1)}
                            className="h-9 w-9 font-black text-slate-600 hover:bg-slate-50"
                          >
                            +
                          </button>
                        </div>
                        <span className="font-black text-slate-950">{formatCurrency(item.precio * item.cantidad)}</span>
                      </div>
                    </div>
                  ))}

                  <div className="rounded-lg p-4" style={{ background: 'var(--brand-primary-dark)', color: 'var(--brand-on-primary)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white/70">Subtotal referencial</span>
                      <span className="text-2xl font-black">{formatCurrency(subtotal)}</span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/62">
                      El total final se confirma con disponibilidad, impuestos y condiciones de entrega.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4" style={{ borderColor: 'var(--brand-soft)', background: 'var(--brand-soft)' }}>
                    <h3 className="font-black text-slate-950">Datos de contacto</h3>
                    <input
                      required
                      value={formData.nombre}
                      onChange={event => setFormData({ ...formData, nombre: event.target.value })}
                      placeholder="Nombre completo"
                      className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                    />
                    <input
                      required
                      type="email"
                      value={formData.email}
                      onChange={event => setFormData({ ...formData, email: event.target.value })}
                      placeholder="Correo electronico"
                      className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                    />
                    <input
                      value={formData.telefono}
                      onChange={event => setFormData({ ...formData, telefono: event.target.value })}
                      placeholder="Telefono o WhatsApp"
                      className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                    />
                    <input
                      value={formData.direccion}
                      onChange={event => setFormData({ ...formData, direccion: event.target.value })}
                      placeholder="Direccion de entrega"
                      className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none"
                    />
                    <button
                      type="submit"
                      disabled={sending || carrito.length === 0}
                      className="min-h-12 w-full rounded-lg px-4 font-black transition disabled:cursor-not-allowed disabled:bg-slate-300"
                      style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
                    >
                      {sending ? 'Enviando pedido...' : 'Enviar pedido'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default CatalogoPublico;
