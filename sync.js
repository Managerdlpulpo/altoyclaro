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
function escS(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

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
resetAll = function () { if (rolActual === 'nino') return cerrarSesion(); return _resetAllOriginal(); };

/* ---------- Acceso obligatorio ---------- */
let rolActual = null; // 'nino' | 'profe' | null (sin acceso: solo pantalla de acceso)
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
            (d.lecturas || []).forEach(i => { if (!idsL.has(i.id)) { lecturaData.lecturas.push(Object.assign({}, i, { audioId: null, s: 1 })); idsL.add(i.id); nuevos++; } });
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
        if ((nuevos || d.borradoT) && tabFr && !tabFr.classList.contains('hidden') && typeof renderFrases === 'function' && typeof frasesOcupada === 'function' && !frasesOcupada() && frVista.modo === 'inicio') renderFrases();
        if ((nuevos || d.borradoT) && tabProg && !tabProg.classList.contains('hidden') && typeof renderProgresoHabla === 'function') renderProgresoHabla();
    } finally { aplicandoRemoto = false; }
    if (hablaData.intentos.some(i => !i.s) || (hayLect && lecturaData.lecturas.some(i => !i.s)) || (hayFr && frasesData.registros.some(i => !i.s))) _syncOtraVez = true;
    return true;
}
let syncEstado = '';

/* ---------- Entrar, salir y borrar datos del dispositivo ---------- */
async function borrarDatosLocales() {
    localStorage.removeItem('ligaHablaVisual');
    localStorage.removeItem('ligaHablaVoz');
    localStorage.removeItem('ligaHablaTestTextos');
    localStorage.removeItem('ligaHablaLectura');
    localStorage.removeItem('ligaHablaFrases');
    localStorage.removeItem('ligaHablaPegatinas');
    localStorage.removeItem(SYNC_KEY);
    try { if (typeof audioClear === 'function') await audioClear(); } catch (e) { }
}
async function entrarConClave() {
    const input = document.getElementById('login-codigo');
    const msg = document.getElementById('login-mensaje');
    const btn = document.getElementById('login-boton');
    const codigo = (input.value || '').trim();
    if (!codigo) { msg.textContent = 'Escribe tu clave.'; return; }
    btn.disabled = true; msg.className = 'text-xs mt-3 text-slate-300'; msg.textContent = 'Comprobando…';
    const r = await llamarApi('acceso', { accion: 'entrar', codigo, dispositivo: dispositivoId(), nombre: nombreDispositivo() });
    btn.disabled = false;
    if (r.status !== 200 || !r.datos.ok) { msg.className = 'text-xs mt-3 text-red-300'; msg.textContent = r.datos.mensaje || 'No se pudo entrar.'; return; }
    const { id, alias } = r.datos;
    let perfilT = 0;
    if (syncMeta.ninoId && syncMeta.ninoId !== id) {
        await borrarDatosLocales(); // eran datos de otro niño
    } else if (syncMeta.ninoId === id) {
        perfilT = syncMeta.perfilT || 0;
    } else {
        await prepararDatosLocales(alias);
        if (syncMeta._juntar) perfilT = 1;
    }
    syncMeta = Object.assign(syncMetaVacia(), { conectado: true, ninoId: id, alias, perfilT });
    guardarSyncMeta();
    if (typeof hablaData !== 'undefined') hablaData = cargarHabla();
    if (typeof lecturaData !== 'undefined') lecturaData = cargarLecturas();
    if (typeof frasesData !== 'undefined') frasesData = cargarFrases();
    try { gameState = limpiarPerfilLocal(JSON.parse(localStorage.getItem('ligaHablaVisual')) || gameState); } catch (e) { }
    msg.textContent = 'Sincronizando…';
    rolActual = 'nino';
    await sincronizar();
    location.reload();
}
async function cerrarSesion() {
    if (rolActual === 'profe') {
        if (!confirm('¿Salir de la sesión del profe en este dispositivo?')) return;
        await llamarApi('acceso', { accion: 'salir_profe' });
        if (!syncMeta.ninoId && localStorage.getItem('ligaHablaVisual') && confirm('¿Borrar también lo que has probado en este dispositivo (perfil, progreso y grabaciones)?')) await borrarDatosLocales();
        location.reload(); return;
    }
    if (!confirm('¿Cerrar sesión en este dispositivo?\n\nSe borrarán de ESTE dispositivo el perfil, el progreso y las grabaciones de voz. El progreso guardado con tu clave sigue en el servidor y podrás volver a entrar con tu clave.')) return;
    if (navigator.onLine) { try { await sincronizar(); } catch (e) { } await llamarApi('acceso', { accion: 'salir' }); }
    await borrarDatosLocales();
    location.reload();
}
async function borrarDispositivoBloqueado() {
    if (!confirm('¿Borrar el perfil, el progreso y las grabaciones de este dispositivo?')) return;
    await borrarDatosLocales();
    location.reload();
}
// Clave cambiada, anulada o dispositivo liberado: vuelta a la pantalla de acceso (el progreso local se conserva)
function bloquearDispositivo(mensaje) {
    syncMeta.bloqueado = true; syncMeta.motivo = mensaje || ''; guardarSyncMeta();
    if (typeof cancelarSesionHabla === 'function') { try { cancelarSesionHabla(); } catch (e) { } }
    mostrarAcceso('formulario', (mensaje || 'Tu clave ha cambiado o este dispositivo ya no está autorizado.') + ' Si no tienes tu clave, pídesela al profe. Tu progreso de este dispositivo sigue guardado aquí.');
}

