// Pruebas locales de las funciones /api con una base Postgres real en memoria (PGlite).
// Ejecutar: npm test
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { manejar, acceso, sync, admin, ESQUEMA } from '../api/_lib/core.js';

const db = new PGlite();
globalThis.__aycQuery = async (t, p = []) => (await db.query(t, p)).rows;

const ENV = { ALTOYCLARO_CLAVE: 'clave-de-prueba-del-profe', ALTOYCLARO_SECRETO: 'x'.repeat(40) + '-secreto-de-prueba' };
const fns = { acceso, sync, admin };

async function llamar(fn, body, { cookie, ip = '10.0.0.1', profe, env = ENV, tipo = 'application/json', metodo = 'POST' } = {}) {
    const req = { method: metodo, headers: { 'content-type': tipo, 'x-forwarded-for': ip }, body };
    if (cookie) req.headers.cookie = cookie;
    if (profe) req.headers['x-clave-profe'] = profe;
    const res = { headers: {}, statusCode: 0, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, end(d) { this.data = d; } };
    await manejar(req, res, fns[fn], env);
    const scs = res.headers['set-cookie'] == null ? [] : [].concat(res.headers['set-cookie']);
    const sc = scs.join('\n') || undefined;
    return { status: res.statusCode, body: JSON.parse(res.data), cookie: scs.length ? scs[0].split(';')[0] : null, setCookie: sc, cookies: scs, headers: res.headers };
}
const adm = (body, o = {}) => llamar('admin', body, { profe: ENV.ALTOYCLARO_CLAVE, ...o });
const entrar = (codigo, dispositivo, o = {}) => llamar('acceso', { accion: 'entrar', codigo, dispositivo, nombre: 'Prueba' }, o);

let ok = 0;
async function prueba(nombre, f) {
    try { await f(); ok++; console.log('  ✔', nombre); }
    catch (e) { console.error('  ✘', nombre, '\n', e); process.exitCode = 1; }
}

console.log('API altoyclaro');
const D1 = 'dispositivo-uno-1234', D2 = 'dispositivo-dos-5678', D3 = 'dispositivo-tres-9999';
let nino, codigo, c1, c2;

await prueba('sin variables de entorno: mensajes claros', async () => {
    let r = await adm({ accion: 'listar' }, { env: { ALTOYCLARO_SECRETO: ENV.ALTOYCLARO_SECRETO } });
    assert.equal(r.status, 500); assert.match(r.body.mensaje, /ALTOYCLARO_CLAVE/);
    r = await adm({ accion: 'listar' }, { env: { ALTOYCLARO_CLAVE: ENV.ALTOYCLARO_CLAVE } });
    assert.equal(r.status, 500); assert.match(r.body.mensaje, /ALTOYCLARO_SECRETO/);
    r = await entrar('ABCD-EFGH', D1, { env: { ALTOYCLARO_CLAVE: 'a' } });
    assert.equal(r.status, 500); assert.match(r.body.mensaje, /ALTOYCLARO_SECRETO/);
    const igual = 'y'.repeat(40);
    r = await adm({ accion: 'listar' }, { env: { ALTOYCLARO_CLAVE: igual, ALTOYCLARO_SECRETO: igual } });
    assert.equal(r.status, 500); assert.match(r.body.mensaje, /distintas/);
    const guardado = globalThis.__aycQuery; delete globalThis.__aycQuery;
    r = await adm({ accion: 'listar' }, { env: ENV });
    globalThis.__aycQuery = guardado;
    assert.equal(r.status, 500); assert.match(r.body.mensaje, /DATABASE_URL/);
});

await prueba('solo POST + JSON (CSRF) y no-store', async () => {
    let r = await llamar('acceso', {}, { metodo: 'GET' }); assert.equal(r.status, 405);
    r = await llamar('acceso', 'codigo=x', { tipo: 'application/x-www-form-urlencoded' }); assert.equal(r.status, 415);
    assert.equal(r.headers['cache-control'], 'no-store');
});

await prueba('profe: clave incorrecta rechazada', async () => {
    const r = await adm({ accion: 'listar' }, { profe: 'mala', ip: '10.9.9.9' });
    assert.equal(r.status, 401);
});

