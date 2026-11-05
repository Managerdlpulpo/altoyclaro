/* Me gusta hablar Alto y claro · Claves de acceso y sincronización
   - ACCESO OBLIGATORIO: sin una sesión válida (clave de niño o sesión de profe, comprobadas en el servidor)
     solo se ve la pantalla de acceso. Si el servidor o la base de datos no responden, no se entra.
   - Profe: entra con la clave del profe (cookie HttpOnly firmada que caduca a las 8 h); puede probar la app
     (lo que haga se queda solo en este dispositivo) y gestionar las claves.
   - Niño, con su clave: el perfil (nombre, nivel, XP, puntuaciones del test de nivel) y la lista
     de intentos al hablar (fecha, palabra, lo que se oyó, puntuación) se sincronizan en hasta 2 dispositivos.
   - Lectura en voz alta: solo las puntuaciones de cada lectura (precisión, palabras por minuto, pausas, comprensión y
     el resultado de cada palabra del cuento: bien/dudas/saltada). Lo que oyó el reconocedor y el audio no se envían.
   - Las respuestas libres del test de nivel (texto) se quedan solo en este dispositivo (ligaHablaTestTextos).
   - Las GRABACIONES DE VOZ NUNCA SALEN DEL DISPOSITIVO: se quedan en IndexedDB y no se envían.
*/
const SYNC_KEY = 'ligaHablaSync';
const DISPOSITIVO_KEY = 'ligaHablaDispositivo';
const SYNC_LOTE = 500;

function syncMetaVacia() { return { conectado: false, ninoId: null, alias: '', perfilT: 0, cursor: 0, borradoT: 0, bloqueado: false, borrarPendiente: false, ultima: 0 }; }
function cargarSyncMeta() {
    try { return Object.assign(syncMetaVacia(), JSON.parse(localStorage.getItem(SYNC_KEY) || '{}')); }
    catch (e) { return syncMetaVacia(); }
}
let syncMeta = cargarSyncMeta();
function guardarSyncMeta() { try { localStorage.setItem(SYNC_KEY, JSON.stringify(syncMeta)); } catch (e) { } }