/* ---------- Interfaz ---------- */
function crearModalesSync() {
    const html = `
    <div id="cuenta-modal" class="modal hidden" style="z-index:110">
      <div class="bg-stadium-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-game text-xl text-white">☁️ Mi clave</h3>
          <button onclick="document.getElementById('cuenta-modal').classList.add('hidden')" class="text-slate-400" aria-label="Cerrar">✕</button>
        </div>
        <div id="cuenta-info" class="text-sm text-slate-300 space-y-1 mb-4"></div>
        <div class="grid gap-2">
          <button onclick="sincronizar().then(actualizarCuentaUI)" class="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 rounded-xl text-sm"><i class="fa-solid fa-rotate mr-1"></i> Sincronizar ahora</button>
          <button onclick="cerrarSesion()" class="bg-red-700 hover:bg-red-600 text-white font-bold py-2 rounded-xl text-sm"><i class="fa-solid fa-right-from-bracket mr-1"></i> Cerrar sesión</button>
        </div>
        <p class="text-[11px] text-slate-400 mt-3">Al cerrar sesión se borra todo de este dispositivo (también las grabaciones). <a href="privacidad.html" target="_blank" class="underline text-sky-300">Privacidad</a></p>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
function abrirCuenta() {
    actualizarCuentaUI();
    document.getElementById('cuenta-modal').classList.remove('hidden');
}
function actualizarCuentaUI() {
    const b = document.getElementById('cuenta-btn');
    if (b) {
        b.innerHTML = rolActual === 'profe'
            ? `<span aria-hidden="true">🧑‍🏫</span><span class="hidden sm:inline">Profe</span>`
            : `<span aria-hidden="true">☁️</span><span class="hidden sm:inline max-w-[7rem] truncate">${escS(syncMeta.alias || 'Mi clave')}</span>`;
        b.setAttribute('aria-label', b.title = rolActual === 'profe' ? 'Sesión del profe' : `Mi clave (${syncMeta.alias || ''})`);
    }
    const info = document.getElementById('cuenta-info');
    if (info && rolActual === 'profe') {
        info.innerHTML = `<div>Has entrado como <strong class="text-white">profe</strong>. La sesión dura 8 horas.</div>
          <div class="text-xs text-slate-400">Lo que pruebes en la app como profe se queda solo en este dispositivo (no se sincroniza). Las claves de los niños se gestionan en el Panel del profe.</div>`;
        const s = document.querySelector('#cuenta-modal button[onclick^="sincronizar"]'); if (s) s.classList.add('hidden');
    } else if (info && syncMeta.conectado) {
        const pend = ((typeof hablaData !== 'undefined') ? hablaData.intentos.filter(i => !i.s).length : 0)
            + ((typeof lecturaData !== 'undefined') ? lecturaData.lecturas.filter(i => !i.s).length : 0)
            + ((typeof frasesData !== 'undefined') ? frasesData.registros.filter(i => !i.s).length : 0);
        info.innerHTML = `<div>Has entrado como <strong class="text-white">${escS(syncMeta.alias)}</strong>.</div>
          <div>Última sincronización: ${syncMeta.ultima ? new Date(syncMeta.ultima).toLocaleString('es-ES') : 'todavía no'}</div>
          <div>${pend ? `⏳ ${pend} intento(s) por enviar` : '✅ Todo enviado'}</div>
          ${syncEstado ? `<div class="text-amber-300">${escS(syncEstado)}</div>` : ''}
          <div class="text-xs text-slate-400">Se sincroniza: nombre, nivel, XP, puntuaciones del test de nivel, intentos (texto), puntuaciones de lectura y de frases cotidianas (sin lo que se oyó) y las pegatinas conseguidas. Las grabaciones y las respuestas libres del test se quedan en este dispositivo.</div>`;
    }
}

/* ---------- Panel del profe: claves de la clase ---------- */
let _claveProfe = ''; // solo en memoria: se olvida al recargar
let _ultimo401Profe = 0;
async function llamarAdmin(accion, extra = {}) {
    const r = await llamarApi('admin', Object.assign({ accion }, extra), { headers: { 'X-Clave-Profe': _claveProfe } });
    if (r.status === 401) {
        _claveProfe = '';
        // la sesión del profe caducó: vuelta a la pantalla de acceso (como mucho una vez cada 15 s, para no entrar en bucle)
        if (rolActual === 'profe' && Date.now() - _ultimo401Profe > 15000) { _ultimo401Profe = Date.now(); comprobarAcceso(); }
    }
    return r;
}
function adminMensaje(txt, tipo = 'info') {
    const m = document.getElementById('admin-mensaje');
    if (!m) return;
    m.className = 'text-xs mt-2 ' + (tipo === 'error' ? 'text-red-300' : tipo === 'ok' ? 'text-emerald-300' : 'text-slate-300');
    m.textContent = txt;
}
async function adminAbrir() {
    _claveProfe = document.getElementById('admin-clave').value;
    if (!_claveProfe) { adminMensaje('Escribe la clave del profe.', 'error'); return; }
    adminMensaje('Comprobando…');
    const r = await llamarAdmin('listar');
    if (r.status !== 200) { adminMensaje(r.datos.mensaje || 'No se pudo abrir.', 'error'); return; }
    document.getElementById('admin-clave').value = '';
    document.getElementById('admin-login').classList.add('hidden');
    document.getElementById('admin-panel').classList.remove('hidden');
    adminMensaje('');
    adminPintar(r.datos);
    if (typeof cargarPegatinasProfe === 'function') cargarPegatinasProfe();
}
function adminCerrarPanel() {
    _claveProfe = '';
    if (rolActual === 'profe') { document.getElementById('admin-codigo-nuevo').classList.add('hidden'); return; }
    document.getElementById('admin-panel').classList.add('hidden');
    document.getElementById('admin-login').classList.remove('hidden');
    document.getElementById('admin-codigo-nuevo').classList.add('hidden');
    document.getElementById('admin-lista').innerHTML = '';
}
async function adminRefrescar() {
    const r = await llamarAdmin('listar');
    if (r.status === 401) { adminCerrarPanel(); adminMensaje(r.datos.mensaje, 'error'); return; }
    if (r.status !== 200) { adminMensaje(r.datos.mensaje, 'error'); return; }
    adminPintar(r.datos);
    if (typeof cargarPegatinasProfe === 'function') cargarPegatinasProfe();
}
function adminMostrarCodigo(alias, codigo) {
    const box = document.getElementById('admin-codigo-nuevo');
    box.innerHTML = `<div class="text-xs text-slate-300">Clave de <strong class="text-white">${escS(alias)}</strong>:</div>
      <div class="font-game text-3xl tracking-widest text-amber-300 my-1 select-all" id="admin-codigo-texto">${escS(codigo)}</div>
      <div class="text-xs text-amber-200">✍️ Apúntala y dásela al niño o a su familia. Por seguridad no se volverá a mostrar.</div>
      <button onclick="this.parentElement.classList.add('hidden')" class="mt-2 text-xs underline text-slate-300">Ya la he apuntado</button>`;
    box.classList.remove('hidden');
}
function adminPintar(d) {
    const cont = document.getElementById('admin-lista');
    if (typeof pegBadge === 'function' && d.pegatinasPendientes != null) pegBadge(d.pegatinasPendientes);
    if (!d.ninos.length) { cont.innerHTML = '<p class="text-xs text-slate-400">Todavía no hay niños con clave.</p>'; return; }
    cont.innerHTML = d.ninos.map(n => `
      <div class="bg-stadium-950 border border-slate-800 rounded-xl p-3" data-nino="${escS(n.id)}">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="font-bold text-white">${escS(n.alias)} ${n.revocado ? '<span class="text-[10px] bg-red-700 text-white px-1.5 py-0.5 rounded">clave anulada</span>' : ''}</div>
            <div class="text-[11px] text-slate-400">${n.xp != null ? `XP ${n.xp} · Nivel ${n.nivel}` : 'Sin perfil aún'}${n.test ? ` · Test ${new Date(n.test.t).toLocaleDateString('es-ES')}: C ${n.test.comp}% V ${n.test.voc}% H ${n.test.conv}%` : ''} · ${n.intentos} intentos · ${n.lecturas || 0} lecturas · ${n.frases || 0} frases${n.pegatinasPendientes ? ` · <span class="text-amber-300">🏅 ${n.pegatinasPendientes} por entregar</span>` : ''} · Dispositivos ${n.dispositivos.length}/${d.maxDispositivos}</div>
          </div>
        </div>
        ${n.dispositivos.map(x => `<div class="flex justify-between items-center text-[11px] text-slate-300 mt-1 bg-stadium-800 rounded-lg px-2 py-1">
            <span>📱 ${escS(x.nombre || 'Dispositivo')} · usado ${new Date(x.ultimo).toLocaleDateString('es-ES')}</span>
            <button onclick="adminLiberar('${escS(n.id)}','${escS(x.id)}')" class="text-sky-300 underline">Liberar</button></div>`).join('')}
        <div class="flex flex-wrap gap-2 mt-2">
          <button onclick="adminRegenerar('${escS(n.id)}')" class="text-[11px] bg-amber-500 text-stadium-950 font-bold px-2 py-1 rounded-lg">Nueva clave</button>
          ${n.revocado ? '' : `<button onclick="adminRevocar('${escS(n.id)}')" class="text-[11px] bg-stadium-800 border border-slate-700 text-slate-200 font-bold px-2 py-1 rounded-lg">Anular clave</button>`}
          <button onclick="adminBorrar('${escS(n.id)}')" class="text-[11px] bg-red-700 text-white font-bold px-2 py-1 rounded-lg">Borrar niño y datos</button>
        </div>
      </div>`).join('');
    cont._ninos = d.ninos;
}
const aliasDe = id => ((document.getElementById('admin-lista')._ninos || []).find(n => n.id === id) || {}).alias || '';
async function adminCrear() {
    const input = document.getElementById('admin-alias');
    const alias = input.value.trim();
    if (!alias) { adminMensaje('Escribe un nombre o apodo (sin apellidos).', 'error'); return; }
    const r = await llamarAdmin('crear', { alias });
    if (r.status !== 200) { adminMensaje(r.datos.mensaje, 'error'); return; }
    input.value = '';
    adminMostrarCodigo(r.datos.alias, r.datos.codigo);
    adminMensaje('');
    adminRefrescar();
}
async function adminRegenerar(id) {
    if (!confirm(`¿Dar una clave nueva a ${aliasDe(id)}?\n\nLa clave anterior dejará de funcionar y se cerrará la sesión en sus dispositivos. Su progreso se conserva.`)) return;
    const alias = aliasDe(id);
    const r = await llamarAdmin('regenerar', { id });
    if (r.status !== 200) { adminMensaje(r.datos.mensaje, 'error'); return; }
    adminMostrarCodigo(alias, r.datos.codigo); adminRefrescar();
}
async function adminRevocar(id) {
    if (!confirm(`¿Anular la clave de ${aliasDe(id)}?\n\nNadie podrá entrar con ella. Su progreso se conserva hasta que le des una clave nueva o lo borres.`)) return;
    const r = await llamarAdmin('revocar', { id });
    if (r.status !== 200) { adminMensaje(r.datos.mensaje, 'error'); return; }
    adminMensaje('Clave anulada.', 'ok'); adminRefrescar();
}
async function adminLiberar(id, dispositivo) {
    if (!confirm('¿Liberar este dispositivo? Se cerrará la sesión en él y quedará un hueco libre para otro.')) return;
    const r = await llamarAdmin('liberar', { id, dispositivo });
    if (r.status !== 200) { adminMensaje(r.datos.mensaje, 'error'); return; }
    adminMensaje('Dispositivo liberado.', 'ok'); adminRefrescar();
}
async function adminBorrar(id) {
    const alias = aliasDe(id);
    if (!confirm(`¿Borrar a ${alias} y TODOS sus datos del servidor (perfil, intentos, lecturas, frases, pegatinas, dispositivos y clave)?\n\nNo se puede deshacer.`)) return;
    const r = await llamarAdmin('borrar', { id });
    if (r.status !== 200) { adminMensaje(r.datos.mensaje, 'error'); return; }
    adminMensaje(`${alias} y sus datos se han borrado del servidor.`, 'ok'); adminRefrescar();
}

/* ---------- Arranque ---------- */
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