await prueba('profe crea niño: clave de 8 caracteres sin ambiguos, guardada con hash', async () => {
    const r = await adm({ accion: 'crear', alias: 'Lucía G.' });
    assert.equal(r.status, 200);
    assert.match(r.body.codigo, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/);
    nino = r.body.id; codigo = r.body.codigo;
    const filas = await globalThis.__aycQuery('SELECT * FROM ayc_ninos');
    assert.equal(filas.length, 1);
    const plano = codigo.replace('-', '');
    assert.ok(!JSON.stringify(filas).includes(plano), 'la clave no debe estar en claro');
    assert.match(filas[0].codigo_hash, /^[0-9a-f]{64}$/);
    const l = await adm({ accion: 'listar' });
    assert.ok(!JSON.stringify(l.body).includes(plano), 'listar no debe devolver la clave');
});

await prueba('entrar con la clave (también en minúsculas y sin guion)', async () => {
    const r = await entrar(codigo.toLowerCase().replace('-', ''), D1);
    assert.equal(r.status, 200); assert.equal(r.body.alias, 'Lucía G.');
    assert.match(r.setCookie, /HttpOnly/); assert.match(r.setCookie, /Secure/); assert.match(r.setCookie, /SameSite=Lax/);
    c1 = r.cookie;
    const e = await llamar('acceso', { accion: 'estado' }, { cookie: c1 });
    assert.equal(e.status, 200); assert.equal(e.body.id, nino);
});

await prueba('cookie manipulada rechazada', async () => {
    const [cuerpo] = c1.split('=')[1].split('.');
    const r = await llamar('sync', {}, { cookie: 'ayc_sesion=' + cuerpo + '.AAAA' });
    assert.equal(r.status, 401);
});

await prueba('límite de 2 dispositivos: el 2º entra, el 3º se rechaza con mensaje amable', async () => {
    const r2 = await entrar(codigo, D2); assert.equal(r2.status, 200); c2 = r2.cookie;
    const again = await entrar(codigo, D1); assert.equal(again.status, 200, 'el mismo dispositivo puede volver a entrar');
    const r3 = await entrar(codigo, D3);
    assert.equal(r3.status, 403); assert.equal(r3.body.codigo, 'limite_dispositivos'); assert.match(r3.body.mensaje, /profe/);
    const l = await adm({ accion: 'listar' });
    assert.equal(l.body.ninos[0].dispositivos.length, 2);
});

await prueba('sincronización: perfil (gana el más reciente) e intentos fusionados por id', async () => {
    const t0 = Date.now();
    let r = await llamar('sync', { perfil: { name: 'Lucía', age: 9, country: 'Marruecos', hobby: 'futbol', level: 1, xp: 30 }, perfilT: t0,
        intentos: [{ id: 'a1', t: t0 - 5000, palabra: 'perro', oido: 'perro', score: 100, resultado: 'perfecto', audioId: 'no-debe-subir' },
                   { id: 'a2', t: t0 - 4000, palabra: 'gato', oido: 'pato', score: 75, resultado: 'casi' }], cursor: 0 }, { cookie: c1 });
    assert.equal(r.status, 200); assert.equal(r.body.perfil.xp, 30); assert.equal(r.body.intentos.length, 2);
    assert.ok(!('audioId' in r.body.intentos[0]), 'audioId no se guarda en el servidor');
    const crudo = await globalThis.__aycQuery('SELECT datos FROM ayc_intentos');
    assert.ok(!JSON.stringify(crudo).includes('no-debe-subir'));
    // dispositivo 2: perfil más antiguo no pisa; sube a2 repetido + a3
    r = await llamar('sync', { perfil: { name: 'Viejo', xp: 5 }, perfilT: t0 - 100000,
        intentos: [{ id: 'a2', t: t0 - 4000, palabra: 'gato', score: 75, resultado: 'casi' }, { id: 'a3', t: t0 - 1000, palabra: 'casa', score: 90, resultado: 'perfecto' }], cursor: 0 }, { cookie: c2 });
    assert.equal(r.body.perfil.name, 'Lucía'); assert.equal(r.body.perfil.xp, 30);
    assert.deepEqual(r.body.intentos.map(i => i.id).sort(), ['a1', 'a2', 'a3']);
    // dispositivo 2 con perfil más reciente sí gana
    r = await llamar('sync', { perfil: { name: 'Lucía', age: 9, level: 2, xp: 120 }, perfilT: t0 + 10, intentos: [] }, { cookie: c2 });
    assert.equal(r.body.perfil.xp, 120);
    r = await llamar('sync', { cursor: 0 }, { cookie: c1 });
    assert.equal(r.body.perfil.xp, 120); assert.equal(r.body.perfilT, t0 + 10); assert.equal(r.body.intentos.length, 3);
    // datos maliciosos se limpian
    r = await llamar('sync', { perfil: { name: '<script>x</script>' + 'a'.repeat(100), xp: -5, level: 99, extra: 'nope', age: 9, country: 'Ucrania', hobby: 'futbol' }, perfilT: t0 + 20 }, { cookie: c1 });
    assert.ok(!r.body.perfil.name.includes('<')); assert.ok(r.body.perfil.name.length <= 40);
    assert.equal(r.body.perfil.xp, 0); assert.equal(r.body.perfil.level, 3); assert.ok(!('extra' in r.body.perfil));
    for (const k of ['age', 'country', 'hobby']) assert.ok(!(k in r.body.perfil), 'no se guarda ' + k);
});

