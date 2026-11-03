// Prueba en navegador de «Leo en voz alta» en el Panel del profe, de punta a punta con el servidor local (PGlite):
// una alumna sincroniza dos lecturas (palabras que le costaron, una practicada después, y la comprensión); su
// profesora las ve con «📖 Lectura»; otra profesora no puede pedirlas (404) y el admin sí. Nada de audio ni de lo oído.
// Requiere: node test/servidor-local.mjs 8811 (con ALTOYCLARO_CLAVE=profe-local-prueba) y playwright-core + Chrome.
// Uso: node test/e2e-lectura-profe.cjs   (CAPTURAS=1 guarda /workspace/shot-profe-lectura.png)
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8811/';
const CLAVE_PROFE = process.env.CLAVE_PROFE || 'profe-local-prueba';
const CAPTURAS = !!process.env.CAPTURAS;
let fallos = 0;
const ok = (cond, msg, extra = '') => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg + (extra ? '  ' + extra : '')); if (!cond) fallos++; };
const admin = async (accion, extra = {}) => {
  const r = await fetch(BASE + 'api/admin', { method: 'POST', headers: { 'content-type': 'application/json', 'x-clave-profe': CLAVE_PROFE }, body: JSON.stringify({ accion, ...extra }) });
  return { status: r.status, datos: await r.json().catch(() => ({})) };
};

