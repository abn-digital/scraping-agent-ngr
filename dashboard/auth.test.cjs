// node --test dashboard/auth.test.cjs
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const {
    crearAuth,
    hashClave,
    verificarClave,
    generarClave,
    firmarSesion,
    leerSesion,
    dejaSinAdmin,
    validarAcceso,
    esDelDominioAdmin,
    ALFABETO,
    COOKIE,
} = require('./auth.cjs');
const { BRANDS, idsDeMarca } = require('../brand_config');

const MARCAS = BRANDS.map((b) => b.key);
const SECRETO = 'secreto-de-prueba';

test('scrypt: la clave correcta pasa, otra no', () => {
    const h = hashClave('una clave larga');
    assert.match(h, /^scrypt\$16384\$8\$1\$/);
    assert.equal(verificarClave('una clave larga', h), true);
    assert.equal(verificarClave('otra clave', h), false);
    assert.equal(verificarClave('x', 'basura'), false);
});

test('la clave generada tiene 20 caracteres y ninguno ambiguo', () => {
    for (let i = 0; i < 50; i++) {
        const c = generarClave();
        assert.equal(c.length, 20);
        for (const ch of c) assert.ok(ALFABETO.includes(ch));
        assert.doesNotMatch(c, /[0OIl1]/);
    }
});

test('la cookie firmada se lee, y adulterada o vencida no', () => {
    const t = firmarSesion({ sub: 'u1', exp: 2000, v: 1 }, SECRETO);
    assert.deepEqual(leerSesion(t, SECRETO, 1000), { sub: 'u1', exp: 2000, v: 1 });
    assert.equal(leerSesion(t, SECRETO, 3000), null);
    assert.equal(leerSesion(t, 'otro', 1000), null);
    const [cuerpo, firma] = t.split('.');
    const falso = Buffer.from(JSON.stringify({ sub: 'admin', exp: 2000, v: 1 })).toString('base64url');
    assert.equal(leerSesion(`${falso}.${firma}`, SECRETO, 1000), null);
    assert.equal(leerSesion(cuerpo, SECRETO, 1000), null);
});

test('validarAcceso: lectura y revisión piden al menos una marca; admin ninguna', () => {
    assert.ok(validarAcceso('viewer', [], MARCAS).error);
    assert.ok(validarAcceso('viewer', ['kfc'], MARCAS).error);
    assert.ok(validarAcceso('jefe', ['bembos'], MARCAS).error);
    assert.deepEqual(validarAcceso('reviewer', ['bembos', 'bembos'], MARCAS), { rol: 'reviewer', marcas: ['bembos'] });
    assert.deepEqual(validarAcceso('admin', ['bembos'], MARCAS), { rol: 'admin', marcas: [] });
});

test('no se puede dejar la app sin un admin activo', () => {
    const us = [
        { id: 'a', rol: 'admin', activo: true },
        { id: 'b', rol: 'viewer', activo: true },
    ];
    assert.equal(dejaSinAdmin(us, 'a', { activo: false }), true);
    assert.equal(dejaSinAdmin(us, 'a', { rol: 'viewer' }), true);
    assert.equal(dejaSinAdmin(us, 'b', { activo: false }), false);
    us.push({ id: 'c', rol: 'admin', activo: true });
    assert.equal(dejaSinAdmin(us, 'a', { activo: false }), false);
});

// ── Con el módulo armado ─────────────────────

function armar() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-'));
    const auth = crearAuth({ archivo: path.join(dir, 'users.json'), secreto: SECRETO, marcas: MARCAS, idsDeMarca });
    return auth;
}

/** Una app de Express de juguete: registra las rutas y las llama. */
function appFalsa() {
    const rutas = {};
    const reg = (m) => (ruta, ...fns) => { rutas[`${m} ${ruta}`] = fns; };
    return { rutas, get: reg('GET'), post: reg('POST'), patch: reg('PATCH') };
}

function respuesta() {
    const r = { statusCode: 200, headers: {}, body: undefined };
    r.status = (c) => { r.statusCode = c; return r; };
    r.json = (b) => { r.body = b; return r; };
    r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
    return r;
}