await prueba('test de nivel: se guardan solo puntuaciones limpias (sin textos), perfiles antiguos siguen valiendo', async () => {
    let r = await llamar('sync', { cursor: 0 }, { cookie: c1 });
    const cur = r.body.perfil, tCur = r.body.perfilT;
    assert.ok(Array.isArray(cur.pruebas) || cur.pruebas === undefined, 'perfil antiguo sin pruebas vale');
    const prueba = { id: 'tabc123', t: Date.now(), nivel: 2, nivelAntes: null, total: 58, comp: 80, voc: 70, conv: 41, modo: 'auto', completo: true, dur: 312,
        texto: 'ayer fui al parque', textos: { c6: 'ayer fui al parque' },
        items: [{ id: 'k1', b: 'comp', r: 'ok', p: 1, m: 1, c: 'K' }, { id: 'c6', b: 'conv', r: 'respuesta', p: 6, m: 6, c: 'RLVKQT', l: 2.4, texto: 'ayer fui al parque' },
            { id: '<x>', b: 'conv', r: 'respuesta', p: 1, m: 1, c: 'R' }, { id: 'c1', b: 'mal', r: 'hackeo', p: 99, m: 5, c: 'R<script>' }] };
    r = await llamar('sync', { perfil: { ...cur, pruebas: [prueba, { id: '', t: 1 }, 'basura'] }, perfilT: tCur + 1 }, { cookie: c1 });
    const ps = r.body.perfil.pruebas;
    assert.equal(ps.length, 1);
    assert.equal(ps[0].nivel, 2); assert.equal(ps[0].conv, 41); assert.equal(ps[0].items.length, 3);
    assert.ok(!JSON.stringify(ps).includes('parque'), 'las respuestas libres no se guardan en el servidor');
    assert.deepEqual(ps[0].items[1], { id: 'c6', b: 'conv', r: 'respuesta', p: 6, m: 6, c: 'RLVKQT', l: 2.4 });
    assert.deepEqual(ps[0].items[2], { id: 'c1', b: 'conv', r: 'nr', p: 10, m: 5, c: 'R' });
    const l = await adm({ accion: 'listar' });
    const n = l.body.ninos.find(x => x.id === nino);
    assert.deepEqual(n.test, { t: prueba.t, nivel: 2, comp: 80, voc: 70, conv: 41 });
    // Test con preguntas sorteadas: ids de 2-3 cifras, semilla y lista de ids (solo identificadores, nunca textos)
    const sorteada = { ...prueba, id: 'tsor1', sem: 123456789, ids: ['k03', 'v17', 'c41', 'd12', 'Toca el perro', '<x>', 'c1234'],
        items: [{ id: 'k03', b: 'comp', r: 'ok', p: 1, m: 1, c: 'K' }, { id: 'd12', b: 'conv', r: 'respuesta', p: 5, m: 5, c: 'RLVKQ' }, { id: 'c1234', b: 'conv', r: 'nr', p: 0, m: 5, c: '' }] };
    r = await llamar('sync', { perfil: { ...cur, pruebas: [sorteada] }, perfilT: tCur + 2 }, { cookie: c1 });
    const s0 = r.body.perfil.pruebas[0];
    assert.equal(s0.sem, 123456789);
    assert.deepEqual(s0.ids, ['k03', 'v17', 'c41', 'd12']);
    assert.deepEqual(s0.items.map(i => i.id), ['k03', 'd12']);
    // 12 pruebas → se quedan las 10 últimas
    const muchas = Array.from({ length: 12 }, (_, i) => ({ ...prueba, id: 't' + i, t: prueba.t + i }));
    r = await llamar('sync', { perfil: { ...cur, pruebas: muchas }, perfilT: tCur + 3 }, { cookie: c1 });
    assert.equal(r.body.perfil.pruebas.length, 10); assert.equal(r.body.perfil.pruebas[0].id, 't2');
});

