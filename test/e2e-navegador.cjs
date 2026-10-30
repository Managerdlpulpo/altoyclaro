// Prueba de extremo a extremo en el navegador: acceso obligatorio con clave (profe + 4 dispositivos).
// Requiere: node test/servidor-local.mjs 8811 (con ALTOYCLARO_CLAVE=profe-local-prueba) y playwright-core + Chrome.
// Comprueba: sin clave solo se ve la pantalla de acceso; con clave de niño se juega; el profe entra con su clave
// (juego + panel de claves); clave anulada/cambiada o dispositivo liberado → vuelta a la pantalla de acceso;
// servidor caído → mensaje claro y no se entra; progreso sin clave → añadirlo o borrarlo al entrar.
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8811/';
const CLAVE_PROFE = process.env.CLAVE_PROFE || 'profe-local-prueba';
let fallos = 0;
const ok = (cond, nombre, extra = '') => { console.log((cond ? '  ✔ ' : '  ✘ ') + nombre + (extra ? '  ' + extra : '')); if (!cond) fallos++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const errors = []; const dialogs = [];
  const mk = async (nombre, opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['microphone'] });
    const page = await ctx.newPage();
    page.__ctx = ctx; page.__aceptar = true;
    page.on('console', m => { if (m.type() === 'error' && !/status of (401|403|503)|ERR_FAILED|favicon/.test(m.text())) errors.push(nombre + ' console: ' + m.text()); });
    page.on('pageerror', e => errors.push(nombre + ' pageerror: ' + e.message));
    page.on('dialog', d => { dialogs.push(nombre + ': ' + d.message().split('\n')[0]); page.__aceptar ? d.accept() : d.dismiss(); });
    if (opts.state) await page.addInitScript(s => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', 1); localStorage.setItem('ligaHablaVisual', s); } }, opts.state);
    await page.addInitScript(() => {
      window.__say = 'el perro';
      const C = class { start() { setTimeout(() => { this.onresult && this.onresult({ results: [[{ transcript: window.__say }]] }); setTimeout(() => this.onend && this.onend(), 200); }, 800); } stop() {} abort() {} };
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: C, configurable: true, writable: true });
      Object.defineProperty(window, 'SpeechRecognition', { value: C, configurable: true, writable: true });
    });
    if (opts.antes) await opts.antes(page);
    await page.goto(BASE); await esperarAcceso(page);
    return page;
  };
  // Espera a que termine la comprobación de sesión (pantalla de acceso, error o juego)
  const esperarAcceso = page => page.waitForFunction(() => document.getElementById('acceso-cargando') && (document.getElementById('acceso-cargando').classList.contains('hidden') || !document.documentElement.classList.contains('sin-acceso')), null, { timeout: 15000 }).then(() => page.waitForTimeout(300));
  const soloAcceso = page => page.evaluate(() => {
    const vis = el => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
    const visibles = [...document.body.children].filter(vis).map(e => e.id || e.tagName.toLowerCase());
    return { sinAcceso: document.documentElement.classList.contains('sin-acceso'), visibles, juego: vis(document.querySelector('header')) || vis(document.querySelector('main')) || vis(document.getElementById('setup-modal')), formulario: vis(document.getElementById('login-codigo')) };
  });
  const enJuego = async page => { const s = await soloAcceso(page); return !s.sinAcceso && s.juego; };
  const hablar = async page => {
    await page.click('#tab-btn-hablar');
    const w = await page.evaluate(() => hablaItem.es);
    await page.evaluate(w => window.__say = w, w);
    await page.click('#habla-mic'); await page.waitForTimeout(2200);
    return w;
  };
  const login = async (page, codigo) => {
    await page.fill('#login-codigo', codigo);
    await Promise.all([page.waitForEvent('load', { timeout: 8000 }).catch(() => {}), page.click('#login-boton')]);
    await esperarAcceso(page);
  };
  const intentos = p => p.evaluate(() => hablaData.intentos.length);
  const motivo = p => p.evaluate(() => { const m = document.getElementById('acceso-motivo'); return m.classList.contains('hidden') ? '' : m.textContent; });

  console.log('Acceso obligatorio (navegador)');
  // 1. SIN CLAVE: solo la pantalla de acceso
  const anon = await mk('anon');
  let s = await soloAcceso(anon);
  ok(s.sinAcceso && !s.juego && s.formulario && s.visibles.join() === 'acceso-pantalla', 'sin clave → solo la pantalla de acceso', JSON.stringify(s.visibles));
  ok(await anon.isVisible('text=Entrar con mi clave') && await anon.isVisible('#acceso-soy-profe'), 'pantalla con «Entrar con mi clave» y «Soy el profe»');
  if (process.env.CAPTURA) await anon.screenshot({ path: process.env.CAPTURA });
  await anon.fill('#login-codigo', 'ZZZZ-ZZZZ'); await anon.click('#login-boton'); await anon.waitForTimeout(600);
  ok(/no es correcta/.test(await anon.textContent('#login-mensaje')) && !(await enJuego(anon)), 'clave inventada → rechazada, sigue fuera');
  await anon.evaluate(() => { document.documentElement.classList.remove('sin-acceso'); }); // quitar la "puerta" a mano no da sesión:
  const sync401 = await anon.evaluate(() => fetch('/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).then(r => r.status));
  ok(sync401 === 401, 'sin sesión la API no sincroniza nada (401)');

  // 2. PROFE: «Soy el profe» con su clave → juego + panel de claves
  const profe = await mk('profe');
  await profe.click('#acceso-soy-profe');
  await profe.fill('#acceso-clave-profe', 'mala'); await profe.click('#acceso-profe-boton'); await profe.waitForTimeout(600);
  ok(/no es correcta/.test(await profe.textContent('#acceso-profe-mensaje')) && !(await enJuego(profe)), 'clave de profe mala → rechazada');
  await profe.fill('#acceso-clave-profe', CLAVE_PROFE);
  await Promise.all([profe.waitForEvent('load'), profe.click('#acceso-profe-boton')]); await esperarAcceso(profe);
  ok(await enJuego(profe), 'profe → entra en el juego');
  const cookies = await profe.__ctx.cookies();
  const cp = cookies.find(c => c.name === 'ayc_profe');
  ok(cp && cp.httpOnly && cp.secure && cp.sameSite === 'Lax' && cp.expires - Date.now() / 1000 <= 8 * 3600 + 60, 'cookie del profe: HttpOnly, Secure, SameSite=Lax, caduca en 8 h');
  ok(await profe.evaluate(() => document.cookie.includes('ayc_profe')) === false, 'el JavaScript de la página no puede leer la cookie');
  const sinTest = (p, n) => p.evaluate(n => { gameState.name = n; finishSetup(); }, n); // saltar el test de nivel
  await sinTest(profe, 'Profe prueba'); // el profe también puede probar la app
  await profe.click('button[title="Panel del profe"]');
  ok(await profe.isVisible('#admin-panel') && !(await profe.isVisible('#admin-login')), 'profe → panel de claves abierto sin volver a escribir la clave');
  await profe.fill('#admin-alias', 'Iryna'); await profe.click('text=Crear clave'); await profe.waitForTimeout(700);
  const codigo = (await profe.textContent('#admin-codigo-texto')).trim();
  ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(codigo), 'el profe crea una clave para un niño');

  // 3. DISPOSITIVO 1: tenía progreso de antes (sin clave) → al entrar se ofrece añadirlo (Aceptar)
  const d1 = await mk('d1', { state: JSON.stringify({ name: 'Iryna', level: 1, xp: 120 }) });
  ok(!(await enJuego(d1)), 'd1 con progreso antiguo pero sin clave → no puede jugar');
  ok(await d1.isVisible('#acceso-borrar-local'), 'd1: se ofrece borrar los datos del dispositivo');
  await login(d1, codigo.toLowerCase());
  ok(await enJuego(d1), 'clave de niño → juego');
  ok(dialogs.some(d => /d1: Este dispositivo ya tiene progreso/.test(d)), 'al entrar se pregunta si el progreso antiguo es suyo');
  ok((await d1.textContent('#xp-text-display')).trim() === '120' && (await d1.textContent('#header-name')).trim() === 'Iryna', 'progreso antiguo añadido al niño (XP 120)');
  await hablar(d1); await d1.evaluate(() => sincronizar()); await d1.waitForTimeout(600);

  // 4. DISPOSITIVO 2 (nuevo): entra y recibe el progreso
  const d2 = await mk('d2');
  await login(d2, codigo);
  ok(await enJuego(d2) && (await d2.textContent('#header-name')).trim() === 'Iryna' && await intentos(d2) === 1, 'd2 entra con la misma clave y recibe perfil e intentos');

  // 5. DISPOSITIVO 3: tercer dispositivo rechazado
  const d3 = await mk('d3');
  await d3.fill('#login-codigo', codigo); await d3.click('#login-boton'); await d3.waitForTimeout(800);
  ok(/2 dispositivos/.test(await d3.textContent('#login-mensaje')) && !(await enJuego(d3)), '3er dispositivo → rechazado con mensaje');

  // 6. Profe libera d2 → d2 vuelve a la pantalla de acceso (sus datos locales siguen)
  await profe.evaluate(() => adminRefrescar()); await profe.waitForTimeout(500);
  const idD2 = await d2.evaluate(() => localStorage.getItem('ligaHablaDispositivo'));
  await profe.evaluate(id => adminLiberar(document.getElementById('admin-lista')._ninos[0].id, id), idD2); await profe.waitForTimeout(600);
  await d2.evaluate(() => sincronizar()); await d2.waitForTimeout(800);
  ok(!(await enJuego(d2)) && /autorizado/.test(await motivo(d2)), 'dispositivo liberado → fuera, a la pantalla de acceso', await motivo(d2));
  ok(await d2.evaluate(() => !!localStorage.getItem('ligaHablaVisual')), 'd2: el progreso local no se pierde');
  await login(d3, codigo);
  ok(await enJuego(d3), 'd3 entra en el hueco libre');

  // 7. Profe da clave nueva → d1 fuera; la vieja no vale; la nueva sí
  await profe.evaluate(() => adminRegenerar(document.getElementById('admin-lista')._ninos[0].id)); await profe.waitForTimeout(700);
  const codigo2 = (await profe.textContent('#admin-codigo-texto')).trim();
  await d1.evaluate(() => sincronizar()); await d1.waitForTimeout(800);
  ok(!(await enJuego(d1)) && /clave ha cambiado/.test(await motivo(d1)), 'clave cambiada → d1 a la pantalla de acceso');
  await d1.fill('#login-codigo', codigo); await d1.click('#login-boton'); await d1.waitForTimeout(700);
  ok(/no es correcta/.test(await d1.textContent('#login-mensaje')), 'la clave vieja ya no vale');
  await login(d1, codigo2);
  ok(await enJuego(d1) && (await d1.textContent('#xp-text-display')).trim() !== '0', 'con la clave nueva vuelve a entrar con su progreso');

  // 8. Profe ANULA la clave → al abrir la app (o volver a ella), fuera
  await profe.evaluate(() => adminRevocar(document.getElementById('admin-lista')._ninos[0].id)); await profe.waitForTimeout(600);
  await d1.reload(); await esperarAcceso(d1);
  s = await soloAcceso(d1);
  ok(s.sinAcceso && !s.juego && /clave ha cambiado/.test(await motivo(d1)), 'clave anulada → al abrir, solo la pantalla de acceso con el motivo');
  await d3.evaluate(() => comprobarAcceso({ enSegundoPlano: true })); await d3.waitForTimeout(600);
  ok(!(await enJuego(d3)), 'clave anulada → el otro dispositivo también sale (comprobación periódica)');
  const cs = (await d1.__ctx.cookies()).find(c => c.name === 'ayc_sesion');
  ok(!cs, 'la cookie anulada se borra');

  // 9. Nuevo niño en dispositivo con progreso sin clave → «Cancelar» = borrarlo
  await profe.fill('#admin-alias', 'Omar'); await profe.click('text=Crear clave'); await profe.waitForTimeout(700);
  const codigoOmar = (await profe.textContent('#admin-codigo-texto')).trim();
  const d4 = await mk('d4', { state: JSON.stringify({ name: 'Otro', level: 2, xp: 55 }) });
  d4.__aceptar = false;
  await login(d4, codigoOmar);
  ok(await enJuego(d4) && (await d4.textContent('#xp-text-display')).trim() !== '55', 'progreso sin clave → «Cancelar» lo borra al entrar');
  d4.__aceptar = true;
  await sinTest(d4, 'Omar');
  // cerrar sesión del niño → pantalla de acceso, datos borrados del dispositivo
  await d4.click('#cuenta-btn');
  await Promise.all([d4.waitForEvent('load'), d4.click('#cuenta-modal >> text=Cerrar sesión')]); await esperarAcceso(d4);
  ok(!(await enJuego(d4)) && await d4.evaluate(() => !localStorage.getItem('ligaHablaVisual')), 'cerrar sesión → pantalla de acceso y datos del dispositivo borrados');

  // 10. Sesión del profe caducada (cookie borrada) → al usar el panel, vuelta a la pantalla de acceso
  const profe2 = await mk('profe2');
  await profe2.click('#acceso-soy-profe'); await profe2.fill('#acceso-clave-profe', CLAVE_PROFE);
  await Promise.all([profe2.waitForEvent('load'), profe2.click('#acceso-profe-boton')]); await esperarAcceso(profe2);
  ok(await enJuego(profe2), 'segundo profe entra');
  await profe2.__ctx.clearCookies();
  await profe2.evaluate(() => adminRefrescar()); await profe2.waitForTimeout(800);
  ok(!(await enJuego(profe2)), 'sesión del profe caducada → pantalla de acceso');
  // profe cierra sesión
  await profe.evaluate(() => toggleTeacherModal());
  await profe.click('#cuenta-btn');
  await Promise.all([profe.waitForEvent('load'), profe.click('#cuenta-modal >> text=Cerrar sesión')]); await esperarAcceso(profe);
  ok(!(await enJuego(profe)), 'el profe cierra sesión → pantalla de acceso');

  // 11. Servidor o base de datos caídos → mensaje claro, no se entra
  const caido = await mk('caido', { antes: p => p.route('**/api/acceso', r => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, codigo: 'bd', mensaje: 'El servidor de claves no puede conectar con la base de datos. Inténtalo dentro de un rato o avisa al profe.' }) })) });
  s = await soloAcceso(caido);
  ok(s.sinAcceso && !s.juego && /base de datos/.test(await caido.textContent('#acceso-error-texto')) && await caido.isVisible('#acceso-reintentar'), 'base de datos caída → mensaje claro y Reintentar, sin juego');
  const sinRed = await mk('sinred', { antes: p => p.route('**/api/acceso', r => r.abort()) });
  s = await soloAcceso(sinRed);
  ok(s.sinAcceso && !s.juego && /conexión/.test(await sinRed.textContent('#acceso-error-texto')), 'sin conexión con el servidor → mensaje claro, sin juego');
  await sinRed.unroute('**/api/acceso'); await sinRed.click('#acceso-reintentar'); await esperarAcceso(sinRed);
  ok(await sinRed.isVisible('#login-codigo'), 'al volver el servidor, Reintentar → pantalla de clave');

  const errs = errors;
  ok(errs.length === 0, 'sin errores de JavaScript', errs.join(' | '));
  console.log('\ndiálogos:', dialogs);
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