async function llamar(app, auth, metodo, ruta, { body, cookie, params } = {}) {
    const req = { method: metodo, path: ruta.replace(/^\/api/, ''), headers: { cookie }, body, params: params || {} };
    const res = respuesta();
    // Primero el middleware de sesión, como app.use('/api', …).
    let siguio = false;
    await auth.requiereSesion(req, res, () => { siguio = true; });
    if (!siguio) return res;
    const clave = Object.keys(app.rutas).find((k) => {
        const [m, patron] = k.split(' ');
        if (m !== metodo) return false;
        const re = new RegExp('^' + patron.replace(/:[^/]+/g, '([^/]+)') + '$');
        const hit = ruta.match(re);
        if (hit && patron.includes(':id')) req.params.id = hit[1];
        return !!hit;
    });
    const fns = app.rutas[clave];
    for (const fn of fns) {
        let next = false;
        await fn(req, res, () => { next = true; });
        if (!next) break;
    }
    return res;
}

const cookieDe = (res) => res.headers['set-cookie'].split(';')[0];

test('primer ingreso: bootstrap, mustChangePassword bloquea, cambiar la clave libera', async () => {
    const auth = armar();
    await auth.iniciar({ bootstrapEmail: 'Admin@NGR.pe', bootstrapPassword: 'clave-inicial-123' });
    const app = appFalsa();
    auth.montar(app);

    const sin = await llamar(app, auth, 'GET', '/api/auth/me');
    assert.equal(sin.statusCode, 200);
    assert.equal(sin.body.usuario, null);
    assert.equal((await llamar(app, auth, 'GET', '/api/auth/users')).statusCode, 401);

    const mal = await llamar(app, auth, 'POST', '/api/auth/login', { body: { email: 'admin@ngr.pe', password: 'nop' } });
    assert.equal(mal.statusCode, 401);
    assert.equal(mal.body.error, 'Email o clave incorrectos.');

    const ok = await llamar(app, auth, 'POST', '/api/auth/login', { body: { email: 'admin@ngr.pe', password: 'clave-inicial-123' } });
    assert.equal(ok.statusCode, 200);
    assert.equal(ok.body.usuario.mustChangePassword, true);
    assert.equal(ok.body.usuario.passwordHash, undefined);
    const c1 = cookieDe(ok);
    assert.ok(c1.startsWith(`${COOKIE}=`));
    assert.match(ok.headers['set-cookie'], /HttpOnly/);
    assert.match(ok.headers['set-cookie'], /SameSite=Lax/);

    const bloqueado = await llamar(app, auth, 'GET', '/api/auth/users', { cookie: c1 });
    assert.equal(bloqueado.statusCode, 403);
    assert.equal(bloqueado.body.code, 'MUST_CHANGE_PASSWORD');
    assert.equal((await llamar(app, auth, 'GET', '/api/auth/me', { cookie: c1 })).statusCode, 200);

    const corta = await llamar(app, auth, 'POST', '/api/auth/change-password', { cookie: c1, body: { actual: 'clave-inicial-123', nueva: 'corta' } });
    assert.equal(corta.statusCode, 400);
    const igual = await llamar(app, auth, 'POST', '/api/auth/change-password', { cookie: c1, body: { actual: 'clave-inicial-123', nueva: 'clave-inicial-123' } });
    assert.equal(igual.statusCode, 400);

    const cambio = await llamar(app, auth, 'POST', '/api/auth/change-password', { cookie: c1, body: { actual: 'clave-inicial-123', nueva: 'una-clave-nueva' } });
    assert.equal(cambio.statusCode, 200);
    assert.equal(cambio.body.usuario.mustChangePassword, false);
    const c2 = cookieDe(cambio);

    // La cookie vieja murió con el cambio de clave; la nueva entra.
    assert.equal((await llamar(app, auth, 'GET', '/api/auth/me', { cookie: c1 })).body.usuario, null);
    assert.equal((await llamar(app, auth, 'GET', '/api/auth/users', { cookie: c1 })).statusCode, 401);
    assert.equal((await llamar(app, auth, 'GET', '/api/auth/users', { cookie: c2 })).statusCode, 200);
});