await prueba('borrar historial se propaga (y no reaparece desde otro dispositivo)', async () => {
    let r = await llamar('sync', { borrarIntentos: true }, { cookie: c1 });
    assert.equal(r.body.intentos.length, 0); assert.ok(r.body.borradoT > 0);
    r = await llamar('sync', { intentos: [{ id: 'a1', t: Date.now() - 50000, palabra: 'perro', score: 100, resultado: 'perfecto' }], cursor: 0 }, { cookie: c2 });
    assert.equal(r.body.intentos.length, 0, 'intento antiguo no vuelve');
    r = await llamar('sync', { intentos: [{ id: 'b1', t: Date.now() + 5, palabra: 'sol', score: 100, resultado: 'perfecto' }], cursor: 0 }, { cookie: c2 });
    assert.equal(r.body.intentos.length, 1);
});

await prueba('profe libera un dispositivo: esa sesión cae y deja hueco para otro', async () => {
    let r = await adm({ accion: 'liberar', id: nino, dispositivo: D2 }); assert.equal(r.status, 200);
    r = await llamar('sync', {}, { cookie: c2 }); assert.equal(r.status, 401); assert.equal(r.body.codigo, 'liberado');
    r = await entrar(codigo, D3); assert.equal(r.status, 200);
});

await prueba('cerrar sesión (salir) libera el hueco', async () => {
    const r3 = await entrar(codigo, D3);
    let r = await llamar('acceso', { accion: 'salir' }, { cookie: r3.cookie });
    assert.equal(r.status, 200); assert.match(r.setCookie, /Max-Age=0/);
    const l = await adm({ accion: 'listar' });
    assert.equal(l.body.ninos[0].dispositivos.length, 1);
});

await prueba('regenerar: la clave vieja deja de valer, sesiones caen, la nueva funciona', async () => {
    const r = await adm({ accion: 'regenerar', id: nino });
    assert.notEqual(r.body.codigo, codigo);
    let s = await llamar('sync', {}, { cookie: c1 }); assert.equal(s.status, 401); assert.equal(s.body.codigo, 'revocado');
    s = await entrar(codigo, D1, { ip: '10.0.0.2' }); assert.equal(s.status, 401);
    codigo = r.body.codigo;
    s = await entrar(codigo, D1); assert.equal(s.status, 200); c1 = s.cookie;
    s = await llamar('sync', { cursor: 0 }, { cookie: c1 }); assert.equal(s.body.perfil.name.startsWith('scriptx'), true, 'datos se conservan');
});

await prueba('revocar: nadie puede entrar ni sincronizar', async () => {
    await adm({ accion: 'revocar', id: nino });
    let s = await llamar('sync', {}, { cookie: c1 }); assert.equal(s.status, 401);
    s = await entrar(codigo, D1, { ip: '10.0.0.3' }); assert.equal(s.status, 401);
    const l = await adm({ accion: 'listar' }); assert.equal(l.body.ninos[0].revocado, true);
});

