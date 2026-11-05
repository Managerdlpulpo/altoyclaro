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
    syncMeta.bloqueado = true; syncMeta.motivo = mensaje || 'Tu clave ya no vale en este dispositivo.'; guardarSyncMeta();
    mostrarAcceso('formulario', syncMeta.motivo);
}

/* ---------- UI de la cuenta ---------- */
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
        location.reload();
        return;
    }
    if (!confirm('¿Salir de esta cuenta en este dispositivo? Tus datos quedan en el servidor y puedes volver a entrar con la clave.')) return;
    await llamarApi('acceso', { accion: 'salir' });
    await borrarDatosLocales();
    location.reload();
}
async function borrarDatosLocales() {
    localStorage.removeItem('ligaHablaVisual');
    localStorage.removeItem('ligaHablaVoz');
    localStorage.removeItem('ligaHablaTestTextos');
    localStorage.removeItem('ligaHablaLectura');
    localStorage.removeItem('ligaHablaFrases');
    localStorage.removeItem('ligaHablaPegatinas');
    localStorage.removeItem('ligaHablaPenalty');
    localStorage.removeItem(SYNC_KEY);
    try { if (typeof audioClear === 'function') await audioClear(); } catch (e) { }
}
function borrarDispositivoBloqueado() {
    if (!confirm('¿Borrar los datos guardados en este dispositivo? No se puede deshacer.')) return;
    borrarDatosLocales().then(() => location.reload());
}

/* ---------- Panel del profe (claves) ---------- */
function panelProfeDesbloqueado() { return rolActual === 'profe'; }
function aplicarCandadoPanel() {
    const l = document.getElementById('admin-login'), p = document.getElementById('admin-panel');
    if (rolActual === 'profe') {
        if (l) l.classList.add('hidden');
        if (p) p.classList.remove('hidden');
    } else {
        if (l) l.classList.remove('hidden');
        if (p) p.classList.add('hidden');
    }
}
function adminCerrarPanel() { /* la sesión del profe se cierra con el botón de salir */ }
async function llamarAdmin(accion, extra = {}) {
    return llamarApi('admin', Object.assign({ accion }, extra));
}
async function adminCrear() {
    const alias = document.getElementById('admin-alias').value.trim();
    if (!alias) { adminMensaje('Escribe el nombre o apodo.', 'error'); return; }
    const r = await llamarAdmin('crear', { alias });
    if (r.status !== 200 || !r.datos.ok) { adminMensaje(r.datos.mensaje || 'No se pudo crear.', 'error'); return; }
    document.getElementById('admin-alias').value = '';
    adminMensaje(`Clave creada para <strong>${escS(alias)}</strong>: <span class="font-game text-lg">${escS(r.datos.codigo)}</span>`, 'ok');
    adminRefrescar();
}
async function adminRefrescar() {
    const cont = document.getElementById('admin-lista');
    if (!cont) return;
    cont.innerHTML = '<p class="text-xs text-slate-400">Cargando…</p>';
    const r = await llamarAdmin('listar');
    if (r.status !== 200 || !r.datos.ok) { cont.innerHTML = '<p class="text-xs text-red-300">No se pudo cargar la lista.</p>'; return; }
    const ninos = r.datos.ninos || [];
    cont.innerHTML = ninos.length ? ninos.map(n => `
        <div class="flex items-center justify-between bg-stadium-800 border border-slate-700 rounded-xl px-3 py-2 text-sm">
            <div>
                <strong class="text-white">${escS(n.alias)}</strong>
                <span class="text-xs text-slate-400 ml-2">${n.revocado ? '🚫 anulada' : '✅ activa'}</span>
            </div>
            <div class="flex gap-1">
                <button onclick="adminRegenerar('${n.id}')" class="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded-lg">Nueva clave</button>
                <button onclick="adminRevocar('${n.id}')" class="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-lg">${n.revocado ? 'Reactivar' : 'Anular'}</button>
                <button onclick="adminBorrar('${n.id}')" class="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded-lg">Borrar</button>
            </div>
        </div>`).join('') : '<p class="text-xs text-slate-400">Todavía no hay claves.</p>';
}
function adminMensaje(html, tipo) {
    const m = document.getElementById('admin-mensaje');
    if (!m) return;
    m.className = 'text-sm mt-2 ' + (tipo === 'ok' ? 'text-emerald-300' : 'text-red-300');
    m.innerHTML = html;
}
async function adminRegenerar(id) {
    if (!confirm('¿Dar una clave nueva? La anterior dejará de valer.')) return;
    const r = await llamarAdmin('regenerar', { id });
    if (r.status !== 200 || !r.datos.ok) { adminMensaje(r.datos.mensaje || 'No se pudo.', 'error'); return; }
    adminMensaje(`Nueva clave: <span class="font-game text-lg">${escS(r.datos.codigo)}</span>`, 'ok');
    adminRefrescar();
}
async function adminRevocar(id) {
    const r = await llamarAdmin('revocar', { id });
    if (r.status !== 200 || !r.datos.ok) { adminMensaje(r.datos.mensaje || 'No se pudo.', 'error'); return; }
    adminRefrescar();
}
async function adminBorrar(id) {
    if (!confirm('¿Borrar este alumno y todos sus datos del servidor? No se puede deshacer.')) return;
    const r = await llamarAdmin('borrar', { id });
    if (r.status !== 200 || !r.datos.ok) { adminMensaje(r.datos.mensaje || 'No se pudo.', 'error'); return; }
    adminRefrescar();
}