test('alta, ACL por marca, reset, desactivar y último admin', async () => {
    const auth = armar();
    await auth.iniciar({ bootstrapEmail: 'admin@ngr.pe', bootstrapPassword: 'clave-inicial-123' });
    const app = appFalsa();
    auth.montar(app);
    const admin = auth._usuarios()[0];
    admin.mustChangePassword = false;
    const login = async (email, password) =>
        cookieDe(await llamar(app, auth, 'POST', '/api/auth/login', { body: { email, password } }));
    const ca = await login('admin@ngr.pe', 'clave-inicial-123');

    const alta = await llamar(app, auth, 'POST', '/api/auth/users', {
        cookie: ca, body: { email: 'brian@ngr.pe', rol: 'viewer', marcas: ['bembos'] },
    });
    assert.equal(alta.statusCode, 201);
    assert.equal(alta.body.clave.length, 20);
    const repetido = await llamar(app, auth, 'POST', '/api/auth/users', {
        cookie: ca, body: { email: 'BRIAN@ngr.pe', rol: 'viewer', marcas: ['bembos'] },
    });
    assert.equal(repetido.statusCode, 409);

    // Un GET nunca trae la clave ni el hash.
    const lista = await llamar(app, auth, 'GET', '/api/auth/users', { cookie: ca });
    assert.equal(lista.body.usuarios.length, 2);
    assert.ok(lista.body.usuarios.every((u) => !('passwordHash' in u) && !('clave' in u)));

    const brian = auth._usuarios().find((u) => u.email === 'brian@ngr.pe');
    assert.deepEqual(auth.marcasDe(brian), ['bembos']);
    assert.equal(auth.puedeVerMarca(brian, 'popeyes'), false);
    assert.equal(auth.puedeVerTienda(brian, '742'), true); // McDonald's en Rappi, competidor de Bembos
    assert.equal(auth.puedeVerTienda(brian, '6337'), true); // KFC: competencia de todas las marcas
    assert.equal(auth.puedeVerTienda(brian, 'kfc-pe'), true);
    assert.equal(auth.puedeVerTienda(brian, '58629'), false); // Yopo: solo de Popeyes
    assert.equal(auth.puedeVerTienda(brian, 'mcd-izaguirre-iza'), false); // no cuelga de ninguna marca
    assert.equal(auth.puedeVerTienda(admin, 'mcd-izaguirre-iza'), true);
    assert.equal(auth.puedeRevisar(brian), false);

    // Un viewer no entra a Usuarios.
    brian.mustChangePassword = false;
    const cb = await login('brian@ngr.pe', alta.body.clave);
    assert.equal((await llamar(app, auth, 'GET', '/api/auth/users', { cookie: cb })).statusCode, 403);

    // Reset: clave nueva, la vieja no entra, la sesión vieja muere.
    const reset = await llamar(app, auth, 'POST', `/api/auth/users/${brian.id}/reset`, { cookie: ca });
    assert.equal(reset.statusCode, 200);
    assert.equal(reset.body.usuario.mustChangePassword, true);
    assert.equal((await llamar(app, auth, 'GET', '/api/auth/me', { cookie: cb })).body.usuario, null);
    const vieja = await llamar(app, auth, 'POST', '/api/auth/login', { body: { email: 'brian@ngr.pe', password: alta.body.clave } });
    assert.equal(vieja.statusCode, 401);

    // Desactivar: el login se rechaza.
    const off = await llamar(app, auth, 'PATCH', `/api/auth/users/${brian.id}`, { cookie: ca, body: { activo: false } });
    assert.equal(off.statusCode, 200);
    const rechazado = await llamar(app, auth, 'POST', '/api/auth/login', { body: { email: 'brian@ngr.pe', password: reset.body.clave } });
    assert.equal(rechazado.statusCode, 401);

    // El último admin no se desactiva ni deja de ser admin.
    const yo = await llamar(app, auth, 'PATCH', `/api/auth/users/${admin.id}`, { cookie: ca, body: { activo: false } });
    assert.equal(yo.statusCode, 400);
    const bajar = await llamar(app, auth, 'PATCH', `/api/auth/users/${admin.id}`, { cookie: ca, body: { rol: 'viewer', marcas: ['bembos'] } });
    assert.equal(bajar.statusCode, 400);
});

test('después de 8 fallos del mismo email, 429', async () => {
    const auth = armar();
    await auth.iniciar({ bootstrapEmail: 'admin@ngr.pe', bootstrapPassword: 'clave-inicial-123' });
    const app = appFalsa();
    auth.montar(app);
    for (let i = 0; i < 8; i++) {
        const r = await llamar(app, auth, 'POST', '/api/auth/login', { body: { email: 'admin@ngr.pe', password: 'mal' } });
        assert.equal(r.statusCode, 401);
    }
    const r = await llamar(app, auth, 'POST', '/api/auth/login', { body: { email: 'admin@ngr.pe', password: 'clave-inicial-123' } });
    assert.equal(r.statusCode, 429);
});