await prueba('borrar niño elimina todos sus datos del servidor', async () => {
    const r = await adm({ accion: 'crear', alias: 'Omar' });
    const e = await entrar(r.body.codigo, D1, { ip: '10.0.0.4' });
    await llamar('sync', { perfil: { name: 'Omar', xp: 10 }, perfilT: Date.now(), intentos: [{ id: 'z', t: Date.now(), palabra: 'luna', score: 100, resultado: 'perfecto' }] }, { cookie: e.cookie });
    await adm({ accion: 'borrar', id: r.body.id });
    const q = globalThis.__aycQuery;
    for (const t of ['ayc_ninos WHERE id', 'ayc_estado WHERE nino_id', 'ayc_intentos WHERE nino_id', 'ayc_dispositivos WHERE nino_id']) {
        assert.equal((await q(`SELECT count(*)::int AS n FROM ${t} = $1`, [r.body.id]))[0].n, 0, t);
    }
    const s = await llamar('sync', {}, { cookie: e.cookie }); assert.equal(s.status, 401);
});

await prueba('límite de intentos: 5 fallos con la misma clave y 20 por IP → 429', async () => {
    const r = await adm({ accion: 'crear', alias: 'Ana' });
    const buena = r.body.codigo;
    // 5 fallos "contra" la misma clave ficticia desde IPs distintas
    for (let i = 0; i < 5; i++) assert.equal((await entrar('ZZZZ-ZZZZ', D1, { ip: '20.0.0.' + i })).status, 401);
    assert.equal((await entrar('ZZZZ-ZZZZ', D1, { ip: '20.0.1.1' })).status, 429);
    // 20 fallos desde la misma IP con claves distintas → bloquea incluso la buena
    for (let i = 0; i < 20; i++) assert.equal((await entrar('AAAA-AA' + 'ABCDEFGHJKMNPQRSTUVW'[i] + 'A', D1, { ip: '30.0.0.1' })).status, 401);
    const b = await entrar(buena, D1, { ip: '30.0.0.1' }); assert.equal(b.status, 429); assert.match(b.body.mensaje, /15 minutos/);
    assert.equal((await entrar(buena, D1, { ip: '30.0.0.2' })).status, 200, 'otra IP sí puede');
    // profe: 10 fallos → 429
    for (let i = 0; i < 10; i++) await adm({ accion: 'listar' }, { profe: 'mal', ip: '40.0.0.1' });
    assert.equal((await adm({ accion: 'listar' }, { ip: '40.0.0.1' })).status, 429);
});


