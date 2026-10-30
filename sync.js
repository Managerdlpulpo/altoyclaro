/* Liga de Habla Soto Alto · Claves de acceso y sincronización
   - Sin clave: todo funciona como siempre, solo en este dispositivo.
   - Con clave (la da el profe): el perfil (nombre, nivel, XP, puntuaciones del test de nivel) y la lista
     de intentos al hablar (fecha, palabra, lo que se oyó, puntuación) se sincronizan en hasta 2 dispositivos.
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
        if (!datos) datos = { ok: false, mensaje: 'El servidor de claves no está disponible todavía (falta desplegarlo o configurarlo). Puedes seguir usando la app sin clave.' };
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
resetAll = function () { if (syncMeta.conectado) return cerrarSesion(); return _resetAllOriginal(); };

let _syncTimer = null;
function programarSync(ms = 2500) {
    if (!syncMeta.conectado || aplicandoRemoto) return;
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
    if (!syncMeta.conectado || syncMeta.bloqueado) return Promise.resolve(false);
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
    const cuerpo = {
        cursor: syncMeta.cursor || 0,
        intentos: pendientes.map(({ s, audioId, ...resto }) => resto), // el audio no se envía nunca
        perfil: gameState && gameState.name ? gameState : null,
        perfilT: syncMeta.perfilT || 0
    };
    const borrar = syncMeta.borrarPendiente;
    if (borrar) cuerpo.borrarIntentos = true;
    const r = await llamarApi('sync', cuerpo, { keepalive: opciones.keepalive });
    if (r.status === 401) { bloquearDispositivo(r.datos.mensaje); return false; }
    if (r.status !== 200 || !r.datos.ok) { syncEstado = r.datos.mensaje || 'No se pudo sincronizar.'; return false; }
    const d = r.datos;
    aplicandoRemoto = true;
    try {
        const recibidos = new Set(d.recibidos || []);
        hablaData.intentos.forEach(i => { if (recibidos.has(i.id)) i.s = 1; });
        if (borrar) syncMeta.borrarPendiente = false;
        // Historial borrado (aquí o en el otro dispositivo): quitar intentos y grabaciones antiguos
        if (d.borradoT && d.borradoT > (syncMeta.borradoT || 0)) {
            const fuera = hablaData.intentos.filter(i => i.t <= d.borradoT);
            const audios = fuera.map(i => i.audioId).filter(Boolean);
            hablaData.intentos = hablaData.intentos.filter(i => i.t > d.borradoT);
            if (audios.length && typeof audioDelete === 'function') audioDelete(audios).catch(() => { });
            syncMeta.borradoT = d.borradoT;
        }
        // Intentos de otros dispositivos: se juntan por id (las grabaciones no viajan)
        const ids = new Set(hablaData.intentos.map(i => i.id));
        let nuevos = 0;
        (d.intentos || []).forEach(i => { if (!ids.has(i.id)) { hablaData.intentos.push(Object.assign({}, i, { audioId: null, s: 1 })); ids.add(i.id); nuevos++; } });
        if (nuevos) hablaData.intentos.sort((a, b) => a.t - b.t);
        guardarHabla();
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
        if ((nuevos || d.borradoT) && tabProg && !tabProg.classList.contains('hidden') && typeof renderProgresoHabla === 'function') renderProgresoHabla();
    } finally { aplicandoRemoto = false; }
    if (hablaData.intentos.some(i => !i.s)) _syncOtraVez = true;
    return true;
}
let syncEstado = '';

/* ---------- Entrar, salir y borrar datos del dispositivo ---------- */
async function borrarDatosLocales() {
    localStorage.removeItem('ligaHablaVisual');
    localStorage.removeItem('ligaHablaVoz');
    localStorage.removeItem('ligaHablaTestTextos');
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
    const hayLocal = !!(gameState && gameState.name) || (typeof hablaData !== 'undefined' && hablaData.intentos.length > 0);
    let perfilT = 0;
    if (syncMeta.ninoId && syncMeta.ninoId !== id) {
        await borrarDatosLocales(); // eran datos de otro niño
    } else if (syncMeta.ninoId === id) {
        perfilT = syncMeta.perfilT || 0;
    } else if (hayLocal) {
        const juntar = confirm(`Este dispositivo ya tiene progreso guardado sin clave.\n\n¿Es de ${alias}?\nAceptar = añadirlo a ${alias}.\nCancelar = borrarlo de este dispositivo.`);
        if (juntar) {
            hablaData.intentos.forEach(i => { delete i.s; }); guardarHabla();
            perfilT = 1; // si el servidor ya tiene perfil, manda el del servidor
        } else await borrarDatosLocales();
    }
    syncMeta = Object.assign(syncMetaVacia(), { conectado: true, ninoId: id, alias, perfilT });
    guardarSyncMeta();
    if (typeof hablaData !== 'undefined') hablaData = cargarHabla();
    try { gameState = limpiarPerfilLocal(JSON.parse(localStorage.getItem('ligaHablaVisual')) || gameState); } catch (e) { }
    msg.textContent = 'Sincronizando…';
    await sincronizar();
    location.reload();
}
async function cerrarSesion() {
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
function bloquearDispositivo(mensaje) {
    syncMeta.bloqueado = true; syncMeta.motivo = mensaje || ''; guardarSyncMeta();
    mostrarBloqueo();
}

/* ---------- Interfaz ---------- */
function crearModalesSync() {
    const html = `
    <div id="login-modal" class="modal hidden" style="z-index:120">
      <div class="bg-stadium-900 border border-pitch-600 rounded-3xl p-6 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-3">
          <h3 class="font-game text-xl text-white">🔑 Entrar con mi clave</h3>
          <button onclick="cerrarLogin()" class="text-slate-400" aria-label="Cerrar">✕</button>
        </div>
        <p class="text-sm text-slate-300 mb-4">Escribe la clave que te ha dado tu profe. Así tu progreso se guarda y lo puedes ver en otro dispositivo.</p>
        <input id="login-codigo" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="XXXX-XXXX"
          class="w-full bg-stadium-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-widest font-game uppercase"
          onkeydown="if(event.key==='Enter') entrarConClave()">
        <button id="login-boton" onclick="entrarConClave()" class="w-full mt-3 bg-pitch-600 hover:bg-pitch-500 text-white font-bold py-3 rounded-xl">Entrar</button>
        <p id="login-mensaje" class="text-xs mt-3 text-slate-300" role="status"></p>
        <p class="text-[11px] text-slate-400 mt-3">Una clave sirve como mucho en 2 dispositivos. Tus grabaciones de voz no salen nunca de este dispositivo. <a href="privacidad.html" target="_blank" class="underline text-sky-300">Privacidad</a></p>
      </div>
    </div>
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
    </div>
    <div id="bloqueo-modal" class="modal hidden" style="z-index:115;background:rgba(2,6,23,0.97)">
      <div class="bg-stadium-900 border border-amber-500 rounded-3xl p-6 max-w-md w-full mx-4 text-center">
        <div class="text-5xl mb-3">🔒</div>
        <h3 class="font-game text-xl text-white mb-2">Este perfil está cerrado</h3>
        <p id="bloqueo-texto" class="text-sm text-slate-300 mb-4"></p>
        <div class="grid gap-2">
          <button onclick="abrirLogin()" class="bg-pitch-600 hover:bg-pitch-500 text-white font-bold py-3 rounded-xl">🔑 Entrar con mi clave</button>
          <button onclick="borrarDispositivoBloqueado()" class="bg-stadium-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold py-2 rounded-xl text-sm">Borrar los datos de este dispositivo</button>
        </div>
      </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', html);
}
function abrirLogin() {
    const m = document.getElementById('login-modal');
    document.getElementById('login-mensaje').textContent = '';
    document.getElementById('login-codigo').value = '';
    m.classList.remove('hidden');
    setTimeout(() => document.getElementById('login-codigo').focus(), 50);
}
function cerrarLogin() { document.getElementById('login-modal').classList.add('hidden'); }
function mostrarBloqueo() {
    const t = document.getElementById('bloqueo-texto');
    if (!t) return;
    t.textContent = (syncMeta.motivo || 'Tu clave ha cambiado o este dispositivo ya no está autorizado.') + ' Si no tienes tu clave, pídesela al profe. Tu progreso de este dispositivo sigue guardado aquí.';
    document.getElementById('bloqueo-modal').classList.remove('hidden');
}
function abrirCuenta() {
    if (!syncMeta.conectado) return abrirLogin();
    actualizarCuentaUI();
    document.getElementById('cuenta-modal').classList.remove('hidden');
}
function actualizarCuentaUI() {
    const b = document.getElementById('cuenta-btn');
    if (b) {
        b.innerHTML = syncMeta.conectado
            ? `<span aria-hidden="true">☁️</span><span class="hidden sm:inline max-w-[7rem] truncate">${escS(syncMeta.alias || 'Mi clave')}</span>`
            : `<span aria-hidden="true">🔑</span><span class="hidden sm:inline">Entrar</span>`;
        b.setAttribute('aria-label', b.title = syncMeta.conectado ? `Mi clave (${syncMeta.alias || ''})` : 'Entrar con mi clave');
    }
    const info = document.getElementById('cuenta-info');
    if (info && syncMeta.conectado) {
        const pend = (typeof hablaData !== 'undefined') ? hablaData.intentos.filter(i => !i.s).length : 0;
        info.innerHTML = `<div>Has entrado como <strong class="text-white">${escS(syncMeta.alias)}</strong>.</div>
          <div>Última sincronización: ${syncMeta.ultima ? new Date(syncMeta.ultima).toLocaleString('es-ES') : 'todavía no'}</div>
          <div>${pend ? `⏳ ${pend} intento(s) por enviar` : '✅ Todo enviado'}</div>
          ${syncEstado ? `<div class="text-amber-300">${escS(syncEstado)}</div>` : ''}
          <div class="text-xs text-slate-400">Se sincroniza: nombre, nivel, XP, puntuaciones del test de nivel e intentos (texto). Las grabaciones y las respuestas libres del test se quedan en este dispositivo.</div>`;
    }
}

/* ---------- Panel del profe: claves de la clase ---------- */
let _claveProfe = ''; // solo en memoria: se olvida al recargar
async function llamarAdmin(accion, extra = {}) {
    const r = await llamarApi('admin', Object.assign({ accion }, extra), { headers: { 'X-Clave-Profe': _claveProfe } });
    if (r.status === 401) { _claveProfe = ''; }
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
}
function adminCerrarPanel() {
    _claveProfe = '';
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
    if (!d.ninos.length) { cont.innerHTML = '<p class="text-xs text-slate-400">Todavía no hay niños con clave.</p>'; return; }
    cont.innerHTML = d.ninos.map(n => `
      <div class="bg-stadium-950 border border-slate-800 rounded-xl p-3" data-nino="${escS(n.id)}">
        <div class="flex justify-between items-start gap-2">
          <div>
            <div class="font-bold text-white">${escS(n.alias)} ${n.revocado ? '<span class="text-[10px] bg-red-700 text-white px-1.5 py-0.5 rounded">clave anulada</span>' : ''}</div>
            <div class="text-[11px] text-slate-400">${n.xp != null ? `XP ${n.xp} · Nivel ${n.nivel}` : 'Sin perfil aún'}${n.test ? ` · Test ${new Date(n.test.t).toLocaleDateString('es-ES')}: C ${n.test.comp}% V ${n.test.voc}% H ${n.test.conv}%` : ''} · ${n.intentos} intentos · Dispositivos ${n.dispositivos.length}/${d.maxDispositivos}</div>
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
    if (!confirm(`¿Borrar a ${alias} y TODOS sus datos del servidor (perfil, intentos, dispositivos y clave)?\n\nNo se puede deshacer.`)) return;
    const r = await llamarAdmin('borrar', { id });
    if (r.status !== 200) { adminMensaje(r.datos.mensaje, 'error'); return; }
    adminMensaje(`${alias} y sus datos se han borrado del servidor.`, 'ok'); adminRefrescar();
}

/* ---------- Arranque ---------- */
function iniciarSync() {
    crearModalesSync();
    actualizarCuentaUI();
    // Si se entró con clave pero aún no hay perfil, proponemos el alias como nombre
    const nombre = document.getElementById('input-name');
    if (syncMeta.conectado && nombre && !nombre.value && !(gameState && gameState.name)) nombre.value = syncMeta.alias || '';
    if (syncMeta.bloqueado) { mostrarBloqueo(); return; }
    if (syncMeta.conectado) sincronizar();
}
window.addEventListener('load', iniciarSync);
window.addEventListener('online', () => sincronizar());
document.addEventListener('visibilitychange', () => {
    if (!syncMeta.conectado) return;
    if (document.visibilityState === 'hidden') { clearTimeout(_syncTimer); sincronizar({ keepalive: true }); }
    else sincronizar();
});