(async () => {
  console.log('Lectura en el Panel del profe');
  const laura = (await admin('profesor_crear', { nombre: 'Laura', clase: '2.º A' })).datos;
  const marta = (await admin('profesor_crear', { nombre: 'Marta', clase: '2.º B' })).datos;
  const ana = (await admin('crear', { alias: 'Ana', profesor: laura.id })).datos;
  ok(!!(laura.clave && marta.clave && ana.codigo), 'admin crea dos profesoras y a Ana en la clase de Laura');

  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const errores = [];
  const mk = async (nombre) => {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/favicon|images\.unsplash|ERR_|status of (401|403|404|503)/.test(m.text())) errores.push(nombre + ': ' + m.text()); });
    page.on('pageerror', e => errores.push(nombre + ' pageerror: ' + e.message));
    page.on('dialog', d => d.accept());
    await page.goto(BASE);
    await page.waitForFunction(() => document.getElementById('acceso-cargando') && (document.getElementById('acceso-cargando').classList.contains('hidden') || !document.documentElement.classList.contains('sin-acceso')), null, { timeout: 15000 });
    await page.waitForTimeout(300);
    return page;
  };
  const esperarCarga = p => p.waitForFunction(() => !document.documentElement.classList.contains('sin-acceso') || document.getElementById('acceso-cargando').classList.contains('hidden'), null, { timeout: 15000 }).then(() => p.waitForTimeout(400));

  // 1. Ana entra con su clave y sincroniza dos lecturas
  const nino = await mk('ana');
  const envios = [];
  nino.on('request', q => { if (q.url().includes('/api/sync')) envios.push(q.postData() || ''); });
  await nino.fill('#login-codigo', ana.codigo);
  await Promise.all([nino.waitForEvent('load', { timeout: 8000 }).catch(() => {}), nino.click('#login-boton')]); await esperarCarga(nino);
  await nino.waitForFunction(() => typeof rolActual !== 'undefined' && rolActual === 'nino', null, { timeout: 15000 });
  await nino.evaluate(() => { gameState.name = 'Ana'; finishSetup(); saveState(); });
  const hecho = await nino.evaluate(() => {
    const c = lecCuento('l0-panda'), tk = lecTokens(c), n = tk.ref.length;
    const kBambu = tk.ref.indexOf('bambu'), kBosque = tk.ref.indexOf('bosque');
    const e1 = Array(n).fill('b'); e1[kBambu] = 'm'; e1[kBosque] = 's';
    const e2 = Array(n).fill('b'); e2[kBambu] = 'd';
    const base = { cuento: c.id, nivel: 0, metodo: 'voz', prec: 90, ppm: 60, compl: 100, est: 2, pausas: 0, autoc: 0, pron: 90, dur: 30, n, esc: false, qv: LEC_PREGUNTAS_VERSION, audioId: 'local-123', oido: 'mei es un oso panda' };
    const ahora = Date.now();
    lecturaData.lecturas.push(Object.assign({}, base, { id: 'lec-a1', t: ahora - 86400000, e: e1.join(''), comp: 67, compN: 3, pw: [kBosque] }));
    lecturaData.lecturas.push(Object.assign({}, base, { id: 'lec-a2', t: ahora - 3600000, e: e2.join(''), comp: 100, compN: 3 }));
    guardarLecturas();
    programarSync(0);
    return { kBambu, kBosque, n };
  });
  ok(hecho.kBambu >= 0 && hecho.kBosque >= 0, 'lecturas de «Mei, el oso panda»: «bambú» costó dos veces, «bosque» una (y la practicó)');
  let enServidor = null;
  for (let i = 0; i < 20 && !(enServidor && enServidor.length >= 2); i++) { await nino.waitForTimeout(500); enServidor = ((await admin('lecturas', { id: ana.id })).datos.lecturas) || null; }
  ok(enServidor && enServidor.length === 2, 'las 2 lecturas llegan al servidor al sincronizar');
  const cuerpo = envios.join('\n');
  ok(cuerpo.includes('lec-a1') && !cuerpo.includes('local-123') && !cuerpo.includes('mei es un oso panda') && !/audio|blob/i.test(cuerpo.replace(/"audios?Id"/g, '')), 'al servidor no van ni la grabación ni lo oído');
  ok(enServidor && enServidor.every(r => !('oido' in r) && !('audioId' in r)) && JSON.stringify(enServidor[0].pw) === JSON.stringify([hecho.kBosque]), 'el servidor guarda solo códigos por palabra, pw y comprensión');

  // 2. Laura (su profesora) abre «📖 Lectura» de Ana
  const lp = await mk('laura');
  await lp.click('#acceso-soy-profe'); await lp.fill('#acceso-clave-profe', laura.clave);
  await Promise.all([lp.waitForEvent('load'), lp.click('#acceso-profe-boton')]); await esperarCarga(lp);
  await lp.evaluate(() => { gameState.name = 'Laura'; finishSetup(); });
  await lp.click('#profe-btn'); await lp.waitForTimeout(900);
  const fila = lp.locator('#admin-lista [data-nino]', { hasText: 'Ana' });
  ok(await fila.count() === 1, 'Laura ve a Ana en su lista');
  await fila.locator('.admin-lectura-btn').click();
  await lp.waitForFunction(() => /Comprensión/.test((document.querySelector('#admin-lista .admin-lectura') || {}).innerText || ''), null, { timeout: 8000 });
  const caja = fila.locator('.admin-lectura');
  const txt = await caja.innerText();
  ok(/Leo en voz alta · Ana/.test(txt) && /2 lecturas/.test(txt), 'cabecera: «Leo en voz alta · Ana», 2 lecturas');
  ok(/bambú/.test(txt) && /×2/.test(txt), 'palabras que le cuestan: «bambú ×2»');
  const bosque = caja.locator('.lec-cuesta', { hasText: 'bosque' });
  ok(await bosque.count() === 1 && /✅/.test(await bosque.innerText()), '«bosque» marcada ✅ (la practicó y la dijo bien)');
  const comp = await caja.locator('tr', { hasText: 'Mei, el oso panda' }).innerText();
  ok(/100\s*%[\s\S]*100\s*%[\s\S]*\b2\b/.test(comp), 'comprensión por cuento: «Mei, el oso panda» última 100 %, mejor 100 %, 2 veces', JSON.stringify(comp));
  ok(await fila.locator('.admin-lectura-btn').getAttribute('aria-expanded') === 'true', 'botón con aria-expanded');
  if (CAPTURAS) { await caja.evaluate(e => { e.closest('[data-nino]').scrollIntoView({ block: 'start' }); window.scrollBy(0, -60); }); await lp.waitForTimeout(300); await lp.screenshot({ path: '/workspace/shot-profe-lectura.png' }); }

  // 3. Marta (otra clase) no puede pedir las lecturas de Ana; el admin sí
  const mp = await mk('marta');
  await mp.click('#acceso-soy-profe'); await mp.fill('#acceso-clave-profe', marta.clave);
  await Promise.all([mp.waitForEvent('load'), mp.click('#acceso-profe-boton')]); await esperarCarga(mp);
  const st = await mp.evaluate(async id => (await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'lecturas', id }) })).status, ana.id);
  ok(st === 404, 'Marta (otra clase) → 404 al pedir las lecturas de Ana', String(st));
  ok((await admin('lecturas', { id: ana.id })).status === 200, 'el admin sí las ve (200)');
  const sinSesion = await fetch(BASE + 'api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accion: 'lecturas', id: ana.id }) });
  ok(sinSesion.status === 401, 'sin sesión de profe → 401', String(sinSesion.status));

  ok(!errores.length, 'sin errores de JavaScript', errores.join(' | '));
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo correcto');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