/* ---------- Acceso obligatorio: sesión del profe y comprobación de sesión ---------- */
const sesion = (o = {}) => llamar('acceso', { accion: 'sesion' }, o);
let cProfe;
await prueba('sin cookies: sesión vacía (ni niño ni profe)', async () => {
    const r = await sesion();
    assert.equal(r.status, 200); assert.equal(r.body.nino, null); assert.equal(r.body.profe, false);
});
await prueba('profe entra con su clave: cookie HttpOnly corta y aparte de la del niño', async () => {
    let r = await llamar('acceso', { accion: 'entrar_profe', clave: 'mala' }, { ip: '50.0.0.1' });
    assert.equal(r.status, 401); assert.equal(r.cookie, null);
    r = await llamar('acceso', { accion: 'entrar_profe', clave: ENV.ALTOYCLARO_CLAVE }, { ip: '50.0.0.1' });
    assert.equal(r.status, 200); assert.equal(r.body.profe, true);
    assert.match(r.setCookie, /^ayc_profe=/); assert.match(r.setCookie, /HttpOnly/); assert.match(r.setCookie, /Secure/); assert.match(r.setCookie, /SameSite=Lax/);
    const maxAge = Number(/Max-Age=(\d+)/.exec(r.setCookie)[1]); assert.ok(maxAge > 0 && maxAge <= 12 * 3600, 'caduca pronto: ' + maxAge);
    assert.ok(!r.setCookie.includes(ENV.ALTOYCLARO_CLAVE), 'la clave del profe no va en la cookie');
    cProfe = r.cookie;
    const s = await sesion({ cookie: cProfe });
    assert.equal(s.body.profe, true); assert.equal(s.body.nino, null);
});
await prueba('profe con sesión: gestiona claves sin enviar la clave', async () => {
    const r = await llamar('admin', { accion: 'listar' }, { cookie: cProfe });
    assert.equal(r.status, 200); assert.ok(Array.isArray(r.body.ninos));
    const sin = await llamar('admin', { accion: 'listar' });
    assert.equal(sin.status, 401);
});
await prueba('firmas separadas: una cookie de niño no vale como profe (ni al revés)', async () => {
    const c = await adm({ accion: 'crear', alias: 'Prueba firma' });
    const e = await entrar(c.body.codigo, 'dispositivo-firma-0001', { ip: '50.0.0.2' });
    const valor = e.cookie.split('=')[1];
    let r = await llamar('admin', { accion: 'listar' }, { cookie: 'ayc_profe=' + valor });
    assert.equal(r.status, 401, 'cookie de niño copiada como profe');
    r = await sesion({ cookie: 'ayc_profe=' + valor }); assert.equal(r.body.profe, false);
    r = await llamar('sync', {}, { cookie: 'ayc_sesion=' + cProfe.split('=')[1] });
    assert.equal(r.status, 401, 'cookie de profe copiada como niño');
    // sesión de niño válida
    r = await sesion({ cookie: e.cookie });
    assert.equal(r.body.nino.alias, 'Prueba firma'); assert.equal(r.body.profe, false);
    // revocada → la comprobación de sesión la rechaza, explica el motivo y borra la cookie
    await adm({ accion: 'revocar', id: c.body.id });
    r = await sesion({ cookie: e.cookie });
    assert.equal(r.status, 200); assert.equal(r.body.nino, null); assert.match(r.body.motivo, /clave/); assert.match(r.setCookie, /ayc_sesion=;.*Max-Age=0/);
});
await prueba('sesión del profe caducada, manipulada o de otra clave de profe → no vale', async () => {
    const { firmarSesion } = await import('../api/_lib/core.js');
    const viejo = firmarSesion(ENV, { profe: 1, k: 'x', iat: 1, exp: Date.now() - 1000 }, 'firma-sesion-profe');
    let r = await llamar('admin', { accion: 'listar' }, { cookie: 'ayc_profe=' + viejo });
    assert.equal(r.status, 401);
    r = await sesion({ cookie: 'ayc_profe=' + viejo });
    assert.equal(r.body.profe, false); assert.match(r.body.motivo, /caducado/); assert.match(r.setCookie, /ayc_profe=;.*Max-Age=0/);
    const [cuerpo] = cProfe.split('=')[1].split('.');
    r = await llamar('admin', { accion: 'listar' }, { cookie: 'ayc_profe=' + cuerpo + '.AAAA' }); assert.equal(r.status, 401);
    // si se cambia la clave del profe, las sesiones abiertas dejan de valer
    r = await llamar('admin', { accion: 'listar' }, { cookie: cProfe, env: { ...ENV, ALTOYCLARO_CLAVE: 'otra-clave-del-profe-nueva' } });
    assert.equal(r.status, 401);
    // salir_profe borra la cookie
    r = await llamar('acceso', { accion: 'salir_profe' }, { cookie: cProfe });
    assert.equal(r.status, 200); assert.match(r.setCookie, /ayc_profe=;.*Max-Age=0/);
});
await prueba('entrar como profe también tiene límite de intentos (10 por IP → 429)', async () => {
    for (let i = 0; i < 10; i++) await llamar('acceso', { accion: 'entrar_profe', clave: 'mal' + i }, { ip: '60.0.0.1' });
    const r = await llamar('acceso', { accion: 'entrar_profe', clave: ENV.ALTOYCLARO_CLAVE }, { ip: '60.0.0.1' });
    assert.equal(r.status, 429); assert.equal(r.cookie, null);
});
await prueba('base de datos caída → 503 con mensaje claro (no deja entrar)', async () => {
    const guardado = globalThis.__aycQuery, listo = globalThis.__aycEsquemaListo;
    globalThis.__aycQuery = async () => { throw new Error('connect ECONNREFUSED'); };
    delete globalThis.__aycEsquemaListo;
    try {
        const r = await sesion();
        assert.equal(r.status, 503); assert.equal(r.body.codigo, 'bd'); assert.match(r.body.mensaje, /base de datos/);
    } finally { globalThis.__aycQuery = guardado; if (listo) globalThis.__aycEsquemaListo = listo; }
});

console.log(`\n${ok} pruebas superadas${process.exitCode ? ' (HAY FALLOS)' : ''}`);
