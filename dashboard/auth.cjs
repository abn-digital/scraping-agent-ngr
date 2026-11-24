// ──────────────────────────────────────────────
// Cuentas, sesión y permisos.
//
// Sin dependencias: scrypt para las claves y HMAC para la cookie, los dos de
// node:crypto. Los usuarios viven en users.json en GCS (con copia local). Son
// pocos: cada instancia los tiene en memoria, los relee de GCS cuando ve una
// cuenta o sesión que no conoce (y cada 30 s), y escribe con precondición de
// generación, así varias instancias de Cloud Run no se pisan.
//
// Las sesiones no se guardan: la cookie lleva { sub, exp, v } firmado. `v` es
// la versión de sesión del usuario; cambiar o resetear la clave, o desactivar
// la cuenta, la sube y todas las cookies viejas dejan de valer.
// ──────────────────────────────────────────────
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROLES = ['viewer', 'reviewer', 'admin'];
// Las cuentas de este dominio son siempre admin (el equipo que mantiene la
// herramienta). AUTH_ADMIN_DOMAIN lo cambia; vacío lo apaga.
const DOMINIO_ADMIN = String(process.env.AUTH_ADMIN_DOMAIN ?? 'abndigital.com.ar').trim().toLowerCase();
const esDelDominioAdmin = (email, dominio = DOMINIO_ADMIN) =>
    !!dominio && String(email || '').toLowerCase().endsWith(`@${dominio}`);
const COOKIE = 'ngr_sesion';
const DURACION_MS = 7 * 24 * 60 * 60 * 1000;
const CLAVE_MINIMA = 10;
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };
// Sin 0/O, 1/l/I: la clave se copia y se pasa por Slack, a veces se tipea.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const INTENTOS_MAX = 8;
const VENTANA_INTENTOS_MS = 15 * 60 * 1000;

const MSG = {
    sinSesion: 'Tenés que iniciar sesión.',
    cambiarClave: 'Tenés que cambiar la clave antes de seguir.',
    credenciales: 'Email o clave incorrectos.',
    demasiados: 'Probá de nuevo en unos minutos.',
    soloAdmin: 'Esto lo puede hacer solo un admin.',
    soloLectura: 'Tu cuenta es de lectura: no puede hacer cambios.',
    sinMarca: 'Tu cuenta no tiene acceso a esa marca.',
    sinTienda: 'Tu cuenta no tiene acceso a esa tienda.',
};

// ── Claves ────────────────────────────────────

function hashClave(clave) {
    const sal = crypto.randomBytes(16);
    const { N, r, p, keylen } = SCRYPT;
    const hash = crypto.scryptSync(String(clave), sal, keylen, { N, r, p });
    return `scrypt$${N}$${r}$${p}$${sal.toString('base64')}$${hash.toString('base64')}`;
}

function verificarClave(clave, guardado) {
    if (typeof guardado !== 'string') return false;
    const partes = guardado.split('$');
    if (partes.length !== 6 || partes[0] !== 'scrypt') return false;
    const [, N, r, p, sal, hash] = partes;
    const esperado = Buffer.from(hash, 'base64');
    let obtenido;
    try {
        obtenido = crypto.scryptSync(String(clave), Buffer.from(sal, 'base64'), esperado.length, {
            N: Number(N), r: Number(r), p: Number(p),
        });
    } catch {
        return false;
    }
    return obtenido.length === esperado.length && crypto.timingSafeEqual(obtenido, esperado);
}

// Para que un email que no existe tarde lo mismo que una clave equivocada.
const HASH_DE_RELLENO = hashClave(crypto.randomBytes(12).toString('hex'));

/** Una clave de un uso: sin caracteres ambiguos y sin sesgo de módulo. */
function generarClave(largo = 20) {
    const tope = 256 - (256 % ALFABETO.length);
    let salida = '';
    while (salida.length < largo) {
        for (const b of crypto.randomBytes(largo * 2)) {
            if (b >= tope) continue;
            salida += ALFABETO[b % ALFABETO.length];
            if (salida.length === largo) break;
        }
    }
    return salida;
}

