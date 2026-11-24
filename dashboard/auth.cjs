// ──────────────────────────────────────────────
// Cuentas, sesión y permisos.
//
// Sin dependencias: scrypt para las claves y HMAC para la cookie, los dos de
// node:crypto. Los usuarios viven en un JSON (users.json) con copia en GCS;
// son pocos y hay una sola instancia, así que alcanza con tenerlos en memoria
// y escribir el archivo entero con un mutex. Si algún día hay más de una
// instancia, dos altas simultáneas pueden pisarse: el arreglo es escribir con
// precondición de generación en GCS.
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

/**
 * @param {object} o
 * @param {string} o.archivo            copia local de users.json
 * @param {string} o.secreto            AUTH_SECRET
 * @param {string[]} o.marcas           claves de todas las marcas
 * @param {(key: string) => string[]} o.idsDeMarca
 * @param {{ descargar: (dest: string) => Promise<'ok'|'no-existe'>, subir: (src: string) => Promise<void> } | null} [o.remoto]
 * @param {() => number} [o.ahora]
 */
function crearAuth({ archivo, secreto, marcas, idsDeMarca, remoto = null, ahora = () => Date.now(), dominioAdmin = DOMINIO_ADMIN }) {
    const permisos = crearPermisos(marcas, idsDeMarca);
    let usuarios = [];
    // Si no se pudo leer GCS al arrancar, no se sube nada: pisaría las cuentas reales.
    let remotoConfiable = false;
    let cola = Promise.resolve();
    const intentos = new Map(); // email → timestamps de fallos

    function cargarLocal() {
        try {
            const datos = JSON.parse(fs.readFileSync(archivo, 'utf8'));
            usuarios = Array.isArray(datos?.usuarios) ? datos.usuarios : [];
        } catch {
            usuarios = [];
        }
    }

    /** Escribe el archivo y lo sube, de a una escritura por vez. */
    function guardar() {
        const foto = JSON.stringify({ usuarios }, null, 2);
        const tarea = cola.then(async () => {
            fs.mkdirSync(path.dirname(archivo), { recursive: true });
            const tmp = `${archivo}.${process.pid}.tmp`;
            fs.writeFileSync(tmp, foto, { mode: 0o600 });
            fs.renameSync(tmp, archivo);
            if (remoto && remotoConfiable) await remoto.subir(archivo);
            else if (remoto) console.warn('[auth] users.json se guardó solo local: GCS no estaba disponible al arrancar.');
        });
        cola = tarea.catch(() => {});
        return tarea;
    }

    async function iniciar({ bootstrapEmail, bootstrapPassword } = {}) {
        if (remoto) {
            try {
                const r = await remoto.descargar(archivo);
                remotoConfiable = true;
                console.log(r === 'ok' ? '[auth] users.json bajado de GCS' : '[auth] No hay users.json en GCS todavía');
            } catch (err) {
                console.warn(`[auth] No se pudo leer users.json de GCS (${err.message}). Se usa la copia local y no se sube nada.`);
            }
        }
        cargarLocal();
        // Una cuenta del dominio admin que quedó con otro rol (creada antes de
        // la regla, o editada a mano) se corrige al arrancar.
        const corregidas = usuarios.filter((u) => esDelDominioAdmin(u.email, dominioAdmin) && u.rol !== 'admin');
        for (const u of corregidas) { u.rol = 'admin'; u.marcas = []; }
        if (corregidas.length) {
            await guardar();
            console.log(`[auth] ${corregidas.length} cuenta(s) de @${dominioAdmin} pasaron a admin.`);
        }
        if (usuarios.length === 0) {
            const email = normalizarEmail(bootstrapEmail);
            if (email && bootstrapPassword) {
                usuarios.push(nuevoUsuario({ email, rol: 'admin', marcas: [], nombre: '', clave: String(bootstrapPassword) }));
                await guardar();
                console.log(`[auth] Se creó el admin inicial ${email}; tiene que cambiar la clave al entrar.`);
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

    /** El usuario de la cookie, si la cookie vale y la cuenta sigue activa. */
    function usuarioDe(req) {
        const token = leerCookies(req.headers.cookie)[COOKIE];
        const datos = leerSesion(token, secreto, ahora());
        if (!datos) return null;
        const u = usuarios.find((x) => x.id === datos.sub);
        if (!u || u.activo === false || (u.sesionV || 1) !== datos.v) return null;
        return u;
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
    function requiereSesion(req, res, next) {
        if (PUBLICAS.has(req.path)) return next();
        const u = usuarioDe(req);
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

    /** Las rutas /api/auth/*. Recibe la app de Express (no requiere express acá). */
    function montar(app) {
        app.post('/api/auth/login', (req, res) => {
            const email = normalizarEmail(req.body?.email);
            const clave = String(req.body?.password ?? '');
            if (!email || !clave) return res.status(400).json({ error: MSG.credenciales });
            if (demasiadosIntentos(email)) return res.status(429).json({ error: MSG.demasiados });
            const u = usuarios.find((x) => x.email === email);
            const ok = verificarClave(clave, u ? u.passwordHash : HASH_DE_RELLENO);
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
            const u = req.usuario;
            const actual = String(req.body?.actual ?? '');
            const nueva = String(req.body?.nueva ?? '');
            if (!verificarClave(actual, u.passwordHash)) {
                return res.status(400).json({ error: 'La clave actual no es esa.', code: 'BAD_CURRENT' });
            }
            if (nueva.length < CLAVE_MINIMA) {
                return res.status(400).json({ error: `La clave nueva tiene que tener al menos ${CLAVE_MINIMA} caracteres.`, code: 'TOO_SHORT' });
            }
            if (nueva === actual) {
                return res.status(400).json({ error: 'La clave nueva tiene que ser distinta de la actual.', code: 'SAME' });
            }
            u.passwordHash = hashClave(nueva);
            u.mustChangePassword = false;
            u.passwordChangedAt = new Date(ahora()).toISOString();
            u.sesionV = (u.sesionV || 1) + 1;
            try {
                await guardar();
            } catch (err) {
                console.error('[auth] change-password:', err.message);
                return res.status(500).json({ error: 'No se pudo guardar la clave nueva.' });
            }
            abrirSesion(req, res, u);
            res.json({ usuario: publico(u) });
        });

        app.get('/api/auth/users', soloAdmin, (_req, res) => {
            res.json({ usuarios: usuarios.map(publico) });
        });

        app.post('/api/auth/users', soloAdmin, async (req, res) => {
            const email = normalizarEmail(req.body?.email);
            if (!emailValido(email)) return res.status(400).json({ error: 'Ese email no es válido.' });
            if (usuarios.some((x) => x.email === email)) {
                return res.status(409).json({ error: 'Ya hay una cuenta con ese email.' });
            }
            const acceso = validarAcceso(req.body?.rol, req.body?.marcas, marcas, email, dominioAdmin);
            if (acceso.error) return res.status(400).json({ error: acceso.error });
            const clave = generarClave();
            const u = nuevoUsuario({ email, rol: acceso.rol, marcas: acceso.marcas, nombre: req.body?.nombre, clave });
            usuarios.push(u);
            try {
                await guardar();
            } catch (err) {
                usuarios = usuarios.filter((x) => x.id !== u.id);
                console.error('[auth] alta:', err.message);
                return res.status(500).json({ error: 'No se pudo crear la cuenta.' });
            }
            res.status(201).json({ usuario: publico(u), clave });
        });

        app.patch('/api/auth/users/:id', soloAdmin, async (req, res) => {
            const u = usuarios.find((x) => x.id === req.params.id);
            if (!u) return res.status(404).json({ error: 'Esa cuenta no existe.' });
            const body = req.body || {};
            const cambios = {};
            if ('rol' in body || 'marcas' in body) {
                const acceso = validarAcceso(body.rol ?? u.rol, body.marcas ?? u.marcas, marcas, u.email, dominioAdmin);
                if (acceso.error) return res.status(400).json({ error: acceso.error });
                cambios.rol = acceso.rol;
                cambios.marcas = acceso.marcas;
            }
            if ('activo' in body) cambios.activo = body.activo !== false;
            if ('nombre' in body) cambios.nombre = String(body.nombre || '').trim().slice(0, 120);
            if (dejaSinAdmin(usuarios, u.id, cambios)) {
                return res.status(400).json({ error: 'Tiene que quedar al menos un admin activo.' });
            }
            const antes = { ...u };
            Object.assign(u, cambios);
            if (cambios.activo === false && antes.activo !== false) u.sesionV = (u.sesionV || 1) + 1;
            try {
                await guardar();
            } catch (err) {
                Object.assign(u, antes);
                console.error('[auth] edición:', err.message);
                return res.status(500).json({ error: 'No se pudo guardar el cambio.' });
            }
            res.json({ usuario: publico(u) });
        });

        app.post('/api/auth/users/:id/reset', soloAdmin, async (req, res) => {
            const u = usuarios.find((x) => x.id === req.params.id);
            if (!u) return res.status(404).json({ error: 'Esa cuenta no existe.' });
            const antes = { ...u };
            const clave = generarClave();
            u.passwordHash = hashClave(clave);
            u.mustChangePassword = true;
            u.sesionV = (u.sesionV || 1) + 1;
            try {
                await guardar();
            } catch (err) {
                Object.assign(u, antes);
                console.error('[auth] reset:', err.message);
                return res.status(500).json({ error: 'No se pudo resetear la clave.' });
            }
            res.json({ usuario: publico(u), clave });
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