test('si GCS no respondió al arrancar, no se sube nada', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-'));
    let subidas = 0;
    const auth = crearAuth({
        archivo: path.join(dir, 'users.json'), secreto: SECRETO, marcas: MARCAS, idsDeMarca,
        remoto: { descargar: async () => { throw new Error('sin red'); }, subir: async () => { subidas++; } },
    });
    await auth.iniciar({ bootstrapEmail: 'admin@ngr.pe', bootstrapPassword: 'clave-inicial-123' });
    assert.equal(subidas, 0);
    assert.equal(auth._usuarios().length, 1);
});

test('las cuentas de @abndigital.com.ar son siempre admin', async () => {
    assert.equal(esDelDominioAdmin('Ana@ABNdigital.com.ar'.toLowerCase()), true);
    assert.equal(esDelDominioAdmin('ana@abndigital.com.ar.evil.com'), false);
    assert.equal(esDelDominioAdmin('ana@otro.com'), false);
    assert.deepEqual(validarAcceso(undefined, [], MARCAS, 'ana@abndigital.com.ar'), { rol: 'admin', marcas: [] });
    assert.ok(validarAcceso('viewer', ['bembos'], MARCAS, 'ana@abndigital.com.ar').error);

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-'));
    const archivo = path.join(dir, 'users.json');
    // Una cuenta del dominio guardada como lectura (de antes de la regla) se corrige al arrancar.
    fs.writeFileSync(archivo, JSON.stringify({ usuarios: [
        { id: 'a', email: 'jefe@ngr.pe', rol: 'admin', marcas: [], activo: true, passwordHash: hashClave('x'.repeat(12)) },
        { id: 'b', email: 'dev@abndigital.com.ar', rol: 'viewer', marcas: ['bembos'], activo: true, passwordHash: hashClave('x'.repeat(12)) },
    ] }));
    const auth = crearAuth({ archivo, secreto: SECRETO, marcas: MARCAS, idsDeMarca });
    await auth.iniciar({});
    assert.equal(auth._usuarios().find((u) => u.id === 'b').rol, 'admin');

    const app = appFalsa();
    auth.montar(app);
    const ok = await llamar(app, auth, 'POST', '/api/auth/login', { body: { email: 'jefe@ngr.pe', password: 'x'.repeat(12) } });
    const c = cookieDe(ok);
    const alta = await llamar(app, auth, 'POST', '/api/auth/users', { cookie: c, body: { email: 'nueva@abndigital.com.ar', rol: 'viewer', marcas: ['bembos'] } });
    assert.equal(alta.statusCode, 400);
    const alta2 = await llamar(app, auth, 'POST', '/api/auth/users', { cookie: c, body: { email: 'nueva@abndigital.com.ar', rol: 'admin' } });
    assert.equal(alta2.statusCode, 201);
    assert.equal(alta2.body.usuario.rol, 'admin');
    const bajar = await llamar(app, auth, 'PATCH', '/api/auth/users/b', { cookie: c, body: { rol: 'reviewer', marcas: ['bembos'] } });
    assert.equal(bajar.statusCode, 400);
});

// ── Varias instancias de Cloud Run contra el mismo users.json ─────────

/** Un users.json en "GCS" con generaciones, compartido por varias instancias. */
function gcsFalso() {
    const estado = { generacion: 0, contenido: null, escrituras: 0 };
    return {
        estado,
        leer: async () => ({ generacion: estado.generacion, contenido: estado.contenido }),
        escribir: async (contenido, esperada) => {
            if (esperada !== estado.generacion) {
                const err = new Error('precondition failed');
                err.code = 412;
                throw err;
            }
            estado.generacion += 1;
            estado.contenido = contenido;
            estado.escrituras += 1;
            return estado.generacion;
        },
    };
}

async function instancia(remoto, reloj) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auth-'));
    const auth = crearAuth({ archivo: path.join(dir, 'users.json'), secreto: SECRETO, marcas: MARCAS, idsDeMarca, remoto, ahora: () => reloj.t });
    await auth.iniciar({ bootstrapEmail: 'admin@ngr.pe', bootstrapPassword: 'clave-inicial-123' });
    const app = appFalsa();
    auth.montar(app);
    return { auth, app };
}

