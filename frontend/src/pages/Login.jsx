import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPublicConfig } from '../services/api';
import { DEFAULT_BRAND_THEME, getBrandThemeVars, getLogoPalette } from '../utils/brandTheme';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [theme, setTheme] = useState(DEFAULT_BRAND_THEME);

  useEffect(() => {
    let mounted = true;

    getPublicConfig()
      .then(response => {
        if (mounted) setConfig(response.data);
      })
      .catch(error => {
        console.error('Error al cargar marca del login:', error);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'No pudimos iniciar sesion con esos datos');
    } finally {
      setLoading(false);
    }
  };

  const storeName = config?.SUPERMERCADO_NOMBRE || 'Comercial Pro';
  const storeLogo = config?.SUPERMERCADO_LOGO;
  const themeVars = getBrandThemeVars(theme);

  return (
    <main className="min-h-screen text-stone-950" style={{ ...themeVars, background: 'var(--brand-surface)' }}>
      <div className="grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-stone-950 p-12 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-20 top-16 h-72 w-72 rounded-full blur-3xl" style={{ background: 'var(--brand-secondary)', opacity: 0.3 }} />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full blur-3xl" style={{ background: 'var(--brand-primary)', opacity: 0.26 }} />
          <Link to="/presentacion" className="relative flex items-center gap-3 text-sm font-black uppercase tracking-[0.2em] text-amber-100">
            {storeLogo ? (
              <img src={storeLogo} alt={storeName} className="h-10 w-10 rounded-full bg-white/10 object-contain" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--brand-primary)' }}>
                {storeName.charAt(0)}
              </span>
            )}
            <span>{storeName}</span>
          </Link>
          <div className="relative">
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--brand-secondary)' }}>
              Panel administrativo
            </p>
            <h1 className="max-w-xl text-6xl font-black leading-[0.95] tracking-[-0.06em]">
              Controla pedidos, cotizaciones y stock en un solo lugar.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-stone-300">
              Diseñado para que el negocio opere con mejor imagen, menos errores y respuestas mas rapidas al cliente.
            </p>
          </div>
          <div className="relative grid grid-cols-3 gap-3 text-sm">
            {['Stock seguro', 'PDF comercial', 'Catalogo web'].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4 font-bold backdrop-blur">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-10">
          <div className="w-full max-w-md rounded-[2rem] border border-white/80 bg-white/85 p-8 shadow-2xl shadow-stone-900/10 backdrop-blur">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.22em]" style={{ color: 'var(--brand-primary)' }}>Acceso privado</p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-stone-950">Iniciar sesion</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                Ingresa para administrar productos, clientes, cotizaciones y configuracion de marca.
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-stone-700">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:ring-4"
                style={{ '--tw-ring-color': 'var(--brand-soft)' }}
                  placeholder="correo@empresa.com"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-stone-700">Contrasena</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-stone-900 outline-none transition focus:ring-4"
                style={{ '--tw-ring-color': 'var(--brand-soft)' }}
                  placeholder="********"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.16em] shadow-xl shadow-stone-950/15 transition disabled:cursor-not-allowed disabled:opacity-60"
                style={{ background: 'var(--brand-primary)', color: 'var(--brand-on-primary)' }}
              >
                {loading ? 'Entrando...' : 'Entrar al panel'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-sm font-bold">
              <Link to="/catalogo" style={{ color: 'var(--brand-primary)' }}>
                Ver catalogo publico
              </Link>
              <Link to="/presentacion" className="text-stone-500 hover:text-stone-900">
                Presentacion
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default Login;