function dispositivoId() {
    let d = localStorage.getItem(DISPOSITIVO_KEY);
    if (!d || !/^[A-Za-z0-9-]{8,64}$/.test(d)) {
        d = (window.crypto && crypto.randomUUID) ? crypto.randomUUID()
            : Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 10)).join('-');
        localStorage.setItem(DISPOSITIVO_KEY, d);
    }
    return d;
}
function nombreDispositivo() {
    const ua = navigator.userAgent || '';
    const so = /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : /Android/.test(ua) ? (/Mobile/.test(ua) ? 'Móvil Android' : 'Tablet Android')
        : /CrOS/.test(ua) ? 'Chromebook' : /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Dispositivo';
    const nav = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return nav ? `${so} · ${nav}` : so;
}
function escS(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' }[c])); }

async function llamarApi(ruta, cuerpo, extra = {}) {
    try {
        const r = await fetch('/api/' + ruta, {
            method: 'POST', credentials: 'same-origin', keepalive: !!extra.keepalive,
            headers: Object.assign({ 'Content-Type': 'application/json' }, extra.headers || {}),
            body: JSON.stringify(cuerpo || {})
        });
        let datos = null;
        try { datos = await r.json(); } catch (e) { }
        if (!datos) datos = { ok: false, mensaje: 'El servidor de claves no responde ahora mismo. Inténtalo dentro de un rato o avisa al profe.' };
        return { status: r.status, datos };
    } catch (e) {
        return { status: 0, datos: { ok: false, mensaje: 'No hay conexión. Lo que hagas se guarda en este dispositivo y se enviará cuando vuelva internet.' } };
    }
}

/* ---------- Ganchos con el resto de la app ---------- */
let aplicandoRemoto = false;
const _saveStateOriginal = saveState;
saveState = function () {
    _saveStateOriginal();
    if (syncMeta.conectado && !aplicandoRemoto) { syncMeta.perfilT = Date.now(); guardarSyncMeta(); programarSync(); }
};
const _resetAllOriginal = resetAll;
resetAll = function () {
    if (!panelProfeDesbloqueado()) return; // «Reiniciar» está en el panel del profe: nunca sin la clave del profe
    if (rolActual === 'nino') return cerrarSesion();
    return _resetAllOriginal();
};

/* ---------- Acceso obligatorio ---------- */
let rolActual = null; // 'nino' | 'profe' | null (sin acceso: solo pantalla de acceso)
let profeInfo = null; // { rol: 'admin' } | { rol: 'docente', id, nombre, clase } (lo dice el servidor; el servidor aplica el ámbito)
function mostrarAcceso(modo, texto) {
    rolActual = modo === 'juego' ? rolActual : null;
    clearTimeout(_syncTimer);
    const html = document.documentElement;
    if (modo === 'juego') { html.classList.remove('sin-acceso'); return; }
    html.classList.add('sin-acceso');
    ['cargando', 'error', 'formulario'].forEach(m => document.getElementById('acceso-' + m).classList.toggle('hidden', m !== modo));
    if (modo === 'error') document.getElementById('acceso-error-texto').textContent = texto || 'No se puede comprobar tu clave ahora mismo.';
    if (modo === 'formulario') {
        const m = document.getElementById('acceso-motivo');
        m.textContent = texto || ''; m.classList.toggle('hidden', !texto);
        const hayLocal = !!localStorage.getItem('ligaHablaVisual') || !!localStorage.getItem('ligaHablaVoz') || !!localStorage.getItem('ligaHablaLectura') || !!localStorage.getItem('ligaHablaFrases');
        document.getElementById('acceso-borrar-local').classList.toggle('hidden', !hayLocal);
        document.getElementById('login-boton').disabled = false;
        setTimeout(() => { const i = document.getElementById('login-codigo'); if (i && !document.getElementById('acceso-formulario').classList.contains('hidden')) i.focus(); }, 50);
    }
}
let _comprobando = null;
function comprobarAcceso(opciones = {}) {
    if (_comprobando) return _comprobando;
    _comprobando = _comprobarAcceso(opciones).finally(() => { _comprobando = null; });
    return _comprobando;
}
async function _comprobarAcceso({ enSegundoPlano = false } = {}) {
    if (!enSegundoPlano) mostrarAcceso('cargando');
    const r = await llamarApi('acceso', { accion: 'sesion' });
    if (r.status !== 200 || !r.datos.ok) {
        // Servidor o base de datos caídos: no se deja entrar (si ya estaba dentro, se sigue y se vuelve a comprobar luego)
        if (enSegundoPlano) return;
        const texto = r.status === 0
            ? 'No hay conexión con el servidor. Para usar «Me gusta hablar Alto y claro» hace falta internet para comprobar tu clave. Revisa la conexión y pulsa Reintentar.'
            : (r.datos.mensaje || 'El servidor de claves no responde ahora mismo.') + ' Mientras tanto no se puede entrar.';
        return mostrarAcceso('error', texto);
    }
    const d = r.datos;
    if (d.nino) {
        if (syncMeta.ninoId && syncMeta.ninoId !== d.nino.id) {
            // Este dispositivo tenía datos de otro niño: se borran antes de entrar
            await borrarDatosLocales(); location.reload(); return;
        }
        if (!syncMeta.conectado || syncMeta.ninoId !== d.nino.id || syncMeta.bloqueado) {
            if (!syncMeta.ninoId) await prepararDatosLocales(d.nino.alias); // progreso sin clave: añadirlo o borrarlo
            const juntar = !!syncMeta._juntar;
            syncMeta = Object.assign(syncMetaVacia(), syncMeta.ninoId === d.nino.id ? syncMeta : {}, { conectado: true, ninoId: d.nino.id, alias: d.nino.alias, bloqueado: false, motivo: '' });
            if (!syncMeta.perfilT && juntar) syncMeta.perfilT = 1;
            delete syncMeta._juntar;
            guardarSyncMeta();
            if (!enSegundoPlano) { location.reload(); return; } // recarga con los datos ya preparados
        }
        syncMeta.alias = d.nino.alias; guardarSyncMeta();
        rolActual = 'nino';
        actualizarCuentaUI();
        mostrarAcceso('juego');
        if (!enSegundoPlano) sincronizar();
        return;
    }
    if (d.profe) {
        rolActual = 'profe';
        profeInfo = d.profesor || { rol: 'admin' };
        actualizarCuentaUI(); prepararPanelProfe();
        mostrarAcceso('juego');
        if (typeof actualizarBotonPegatinas === 'function') actualizarBotonPegatinas();
        if (typeof cargarPegatinasProfe === 'function') cargarPegatinasProfe({ aviso: !enSegundoPlano });
        return;
    }
    mostrarAcceso('formulario', d.motivo || (syncMeta.bloqueado ? syncMeta.motivo : ''));
}
// Al entrar por primera vez con una clave en un dispositivo que ya tenía progreso sin clave
async function prepararDatosLocales(alias) {
    const hayLocal = !!localStorage.getItem('ligaHablaVisual') || (typeof hablaData !== 'undefined' && hablaData.intentos.length > 0)
        || (typeof lecturaData !== 'undefined' && lecturaData.lecturas.length > 0)
        || (typeof frasesData !== 'undefined' && frasesData.registros.length > 0);
    if (!hayLocal) return;
    const juntar = confirm(`Este dispositivo ya tiene progreso guardado sin clave.\n\n¿Es de ${alias}?\nAceptar = añadirlo a ${alias}.\nCancelar = borrarlo de este dispositivo.`);
    if (juntar) {
        if (typeof hablaData !== 'undefined') { hablaData.intentos.forEach(i => { delete i.s; }); guardarHabla(); }
        if (typeof lecturaData !== 'undefined') { lecturaData.lecturas.forEach(i => { delete i.s; }); guardarLecturas(); }
        if (typeof frasesData !== 'undefined') { frasesData.registros.forEach(i => { delete i.s; }); guardarFrases(); }
        syncMeta._juntar = true; // perfilT = 1: si el servidor ya tiene perfil, manda el del servidor
    } else await borrarDatosLocales();
}
async function entrarComoProfe() {
    const input = document.getElementById('acceso-clave-profe');
    const msg = document.getElementById('acceso-profe-mensaje');
    const btn = document.getElementById('acceso-profe-boton');
    if (!input.value) { msg.className = 'text-xs mt-2 text-red-300'; msg.textContent = 'Escribe la clave del profe.'; return; }
    btn.disabled = true; msg.className = 'text-xs mt-2 text-slate-300'; msg.textContent = 'Comprobando…';
    const r = await llamarApi('acceso', { accion: 'entrar_profe', clave: input.value });
    btn.disabled = false;
    if (r.status !== 200 || !r.datos.ok) { msg.className = 'text-xs mt-2 text-red-300'; msg.textContent = r.datos.mensaje || 'No se pudo entrar.'; return; }
    input.value = '';
    location.reload();
}
function prepararPanelProfe() {
    if (rolActual !== 'profe') return;
    const l = document.getElementById('admin-login'), p = document.getElementById('admin-panel'), s = document.getElementById('admin-sesion-profe');
    if (l) l.classList.add('hidden');
    if (p) p.classList.remove('hidden');
    if (s) s.classList.remove('hidden');
    aplicarCandadoPanel();
    aplicarPapelProfe();
}
const nombreClase = p => p ? escS(p.nombre) + (p.clase ? ' – ' + escS(p.clase) : '') : '';
const esAdminProfe = () => !profeInfo || profeInfo.rol === 'admin';
// Admin: ve «Profesores», el registro y el filtro. Docente: solo «Claves de la clase» de su clase.
function aplicarPapelProfe() {
    const s = document.getElementById('admin-sesion-profe'), t = document.getElementById('admin-titulo'), b = document.getElementById('admin-profesores-bloque');
    const admin = esAdminProfe();
    if (s) s.innerHTML = admin
        ? 'Has entrado como <strong>administrador</strong>: ves todas las clases (la sesión dura 8 horas).'
        : `Has entrado como <strong>${nombreClase(profeInfo)}</strong>: solo ves a los alumnos de tu clase (la sesión dura 8 horas).`;
    if (t) t.textContent = admin ? '🔑 Claves de la clase' : '🔑 Claves de la clase · ' + (profeInfo.clase || profeInfo.nombre);
    if (b) { b.classList.toggle('hidden', !admin); if (admin) profCargar(); }
}

let _syncTimer = null;
function programarSync(ms = 2500) {
    if (!syncMeta.conectado || aplicandoRemoto || rolActual !== 'nino') return;
    clearTimeout(_syncTimer);
    _syncTimer = setTimeout(() => sincronizar(), ms);
}
// Llamado desde hablar.js cuando se borra todo el progreso al hablar
function syncHistorialBorrado() {
    if (!syncMeta.conectado) return;
    syncMeta.borrarPendiente = true; guardarSyncMeta(); sincronizar();
}

/* ---------- Sincronización ---------- */
let _syncEnCurso = null, _syncOtraVez = false;
function sincronizar(opciones = {}) {
    if (!syncMeta.conectado || syncMeta.bloqueado || rolActual !== 'nino') return Promise.resolve(false);
    if (_syncEnCurso) { _syncOtraVez = true; return _syncEnCurso; }
    _syncEnCurso = (async () => {
        let vueltas = 0, ok = false;
        do {
            _syncOtraVez = false;
            ok = await _sincronizarUnaVez(opciones);
            vueltas++;
        } while (ok && _syncOtraVez && vueltas < 10);
        return ok;
    })().finally(() => { _syncEnCurso = null; actualizarCuentaUI(); });
    return _syncEnCurso;
}
async function _sincronizarUnaVez(opciones) {
    if (typeof hablaData === 'undefined') return false;
    const pendientes = hablaData.intentos.filter(i => !i.s).slice(0, SYNC_LOTE);
    const hayLect = typeof lecturaData !== 'undefined';
    const pendLect = hayLect ? lecturaData.lecturas.filter(i => !i.s).slice(0, SYNC_LOTE) : [];
    const hayFr = typeof frasesData !== 'undefined';
    const pendFr = hayFr ? frasesData.registros.filter(i => !i.s).slice(0, SYNC_LOTE) : [];
    const cuerpo = {
        cursor: syncMeta.cursor || 0,
        intentos: pendientes.map(({ s, audioId, ...resto }) => resto), // el audio no se envía nunca
        // Lecturas en voz alta: solo las puntuaciones (lecturaParaServidor deja fuera audio y cualquier texto oído)
        lecturas: pendLect.map(lecturaParaServidor),
        // Frases cotidianas: solo qué frase, actividad, puntuación y si salió bien
        frases: hayFr ? pendFr.map(frParaServidor) : [],
        perfil: gameState && gameState.name ? gameState : null,
        perfilT: syncMeta.perfilT || 0
    };
    const borrar = syncMeta.borrarPendiente;
    if (borrar) cuerpo.borrarIntentos = true;
    if (typeof pegatinasHayQueRevisar === 'function' && pegatinasHayQueRevisar()) cuerpo.revisarPegatinas = true;
    const r = await llamarApi('sync', cuerpo, { keepalive: opciones.keepalive });
    if (r.status === 401) { bloquearDispositivo(r.datos.mensaje); return false; }
    if (r.status !== 200 || !r.datos.ok) { syncEstado = r.datos.mensaje || 'No se pudo sincronizar.'; return false; }
    const d = r.datos;
    aplicandoRemoto = true;
    try {
        const recibidos = new Set(d.recibidos || []);
        hablaData.intentos.forEach(i => { if (recibidos.has(i.id)) i.s = 1; });
        const recibidasL = new Set(d.lecturasRecibidas || []);
        if (hayLect) lecturaData.lecturas.forEach(i => { if (recibidasL.has(i.id)) i.s = 1; });
        const recibidasF = new Set(d.frasesRecibidas || []);
        if (hayFr) frasesData.registros.forEach(i => { if (recibidasF.has(i.id)) i.s = 1; });
        if (borrar) syncMeta.borrarPendiente = false;
        // Historial borrado (aquí o en el otro dispositivo): quitar intentos y grabaciones antiguos
        if (d.borradoT && d.borradoT > (syncMeta.borradoT || 0)) {
            const fuera = hablaData.intentos.filter(i => i.t <= d.borradoT);
            const audios = fuera.map(i => i.audioId).filter(Boolean);
            hablaData.intentos = hablaData.intentos.filter(i => i.t > d.borradoT);
            if (hayLect) {
                lecturaData.lecturas.filter(i => i.t <= d.borradoT).forEach(i => { if (i.audioId) audios.push(i.audioId); });
                lecturaData.lecturas = lecturaData.lecturas.filter(i => i.t > d.borradoT);
            }
            if (hayFr) frasesData.registros = frasesData.registros.filter(i => i.t > d.borradoT);
            if (audios.length && typeof audioDelete === 'function') audioDelete(audios).catch(() => { });
            syncMeta.borradoT = d.borradoT;
        }
        // Intentos de otros dispositivos: se juntan por id (las grabaciones no viajan)
        const ids = new Set(hablaData.intentos.map(i => i.id));
        let nuevos = 0;
        (d.intentos || []).forEach(i => { if (!ids.has(i.id)) { hablaData.intentos.push(Object.assign({}, i, { audioId: null, s: 1 })); ids.add(i.id); nuevos++; } });
        if (nuevos) hablaData.intentos.sort((a, b) => a.t - b.t);
        guardarHabla();
        if (hayLect) {
            const idsL = new Set(lecturaData.lecturas.map(i => i.id));
            (d.lecturas || []).forEach(i => {
                if (!idsL.has(i.id)) { lecturaData.lecturas.push(Object.assign({}, i, { audioId: null, s: 1 })); idsL.add(i.id); nuevos++; return; }
                // Ya la teníamos: solo puede crecer la lista de palabras practicadas (pw) desde otro dispositivo
                const loc = lecturaData.lecturas.find(x => x.id === i.id);
                if (loc && Array.isArray(i.pw) && i.pw.length > (Array.isArray(loc.pw) ? loc.pw.length : 0)) { loc.pw = i.pw.slice(); nuevos++; }
            });
            lecturaData.lecturas.sort((a, b) => a.t - b.t);
            guardarLecturas();
        }
        if (hayFr) {
            const idsF = new Set(frasesData.registros.map(i => i.id));
            (d.frases || []).forEach(i => { if (!idsF.has(i.id)) { frasesData.registros.push(Object.assign({}, i, { s: 1 })); idsF.add(i.id); nuevos++; } });
            frasesData.registros.sort((a, b) => a.t - b.t);
            try { localStorage.setItem(FRASES_KEY, JSON.stringify(frasesData)); } catch (e) { }
        }
        if (Array.isArray(d.pegatinas) && typeof aplicarPegatinasServidor === 'function') aplicarPegatinasServidor(d.pegatinas);
        // Perfil: gana el cambio más reciente
        if (d.perfil && d.perfilT > (syncMeta.perfilT || 0)) {
            gameState = limpiarPerfilLocal(Object.assign({}, gameState, d.perfil));
            _saveStateOriginal();
            syncMeta.perfilT = d.perfilT;
            updateHUD();
            const setup = document.getElementById('setup-modal');
            if (setup && !setup.classList.contains('hidden') && gameState.name) { setup.classList.add('hidden'); renderAll(); }
        } else if (d.perfilT === syncMeta.perfilT) { /* al día */ }
        if (d.alias) syncMeta.alias = d.alias;
        syncMeta.cursor = d.cursor;
        syncMeta.ultima = Date.now();
        guardarSyncMeta();
        syncEstado = '';
        const tabProg = document.getElementById('tab-progreso');
        const tabLect = document.getElementById('tab-lectura');
        if ((nuevos || d.borradoT) && tabLect && !tabLect.classList.contains('hidden') && typeof renderLectura === 'function' && typeof lecturaOcupada === 'function' && !lecturaOcupada()) renderLectura();
        const tabFr = document.getElementById('tab-frases');
        if ((nuevos || d.borradoT) && tabFr && !tabFr.classList.contains('hidden') && typeof renderFrases === 'function') renderFrases();
        if (nuevos && tabProg && !tabProg.classList.contains('hidden') && typeof renderProgreso === 'function') renderProgreso();
    } finally { aplicandoRemoto = false; }
    return true;
}

function bloquearDispositivo(mensaje) {
    syncMeta.conectado = false; syncMeta.bloqueado = true; syncMeta.motivo = mensaje || 'Esta clave ya no sirve en este dispositivo.';
    guardarSyncMeta();
    mostrarAcceso('formulario', syncMeta.motivo);
}

/* ---------- UI de la cuenta ---------- */
let syncEstado = '';
function actualizarCuentaUI() {
    const btn = document.getElementById('cuenta-btn');
    if (!btn) return;
    if (rolActual === 'profe') {
        btn.innerHTML = '<span aria-hidden="true">👤</span><span class="hidden sm:inline">Profe</span>';
        btn.title = 'Sesión del profe';
    } else if (rolActual === 'nino' && syncMeta.alias) {
        btn.innerHTML = '<span aria-hidden="true">🔑</span><span class="hidden sm:inline">' + escS(syncMeta.alias) + '</span>';
        btn.title = 'Mi clave: ' + syncMeta.alias;
    } else {
        btn.innerHTML = '<span aria-hidden="true">🔑</span><span class="hidden sm:inline">Entrar</span>';
        btn.title = 'Entrar con mi clave';
    }
}

function abrirCuenta() {
    crearModalesSync();
    document.getElementById('cuenta-modal').classList.remove('hidden');
    renderCuenta();
}
function cerrarCuenta() { const m = document.getElementById('cuenta-modal'); if (m) m.classList.add('hidden'); }

function renderCuenta() {
    const c = document.getElementById('cuenta-contenido');
    if (!c) return;
    if (rolActual === 'profe') {
        c.innerHTML = `<div class="text-center"><div class="text-4xl mb-2">👤</div><p class="text-slate-200">Has entrado como <strong>profe</strong>.</p><p class="text-xs text-slate-400 mt-2">La sesión dura 8 horas. Puedes probar la app y gestionar las claves desde el engranaje.</p><button onclick="cerrarSesion()" class="mt-4 bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-xl text-sm">Cerrar sesión del profe</button></div>`;
        return;
    }
    if (rolActual === 'nino') {
        c.innerHTML = `<div class="text-center"><div class="text-4xl mb-2">🔑</div><p class="text-slate-200">Clave: <strong>${escS(syncMeta.alias)}</strong></p><p class="text-xs text-slate-400 mt-1">Progreso sincronizado en hasta 2 dispositivos.</p><button onclick="cerrarSesion()" class="mt-4 bg-slate-700 hover:bg-slate-600 text-white font-bold px-4 py-2 rounded-xl text-sm">Cerrar sesión / cambiar de alumno</button></div>`;
        return;
    }
    c.innerHTML = `<div class="text-center"><p class="text-slate-300">No hay sesión activa.</p></div>`;
}

async function cerrarSesion() {
    if (!confirm('¿Cerrar la sesión en este dispositivo?')) return;
    await llamarApi('acceso', { accion: 'salir' });
    syncMeta = syncMetaVacia(); guardarSyncMeta();
    location.reload();
}

async function entrarConClave() {
    const input = document.getElementById('login-codigo');
    const msg = document.getElementById('login-mensaje');
    const btn = document.getElementById('login-boton');
    const codigo = (input.value || '').trim().toUpperCase();
    if (!codigo) { msg.className = 'text-xs mt-3 text-red-300 text-center'; msg.textContent = 'Escribe la clave.'; return; }
    btn.disabled = true; msg.className = 'text-xs mt-3 text-slate-300 text-center'; msg.textContent = 'Comprobando…';
    const r = await llamarApi('acceso', { accion: 'entrar', codigo, dispositivo: dispositivoId(), nombreDispositivo: nombreDispositivo() });
    btn.disabled = false;
    if (r.status !== 200 || !r.datos.ok) {
        msg.className = 'text-xs mt-3 text-red-300 text-center';
        msg.textContent = r.datos.mensaje || 'No se pudo entrar.';
        return;
    }
    input.value = '';
    location.reload();
}

async function borrarDatosLocales() {
    // Borra el progreso local (no toca la clave ni el dispositivoId)
    ['ligaHablaVisual', 'ligaHablaVoz', 'ligaHablaLectura', 'ligaHablaFrases', 'ligaHablaTestTextos'].forEach(k => localStorage.removeItem(k));
    if (typeof audioClear === 'function') try { await audioClear(); } catch (e) { }
}

async function borrarDispositivoBloqueado() {
    if (!confirm('¿Borrar todos los datos guardados en este dispositivo? (el progreso en el servidor no se toca)')) return;
    await borrarDatosLocales();
    syncMeta = syncMetaVacia(); guardarSyncMeta();
    location.reload();
}

/* ---------- Modales de sincronización ---------- */
function crearModalesSync() {
    if (document.getElementById('cuenta-modal')) return;
    const html = `
    <div id="cuenta-modal" class="modal hidden">
        <div class="bg-stadium-900 border border-pitch-600 rounded-3xl p-6 max-w-md w-full mx-4">
            <div class="flex justify-between items-center mb-4"><h2 class="font-game text-xl text-white">Mi cuenta</h2><button onclick="cerrarCuenta()" class="text-slate-400 hover:text-white text-2xl">&times;</button></div>
            <div id="cuenta-contenido"></div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}

async function iniciarSync() {
    crearModalesSync();
    await comprobarAcceso();
    // Si se entró con clave pero aún no hay perfil, proponemos el alias como nombre
    const nombre = document.getElementById('input-name');
    if (rolActual === 'nino' && nombre && !nombre.value && !(gameState && gameState.name)) nombre.value = syncMeta.alias || '';
}
window.addEventListener('load', iniciarSync);
window.addEventListener('online', () => {
    if (!document.getElementById('acceso-error').classList.contains('hidden')) return comprobarAcceso();
    sincronizar();
});
// La sesión se vuelve a comprobar de vez en cuando (caducada o anulada → pantalla de acceso)
setInterval(() => { if (rolActual && document.visibilityState === 'visible') comprobarAcceso({ enSegundoPlano: true }); }, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => {
    if (!rolActual) return;
    if (document.visibilityState === 'hidden') { clearTimeout(_syncTimer); sincronizar({ keepalive: true }); }
    else { comprobarAcceso({ enSegundoPlano: true }); sincronizar(); }
});
