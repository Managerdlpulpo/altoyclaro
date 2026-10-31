// Me gusta hablar Alto y claro · backend de claves de acceso y sincronización
// - Funciones serverless de Vercel (Node). Base de datos: Postgres (Neon).
// - Las grabaciones de voz NUNCA llegan aquí: solo texto (perfil, lista de intentos, puntuaciones de lectura y de frases, pegatinas).
import crypto from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { evaluarPegatinas, PEGATINAS_IDS } from './pegatinas.js';

export const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O, 1/I/L
export const LONGITUD_CODIGO = 8;
export const MAX_DISPOSITIVOS = 2;
const COOKIE = 'ayc_sesion';
const SESION_SEG = 180 * 24 * 3600;
const COOKIE_PROFE = 'ayc_profe';
const SESION_PROFE_SEG = 8 * 3600; // la sesión del profe caduca a las 8 horas
const VENTANA_MS = 15 * 60 * 1000;
const LIMITE_IP = 20;       // intentos fallidos de clave por IP en 15 min
const LIMITE_CODIGO = 5;    // intentos fallidos con la misma clave en 15 min
const LIMITE_PROFE = 10;    // intentos fallidos de clave de profe por IP en 15 min
const MAX_LOTE = 500;
const MAX_INTENTOS_NINO = 5000;
const MAX_LECTURAS_NINO = 2000;
const MAX_FRASES_NINO = 3000;

export class ErrorHttp extends Error {
    constructor(status, codigo, mensaje) { super(mensaje); this.status = status; this.codigo = codigo; }
}

/* ---------- Configuración y secretos ---------- */
function secreto(env) {
    const s = env.ALTOYCLARO_SECRETO;
    if (!s || s.length < 32) throw new ErrorHttp(500, 'config', 'Falta configurar ALTOYCLARO_SECRETO en Vercel (Settings → Environment Variables), con al menos 32 caracteres, y volver a desplegar.');
    if (env.ALTOYCLARO_CLAVE && s === env.ALTOYCLARO_CLAVE) throw new ErrorHttp(500, 'config', 'ALTOYCLARO_SECRETO y ALTOYCLARO_CLAVE tienen que ser distintas.');
    return s;
}
function claveProfe(env) {
    const s = env.ALTOYCLARO_CLAVE;
    if (!s) throw new ErrorHttp(500, 'config', 'Falta configurar ALTOYCLARO_CLAVE (la clave del profe) en Vercel (Settings → Environment Variables) y volver a desplegar.');
    return s;
}
const hmac = (clave, texto) => crypto.createHmac('sha256', clave).update(texto).digest();
const subclave = (env, uso) => hmac(secreto(env), 'altoyclaro:' + uso);

