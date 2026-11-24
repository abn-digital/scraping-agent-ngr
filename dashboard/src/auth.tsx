import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import axios from 'axios';
import { ArrowPathIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import logoNgr from './assets/Logo-ngr.png';
import { Ctx, claveDeMarca, type Sesion, type Usuario } from './sesion';
import { AnimacionLogin } from './AnimacionLogin';

// Sesión de la v1. Misma cookie y mismas rutas /api/auth/* que la v2: entrar
// por una deja entrar por la otra. Lo que la cuenta no puede ver ya lo filtra
// el server; esto recorta las listas del cliente y esconde lo que no puede hacer.

type Estado =
  | { tipo: 'cargando' }
  | { tipo: 'error' }
  | { tipo: 'sin-sesion' }
  | { tipo: 'con-sesion'; usuario: Usuario; cambiando: boolean };

const mensajeDe = (err: unknown, respaldo: string) => {
  const m = axios.isAxiosError(err) ? err.response?.data?.error : null;
  return typeof m === 'string' && m ? m : respaldo;
};

export function AuthGate({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  const cargar = useCallback(
    () =>
      axios.get<{ usuario: Usuario | null }>('/api/auth/me').then(
        (r) => {
          const u = r.data.usuario;
          setEstado(u ? { tipo: 'con-sesion', usuario: u, cambiando: u.mustChangePassword } : { tipo: 'sin-sesion' });
        },
        () => setEstado({ tipo: 'error' }),
      ),
    [],
  );

  useEffect(() => {
    let vivo = true;
    axios.get<{ usuario: Usuario | null }>('/api/auth/me').then(
      (r) => {
        if (!vivo) return;
        const u = r.data.usuario;
        setEstado(u ? { tipo: 'con-sesion', usuario: u, cambiando: u.mustChangePassword } : { tipo: 'sin-sesion' });
      },
      () => vivo && setEstado({ tipo: 'error' }),
    );
    return () => { vivo = false; };
  }, []);

  // Si en medio del uso la sesión se cae (venció, la desactivaron, le
  // resetearon la clave), cualquier /api lo dice y se vuelve al login.
  useEffect(() => {
    const id = axios.interceptors.response.use(undefined, (err) => {
      const status = err?.response?.status;
      const url: string = err?.config?.url || '';
      if (!url.startsWith('/api/auth/')) {
        if (status === 401) setEstado({ tipo: 'sin-sesion' });
        else if (status === 403 && err.response?.data?.code === 'MUST_CHANGE_PASSWORD') void cargar();
      }
      return Promise.reject(err);
    });
    return () => axios.interceptors.response.eject(id);
  }, [cargar]);

  if (estado.tipo === 'cargando') {
    return (
      <Pantalla>
        <div className="flex justify-center py-10" role="status">
          <ArrowPathIcon className="w-6 h-6 text-slate-300 animate-spin" />
          <span className="sr-only">Cargando</span>
        </div>
      </Pantalla>
    );
  }
  if (estado.tipo === 'error') {
    return (
      <Pantalla titulo="No se pudo conectar" bajada="El servidor no respondió. Probá de nuevo en unos segundos.">
        <button onClick={() => { setEstado({ tipo: 'cargando' }); void cargar(); }} className={BOTON}>
          Reintentar
        </button>
      </Pantalla>
    );
  }
  if (estado.tipo === 'sin-sesion') {
    return <Login onEntrar={(u) => setEstado({ tipo: 'con-sesion', usuario: u, cambiando: u.mustChangePassword })} />;
  }

  const { usuario } = estado;
  const salir = async () => {
    try { await axios.post('/api/auth/logout'); } catch { /* la cookie igual se va a vencer */ }
    setEstado({ tipo: 'sin-sesion' });
  };

  if (estado.cambiando) {
    return (
      <CambiarClave
        usuario={usuario}
        obligatoria={usuario.mustChangePassword}
        onListo={(u) => setEstado({ tipo: 'con-sesion', usuario: u, cambiando: false })}
        onCancelar={() => setEstado({ tipo: 'con-sesion', usuario, cambiando: false })}
        onSalir={salir}
      />
    );
  }

  const esAdmin = usuario.rol === 'admin';
  const sesion: Sesion = {
    usuario,
    esAdmin,
    puedeRevisar: esAdmin || usuario.rol === 'reviewer',
    veMarca: (x) => esAdmin || usuario.marcas.includes(claveDeMarca(x)),
    salir,
    cambiarClave: () => setEstado({ tipo: 'con-sesion', usuario, cambiando: true }),
  };
  return <Ctx.Provider value={sesion}>{children}</Ctx.Provider>;
}

// ── Piezas con la estética de la v1 ─────────────

const INPUT =
  'w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-200 placeholder:text-slate-300';
const BOTON =
  'w-full px-5 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed';
const ETIQUETA = 'block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider';

function Pantalla({ titulo, bajada, children, conAnimacion = false }: {
  titulo?: string;
  bajada?: string;
  children: ReactNode;
  /** El login: a la derecha (arriba en el celular), cómo funciona la herramienta. */
  conAnimacion?: boolean;
}) {
  const formulario = (
      <div className="w-full max-w-md space-y-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center overflow-hidden p-2">
            <img src={logoNgr} alt="NGR" className="w-full h-auto object-contain" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Scraping Agent <span className="text-slate-400 font-light">Price Panel</span>
            </h1>
            <p className="text-slate-500 font-medium text-sm">NGR Digital Intelligence Unit</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-sm space-y-6">
          {titulo && (
            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-slate-900">{titulo}</h2>
              {bajada && <p className="text-sm text-slate-500">{bajada}</p>}
            </div>
          )}
          {children}
        </div>
      </div>
  );
  if (!conAnimacion) {
    return <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-6 font-sans">{formulario}</div>;
  }
  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans grid md:grid-cols-2">
      <div className="relative h-[220px] overflow-hidden bg-slate-900 md:hidden">
        <Brillo />
        <AnimacionLogin compacta />
      </div>
      <div className="flex items-center justify-center p-6 md:p-10">{formulario}</div>
      <div className="relative hidden md:flex items-center justify-center overflow-hidden bg-slate-900 p-10 lg:p-16">
        <Brillo />
        <AnimacionLogin />
      </div>
    </div>
  );
}

/** Profundidad del panel oscuro: un brillo del rojo de NGR arriba y una grilla de puntos. */
function Brillo() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="absolute -left-40 -top-32 h-[560px] w-[560px] rounded-full bg-accent/15 blur-[110px]" />
      <div className="absolute inset-0 opacity-[.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:22px_22px]" />
    </div>
  );
}

