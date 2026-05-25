import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPublicConfig } from '../services/api';
import { DEFAULT_BRAND_THEME, getBrandThemeVars, getLogoPalette } from '../utils/brandTheme';

const modules = [
  'Catalogo web con pedidos',
  'Cotizaciones en PDF',
  'Control de stock',
  'Clientes y seguimiento',
  'Facturacion interna',
  'Marca adaptable al logo'
];

const benefits = [
  'Convierte consultas por WhatsApp en pedidos ordenados.',
  'Evita vender productos sin stock disponible.',
  'Entrega cotizaciones formales y descargables.',
  'Centraliza productos, precios, clientes y ventas.'
];

const Presentacion = () => {
  const [config, setConfig] = useState(null);
  const [theme, setTheme] = useState(DEFAULT_BRAND_THEME);

  useEffect(() => {
    let mounted = true;

    getPublicConfig()
      .then(response => {
        if (mounted) setConfig(response.data);
      })
      .catch(error => {
        console.error('Error al cargar marca publica:', error);
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

  const storeName = config?.SUPERMERCADO_NOMBRE || 'Comercial Pro';
  const storeLogo = config?.SUPERMERCADO_LOGO;
  const storePhone = config?.SUPERMERCADO_TELEFONO;
  const storeEmail = config?.SUPERMERCADO_EMAIL;
  const themeVars = getBrandThemeVars(theme);

  return (
    <main className="min-h-screen overflow-hidden text-stone-950" style={{ ...themeVars, background: 'var(--brand-surface)' }}>
      <section className="relative isolate px-6 py-8 sm:px-10 lg:px-16">
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: `radial-gradient(circle at top left, var(--brand-secondary) 0, transparent 34%), radial-gradient(circle at 80% 20%, var(--brand-soft) 0, transparent 28%), linear-gradient(135deg, #fffaf1, var(--brand-surface))`
          }}
        />
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-stone-200/80 bg-white/70 px-5 py-3 shadow-sm backdrop-blur">
          <Link to="/presentacion" className="flex min-w-0 items-center gap-3">
            {storeLogo ? (
              <img src={storeLogo} alt={storeName} className="h-9 w-9 rounded-full object-contain" />
            ) : (
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-black"
                style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
              >
                {storeName.charAt(0)}
              </span>
            )}
            <span className="truncate text-sm font-black uppercase tracking-[0.18em]" style={{ color: 'var(--brand-primary)' }}>
              {storeName}
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm font-bold">
            <Link to="/catalogo" className="rounded-full px-4 py-2 text-stone-700 hover:bg-stone-100">
              Ver catalogo
            </Link>
            <Link
              to="/login"
              className="rounded-full px-4 py-2 shadow-lg shadow-stone-950/15"
              style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
            >
              Entrar al panel
            </Link>
          </div>
        </nav>

        <div className="mx-auto grid max-w-7xl items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <p
              className="mb-5 inline-flex rounded-full border bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.22em]"
              style={{ borderColor: 'var(--brand-soft)', color: 'var(--brand-primary)' }}
            >
              Sistema comercial para supermercados y distribuidoras
            </p>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.05em] text-stone-950 sm:text-7xl">
              {storeName}: vende con catalogo, cotiza profesional y controla tu stock.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-700">
              Una plataforma lista para operar pedidos web, cotizaciones, clientes e inventario desde un panel simple. Pensada para negocios que quieren verse mas serios y vender con menos desorden.
            </p>
            {(storePhone || storeEmail) && (
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold text-stone-700">
                {storePhone && <span className="rounded-full bg-white/70 px-4 py-2">Tel: {storePhone}</span>}
                {storeEmail && <span className="rounded-full bg-white/70 px-4 py-2">{storeEmail}</span>}
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/catalogo"
                className="rounded-2xl px-7 py-4 text-center text-sm font-black uppercase tracking-[0.14em] shadow-xl"
                style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
              >
                Probar catalogo
              </Link>
              <Link to="/login" className="rounded-2xl border border-stone-300 bg-white/70 px-7 py-4 text-center text-sm font-black uppercase tracking-[0.14em] text-stone-900 hover:bg-white">
                Administrar
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -left-8 -top-8 h-28 w-28 rounded-full blur-2xl" style={{ background: 'var(--brand-secondary)', opacity: 0.65 }} />
            <div className="rounded-[2rem] border border-white/80 bg-white/80 p-5 shadow-2xl shadow-stone-900/10 backdrop-blur">
              <div className="rounded-[1.5rem] p-5" style={{ background: 'var(--brand-primary-dark)', color: 'var(--brand-on-primary)' }}>
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/70">Ventas de hoy</p>
                    <p className="mt-2 text-3xl font-black">$1.248.900</p>
                  </div>
                  <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--brand-secondary)', color: '#111827' }}>+18%</span>
                </div>
                <div className="mt-5 grid gap-3">
                  {benefits.map((benefit) => (
                    <div key={benefit} className="rounded-2xl bg-white/8 p-4 text-sm text-stone-100">
                      {benefit}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {modules.map((module) => (
                  <div key={module} className="rounded-2xl border border-stone-200 p-4 text-sm font-bold text-stone-800" style={{ background: 'var(--brand-soft)' }}>
                    {module}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Presentacion;