test('dos instancias: lo que se crea en una se puede usar en la otra', async () => {
    const remoto = gcsFalso();
    const reloj = { t: 1_000_000 };
    const A = await instancia(remoto, reloj);
    const B = await instancia(remoto, reloj);
    // Las dos arrancaron con GCS vacío: solo una sembró el admin.
    assert.equal(JSON.parse(remoto.estado.contenido).usuarios.length, 1);

    A.auth._usuarios()[0].mustChangePassword = false; // en memoria de A, para el test
    const ca = cookieDe(await llamar(A.app, A.auth, 'POST', '/api/auth/login', { body: { email: 'admin@ngr.pe', password: 'clave-inicial-123' } }));
    // La cookie de A sirve en B (mismo secreto, misma cuenta).
    reloj.t += 3000;
    assert.equal((await llamar(B.app, B.auth, 'GET', '/api/auth/me', { cookie: ca })).body.usuario.email, 'admin@ngr.pe');

    // Alta en A, login en B.
    const alta = await llamar(A.app, A.auth, 'POST', '/api/auth/users', {
        cookie: ca, body: { email: 'brian@ngr.pe', rol: 'viewer', marcas: ['bembos'] },
    });
    assert.equal(alta.statusCode, 201, JSON.stringify(alta.body));
    reloj.t += 3000;
    const enB = await llamar(B.app, B.auth, 'POST', '/api/auth/login', { body: { email: 'brian@ngr.pe', password: alta.body.clave } });
    assert.equal(enB.statusCode, 200);
    const cb = cookieDe(enB);

    // Desactivar en A: B se entera a más tardar en el próximo refresco.
    const id = alta.body.usuario.id;
    assert.equal((await llamar(A.app, A.auth, 'PATCH', `/api/auth/users/${id}`, { cookie: ca, body: { activo: false } })).statusCode, 200);
    reloj.t += 31_000;
    await llamar(B.app, B.auth, 'GET', '/api/auth/me', { cookie: cb }); // dispara el refresco de fondo
    await new Promise((r) => setImmediate(r));
    assert.equal((await llamar(B.app, B.auth, 'GET', '/api/auth/me', { cookie: cb })).body.usuario, null);
});

test('dos altas a la vez en instancias distintas no se pisan', async () => {
    const remoto = gcsFalso();
    const reloj = { t: 2_000_000 };
    const A = await instancia(remoto, reloj);
    const B = await instancia(remoto, reloj);
    for (const I of [A, B]) I.auth._usuarios()[0].mustChangePassword = false;
    const login = async (I) => cookieDe(await llamar(I.app, I.auth, 'POST', '/api/auth/login', { body: { email: 'admin@ngr.pe', password: 'clave-inicial-123' } }));
    const [ca, cb] = [await login(A), await login(B)];
    // B sigue con la foto vieja en memoria cuando A escribe: su escritura choca (412) y reintenta sobre lo nuevo.
    const [r1, r2] = await Promise.all([
        llamar(A.app, A.auth, 'POST', '/api/auth/users', { cookie: ca, body: { email: 'uno@ngr.pe', rol: 'viewer', marcas: ['bembos'] } }),
        llamar(B.app, B.auth, 'POST', '/api/auth/users', { cookie: cb, body: { email: 'dos@ngr.pe', rol: 'viewer', marcas: ['popeyes'] } }),
    ]);
    assert.equal(r1.statusCode, 201);
    assert.equal(r2.statusCode, 201);
    const final = JSON.parse(remoto.estado.contenido).usuarios.map((u) => u.email).sort();
    assert.deepEqual(final, ['admin@ngr.pe', 'dos@ngr.pe', 'uno@ngr.pe']);
    // Y el mismo email desde las dos instancias: uno gana, el otro recibe 409.
    const [x, y] = await Promise.all([
        llamar(A.app, A.auth, 'POST', '/api/auth/users', { cookie: ca, body: { email: 'tres@ngr.pe', rol: 'viewer', marcas: ['bembos'] } }),
        llamar(B.app, B.auth, 'POST', '/api/auth/users', { cookie: cb, body: { email: 'tres@ngr.pe', rol: 'viewer', marcas: ['bembos'] } }),
    ]);
    assert.deepEqual([x.statusCode, y.statusCode].sort(), [201, 409]);
});

test('las rutas internas de los jobs no piden cookie (traen su propio secreto)', async () => {
    const auth = armar();
    await auth.iniciar({});
    for (const ruta of ['/internal/resync', '/internal/scrape-sentinel']) {
        let siguio = false;
        await auth.requiereSesion({ path: ruta, headers: {} }, respuesta(), () => { siguio = true; });
        assert.equal(siguio, true, ruta);
    }
});
