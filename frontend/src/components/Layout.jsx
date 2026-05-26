import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConfiguracion } from '../services/api';
import { DEFAULT_BRAND_THEME, getBrandThemeVars, getLogoPalette } from '../utils/brandTheme';

const Layout = ({ children }) => {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [theme, setTheme] = useState(DEFAULT_BRAND_THEME);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: 'DB' },
    { path: '/cotizaciones', label: 'Cotizaciones', icon: 'CT' },
    { path: '/cotizaciones/nueva', label: 'Nueva cotizacion', icon: '+' },
    { path: '/clientes', label: 'Clientes', icon: 'CL' },
    { path: '/productos', label: 'Productos', icon: 'PR', adminOnly: true },
    { path: '/reportes', label: 'Reportes', icon: 'RP', adminOnly: true },
    { path: '/categorias', label: 'Categorias', icon: 'CA', adminOnly: true },
    { path: '/configuraciones', label: 'Configuracion', icon: 'CF', adminOnly: true },
    { path: '/catalogo', label: 'Catalogo web', icon: 'WEB' }
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleMenuItems = menuItems.filter(item => !item.adminOnly || usuario?.rol === 'admin');

  useEffect(() => {
    let mounted = true;

    getConfiguracion()
      .then(response => {
        if (mounted) setConfig(response.data);
      })
      .catch(error => {
        console.error('Error al cargar marca del panel:', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    getLogoPalette(config?.SUPERMERCADO_LOGO).then(nextTheme => {
      if (mounted) setTheme(nextTheme);
    });

    return () => {
      mounted = false;
    };
  }, [config?.SUPERMERCADO_LOGO]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';

    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  if (!usuario) return null;

  const storeName = config?.SUPERMERCADO_NOMBRE || 'Comercial Pro';
  const storeLogo = config?.SUPERMERCADO_LOGO;
  const themeVars = getBrandThemeVars(theme);

  return (
    <div className="min-h-screen" style={{ ...themeVars, background: 'var(--brand-surface)' }}>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            {storeLogo ? (
              <img src={storeLogo} alt={storeName} className="h-10 w-10 shrink-0 rounded-lg object-contain" />
            ) : (
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black"
                style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
              >
                {storeName.charAt(0)}
              </span>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-base font-black text-slate-950 sm:text-lg">{storeName}</h1>
              <p className="hidden text-xs font-semibold text-slate-500 sm:block">Cotizaciones, catalogo e inventario</p>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm font-semibold text-slate-600 sm:inline">{usuario.nombre}</span>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50 md:hidden"
              aria-label="Abrir menu"
              aria-expanded={mobileMenuOpen}
            >
              <span className="grid gap-1">
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
                <span className="block h-0.5 w-4 rounded-full bg-current" />
              </span>
              Menu
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="hidden rounded-lg px-3 py-2 text-sm font-bold transition sm:inline-flex"
              style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/45"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Cerrar menu"
          />
          <aside className="absolute left-0 top-0 flex h-full w-[min(86vw,22rem)] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
              <div className="flex min-w-0 items-center gap-3">
                {storeLogo ? (
                  <img src={storeLogo} alt={storeName} className="h-10 w-10 shrink-0 rounded-lg object-contain" />
                ) : (
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-black"
                    style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
                  >
                    {storeName.charAt(0)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-950">{storeName}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{usuario.nombre}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-xl font-black text-slate-700"
                aria-label="Cerrar menu"
              >
                ×
              </button>
            </div>

            <nav className="grid flex-1 content-start gap-1 overflow-y-auto p-3">
              {visibleMenuItems.map((item) => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition ${
                      active
                        ? ''
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                    style={active ? { background: 'var(--brand-soft)', color: 'var(--brand-primary)' } : undefined}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[11px] font-black"
                      style={active ? { background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' } : { background: '#f1f5f9' }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-lg px-4 py-3 text-sm font-black transition"
                style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
              >
                Salir
              </button>
            </div>
          </aside>
        </div>
      )}

      <div className="mx-auto flex max-w-7xl">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
          <nav className="sticky top-[65px] grid gap-1 p-3">
            {visibleMenuItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-bold transition ${
                    active
                      ? ''
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`}
                  style={active ? { background: 'var(--brand-soft)', color: 'var(--brand-primary)' } : undefined}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-black"
                    style={active ? { background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' } : { background: '#f1f5f9' }}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