// ── Cookie firmada ────────────────────────────

const b64url = (buf) => Buffer.from(buf).toString('base64url');

function firmarSesion(datos, secreto) {
    const cuerpo = b64url(JSON.stringify(datos));
    const firma = crypto.createHmac('sha256', secreto).update(cuerpo).digest('base64url');
    return `${cuerpo}.${firma}`;
}

function leerSesion(token, secreto, ahora = Date.now()) {
    if (typeof token !== 'string') return null;
    const [cuerpo, firma] = token.split('.');
    if (!cuerpo || !firma) return null;
    const esperada = crypto.createHmac('sha256', secreto).update(cuerpo).digest();
    let recibida;
    try { recibida = Buffer.from(firma, 'base64url'); } catch { return null; }
    if (recibida.length !== esperada.length || !crypto.timingSafeEqual(recibida, esperada)) return null;
    let datos;
    try { datos = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8')); } catch { return null; }
    if (!datos || typeof datos.sub !== 'string' || typeof datos.exp !== 'number') return null;
    if (datos.exp <= ahora) return null;
    return datos;
}

function leerCookies(header) {
    const salida = {};
    for (const parte of String(header || '').split(';')) {
        const i = parte.indexOf('=');
        if (i < 0) continue;
        const k = parte.slice(0, i).trim();
        if (!k) continue;
        try { salida[k] = decodeURIComponent(parte.slice(i + 1).trim()); } catch { /* cookie rota */ }
    }
    return salida;
}

const esHttps = (req) =>
    req.secure || String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';

function cookieDeSesion(req, token, maxAgeSeg) {
    return [
        `${COOKIE}=${token}`,
        'HttpOnly',
        'SameSite=Lax',
        'Path=/',
        `Max-Age=${maxAgeSeg}`,
        ...(esHttps(req) ? ['Secure'] : []),
    ].join('; ');
}

// ── Permisos ──────────────────────────────────

/**
 * @param {string[]} todasLasMarcas  claves de brand_config (BRANDS)
 * @param {(key: string) => string[]} idsDeMarca
 */
function crearPermisos(todasLasMarcas, idsDeMarca) {
    const marcasDe = (u) =>
        !u ? [] : u.rol === 'admin' ? [...todasLasMarcas] : (u.marcas || []).filter((m) => todasLasMarcas.includes(m));
    const tiendasDe = (u) => new Set(marcasDe(u).flatMap((m) => idsDeMarca(m)));
    return {
        marcasDe,
        tiendasDe,
        puedeVerMarca: (u, marca) => !!u && (u.rol === 'admin' || marcasDe(u).includes(String(marca))),
        // Un admin ve todo, también las tiendas que no cuelgan de ninguna marca.
        puedeVerTienda: (u, id) => !!u && (u.rol === 'admin' || tiendasDe(u).has(String(id))),
        puedeRevisar: (u) => !!u && (u.rol === 'reviewer' || u.rol === 'admin'),
        esAdmin: (u) => !!u && u.rol === 'admin',
    };
}

const publico = (u) => ({
    id: u.id,
    email: u.email,
    nombre: u.nombre || '',
    rol: u.rol,
    marcas: u.rol === 'admin' ? [] : [...(u.marcas || [])],
    mustChangePassword: !!u.mustChangePassword,
    activo: u.activo !== false,
    createdAt: u.createdAt || null,
    passwordChangedAt: u.passwordChangedAt || null,
});

const normalizarEmail = (e) => String(e || '').trim().toLowerCase();
const emailValido = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;

/** ¿Este cambio deja la app sin ningún admin activo? */
function dejaSinAdmin(usuarios, id, cambios) {
    const despues = usuarios.map((u) => (u.id === id ? { ...u, ...cambios } : u));
    return !despues.some((u) => u.rol === 'admin' && u.activo !== false);
}

/** Valida rol + marcas de un alta o edición. Devuelve { error } o { rol, marcas }. */
function validarAcceso(rol, marcas, todasLasMarcas, email = '', dominio = DOMINIO_ADMIN) {
    if (esDelDominioAdmin(email, dominio)) {
        if (rol !== undefined && rol !== 'admin') {
            return { error: `Las cuentas de @${dominio} son siempre admin.` };
        }
        return { rol: 'admin', marcas: [] };
    }
    if (!ROLES.includes(rol)) return { error: 'El rol tiene que ser lectura, revisión o admin.' };
    if (rol === 'admin') return { rol, marcas: [] };
    const lista = Array.isArray(marcas) ? [...new Set(marcas.map(String))] : [];
    if (lista.some((m) => !todasLasMarcas.includes(m))) return { error: 'Alguna de las marcas no existe.' };
    if (lista.length === 0) return { error: 'Elegí al menos una marca.' };
    return { rol, marcas: lista };
}

// ── El módulo ─────────────────────────────────

/** Un "no" de una escritura: se contesta tal cual, sin guardar nada. */
class Rechazo extends Error {
    constructor(status, cuerpo) {
        super(cuerpo.error);
        this.status = status;
        this.cuerpo = cuerpo;
    }
}

// Cada cuánto una instancia vuelve a mirar users.json en GCS por las suyas
// (para enterarse de bajas y cambios de clave hechos en otra instancia), y el
// mínimo entre dos lecturas forzadas por una cuenta o sesión desconocida.
const REFRESCO_MS = 30 * 1000;
const REFRESCO_FORZADO_MS = 2 * 1000;
const REINTENTOS_DE_ESCRITURA = 4;

/**
 * @param {object} o
 * @param {string} o.archivo            copia local de users.json
 * @param {string} o.secreto            AUTH_SECRET
 * @param {string[]} o.marcas           claves de todas las marcas
 * @param {(key: string) => string[]} o.idsDeMarca
 * @param {{
 *   leer: () => Promise<{ generacion: number, contenido: string | null }>,
 *   escribir: (contenido: string, generacionEsperada: number) => Promise<number>,
 * } | null} [o.remoto]  users.json en GCS. `generacion` 0 = no existe; `escribir`
 *   falla con `err.code === 412` si la generación ya no es esa.
 * @param {() => number} [o.ahora]
 */
function crearAuth({ archivo, secreto, marcas, idsDeMarca, remoto = null, ahora = () => Date.now(), dominioAdmin = DOMINIO_ADMIN }) {
    const permisos = crearPermisos(marcas, idsDeMarca);
    // Cloud Run puede correr varias instancias: cada una tiene esta copia en
    // memoria. GCS es la verdad. Se relee cuando aparece una cuenta o una
    // sesión que no se conoce, y cada REFRESCO_MS; se escribe releyendo lo
    // último y subiendo con precondición de generación, con reintento.
    let usuarios = [];
    let generacion = null; // la de GCS que tenemos en memoria
    // Si no se pudo leer GCS al arrancar, no se sube nada: pisaría las cuentas reales.
    let remotoConfiable = false;
    let ultimaLectura = 0;
    let lecturaEnCurso = null;
    let cola = Promise.resolve();
    const intentos = new Map(); // email → timestamps de fallos

    const parsear = (texto) => {
        try {
            const datos = JSON.parse(texto);
            return Array.isArray(datos?.usuarios) ? datos.usuarios : [];
        } catch {
            return [];
        }
    };

    function cargarLocal() {
        try {
            usuarios = parsear(fs.readFileSync(archivo, 'utf8'));
        } catch {
            usuarios = [];
        }
    }

    function escribirLocal(lista) {
        fs.mkdirSync(path.dirname(archivo), { recursive: true });
        const tmp = `${archivo}.${process.pid}.tmp`;
        fs.writeFileSync(tmp, JSON.stringify({ usuarios: lista }, null, 2), { mode: 0o600 });
        fs.renameSync(tmp, archivo);
    }

    /** Trae users.json de GCS si cambió. Una lectura por vez. */
    function sincronizar({ forzada = false } = {}) {
        if (!remoto || !remotoConfiable) return Promise.resolve();
        const minimo = forzada ? REFRESCO_FORZADO_MS : REFRESCO_MS;
        if (ahora() - ultimaLectura < minimo) return lecturaEnCurso || Promise.resolve();
        if (lecturaEnCurso) return lecturaEnCurso;
        ultimaLectura = ahora();
        lecturaEnCurso = (async () => {
            try {
                const { generacion: g, contenido } = await remoto.leer();
                if (g !== generacion) {
                    usuarios = g ? parsear(contenido) : [];
                    generacion = g;
                    escribirLocal(usuarios);
                }
            } catch (err) {
                console.warn(`[auth] No se pudo releer users.json de GCS: ${err.message}`);
            } finally {
                lecturaEnCurso = null;
            }
        })();
        return lecturaEnCurso;
    }

    /**
     * Aplica un cambio a las cuentas: relee lo último de GCS, corre `cambio`
     * sobre una copia y la sube solo si nadie escribió en el medio. Si otra
     * instancia ganó, vuelve a empezar sobre lo nuevo. `cambio` puede tirar un
     * Rechazo (400, 404, 409) y entonces no se guarda nada.
     */
    function mutar(cambio) {
        const tarea = cola.then(async () => {
            for (let intento = 0; intento < REINTENTOS_DE_ESCRITURA; intento++) {
                if (remoto && remotoConfiable) {
                    ultimaLectura = 0;
                    await sincronizar({ forzada: true });
                }
                const copia = structuredClone(usuarios);
                const resultado = cambio(copia);
                if (remoto && remotoConfiable) {
                    try {
                        generacion = await remoto.escribir(JSON.stringify({ usuarios: copia }, null, 2), generacion || 0);
                    } catch (err) {
                        if (err && (err.code === 412 || err.code === '412')) continue;
                        throw err;
                    }
                } else if (remoto) {
                    console.warn('[auth] users.json se guarda solo local: GCS no estaba disponible al arrancar.');
                }
                usuarios = copia;
                escribirLocal(usuarios);
                return resultado;
            }
            throw new Error('users.json cambió demasiadas veces seguidas');
        });
        cola = tarea.catch(() => {});
        return tarea;
    }

    async function iniciar({ bootstrapEmail, bootstrapPassword } = {}) {
        if (remoto) {
            try {
                const { generacion: g, contenido } = await remoto.leer();
                generacion = g;
                remotoConfiable = true;
                ultimaLectura = ahora();
                if (g) {
                    usuarios = parsear(contenido);
                    escribirLocal(usuarios);
                    console.log(`[auth] users.json bajado de GCS (${usuarios.length} cuentas)`);
                } else {
                    usuarios = [];
                    console.log('[auth] No hay users.json en GCS todavía');
                }
            } catch (err) {
                console.warn(`[auth] No se pudo leer users.json de GCS (${err.message}). Se usa la copia local y no se sube nada.`);
                cargarLocal();
            }
        } else {
            cargarLocal();
        }

        // Una cuenta del dominio admin que quedó con otro rol (creada antes de
        // la regla, o editada a mano) se corrige al arrancar.
        const esCorregible = (u) => esDelDominioAdmin(u.email, dominioAdmin) && u.rol !== 'admin';
        if (usuarios.some(esCorregible)) {
            const n = await mutar((lista) => {
                const corregir = lista.filter(esCorregible);
                for (const u of corregir) { u.rol = 'admin'; u.marcas = []; }
                return corregir.length;
            });
            if (n) console.log(`[auth] ${n} cuenta(s) de @${dominioAdmin} pasaron a admin.`);
        }
        if (usuarios.length === 0) {
            const email = normalizarEmail(bootstrapEmail);
            if (email && bootstrapPassword) {
                const creado = await mutar((lista) => {
                    // Otra instancia pudo haberlo sembrado mientras arrancábamos.
                    if (lista.length) return false;
                    lista.push(nuevoUsuario({ email, rol: 'admin', marcas: [], nombre: '', clave: String(bootstrapPassword) }));
                    return true;
                });
                if (creado) console.log(`[auth] Se creó el admin inicial ${email}; tiene que cambiar la clave al entrar.`);
            } else {
                console.warn('[auth] No hay cuentas. Definí AUTH_BOOTSTRAP_EMAIL y AUTH_BOOTSTRAP_PASSWORD para crear el primer admin.');
            }
        }
    }

    function nuevoUsuario({ email, rol, marcas: m, nombre, clave }) {
        const ts = new Date(ahora()).toISOString();
        return {
            id: crypto.randomUUID(),
            email,
            nombre: String(nombre || '').trim().slice(0, 120),
            passwordHash: hashClave(clave),
            rol,
            marcas: m,
            mustChangePassword: true,
            activo: true,
            sesionV: 1,
            createdAt: ts,
            passwordChangedAt: null,
        };
    }

    const datosDeLaCookie = (req) => leerSesion(leerCookies(req.headers.cookie)[COOKIE], secreto, ahora());

    function usuarioPorSesion(datos) {
        if (!datos) return null;
        const u = usuarios.find((x) => x.id === datos.sub);
        if (!u || u.activo === false || (u.sesionV || 1) !== datos.v) return null;
        return u;
    }

    /** El usuario de la cookie, si la cookie vale y la cuenta sigue activa (con lo que hay en memoria). */
    function usuarioDe(req) {
        return usuarioPorSesion(datosDeLaCookie(req));
    }

    function abrirSesion(req, res, u) {
        const token = firmarSesion({ sub: u.id, exp: ahora() + DURACION_MS, v: u.sesionV || 1 }, secreto);
        res.setHeader('Set-Cookie', cookieDeSesion(req, token, Math.floor(DURACION_MS / 1000)));
    }

    function cerrarSesion(req, res) {
        res.setHeader('Set-Cookie', cookieDeSesion(req, '', 0));
    }

    // Lo que no pide cookie. Rutas relativas a /api.
    const PUBLICAS = new Set(['/auth/login', '/internal/resync']);
    // Lo único que puede hacer alguien que todavía tiene la clave de un uso.
    const CON_CLAVE_VIEJA = new Set(['/auth/me', '/auth/change-password', '/auth/logout']);

    /** Middleware para app.use('/api', …): 401 sin sesión, 403 si falta cambiar la clave. */
    async function requiereSesion(req, res, next) {
        if (PUBLICAS.has(req.path)) return next();
        // De fondo, cada tanto: así una baja hecha en otra instancia llega acá.
        void sincronizar();
        const datos = datosDeLaCookie(req);
        let u = usuarioPorSesion(datos);
        // Una cookie bien firmada de una cuenta que no conocemos (o con otra
        // versión de sesión) puede venir de otra instancia: se relee y se mira de nuevo.
        if (!u && datos) {
            await sincronizar({ forzada: true });
            u = usuarioPorSesion(datos);
        }
        // /me es cómo el front pregunta si hay sesión: "no hay" es una
        // respuesta, no un error (un 401 ensuciaba la consola en cada login).
        if (!u && req.path === '/auth/me') return res.json({ usuario: null });
        if (!u) return res.status(401).json({ error: MSG.sinSesion, code: 'NO_SESSION' });
        req.usuario = u;
        if (u.mustChangePassword && !CON_CLAVE_VIEJA.has(req.path)) {
            return res.status(403).json({ error: MSG.cambiarClave, code: 'MUST_CHANGE_PASSWORD' });
        }
        next();
    }

    const soloAdmin = (req, res, next) =>
        permisos.esAdmin(req.usuario) ? next() : res.status(403).json({ error: MSG.soloAdmin });

    function demasiadosIntentos(email) {
        const t = ahora();
        const lista = (intentos.get(email) || []).filter((x) => t - x < VENTANA_INTENTOS_MS);
        if (lista.length) intentos.set(email, lista);
        else intentos.delete(email);
        return lista.length >= INTENTOS_MAX;
    }
    function anotarFallo(email) {
        const lista = intentos.get(email) || [];
        lista.push(ahora());
        intentos.set(email, lista);
    }

    /** Corre una escritura y contesta: el resultado, el Rechazo tal cual, o un 500. */
    async function responderMutacion(res, cambio, alSalir, mensaje500, etiqueta) {
        let resultado;
        try {
            resultado = await mutar(cambio);
        } catch (err) {
            if (err instanceof Rechazo) return res.status(err.status).json(err.cuerpo);
            console.error(`[auth] ${etiqueta}:`, err.message);
            return res.status(500).json({ error: mensaje500 });
        }
        return alSalir(resultado);
    }

    const buscar = (lista, id) => {
        const u = lista.find((x) => x.id === id);
        if (!u) throw new Rechazo(404, { error: 'Esa cuenta no existe.' });
        return u;
    };

    /** Las rutas /api/auth/*. Recibe la app de Express (no requiere express acá). */
    function montar(app) {
        app.post('/api/auth/login', async (req, res) => {
            const email = normalizarEmail(req.body?.email);
            const clave = String(req.body?.password ?? '');
            if (!email || !clave) return res.status(400).json({ error: MSG.credenciales });
            if (demasiadosIntentos(email)) return res.status(429).json({ error: MSG.demasiados });
            let u = usuarios.find((x) => x.email === email);
            let ok = verificarClave(clave, u ? u.passwordHash : HASH_DE_RELLENO);
            if (!u || !ok || u.activo === false) {
                // La cuenta (o su clave nueva) pudo haberse creado en otra instancia.
                await sincronizar({ forzada: true });
                u = usuarios.find((x) => x.email === email);
                ok = !!u && verificarClave(clave, u.passwordHash);
            }
            if (!u || !ok || u.activo === false) {
                anotarFallo(email);
                return res.status(401).json({ error: MSG.credenciales });
            }
            intentos.delete(email);
            abrirSesion(req, res, u);
            res.json({ usuario: publico(u) });
        });

        app.get('/api/auth/me', (req, res) => res.json({ usuario: publico(req.usuario) }));

        app.post('/api/auth/logout', (req, res) => {
            cerrarSesion(req, res);
            res.json({ ok: true });
        });

        app.post('/api/auth/change-password', async (req, res) => {
            const actual = String(req.body?.actual ?? '');
            const nueva = String(req.body?.nueva ?? '');
            if (!verificarClave(actual, req.usuario.passwordHash)) {
                return res.status(400).json({ error: 'La clave actual no es esa.', code: 'BAD_CURRENT' });
            }
            if (nueva.length < CLAVE_MINIMA) {
                return res.status(400).json({ error: `La clave nueva tiene que tener al menos ${CLAVE_MINIMA} caracteres.`, code: 'TOO_SHORT' });
            }
            if (nueva === actual) {
                return res.status(400).json({ error: 'La clave nueva tiene que ser distinta de la actual.', code: 'SAME' });
            }
            const hash = hashClave(nueva);
            return responderMutacion(res, (lista) => {
                const u = buscar(lista, req.usuario.id);
                u.passwordHash = hash;
                u.mustChangePassword = false;
                u.passwordChangedAt = new Date(ahora()).toISOString();
                u.sesionV = (u.sesionV || 1) + 1;
                return u;
            }, (u) => {
                abrirSesion(req, res, u);
                res.json({ usuario: publico(u) });
            }, 'No se pudo guardar la clave nueva.', 'change-password');
        });

        app.get('/api/auth/users', soloAdmin, async (_req, res) => {
            // La lista de un admin tiene que ser la de todas las instancias.
            await sincronizar({ forzada: true });
            res.json({ usuarios: usuarios.map(publico) });
        });

        app.post('/api/auth/users', soloAdmin, async (req, res) => {
            const email = normalizarEmail(req.body?.email);
            if (!emailValido(email)) return res.status(400).json({ error: 'Ese email no es válido.' });
            const acceso = validarAcceso(req.body?.rol, req.body?.marcas, marcas, email, dominioAdmin);
            if (acceso.error) return res.status(400).json({ error: acceso.error });
            const clave = generarClave();
            const nuevo = nuevoUsuario({ email, rol: acceso.rol, marcas: acceso.marcas, nombre: req.body?.nombre, clave });
            return responderMutacion(res, (lista) => {
                if (lista.some((x) => x.email === email)) throw new Rechazo(409, { error: 'Ya hay una cuenta con ese email.' });
                lista.push(nuevo);
                return nuevo;
            }, (u) => res.status(201).json({ usuario: publico(u), clave }), 'No se pudo crear la cuenta.', 'alta');
        });

        app.patch('/api/auth/users/:id', soloAdmin, async (req, res) => {
            const body = req.body || {};
            return responderMutacion(res, (lista) => {
                const u = buscar(lista, req.params.id);
                const cambios = {};
                if ('rol' in body || 'marcas' in body) {
                    const acceso = validarAcceso(body.rol ?? u.rol, body.marcas ?? u.marcas, marcas, u.email, dominioAdmin);
                    if (acceso.error) throw new Rechazo(400, { error: acceso.error });
                    cambios.rol = acceso.rol;
                    cambios.marcas = acceso.marcas;
                }
                if ('activo' in body) cambios.activo = body.activo !== false;
                if ('nombre' in body) cambios.nombre = String(body.nombre || '').trim().slice(0, 120);
                if (dejaSinAdmin(lista, u.id, cambios)) {
                    throw new Rechazo(400, { error: 'Tiene que quedar al menos un admin activo.' });
                }
                const estabaActiva = u.activo !== false;
                Object.assign(u, cambios);
                if (cambios.activo === false && estabaActiva) u.sesionV = (u.sesionV || 1) + 1;
                return u;
            }, (u) => res.json({ usuario: publico(u) }), 'No se pudo guardar el cambio.', 'edición');
        });

        app.post('/api/auth/users/:id/reset', soloAdmin, async (req, res) => {
            const clave = generarClave();
            const hash = hashClave(clave);
            return responderMutacion(res, (lista) => {
                const u = buscar(lista, req.params.id);
                u.passwordHash = hash;
                u.mustChangePassword = true;
                u.sesionV = (u.sesionV || 1) + 1;
                return u;
            }, (u) => res.json({ usuario: publico(u), clave }), 'No se pudo resetear la clave.', 'reset');
        });
    }

    return {
        ...permisos,
        iniciar,
        montar,
        requiereSesion,
        usuarioDe,
        MSG,
        /** Solo para tests. */
        _usuarios: () => usuarios,
    };
}

/** AUTH_SECRET: obligatorio en Cloud Run; en local, uno efímero con aviso. */
function secretoDelEntorno(env = process.env) {
    const s = String(env.AUTH_SECRET || '').trim();
    if (s) return s;
    if (env.K_SERVICE || env.NODE_ENV === 'production') {
        throw new Error('Falta AUTH_SECRET: sin eso el server no arranca en producción.');
    }
    console.warn('[auth] Sin AUTH_SECRET: se usa uno efímero. Las sesiones se pierden al reiniciar.');
    return crypto.randomBytes(32).toString('hex');
}

module.exports = {
    crearAuth,
    Rechazo,
    crearPermisos,
    secretoDelEntorno,
    hashClave,
    verificarClave,
    generarClave,
    firmarSesion,
    leerSesion,
    leerCookies,
    dejaSinAdmin,
    validarAcceso,
    esDelDominioAdmin,
    publico,
    ALFABETO,
    COOKIE,
    ROLES,
};