/* ---------- Códigos de los niños ---------- */
export function generarCodigo() {
    let c = '';
    for (let i = 0; i < LONGITUD_CODIGO; i++) c += ALFABETO[crypto.randomInt(ALFABETO.length)];
    return c;
}
export function normalizarCodigo(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
export function codigoValido(c) { return c.length === LONGITUD_CODIGO && [...c].every(ch => ALFABETO.includes(ch)); }
export const formatoCodigo = c => c.slice(0, 4) + '-' + c.slice(4);
// HMAC-SHA256 con "pimienta" del servidor: en la base de datos nunca se guarda la clave en claro
export function hashCodigo(env, c) { return hmac(subclave(env, 'pimienta-codigos'), normalizarCodigo(c)).toString('hex'); }

/* ---------- Cookie de sesión firmada ---------- */
const b64u = buf => Buffer.from(buf).toString('base64url');
// Cada tipo de sesión se firma con su propia subclave (niño: 'firma-sesion'; profe: 'firma-sesion-profe'),
// así una cookie de niño nunca vale como cookie de profe aunque alguien copiara su contenido.
export function firmarSesion(env, datos, uso = 'firma-sesion') {
    const cuerpo = b64u(JSON.stringify(datos));
    return cuerpo + '.' + b64u(hmac(subclave(env, uso), cuerpo));
}
export function leerSesion(env, valor, uso = 'firma-sesion') {
    if (!valor || typeof valor !== 'string' || !valor.includes('.')) return null;
    const [cuerpo, firma] = valor.split('.');
    const esperada = hmac(subclave(env, uso), cuerpo);
    let recibida;
    try { recibida = Buffer.from(firma, 'base64url'); } catch { return null; }
    if (recibida.length !== esperada.length || !crypto.timingSafeEqual(recibida, esperada)) return null;
    try { return JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8')); } catch { return null; }
}
function cookieSesion(valor, maxAge, nombre = COOKIE) {
    return `${nombre}=${valor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
/* ---------- Sesión del profe (cookie firmada, caduca a las 8 h) ---------- */
// Huella de la clave del profe: si se cambia ALTOYCLARO_CLAVE, las sesiones de profe abiertas dejan de valer.
const huellaProfe = env => hmac(subclave(env, 'huella-clave-profe'), claveProfe(env)).toString('base64url').slice(0, 16);
function cookieProfeNueva(env) {
    const ahora = Date.now();
    return cookieSesion(firmarSesion(env, { profe: 1, k: huellaProfe(env), iat: ahora, exp: ahora + SESION_PROFE_SEG * 1000 }, 'firma-sesion-profe'), SESION_PROFE_SEG, COOKIE_PROFE);
}
function sesionProfe(env, req) {
    const s = leerSesion(env, leerCookies(req)[COOKIE_PROFE], 'firma-sesion-profe');
    return !!(s && s.profe === 1 && typeof s.exp === 'number' && s.exp > Date.now() && s.k === huellaProfe(env));
}
function leerCookies(req) {
    const out = {};
    String(req.headers.cookie || '').split(';').forEach(p => {
        const i = p.indexOf('=');
        if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
    });
    return out;
}
function ipDe(req) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    return xf || req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'desconocida';
}

/* ---------- Base de datos ---------- */
let _query = null;
export function obtenerQuery(env) {
    if (globalThis.__aycQuery) return globalThis.__aycQuery; // pruebas locales
    if (_query) return _query;
    const url = env.DATABASE_URL || env.POSTGRES_URL;
    if (!url) throw new ErrorHttp(500, 'config', 'Falta la base de datos: conecta una base de datos Neon al proyecto en Vercel (Storage) para que exista DATABASE_URL, y vuelve a desplegar.');
    const sql = neon(url);
    _query = (texto, params = []) => sql.query(texto, params);
    return _query;
}
export const ESQUEMA = [
    `CREATE TABLE IF NOT EXISTS ayc_ninos (
        id TEXT PRIMARY KEY,
        alias TEXT NOT NULL,
        codigo_hash TEXT UNIQUE,
        gen INTEGER NOT NULL DEFAULT 1,
        revocado BOOLEAN NOT NULL DEFAULT FALSE,
        creado BIGINT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS ayc_dispositivos (
        nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
        dispositivo_id TEXT NOT NULL,
        nombre TEXT,
        creado BIGINT NOT NULL,
        ultimo BIGINT NOT NULL,
        PRIMARY KEY (nino_id, dispositivo_id))`,
    `CREATE TABLE IF NOT EXISTS ayc_estado (
        nino_id TEXT PRIMARY KEY REFERENCES ayc_ninos(id) ON DELETE CASCADE,
        perfil JSONB,
        perfil_t BIGINT NOT NULL DEFAULT 0,
        borrado_t BIGINT NOT NULL DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS ayc_intentos (
        nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        t BIGINT NOT NULL,
        recibido BIGINT NOT NULL,
        datos JSONB NOT NULL,
        PRIMARY KEY (nino_id, id))`,
    `CREATE INDEX IF NOT EXISTS ayc_intentos_recibido ON ayc_intentos (nino_id, recibido)`,
    // Lecturas en voz alta: solo puntuaciones (nunca lo que se oyó ni audio)
    `CREATE TABLE IF NOT EXISTS ayc_lecturas (
        nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        t BIGINT NOT NULL,
        recibido BIGINT NOT NULL,
        datos JSONB NOT NULL,
        PRIMARY KEY (nino_id, id))`,
    `CREATE INDEX IF NOT EXISTS ayc_lecturas_recibido ON ayc_lecturas (nino_id, recibido)`,
    // Frases cotidianas: solo qué frase/actividad, puntuación y si salió bien (nunca lo que se oyó)
    `CREATE TABLE IF NOT EXISTS ayc_frases (
        nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
        id TEXT NOT NULL,
        t BIGINT NOT NULL,
        recibido BIGINT NOT NULL,
        datos JSONB NOT NULL,
        PRIMARY KEY (nino_id, id))`,
    `CREATE INDEX IF NOT EXISTS ayc_frases_recibido ON ayc_frases (nino_id, recibido)`,
    // Pegatinas conseguidas: id de pegatina, fecha, si el profe la entregó y los números del motivo
    `CREATE TABLE IF NOT EXISTS ayc_pegatinas (
        nino_id TEXT NOT NULL REFERENCES ayc_ninos(id) ON DELETE CASCADE,
        pegatina TEXT NOT NULL,
        t BIGINT NOT NULL,
        entregada BOOLEAN NOT NULL DEFAULT FALSE,
        entregada_t BIGINT,
        nums JSONB,
        PRIMARY KEY (nino_id, pegatina))`,
    `CREATE TABLE IF NOT EXISTS ayc_limite (clave TEXT NOT NULL, t BIGINT NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS ayc_limite_idx ON ayc_limite (clave, t)`
];
let _esquemaListo = null;
async function asegurarEsquema(q) {
    if (globalThis.__aycEsquemaListo) return;
    if (!_esquemaListo) {
        _esquemaListo = (async () => { for (const s of ESQUEMA) await q(s); })();
        _esquemaListo.catch(() => { _esquemaListo = null; });
    }
    await _esquemaListo;
}

function bdCaida(e) {
    console.error('altoyclaro bd no disponible', e);
    throw new ErrorHttp(503, 'bd', 'El servidor de claves no puede conectar con la base de datos. Inténtalo dentro de un rato o avisa al profe.');
}
async function comprobarBd(q) { try { await q('SELECT 1'); } catch (e) { bdCaida(e); } }

/* ---------- Límite de intentos (rate limiting) ---------- */
async function comprobarLimite(q, clave, max, mensaje) {
    const r = await q('SELECT count(*)::int AS n FROM ayc_limite WHERE clave = $1 AND t > $2', [clave, Date.now() - VENTANA_MS]);
    if (Number(r[0].n) >= max) throw new ErrorHttp(429, 'demasiados', mensaje);
}
async function apuntarFallo(q, claves) {
    const ahora = Date.now();
    for (const c of claves) await q('INSERT INTO ayc_limite (clave, t) VALUES ($1, $2)', [c, ahora]);
    if (Math.random() < 0.05) await q('DELETE FROM ayc_limite WHERE t < $1', [ahora - 24 * 3600 * 1000]);
}

/* ---------- Validación ---------- */
const texto = (v, max) => (typeof v === 'string' ? v : v == null ? '' : String(v)).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, max);
const numero = (v, min, max, def = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const TEMAS_PERMITIDOS = ['mezcla', 'futbol', 'animales', 'comida', 'naturaleza', 'transporte'];
function limpiarPerfil(p) {
    if (!p || typeof p !== 'object') return null;
    return {
        // Solo nombre/apodo, nivel, XP, test y tema favorito (una preferencia de una lista cerrada).
        // Edad, país y afición en texto libre ya no se guardan; se descartan.
        name: texto(p.name, 40), level: Math.round(numero(p.level, 0, 3, 1)), xp: Math.round(numero(p.xp, 0, 1e7, 0)),
        pruebas: Array.isArray(p.pruebas) ? p.pruebas.slice(-10).map(limpiarPrueba).filter(Boolean) : [],
        tema: TEMAS_PERMITIDOS.includes(p.tema) ? p.tema : null
    };
}
// Resultados del test de nivel: solo puntuaciones y resultado por pregunta. Nunca lo que dijo el niño.
const RESULTADOS_ITEM = ['ok', 'mal', 'perfecto', 'casi', 'otra', 'respuesta', 'nr', 'salto', 'sueltas', 'frases'];
const ID_ITEM = /^[a-z][0-9]{1,3}$/; // k1…, c07, d12: solo identificadores de pregunta (nunca texto)
function limpiarPrueba(x) {
    if (!x || typeof x !== 'object') return null;
    const id = texto(x.id, 20).replace(/[^a-z0-9]/gi, '');
    const t = Math.round(numero(x.t, 0, Date.now() + 864e5, 0));
    if (!id || !t) return null;
    const pct = v => Math.round(numero(v, 0, 100, 0));
    const nivel = v => Math.round(numero(v, 0, 3, 0));
    return {
        id, t, nivel: nivel(x.nivel), nivelAntes: x.nivelAntes == null ? null : nivel(x.nivelAntes),
        total: pct(x.total), comp: pct(x.comp), voc: pct(x.voc), conv: pct(x.conv),
        modo: ['auto', 'adulto', 'mixto'].includes(x.modo) ? x.modo : 'auto', completo: x.completo !== false,
        dur: Math.round(numero(x.dur, 0, 3600, 0)),
        // Semilla del sorteo de preguntas y lista de preguntas elegidas (para no repetirlas en los siguientes tests)
        ...(x.sem != null && Number.isFinite(Number(x.sem)) ? { sem: Math.round(numero(x.sem, 0, 4294967295, 0)) } : {}),
        ...(Array.isArray(x.ids) ? { ids: x.ids.filter(v => typeof v === 'string' && ID_ITEM.test(v)).slice(0, 40) } : {}),
        items: Array.isArray(x.items) ? x.items.slice(0, 30).filter(i => i && typeof i === 'object' && ID_ITEM.test(i.id)).map(i => {
            const o = {
                id: i.id, b: ['comp', 'voc', 'conv'].includes(i.b) ? i.b : 'conv',
                r: RESULTADOS_ITEM.includes(i.r) ? i.r : 'nr',
                p: Math.round(numero(i.p, 0, 10, 0) * 10) / 10, m: Math.round(numero(i.m, 0, 10, 0) * 10) / 10,
                c: texto(i.c, 10).replace(/[^A-Z]/g, '')
            };
            if (i.l != null) o.l = Math.round(numero(i.l, 0, 120, 0) * 10) / 10;
            return o;
        }) : []
    };
}
function limpiarIntento(i) {
    if (!i || typeof i !== 'object') return null;
    const id = texto(i.id, 40);
    const t = Math.round(numero(i.t, 0, Date.now() + 864e5, 0));
    if (!id || !t) return null;
    return {
        id, t, datos: {
            palabra: texto(i.palabra, 60), categoria: texto(i.categoria, 30),
            modo: i.modo === 'frase' ? 'frase' : 'palabra', metodo: i.metodo === 'adulto' ? 'adulto' : 'auto',
            oido: texto(i.oido, 200),
            alternativas: Array.isArray(i.alternativas) ? i.alternativas.slice(0, 5).map(a => texto(a, 200)) : [],
            score: Math.round(numero(i.score, 0, 100, 0)),
            resultado: ['perfecto', 'casi', 'otra', 'bien', 'practicar'].includes(i.resultado) ? i.resultado : 'otra'
        }
    };
}
// Lectura en voz alta: lista blanca de puntuaciones. Nada de transcripciones ni audio: lo demás se descarta.
// e = resultado de cada palabra del cuento, en orden (b bien, d con dudas, m no se entendió, s saltada, n no leída).
const ID_CUENTO = /^[a-z0-9-]{1,30}$/;
function limpiarLectura(x) {
    if (!x || typeof x !== 'object') return null;
    const id = texto(x.id, 40);
    const t = Math.round(numero(x.t, 0, Date.now() + 864e5, 0));
    const cuento = typeof x.cuento === 'string' && ID_CUENTO.test(x.cuento) ? x.cuento : '';
    if (!id || !t || !cuento) return null;
    const ent = (v, max) => Math.round(numero(v, 0, max, 0));
    const opc = (v, max) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : ent(v, max));
    return {
        id, t, datos: {
            cuento, nivel: ent(x.nivel, 3), metodo: x.metodo === 'adulto' ? 'adulto' : 'auto',
            prec: ent(x.prec, 100), ppm: ent(x.ppm, 400), compl: ent(x.compl, 100), est: ent(x.est, 3),
            pausas: opc(x.pausas, 99), autoc: opc(x.autoc, 99), pron: opc(x.pron, 100),
            comp: opc(x.comp, 100), compN: ent(x.compN, 5), dur: ent(x.dur, 1800), n: ent(x.n, 400), esc: x.esc === true,
            e: typeof x.e === 'string' && /^[bdmsn]{0,400}$/.test(x.e) ? x.e : ''
        }
    };
}
// Frases cotidianas: lista blanca (id de frase, situación, actividad, puntuación, bien/mal y quién valoró)
const SITUACIONES_FRASES = ['llegar', 'companero', 'profe', 'patio', 'gracias', 'adios'];
const ACTIVIDADES_FRASES = ['repetir', 'dirias', 'dialogo'];
function limpiarFrase(x) {
    if (!x || typeof x !== 'object') return null;
    const id = texto(x.id, 40);
    const t = Math.round(numero(x.t, 0, Date.now() + 864e5, 0));
    const fid = typeof x.fid === 'string' && /^[fqd][0-9]{2}$/.test(x.fid) ? x.fid : '';
    if (!id || !t || !fid || !SITUACIONES_FRASES.includes(x.sit) || !ACTIVIDADES_FRASES.includes(x.act)) return null;
    return { id, t, datos: { fid, sit: x.sit, act: x.act, score: Math.round(numero(x.score, 0, 100, 0)), ok: x.ok === true, metodo: x.metodo === 'adulto' ? 'adulto' : 'auto' } };
}
const datosDe = f => Object.assign({ id: f.id, t: Number(f.t) }, typeof f.datos === 'string' ? JSON.parse(f.datos) : f.datos);
const numsDe = v => (Array.isArray(v) ? v : typeof v === 'string' ? JSON.parse(v) : []).slice(0, 4).map(n => Math.round(numero(n, -1, 100000, 0)));
const pegatinaFila = f => ({ id: f.pegatina, t: Number(f.t), entregada: !!f.entregada, entregadaT: f.entregada_t == null ? null : Number(f.entregada_t), nums: numsDe(f.nums) });

const dispositivoValido = d => typeof d === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(d);

/* ---------- Sesión del niño ---------- */
async function sesionNino(q, env, req) {
    const s = leerSesion(env, leerCookies(req)[COOKIE]);
    if (!s || !s.n || !s.d) throw new ErrorHttp(401, 'sin_sesion', 'No has entrado con tu clave en este dispositivo.');
    const n = (await q('SELECT id, alias, gen, revocado FROM ayc_ninos WHERE id = $1', [s.n]))[0];
    if (!n || n.revocado || Number(n.gen) !== Number(s.g)) throw new ErrorHttp(401, 'revocado', 'Tu clave ha cambiado. Pide la nueva al profe.');
    const d = (await q('SELECT dispositivo_id FROM ayc_dispositivos WHERE nino_id = $1 AND dispositivo_id = $2', [n.id, s.d]))[0];
    if (!d) throw new ErrorHttp(401, 'liberado', 'Este dispositivo ya no está autorizado. Vuelve a entrar con tu clave.');
    await q('UPDATE ayc_dispositivos SET ultimo = $3 WHERE nino_id = $1 AND dispositivo_id = $2', [n.id, s.d, Date.now()]);
    return { nino: n, dispositivo: s.d };
}

/* ---------- /api/acceso ---------- */
export async function acceso({ q, env, req, body }) {
    const accion = body.accion;
    if (accion === 'entrar') {
        const ip = ipDe(req);
        const codigo = normalizarCodigo(body.codigo);
        const hash = codigo ? hashCodigo(env, codigo) : '';
        const msgLimite = 'Has probado demasiadas claves. Espera 15 minutos o pide ayuda al profe.';
        await comprobarLimite(q, 'ip:' + ip, LIMITE_IP, msgLimite);
        if (hash) await comprobarLimite(q, 'cod:' + hash, LIMITE_CODIGO, msgLimite);
        if (!dispositivoValido(body.dispositivo)) throw new ErrorHttp(400, 'dispositivo', 'Falta el identificador del dispositivo.');
        const nino = codigoValido(codigo)
            ? (await q('SELECT id, alias, gen FROM ayc_ninos WHERE codigo_hash = $1 AND revocado = FALSE', [hash]))[0]
            : null;
        if (!nino) {
            await apuntarFallo(q, hash ? ['ip:' + ip, 'cod:' + hash] : ['ip:' + ip]);
            throw new ErrorHttp(401, 'clave_incorrecta', 'Esa clave no es correcta. Revísala o pide ayuda al profe.');
        }
        const ahora = Date.now();
        const nombre = texto(body.nombre, 60) || 'Dispositivo';
        const ya = (await q('SELECT 1 FROM ayc_dispositivos WHERE nino_id = $1 AND dispositivo_id = $2', [nino.id, body.dispositivo]))[0];
        if (ya) {
            await q('UPDATE ayc_dispositivos SET ultimo = $3, nombre = $4 WHERE nino_id = $1 AND dispositivo_id = $2', [nino.id, body.dispositivo, ahora, nombre]);
        } else {
            // Inserta solo si quedan huecos (máximo 2 dispositivos por clave)
            const r = await q(`INSERT INTO ayc_dispositivos (nino_id, dispositivo_id, nombre, creado, ultimo)
                SELECT $1, $2, $3, $4, $4
                WHERE (SELECT count(*) FROM ayc_dispositivos WHERE nino_id = $1) < $5
                RETURNING dispositivo_id`, [nino.id, body.dispositivo, nombre, ahora, MAX_DISPOSITIVOS]);
            if (!r.length) throw new ErrorHttp(403, 'limite_dispositivos', `Esta clave ya se está usando en ${MAX_DISPOSITIVOS} dispositivos. Pide al profe que libere uno.`);
        }
        const cookie = cookieSesion(firmarSesion(env, { n: nino.id, d: body.dispositivo, g: Number(nino.gen), iat: ahora }), SESION_SEG);
        return { status: 200, cookie, body: { ok: true, id: nino.id, alias: nino.alias } };
    }
    if (accion === 'estado') {
        const { nino } = await sesionNino(q, env, req);
        return { status: 200, body: { ok: true, id: nino.id, alias: nino.alias } };
    }
    if (accion === 'sesion') {
        // Comprobación ligera al abrir la app: ¿hay sesión de niño válida? ¿y de profe?
        claveProfe(env); secreto(env);
        await comprobarBd(q); // si la base de datos no responde, no se deja entrar a nadie
        const profe = sesionProfe(env, req);
        let nino = null, motivo = '', cookie;
        if (leerCookies(req)[COOKIE]) {
            try { nino = (await sesionNino(q, env, req)).nino; }
            catch (e) {
                if (!(e instanceof ErrorHttp) || e.status !== 401) throw e;
                motivo = e.message; cookie = cookieSesion('', 0); // revocada o caducada: se borra
            }
        }
        if (!profe && leerCookies(req)[COOKIE_PROFE]) {
            motivo = motivo || 'La sesión del profe ha caducado. Vuelve a entrar.';
            cookie = cookie ? [cookie, cookieSesion('', 0, COOKIE_PROFE)] : cookieSesion('', 0, COOKIE_PROFE);
        }
        return { status: 200, cookie, body: { ok: true, nino: nino ? { id: nino.id, alias: nino.alias } : null, profe, motivo } };
    }
    if (accion === 'entrar_profe') {
        const clave = claveProfe(env);
        secreto(env);
        const ip = ipDe(req);
        await comprobarLimite(q, 'adm:' + ip, LIMITE_PROFE, 'Demasiados intentos con la clave del profe. Espera 15 minutos.');
        if (typeof body.clave !== 'string' || !body.clave || !igualSeguro(body.clave, clave)) {
            await apuntarFallo(q, ['adm:' + ip]);
            throw new ErrorHttp(401, 'clave_profe', 'La clave del profe no es correcta.');
        }
        return { status: 200, cookie: cookieProfeNueva(env), body: { ok: true, profe: true } };
    }
    if (accion === 'salir_profe') {
        return { status: 200, cookie: cookieSesion('', 0, COOKIE_PROFE), body: { ok: true } };
    }
    if (accion === 'salir') {
        try {
            const { nino, dispositivo } = await sesionNino(q, env, req);
            await q('DELETE FROM ayc_dispositivos WHERE nino_id = $1 AND dispositivo_id = $2', [nino.id, dispositivo]);
        } catch (e) { if (!(e instanceof ErrorHttp) || e.status !== 401) throw e; }
        return { status: 200, cookie: cookieSesion('', 0), body: { ok: true } };
    }
    throw new ErrorHttp(400, 'accion', 'Acción desconocida.');
}

/* ---------- /api/sync ---------- */
export async function sync({ q, env, req, body }) {
    const { nino } = await sesionNino(q, env, req);
    const id = nino.id;
    const ahora = Date.now();
    await q('INSERT INTO ayc_estado (nino_id) VALUES ($1) ON CONFLICT (nino_id) DO NOTHING', [id]);
    if (body.borrarIntentos === true) {
        await q('DELETE FROM ayc_intentos WHERE nino_id = $1', [id]);
        await q('DELETE FROM ayc_lecturas WHERE nino_id = $1', [id]);
        await q('DELETE FROM ayc_frases WHERE nino_id = $1', [id]);
        // Las pegatinas ya entregadas por el profe se conservan (están en el papel); las pendientes se borran
        await q('DELETE FROM ayc_pegatinas WHERE nino_id = $1 AND entregada = FALSE', [id]);
        await q('UPDATE ayc_estado SET borrado_t = $2 WHERE nino_id = $1', [id, ahora]);
    }
    const est = (await q('SELECT perfil, perfil_t, borrado_t FROM ayc_estado WHERE nino_id = $1', [id]))[0];
    const borradoT = Number(est.borrado_t);
    let perfilT = Number(est.perfil_t);
    let perfil = est.perfil;
    let perfilCambiado = false;
    // Perfil (XP, nivel...): gana el cambio más reciente
    const perfilNuevo = limpiarPerfil(body.perfil);
    const tNuevo = Math.round(numero(body.perfilT, 0, ahora + 60000, 0));
    if (perfilNuevo && tNuevo > perfilT) {
        await q('UPDATE ayc_estado SET perfil = $2::jsonb, perfil_t = $3 WHERE nino_id = $1', [id, JSON.stringify(perfilNuevo), tNuevo]);
        perfil = perfilNuevo; perfilT = tNuevo; perfilCambiado = true;
    }
    // Intentos: se juntan por id (nunca se duplican)
    const lote = (Array.isArray(body.intentos) ? body.intentos : []).slice(0, MAX_LOTE).map(limpiarIntento).filter(i => i && i.t > borradoT);
    if (lote.length) {
        await q(`INSERT INTO ayc_intentos (nino_id, id, t, recibido, datos)
            SELECT $1, x.id, x.t, $2, x.datos FROM jsonb_to_recordset($3::jsonb) AS x(id text, t bigint, datos jsonb)
            ON CONFLICT (nino_id, id) DO NOTHING`, [id, ahora, JSON.stringify(lote)]);
        const total = Number((await q('SELECT count(*)::int AS n FROM ayc_intentos WHERE nino_id = $1', [id]))[0].n);
        if (total > MAX_INTENTOS_NINO) {
            await q(`DELETE FROM ayc_intentos WHERE nino_id = $1 AND id IN (
                SELECT id FROM ayc_intentos WHERE nino_id = $1 ORDER BY t ASC LIMIT $2)`, [id, total - MAX_INTENTOS_NINO]);
        }
    }
    // Lecturas en voz alta (solo puntuaciones): igual que los intentos
    const loteL = (Array.isArray(body.lecturas) ? body.lecturas : []).slice(0, MAX_LOTE).map(limpiarLectura).filter(i => i && i.t > borradoT);
    if (loteL.length) {
        await q(`INSERT INTO ayc_lecturas (nino_id, id, t, recibido, datos)
            SELECT $1, x.id, x.t, $2, x.datos FROM jsonb_to_recordset($3::jsonb) AS x(id text, t bigint, datos jsonb)
            ON CONFLICT (nino_id, id) DO NOTHING`, [id, ahora, JSON.stringify(loteL)]);
        const total = Number((await q('SELECT count(*)::int AS n FROM ayc_lecturas WHERE nino_id = $1', [id]))[0].n);
        if (total > MAX_LECTURAS_NINO) {
            await q(`DELETE FROM ayc_lecturas WHERE nino_id = $1 AND id IN (
                SELECT id FROM ayc_lecturas WHERE nino_id = $1 ORDER BY t ASC LIMIT $2)`, [id, total - MAX_LECTURAS_NINO]);
        }
    }
    // Frases cotidianas (solo puntuaciones): igual que los intentos
    const loteF = (Array.isArray(body.frases) ? body.frases : []).slice(0, MAX_LOTE).map(limpiarFrase).filter(i => i && i.t > borradoT);
    if (loteF.length) {
        await q(`INSERT INTO ayc_frases (nino_id, id, t, recibido, datos)
            SELECT $1, x.id, x.t, $2, x.datos FROM jsonb_to_recordset($3::jsonb) AS x(id text, t bigint, datos jsonb)
            ON CONFLICT (nino_id, id) DO NOTHING`, [id, ahora, JSON.stringify(loteF)]);
        const total = Number((await q('SELECT count(*)::int AS n FROM ayc_frases WHERE nino_id = $1', [id]))[0].n);
        if (total > MAX_FRASES_NINO) {
            await q(`DELETE FROM ayc_frases WHERE nino_id = $1 AND id IN (
                SELECT id FROM ayc_frases WHERE nino_id = $1 ORDER BY t ASC LIMIT $2)`, [id, total - MAX_FRASES_NINO]);
        }
    }
    // Pegatinas: se recalculan cuando llega algo nuevo (o si se pide expresamente)
    let pegFilas = await q('SELECT pegatina, t, entregada, entregada_t, nums FROM ayc_pegatinas WHERE nino_id = $1', [id]);
    const pegatinasNuevas = [];
    if ((lote.length || loteL.length || loteF.length || perfilCambiado || body.revisarPegatinas === true) && pegFilas.length < PEGATINAS_IDS.length) {
        const todo = async tabla => (await q(`SELECT id, t, datos FROM ${tabla} WHERE nino_id = $1`, [id])).map(datosDe);
        const p = perfil ? (typeof perfil === 'string' ? JSON.parse(perfil) : perfil) : null;
        const cumplidas = evaluarPegatinas({ intentos: await todo('ayc_intentos'), lecturas: await todo('ayc_lecturas'), frases: await todo('ayc_frases'), pruebas: p && Array.isArray(p.pruebas) ? p.pruebas : [] });
        const ya = new Set(pegFilas.map(f => f.pegatina));
        for (const [peg, nums] of Object.entries(cumplidas)) {
            if (ya.has(peg) || !PEGATINAS_IDS.includes(peg)) continue;
            const r = await q(`INSERT INTO ayc_pegatinas (nino_id, pegatina, t, nums) VALUES ($1, $2, $3, $4::jsonb)
                ON CONFLICT (nino_id, pegatina) DO NOTHING RETURNING pegatina`, [id, peg, ahora, JSON.stringify(numsDe(nums))]);
            if (r.length) pegatinasNuevas.push(peg);
        }
        if (pegatinasNuevas.length) pegFilas = await q('SELECT pegatina, t, entregada, entregada_t, nums FROM ayc_pegatinas WHERE nino_id = $1', [id]);
    }
    const cursor = Math.max(0, Math.round(numero(body.cursor, 0, ahora, 0)) - 60000); // margen de 1 min
    const filas = await q(`SELECT id, t, recibido, datos FROM ayc_intentos WHERE nino_id = $1 AND recibido > $2 ORDER BY recibido ASC LIMIT ${MAX_INTENTOS_NINO}`, [id, cursor]);
    const filasL = await q(`SELECT id, t, datos FROM ayc_lecturas WHERE nino_id = $1 AND recibido > $2 ORDER BY recibido ASC LIMIT ${MAX_LECTURAS_NINO}`, [id, cursor]);
    const filasF = await q(`SELECT id, t, datos FROM ayc_frases WHERE nino_id = $1 AND recibido > $2 ORDER BY recibido ASC LIMIT ${MAX_FRASES_NINO}`, [id, cursor]);
    return {
        status: 200, body: {
            ok: true, alias: nino.alias, perfil: perfil ? limpiarPerfil(typeof perfil === 'string' ? JSON.parse(perfil) : perfil) : null, perfilT, borradoT, cursor: ahora,
            recibidos: lote.map(i => i.id), lecturasRecibidas: loteL.map(i => i.id), frasesRecibidas: loteF.map(i => i.id),
            frases: filasF.map(datosDe),
            pegatinas: pegFilas.map(pegatinaFila).sort((a, b) => a.t - b.t), pegatinasNuevas,
            lecturas: filasL.map(f => Object.assign({ id: f.id, t: Number(f.t) }, typeof f.datos === 'string' ? JSON.parse(f.datos) : f.datos)),
            intentos: filas.map(f => Object.assign({ id: f.id, t: Number(f.t) }, typeof f.datos === 'string' ? JSON.parse(f.datos) : f.datos))
        }
    };
}

/* ---------- /api/admin (profe) ---------- */
function igualSeguro(a, b) {
    const ha = crypto.createHash('sha256').update(String(a)).digest();
    const hb = crypto.createHash('sha256').update(String(b)).digest();
    return crypto.timingSafeEqual(ha, hb);
}
async function codigoNuevoUnico(q, env) {
    for (let i = 0; i < 5; i++) {
        const c = generarCodigo();
        const h = hashCodigo(env, c);
        const r = await q('SELECT 1 FROM ayc_ninos WHERE codigo_hash = $1', [h]);
        if (!r.length) return { c, h };
    }
    throw new ErrorHttp(500, 'codigo', 'No se pudo generar una clave nueva. Inténtalo otra vez.');
}
export async function admin({ q, env, req, body }) {
    const clave = claveProfe(env);
    secreto(env); // también hace falta para firmar y para las claves de los niños
    const ip = ipDe(req);
    const enviada = req.headers['x-clave-profe'];
    if (!enviada) {
        // Sin cabecera: vale la sesión del profe (cookie firmada y sin caducar)
        if (!sesionProfe(env, req)) throw new ErrorHttp(401, 'sin_sesion_profe', 'La sesión del profe ha caducado. Vuelve a entrar con la clave del profe.');
    } else {
        await comprobarLimite(q, 'adm:' + ip, LIMITE_PROFE, 'Demasiados intentos con la clave del profe. Espera 15 minutos.');
        if (!igualSeguro(enviada, clave)) {
            await apuntarFallo(q, ['adm:' + ip]);
            throw new ErrorHttp(401, 'clave_profe', 'La clave del profe no es correcta.');
        }
    }
    const id = texto(body.id, 40);
    const existe = async () => {
        const n = (await q('SELECT id FROM ayc_ninos WHERE id = $1', [id]))[0];
        if (!n) throw new ErrorHttp(404, 'no_existe', 'Ese niño no existe.');
    };
    switch (body.accion) {
        case 'comprobar': return { status: 200, body: { ok: true } };
        case 'listar': {
            const ninos = await q(`SELECT n.id, n.alias, n.revocado, n.creado, e.perfil, e.perfil_t,
                (SELECT count(*)::int FROM ayc_intentos i WHERE i.nino_id = n.id) AS intentos,
                (SELECT count(*)::int FROM ayc_lecturas l WHERE l.nino_id = n.id) AS lecturas,
                (SELECT count(*)::int FROM ayc_frases f WHERE f.nino_id = n.id) AS frases,
                (SELECT count(*)::int FROM ayc_pegatinas g WHERE g.nino_id = n.id AND g.entregada = FALSE) AS pegatinas_pendientes
                FROM ayc_ninos n LEFT JOIN ayc_estado e ON e.nino_id = n.id ORDER BY lower(n.alias)`);
            const disp = await q('SELECT nino_id, dispositivo_id, nombre, creado, ultimo FROM ayc_dispositivos ORDER BY creado');
            return {
                status: 200, body: {
                    ok: true, maxDispositivos: MAX_DISPOSITIVOS, pegatinasPendientes: ninos.reduce((a, n) => a + Number(n.pegatinas_pendientes || 0), 0), ninos: ninos.map(n => {
                        const p = typeof n.perfil === 'string' ? JSON.parse(n.perfil) : n.perfil;
                        return {
                            id: n.id, alias: n.alias, revocado: n.revocado, creado: Number(n.creado), intentos: Number(n.intentos), lecturas: Number(n.lecturas || 0), frases: Number(n.frases || 0), pegatinasPendientes: Number(n.pegatinas_pendientes || 0),
                            xp: p ? p.xp : null, nivel: p ? p.level : null,
                            test: p && Array.isArray(p.pruebas) && p.pruebas.length ? (({ t, nivel, comp, voc, conv }) => ({ t, nivel, comp, voc, conv }))(p.pruebas[p.pruebas.length - 1]) : null,
                            dispositivos: disp.filter(d => d.nino_id === n.id).map(d => ({ id: d.dispositivo_id, nombre: d.nombre, creado: Number(d.creado), ultimo: Number(d.ultimo) }))
                        };
                    })
                }
            };
        }
        case 'pegatinas': {
            const filas = await q(`SELECT g.nino_id, n.alias, g.pegatina, g.t, g.entregada, g.entregada_t, g.nums
                FROM ayc_pegatinas g JOIN ayc_ninos n ON n.id = g.nino_id ORDER BY g.t DESC LIMIT 2000`);
            const f = x => Object.assign({ nino: x.nino_id, alias: x.alias }, pegatinaFila(x));
            return {
                status: 200, body: {
                    ok: true, pendientes: filas.filter(x => !x.entregada).map(f).sort((a, b) => a.t - b.t),
                    entregadas: filas.filter(x => x.entregada).map(f).sort((a, b) => b.entregadaT - a.entregadaT).slice(0, 300)
                }
            };
        }
        case 'entregar': {
            await existe();
            const peg = texto(body.pegatina, 20);
            if (!PEGATINAS_IDS.includes(peg)) throw new ErrorHttp(400, 'pegatina', 'Esa pegatina no existe.');
            const r = await q('UPDATE ayc_pegatinas SET entregada = TRUE, entregada_t = $3 WHERE nino_id = $1 AND pegatina = $2 AND entregada = FALSE RETURNING pegatina',
                [id, peg, Date.now()]);
            if (!r.length) {
                const hay = await q('SELECT 1 FROM ayc_pegatinas WHERE nino_id = $1 AND pegatina = $2', [id, peg]);
                if (!hay.length) throw new ErrorHttp(404, 'no_existe', 'Ese niño no tiene esa pegatina.');
            }
            return { status: 200, body: { ok: true } };
        }
        case 'crear': {
            const alias = texto(body.alias, 40);
            if (!alias) throw new ErrorHttp(400, 'alias', 'Escribe un nombre o apodo (sin apellidos).');
            const nuevoId = crypto.randomBytes(8).toString('hex');
            const { c, h } = await codigoNuevoUnico(q, env);
            await q('INSERT INTO ayc_ninos (id, alias, codigo_hash, creado) VALUES ($1, $2, $3, $4)', [nuevoId, alias, h, Date.now()]);
            await q('INSERT INTO ayc_estado (nino_id) VALUES ($1) ON CONFLICT DO NOTHING', [nuevoId]);
            return { status: 200, body: { ok: true, id: nuevoId, alias, codigo: formatoCodigo(c) } };
        }
        case 'regenerar': {
            await existe();
            const { c, h } = await codigoNuevoUnico(q, env);
            await q('UPDATE ayc_ninos SET codigo_hash = $2, gen = gen + 1, revocado = FALSE WHERE id = $1', [id, h]);
            await q('DELETE FROM ayc_dispositivos WHERE nino_id = $1', [id]);
            return { status: 200, body: { ok: true, id, codigo: formatoCodigo(c) } };
        }
        case 'revocar': {
            await existe();
            await q('UPDATE ayc_ninos SET codigo_hash = NULL, gen = gen + 1, revocado = TRUE WHERE id = $1', [id]);
            await q('DELETE FROM ayc_dispositivos WHERE nino_id = $1', [id]);
            return { status: 200, body: { ok: true } };
        }
        case 'liberar': {
            await existe();
            await q('DELETE FROM ayc_dispositivos WHERE nino_id = $1 AND dispositivo_id = $2', [id, texto(body.dispositivo, 64)]);
            return { status: 200, body: { ok: true } };
        }
        case 'borrar': {
            await existe();
            await q('DELETE FROM ayc_intentos WHERE nino_id = $1', [id]);
            await q('DELETE FROM ayc_lecturas WHERE nino_id = $1', [id]);
            await q('DELETE FROM ayc_frases WHERE nino_id = $1', [id]);
            await q('DELETE FROM ayc_pegatinas WHERE nino_id = $1', [id]);
            await q('DELETE FROM ayc_dispositivos WHERE nino_id = $1', [id]);
            await q('DELETE FROM ayc_estado WHERE nino_id = $1', [id]);
            await q('DELETE FROM ayc_ninos WHERE id = $1', [id]);
            return { status: 200, body: { ok: true } };
        }
        default: throw new ErrorHttp(400, 'accion', 'Acción desconocida.');
    }
}

/* ---------- Envoltorio HTTP común (Node req/res) ---------- */
async function leerCuerpo(req) {
    if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
    let raw = typeof req.body === 'string' ? req.body : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : null;
    if (raw == null) {
        raw = await new Promise((resolve, reject) => {
            let d = ''; req.on('data', c => { d += c; if (d.length > 2e6) reject(new ErrorHttp(413, 'grande', 'Demasiados datos.')); });
            req.on('end', () => resolve(d)); req.on('error', reject);
        });
    }
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { throw new ErrorHttp(400, 'json', 'Datos no válidos.'); }
}
export async function manejar(req, res, fn, env = process.env) {
    const enviar = (status, obj, cookie) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        if (cookie) res.setHeader('Set-Cookie', cookie);
        res.end(JSON.stringify(obj));
    };
    try {
        if (req.method !== 'POST') throw new ErrorHttp(405, 'metodo', 'Usa POST.');
        // Evita envíos desde formularios de otras webs (CSRF): solo JSON
        if (!String(req.headers['content-type'] || '').includes('application/json')) throw new ErrorHttp(415, 'tipo', 'Se esperaba JSON.');
        const body = await leerCuerpo(req);
        const q = obtenerQuery(env);
        try { await asegurarEsquema(q); } catch (e) { bdCaida(e); }
        const r = await fn({ q, env, req, body });
        enviar(r.status, r.body, r.cookie);
    } catch (e) {
        if (e instanceof ErrorHttp) {
            enviar(e.status, { ok: false, codigo: e.codigo, mensaje: e.message });
        } else {
            console.error('altoyclaro api error', e);
            enviar(500, { ok: false, codigo: 'interno', mensaje: 'Algo ha fallado en el servidor. Inténtalo más tarde.' });
        }
    }
}
