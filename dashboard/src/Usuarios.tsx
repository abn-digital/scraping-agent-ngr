import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import axios from 'axios';
import {
  ArrowPathIcon,
  CheckIcon,
  ClipboardDocumentIcon,
  KeyIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { DOMINIO_ADMIN, NOMBRE_DE_ROL, esDelDominioAdmin, useSesion, type Rol } from './sesion';

// Panel de cuentas (solo admin): quién entra, con qué rol y a qué marcas.
// Todavía no mandamos mails: la clave de un uso se muestra una vez, se copia
// y se pasa por Slack. Mismas rutas /api/auth/users que el panel de la v2.

interface Cuenta {
  id: string;
  email: string;
  nombre: string;
  rol: Rol;
  marcas: string[];
  mustChangePassword: boolean;
  activo: boolean;
  createdAt: string | null;
}

const MARCAS = [
  { key: 'bembos', label: 'Bembos' },
  { key: 'popeyes', label: 'Popeyes' },
  { key: 'papajohns', label: 'Papa Johns' },
  { key: 'chinawok', label: 'Chinawok' },
  { key: 'dunkin', label: "Dunkin'" },
  { key: 'donbelisario', label: 'Don Belisario' },
];

const ROLES: { value: Rol; label: string; hint: string }[] = [
  { value: 'viewer', label: 'Lectura', hint: 'Ve sus marcas. No cambia nada.' },
  { value: 'reviewer', label: 'Revisión', hint: 'Además confirma matches y actualiza catálogos de sus marcas.' },
  { value: 'admin', label: 'Admin', hint: 'Todas las marcas y el panel de usuarios.' },
];

const mensajeDe = (err: unknown, respaldo: string) => {
  const m = axios.isAxiosError(err) ? err.response?.data?.error : null;
  return typeof m === 'string' && m ? m : respaldo;
};

const INPUT =
  'w-full px-4 py-3 bg-slate-50 border-0 rounded-xl text-slate-900 font-semibold focus:ring-2 focus:ring-slate-200 placeholder:text-slate-300 disabled:opacity-60';
const ETIQUETA = 'block text-[10px] font-bold text-slate-500 uppercase mb-2 tracking-wider';
const BOTON_PRIMARIO =
  'px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed';
const BOTON_SECUNDARIO =
  'px-4 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition-all flex items-center justify-center gap-2 font-semibold';
const ACCION =
  'p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed';

type Modal =
  | { tipo: 'alta' }
  | { tipo: 'editar'; cuenta: Cuenta }
  | { tipo: 'confirmar'; que: 'reset' | 'desactivar'; cuenta: Cuenta }
  | { tipo: 'clave'; email: string; clave: string }
  | null;

export default function Usuarios() {
  const { usuario: yo } = useSesion();
  const [cuentas, setCuentas] = useState<Cuenta[] | null>(null);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [aviso, setAviso] = useState('');

  const cargar = () =>
    axios.get<{ usuarios: Cuenta[] }>('/api/auth/users').then(
      (r) => { setCuentas(r.data.usuarios); setError(''); },
      (err) => setError(mensajeDe(err, 'No se pudo cargar la lista de cuentas.')),
    );

  useEffect(() => {
    let vivo = true;
    axios.get<{ usuarios: Cuenta[] }>('/api/auth/users').then(
      (r) => vivo && setCuentas(r.data.usuarios),
      (err) => vivo && setError(mensajeDe(err, 'No se pudo cargar la lista de cuentas.')),
    );
    return () => { vivo = false; };
  }, []);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(''), 4000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const todas = cuentas ?? [];
  const aguja = q.trim().toLowerCase();
  const visibles = todas
    .filter((c) => !aguja || `${c.email} ${c.nombre}`.toLowerCase().includes(aguja))
    .sort((a, b) => Number(b.activo) - Number(a.activo) || a.email.localeCompare(b.email));
  const adminsActivos = todas.filter((c) => c.activo && c.rol === 'admin').length;

  const reactivar = async (c: Cuenta) => {
    try {
      await axios.patch(`/api/auth/users/${encodeURIComponent(c.id)}`, { activo: true });
      setAviso(`Se reactivó ${c.email}.`);
      await cargar();
    } catch (err) {
      setError(mensajeDe(err, 'No se pudo reactivar la cuenta.'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Usuarios</h2>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Quién entra a la herramienta, con qué rol y a qué marcas.
            {cuentas && ` ${todas.filter((c) => c.activo).length} activas.`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por email o nombre..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-100 placeholder:text-slate-300"
            />
          </div>
          <button onClick={() => setModal({ tipo: 'alta' })} className={`${BOTON_PRIMARIO} whitespace-nowrap`}>
            <PlusIcon className="w-5 h-5" />
            Nueva cuenta
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>
      )}
      {aviso && (
        <p role="status" className="text-sm font-semibold text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">{aviso}</p>
      )}

      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm overflow-x-auto">
        <table className="w-full text-left border-separate border-spacing-0">
          <thead>
            <tr>
              {['Cuenta', 'Rol', 'Marcas', 'Estado', ''].map((h, i) => (
                <th key={i} className={`py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 ${i === 4 ? 'text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cuentas === null && !error ? (
              <tr><td colSpan={5} className="py-16 text-center text-slate-300 italic">Cargando cuentas...</td></tr>
            ) : visibles.length === 0 ? (
              <tr><td colSpan={5} className="py-16 text-center">
                <div className="flex flex-col items-center gap-2 opacity-60">
                  <UsersIcon className="w-10 h-10 text-slate-200" />
                  <p className="text-slate-400 italic text-sm">
                    {aguja ? `No se encontraron cuentas con "${q.trim()}".` : 'Ninguna cuenta todavía.'}
                  </p>
                </div>
              </td></tr>
            ) : visibles.map((c) => {
              const ultimoAdmin = c.rol === 'admin' && c.activo && adminsActivos <= 1;
              return (
                <tr key={c.id} className={`hover:bg-slate-50/50 transition-colors ${c.activo ? '' : 'opacity-60'}`}>
                  <td className="py-4 pr-3 border-b border-slate-50">
                    <p className="font-bold text-slate-900">{c.nombre || c.email}</p>
                    {c.nombre && <p className="text-[11px] text-slate-400 mt-0.5">{c.email}</p>}
                  </td>
                  <td className="py-4 pr-3 border-b border-slate-50">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${c.rol === 'admin' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      {NOMBRE_DE_ROL[c.rol]}
                    </span>
                  </td>
                  <td className="py-4 pr-3 border-b border-slate-50 text-sm text-slate-600">
                    {c.rol === 'admin' ? 'Todas' : MARCAS.filter((m) => c.marcas.includes(m.key)).map((m) => m.label).join(', ') || '—'}
                  </td>
                  <td className="py-4 pr-3 border-b border-slate-50">
                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                      !c.activo ? 'bg-slate-100 text-slate-500'
                        : c.mustChangePassword ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {!c.activo ? 'Desactivada' : c.mustChangePassword ? 'Clave de un uso' : 'Activa'}
                    </span>
                  </td>
                  <td className="py-4 border-b border-slate-50">
                    <div className="flex justify-end gap-1">
                      <button title="Editar el acceso" aria-label={`Editar el acceso de ${c.email}`} className={ACCION}
                              onClick={() => setModal({ tipo: 'editar', cuenta: c })}>
                        <PencilSquareIcon className="w-5 h-5" />
                      </button>
                      <button title="Resetear la clave" aria-label={`Resetear la clave de ${c.email}`} className={ACCION}
                              disabled={!c.activo} onClick={() => setModal({ tipo: 'confirmar', que: 'reset', cuenta: c })}>
                        <KeyIcon className="w-5 h-5" />
                      </button>
                      {c.activo ? (
                        <button
                          title={ultimoAdmin ? 'Tiene que quedar al menos un admin activo.' : 'Desactivar'}
                          aria-label={`Desactivar ${c.email}`}
                          className={`${ACCION} hover:!text-red-600 hover:!bg-red-50`}
                          disabled={ultimoAdmin}
                          onClick={() => setModal({ tipo: 'confirmar', que: 'desactivar', cuenta: c })}>
                          <NoSymbolIcon className="w-5 h-5" />
                        </button>
                      ) : (
                        <button title="Reactivar" aria-label={`Reactivar ${c.email}`} className={ACCION}
                                onClick={() => void reactivar(c)}>
                          <ArrowPathIcon className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(modal?.tipo === 'alta' || modal?.tipo === 'editar') && (
        <FormularioDeCuenta
          cuenta={modal.tipo === 'editar' ? modal.cuenta : null}
          yo={yo.id}
          onCerrar={() => setModal(null)}
          onCreada={(email, clave) => { setModal({ tipo: 'clave', email, clave }); void cargar(); }}
          onGuardada={(email) => { setModal(null); setAviso(`Se guardó el acceso de ${email}.`); void cargar(); }}
        />
      )}

      {modal?.tipo === 'confirmar' && (
        <Confirmar
          titulo={modal.que === 'reset' ? `Resetear la clave de "${modal.cuenta.email}"` : `Desactivar "${modal.cuenta.email}"`}
          texto={modal.que === 'reset'
            ? 'La clave actual deja de servir y se cierran sus sesiones. Le vas a pasar una de un uso, y al entrar se le pide una nueva.'
            : 'No va a poder entrar y se cierran sus sesiones. La cuenta queda: se puede reactivar.'}
          boton={modal.que === 'reset' ? 'Resetear' : 'Desactivar'}
          onCancelar={() => setModal(null)}
          onConfirmar={async () => {
            const c = modal.cuenta;
            try {
              if (modal.que === 'reset') {
                const r = await axios.post<{ clave: string }>(`/api/auth/users/${encodeURIComponent(c.id)}/reset`);
                setModal({ tipo: 'clave', email: c.email, clave: r.data.clave });
              } else {
                await axios.patch(`/api/auth/users/${encodeURIComponent(c.id)}`, { activo: false });
                setModal(null);
                setAviso(`Se desactivó ${c.email}.`);
              }
              await cargar();
            } catch (err) {
              setModal(null);
              setError(mensajeDe(err, 'No se pudo completar la acción.'));
            }
          }}
        />
      )}

      {modal?.tipo === 'clave' && (
        <ClaveDeUnUso email={modal.email} clave={modal.clave} onCerrar={() => setModal(null)} />
      )}
    </div>
  );
}

function Hoja({ titulo, bajada, children, onCerrar, angosta = false }: {
  titulo: string;
  bajada?: string;
  children: ReactNode;
  onCerrar: () => void;
  angosta?: boolean;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={onCerrar} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={titulo}
           className={`relative w-full ${angosta ? 'max-w-md' : 'max-w-lg'} bg-white rounded-2xl border border-slate-100 shadow-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">{titulo}</h3>
            {bajada && <p className="text-sm text-slate-500 mt-1">{bajada}</p>}
          </div>
          <button onClick={onCerrar} aria-label="Cerrar" className={ACCION}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormularioDeCuenta({ cuenta, yo, onCerrar, onCreada, onGuardada }: {
  cuenta: Cuenta | null;
  yo: string;
  onCerrar: () => void;
  onCreada: (email: string, clave: string) => void;
  onGuardada: (email: string) => void;
}) {
  const [email, setEmail] = useState(cuenta?.email ?? '');
  const [nombre, setNombre] = useState(cuenta?.nombre ?? '');
  const [rol, setRol] = useState<Rol>(cuenta?.rol ?? 'viewer');
  const [marcas, setMarcas] = useState<string[]>(cuenta?.marcas ?? []);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Las cuentas del dominio de ABN son siempre admin: el rol no se elige.
  const forzadoAdmin = esDelDominioAdmin(email);
  const rolEfectivo: Rol = forzadoAdmin ? 'admin' : rol;
  const meBajo = cuenta?.id === yo && cuenta.rol === 'admin' && rolEfectivo !== 'admin';

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!cuenta && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Escribí un email válido.');
    if (rolEfectivo !== 'admin' && marcas.length === 0) return setError('Elegí al menos una marca.');
    setEnviando(true);
    setError('');
    const datos = { nombre: nombre.trim(), rol: rolEfectivo, marcas: rolEfectivo === 'admin' ? [] : marcas };
    try {
      if (cuenta) {
        await axios.patch(`/api/auth/users/${encodeURIComponent(cuenta.id)}`, datos);
        onGuardada(cuenta.email);
      } else {
        const r = await axios.post<{ usuario: Cuenta; clave: string }>('/api/auth/users', { email: email.trim(), ...datos });
        onCreada(r.data.usuario.email, r.data.clave);
      }
    } catch (err) {
      setError(mensajeDe(err, cuenta ? 'No se pudo guardar el cambio.' : 'No se pudo crear la cuenta.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Hoja
      titulo={cuenta ? `Acceso de ${cuenta.email}` : 'Nueva cuenta'}
      bajada={cuenta ? undefined : 'Se genera una clave de un uso. La ves una sola vez, al crearla.'}
      onCerrar={onCerrar}
    >
      <form onSubmit={enviar} className="space-y-5" noValidate>
        {!cuenta && (
          <div>
            <label htmlFor="cuenta-email" className={ETIQUETA}>Email</label>
            <input id="cuenta-email" type="email" autoComplete="off" autoFocus value={email}
                   onChange={(e) => setEmail(e.target.value)} className={INPUT} />
          </div>
        )}
        <div>
          <label htmlFor="cuenta-nombre" className={ETIQUETA}>Nombre <span className="normal-case font-semibold text-slate-400">(opcional)</span></label>
          <input id="cuenta-nombre" autoComplete="off" value={nombre}
                 onChange={(e) => setNombre(e.target.value)} className={INPUT} />
        </div>
        <div>
          <p className={ETIQUETA}>Rol</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Rol">
            {ROLES.map((r) => (
              <button key={r.value} type="button" role="radio" aria-checked={rolEfectivo === r.value}
                      disabled={forzadoAdmin}
                      onClick={() => setRol(r.value)}
                      className={`py-2.5 rounded-xl text-sm font-bold transition-all disabled:cursor-not-allowed ${
                        rolEfectivo === r.value ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40'
                      }`}>
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400">
            {forzadoAdmin
              ? `Las cuentas de @${DOMINIO_ADMIN} son siempre admin.`
              : meBajo
                ? 'Es tu propia cuenta: vas a dejar de ver este panel.'
                : ROLES.find((r) => r.value === rolEfectivo)?.hint}
          </p>
        </div>
        {rolEfectivo !== 'admin' && (
          <fieldset>
            <legend className={ETIQUETA}>Marcas</legend>
            <div className="grid grid-cols-2 gap-2">
              {MARCAS.map((m) => {
                const activa = marcas.includes(m.key);
                return (
                  <label key={m.key} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer text-sm font-semibold transition-all ${
                    activa ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input type="checkbox" className="sr-only peer" checked={activa}
                           onChange={(e) => setMarcas((prev) => e.target.checked ? [...prev, m.key] : prev.filter((x) => x !== m.key))} />
                    <span className={`w-4 h-4 rounded flex items-center justify-center border peer-focus-visible:ring-2 peer-focus-visible:ring-slate-400 ${activa ? 'bg-white border-white' : 'border-slate-300 bg-white'}`}>
                      {activa && <CheckIcon className="w-3 h-3 text-slate-900" strokeWidth={3} />}
                    </span>
                    {m.label}
                  </label>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">Ve esas marcas y su competencia.</p>
          </fieldset>
        )}
        {error && <p role="alert" className="text-sm font-semibold text-red-600 bg-red-50 rounded-xl px-4 py-3">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onCerrar} className={BOTON_SECUNDARIO}>Cancelar</button>
          <button type="submit" disabled={enviando} className={BOTON_PRIMARIO}>
            {enviando && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
            {cuenta ? (enviando ? 'Guardando...' : 'Guardar el acceso') : (enviando ? 'Creando...' : 'Crear la cuenta')}
          </button>
        </div>
      </form>
    </Hoja>
  );
}

function Confirmar({ titulo, texto, boton, onCancelar, onConfirmar }: {
  titulo: string;
  texto: string;
  boton: string;
  onCancelar: () => void;
  onConfirmar: () => Promise<void>;
}) {
  const [enviando, setEnviando] = useState(false);
  return (
    <Hoja titulo={titulo} onCerrar={onCancelar} angosta>
      <p className="text-sm text-slate-600 leading-relaxed">{texto}</p>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancelar} className={BOTON_SECUNDARIO}>Cancelar</button>
        <button type="button" disabled={enviando}
                onClick={async () => { setEnviando(true); await onConfirmar(); }}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 font-semibold disabled:opacity-50">
          {enviando && <ArrowPathIcon className="w-5 h-5 animate-spin" />}
          {boton}
        </button>
      </div>
    </Hoja>
  );
}

function ClaveDeUnUso({ email, clave, onCerrar }: { email: string; clave: string; onCerrar: () => void }) {
  const [copiada, setCopiada] = useState(false);
  const [falloCopia, setFalloCopia] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(clave);
      setCopiada(true);
    } catch {
      setFalloCopia(true);
    }
  };
  return (
    <Hoja titulo="La clave de un uso" bajada={`Para ${email}.`} onCerrar={onCerrar} angosta>
      <p className="select-all break-all bg-slate-50 rounded-xl px-4 py-3 font-mono text-lg font-semibold text-slate-900">{clave}</p>
      <button type="button" onClick={() => void copiar()} className={`${BOTON_PRIMARIO} w-full`}>
        {copiada ? <CheckIcon className="w-5 h-5" /> : <ClipboardDocumentIcon className="w-5 h-5" />}
        {copiada ? 'Copiada' : 'Copiar la clave'}
      </button>
      <p className="text-[11px] text-slate-500">
        {falloCopia
          ? 'No se pudo copiar. Seleccioná la clave y copiala a mano.'
          : 'No se vuelve a mostrar. Pasásela por Slack: al entrar se le pide una nueva.'}
      </p>
      <button type="button" onClick={onCerrar} className={`${BOTON_SECUNDARIO} w-full`}>Listo</button>
    </Hoja>
  );
}