function MensajeDeError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">
      {children}
    </p>
  );
}

function Login({ onEntrar }: { onEntrar: (u: Usuario) => void }) {
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !clave) return;
    setEnviando(true);
    setError('');
    try {
      const r = await axios.post<{ usuario: Usuario }>('/api/auth/login', { email: email.trim(), password: clave });
      onEntrar(r.data.usuario);
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo entrar. Probá de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla conAnimacion titulo="Iniciar sesión" bajada="Los precios de NGR contra la competencia en Rappi, PedidosYa y los sitios propios.">
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <div>
          <label htmlFor="email" className={ETIQUETA}>Email</label>
          <input id="email" type="email" autoComplete="username" autoFocus value={email}
                 onChange={(e) => setEmail(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="clave" className={ETIQUETA}>Clave</label>
          <input id="clave" type="password" autoComplete="current-password" value={clave}
                 onChange={(e) => setClave(e.target.value)} className={INPUT} />
        </div>
        {error && <MensajeDeError>{error}</MensajeDeError>}
        <button type="submit" disabled={enviando || !email.trim() || !clave} className={BOTON}>
          {enviando ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <LockClosedIcon className="w-5 h-5" />}
          {enviando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <p className="text-[11px] text-slate-400">
        Si no tenés cuenta o perdiste la clave, pedísela a quien administra la herramienta.
      </p>
    </Pantalla>
  );
}

function CambiarClave({ usuario, obligatoria, onListo, onCancelar, onSalir }: {
  usuario: Usuario;
  obligatoria: boolean;
  onListo: (u: Usuario) => void;
  onCancelar: () => void;
  onSalir: () => void;
}) {
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetida, setRepetida] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (nueva.length < 10) return setError('La clave nueva tiene que tener al menos 10 caracteres.');
    if (nueva !== repetida) return setError('Las dos claves nuevas no coinciden.');
    setEnviando(true);
    setError('');
    try {
      const r = await axios.post<{ usuario: Usuario }>('/api/auth/change-password', { actual, nueva });
      onListo(r.data.usuario);
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo cambiar la clave. Probá de nuevo.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Pantalla
      titulo={obligatoria ? 'Elegí tu clave' : 'Cambiar la clave'}
      bajada={obligatoria
        ? 'Entraste con una clave de un uso. Elegí una tuya para seguir.'
        : 'Al cambiarla, se cierran las otras sesiones de tu cuenta.'}
    >
      <p className="text-xs font-semibold text-slate-400 -mt-2">{usuario.email}</p>
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <input type="email" autoComplete="username" value={usuario.email} readOnly hidden />
        <div>
          <label htmlFor="actual" className={ETIQUETA}>{obligatoria ? 'Clave de un uso' : 'Clave actual'}</label>
          <input id="actual" type="password" autoComplete="current-password" autoFocus value={actual}
                 onChange={(e) => setActual(e.target.value)} className={INPUT} />
        </div>
        <div>
          <label htmlFor="nueva" className={ETIQUETA}>Clave nueva</label>
          <input id="nueva" type="password" autoComplete="new-password" value={nueva}
                 onChange={(e) => setNueva(e.target.value)} className={INPUT} />
          <p className="mt-1 text-[10px] text-slate-400">Al menos 10 caracteres.</p>
        </div>
        <div>
          <label htmlFor="repetida" className={ETIQUETA}>Repetí la clave nueva</label>
          <input id="repetida" type="password" autoComplete="new-password" value={repetida}
                 onChange={(e) => setRepetida(e.target.value)} className={INPUT} />
        </div>
        {error && <MensajeDeError>{error}</MensajeDeError>}
        <button type="submit" disabled={enviando || !actual || !nueva || !repetida} className={BOTON}>
          {enviando && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
          {enviando ? 'Cambiando...' : 'Cambiar la clave'}
        </button>
        <button type="button" onClick={obligatoria ? onSalir : onCancelar}
                className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors">
          {obligatoria ? 'Cerrar sesión' : 'Volver'}
        </button>
      </form>
    </Pantalla>
  );
}