/* ---------- Profesores (solo admin) ---------- */
async function profCargar() {
    const cont = document.getElementById('admin-profesores-lista');
    if (!cont) return;
    const r = await llamarAdmin('profesores');
    if (r.status !== 200 || !r.datos.ok) { cont.innerHTML = '<p class="text-xs text-red-300">No se pudo cargar.</p>'; return; }
    const profs = r.datos.profesores || [];
    cont.innerHTML = profs.length ? profs.map(p => `
        <div class="flex items-center justify-between bg-stadium-800 border border-slate-700 rounded-xl px-3 py-2 text-sm">
            <div>
                <strong class="text-white">${escS(p.nombre)}</strong>
                <span class="text-xs text-slate-400 ml-2">${escS(p.clase || 'sin clase')}</span>
                <span class="text-xs ${p.activo ? 'text-emerald-400' : 'text-red-400'} ml-2">${p.activo ? 'activo' : 'desactivado'}</span>
            </div>
            <div class="flex gap-1">
                <button onclick="profRegenerar('${p.id}')" class="text-xs bg-amber-600 hover:bg-amber-500 text-white px-2 py-1 rounded-lg">Nueva clave</button>
                <button onclick="profActivar('${p.id}', ${!p.activo})" class="text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded-lg">${p.activo ? 'Desactivar' : 'Activar'}</button>
                <button onclick="profBorrar('${p.id}')" class="text-xs bg-red-700 hover:bg-red-600 text-white px-2 py-1 rounded-lg">Borrar</button>
            </div>
        </div>`).join('') : '<p class="text-xs text-slate-400">Todavía no hay profesores.</p>';
}
async function profCrear() {
    const nombre = document.getElementById('admin-prof-nombre').value.trim();
    const clase = document.getElementById('admin-prof-clase').value.trim();
    if (!nombre) { adminMensaje('Escribe el nombre del profesor.', 'error'); return; }
    const r = await llamarAdmin('profesor_crear', { nombre, clase });
    if (r.status !== 200 || !r.datos.ok) { adminMensaje(r.datos.mensaje || 'No se pudo.', 'error'); return; }
    document.getElementById('admin-prof-nombre').value = '';
    document.getElementById('admin-prof-clase').value = '';
    adminMensaje(`Clave de profesor para <strong>${escS(nombre)}</strong>: <span class="font-game text-lg">${escS(r.datos.codigo)}</span>`, 'ok');
    profCargar();
}
async function profRegenerar(id) {
    if (!confirm('¿Dar una clave nueva a este profesor?')) return;
    const r = await llamarAdmin('profesor_regenerar', { id });
    if (r.status !== 200 || !r.datos.ok) { adminMensaje(r.datos.mensaje || 'No se pudo.', 'error'); return; }
    adminMensaje(`Nueva clave de profesor: <span class="font-game text-lg">${escS(r.datos.codigo)}</span>`, 'ok');
    profCargar();
}
async function profActivar(id, activo) {
    const r = await llamarAdmin('profesor_activar', { id, activo });
    if (r.status !== 200 || !r.datos.ok) { adminMensaje(r.datos.mensaje || 'No se pudo.', 'error'); return; }
    profCargar();
}
async function profBorrar(id) {
    if (!confirm('¿Borrar este profesor? Sus alumnos pasan al administrador.')) return;
    const r = await llamarAdmin('profesor_borrar', { id });
    if (r.status !== 200 || !r.datos.ok) { adminMensaje(r.datos.mensaje || 'No se pudo.', 'error'); return; }
    profCargar();
    adminRefrescar();
}

/* ---------- Auditoría ---------- */
const ACCIONES_REGISTRO = {
    nino_crear: 'creó la clave de', nino_regenerar: 'dio clave nueva a', nino_revocar: 'anuló la clave de', nino_borrar: 'borró a', nino_reasignar: 'cambió de clase a',
    profesor_crear: 'creó al profesor', profesor_regenerar: 'dio clave nueva al profesor', profesor_desactivar: 'desactivó al profesor', profesor_activar: 'activó al profesor', profesor_borrar: 'borró al profesor'
};
async function auditoriaCargar() {
    const cont = document.getElementById('auditoria-lista');
    const r = await llamarAdmin('auditoria');
    if (!cont || r.status !== 200) return;
    cont.innerHTML = r.datos.registro.length ? r.datos.registro.map(x => `<div class="text-[11px] text-slate-300 border-b border-slate-800 pb-1">
        <span class="text-slate-500">${new Date(x.t).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <strong class="text-white">${escS(x.quien)}</strong> ${escS(ACCIONES_REGISTRO[x.accion] || x.accion)} <span class="text-amber-200">${escS(x.detalle)}</span></div>`).join('')
        : '<p class="text-[11px] text-slate-400">Sin cambios todavía.</p>';
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
