// Prueba de extremo a extremo en el navegador (3 dispositivos + profe).
// Requiere: node test/servidor-local.mjs 8811 (con ALTOYCLARO_CLAVE=profe-local-prueba) y playwright-core + Chrome.
const { chromium } = require('playwright-core');
const BASE = 'http://localhost:8811/';
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream'] });
  const errors = []; const dialogs = [];
  const mk = async (nombre, opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ['microphone'] });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(nombre + ' console: ' + m.text()); });
    page.on('pageerror', e => errors.push(nombre + ' pageerror: ' + e.message));
    page.on('dialog', d => { dialogs.push(nombre + ': ' + d.message().split('\n')[0]); d.accept(); });
    if (opts.state) await page.addInitScript(s => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', 1); localStorage.setItem('ligaHablaVisual', s); } }, opts.state);
    await page.addInitScript(() => {
      window.__say = 'el perro';
      const C = class { start() { setTimeout(() => { this.onresult && this.onresult({ results: [[{ transcript: window.__say }]] }); setTimeout(() => this.onend && this.onend(), 200); }, 800); } stop() {} abort() {} };
      Object.defineProperty(window, 'webkitSpeechRecognition', { value: C, configurable: true, writable: true });
      Object.defineProperty(window, 'SpeechRecognition', { value: C, configurable: true, writable: true });
    });
    await page.goto(BASE); await page.waitForTimeout(1200);
    return page;
  };
  const hablar = async (page) => {
    await page.click('#tab-btn-hablar');
    const w = await page.evaluate(() => hablaItem.es);
    await page.evaluate(w => window.__say = w, w);
    await page.click('#habla-mic'); await page.waitForTimeout(2200);
    return w;
  };
  const login = async (page, codigo, desdeSetup) => {
    if (desdeSetup) await page.click('text=🔑 Ya tengo una clave'); else await page.click('#cuenta-btn');
    await page.fill('#login-codigo', codigo);
    await Promise.all([page.waitForLoadState('load').catch(() => {}), page.click('#login-boton')]);
    await page.waitForTimeout(1800);
  };
  const intentos = p => p.evaluate(() => hablaData.intentos.length);
  const log = (...a) => console.log(...a);

  // PROFE
  const profe = await mk('profe', { state: JSON.stringify({ name: 'Profe', age: 8, country: 'Otro', hobby: 'arte', level: 1, xp: 0 }) });
  await profe.click('button[title="Panel del profe"]');
  await profe.fill('#admin-clave', 'mala'); await profe.click('text=Abrir'); await profe.waitForTimeout(500);
  log('clave profe mala →', await profe.textContent('#admin-mensaje'));
  await profe.fill('#admin-clave', 'profe-local-prueba'); await profe.click('text=Abrir'); await profe.waitForTimeout(500);
  await profe.fill('#admin-alias', 'Iryna'); await profe.click('text=Crear clave'); await profe.waitForTimeout(700);
  const codigo = (await profe.textContent('#admin-codigo-texto')).trim();
  log('clave creada (formato):', /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(codigo));
  await profe.screenshot({ path: '/workspace/shot-profe.png' });

  // DISPOSITIVO 1: ya tenía progreso sin clave
  const d1 = await mk('d1', { state: JSON.stringify({ name: 'Iryna', age: 8, country: 'Ucrania', hobby: 'futbol', level: 1, xp: 120 }) });
  log('d1 botón cuenta (sin clave):', (await d1.textContent('#cuenta-btn')).trim());
  await hablar(d1);
  log('d1 intentos locales antes de entrar:', await intentos(d1), 'xp', await d1.textContent('#xp-text-display'));
  await login(d1, codigo.toLowerCase());
  log('d1 tras entrar: botón', (await d1.textContent('#cuenta-btn')).trim(), '| xp', await d1.textContent('#xp-text-display'), '| intentos', await intentos(d1), '| audio local conservado:', await d1.evaluate(() => audioAll().then(a => a.length)));
  await d1.waitForTimeout(500);

  // DISPOSITIVO 2: nuevo
  const d2 = await mk('d2');
  log('d2 setup visible (nuevo):', await d2.isVisible('#setup-modal'));
  await login(d2, codigo, true);
  log('d2 tras entrar: setup visible', await d2.isVisible('#setup-modal'), '| nombre', await d2.textContent('#header-name'), '| xp', await d2.textContent('#xp-text-display'), '| intentos', await intentos(d2), '| audioId de intentos remotos:', await d2.evaluate(() => hablaData.intentos.map(i => i.audioId)));
  await hablar(d2);
  await d2.waitForTimeout(3500); // debounce de sync
  const xp2 = await d2.textContent('#xp-text-display');
  await d1.evaluate(() => sincronizar()); await d1.waitForTimeout(800);
  log('d1 tras sync: intentos', await intentos(d1), '| xp', await d1.textContent('#xp-text-display'), '(d2 xp', xp2 + ')');
  await d1.click('#tab-btn-progreso'); await d1.waitForTimeout(400);
  log('d1 progreso resumen:', (await d1.textContent('#prog-resumen')).replace(/\s+/g, ' ').trim().slice(0, 120));

  // DISPOSITIVO 3: debe rechazarse
  const d3 = await mk('d3');
  await d3.click('text=🔑 Ya tengo una clave'); await d3.fill('#login-codigo', codigo); await d3.click('#login-boton'); await d3.waitForTimeout(800);
  log('d3 →', await d3.textContent('#login-mensaje'));
  await d3.screenshot({ path: '/workspace/shot-limite.png' });

  // PROFE: lista y libera d2
  await profe.click('text=Actualizar lista'); await profe.waitForTimeout(600);
  log('profe lista:', (await profe.textContent('#admin-lista')).replace(/\s+/g, ' ').trim().slice(0, 160));
  const idD2 = await d2.evaluate(() => localStorage.getItem('ligaHablaDispositivo'));
  await profe.evaluate(id => { const n = document.getElementById('admin-lista')._ninos[0]; return adminLiberar(n.id, id); }, idD2); await profe.waitForTimeout(600);
  await d2.evaluate(() => sincronizar()); await d2.waitForTimeout(800);
  log('d2 tras liberar: bloqueo visible', await d2.isVisible('#bloqueo-modal'), '| datos locales siguen:', await intentos(d2));
  await d2.screenshot({ path: '/workspace/shot-bloqueo.png' });
  await d3.fill('#login-codigo', codigo);
  await Promise.all([d3.waitForLoadState('load').catch(() => {}), d3.click('#login-boton')]); await d3.waitForTimeout(1800);
  log('d3 ahora entra:', (await d3.textContent('#cuenta-btn')).trim(), '| intentos', await intentos(d3));

  // d3 borra todo el historial → se propaga a d1
  await d3.click('#tab-btn-progreso'); await d3.click('text=Borrar todo el progreso al hablar'); await d3.waitForTimeout(1200);
  await d1.evaluate(() => sincronizar()); await d1.waitForTimeout(800);
  log('tras borrar historial en d3: d3', await intentos(d3), 'd1', await intentos(d1), '| audio d1', await d1.evaluate(() => audioAll().then(a => a.length)));

  // PROFE: nueva clave → d1 y d3 bloqueados
  await profe.evaluate(() => adminRegenerar(document.getElementById('admin-lista')._ninos[0].id)); await profe.waitForTimeout(700);
  const codigo2 = (await profe.textContent('#admin-codigo-texto')).trim();
  await d1.evaluate(() => sincronizar()); await d1.waitForTimeout(800);
  log('d1 tras nueva clave: bloqueo', await d1.isVisible('#bloqueo-modal'), '| clave nueva distinta', codigo2 !== codigo);
  await d1.click('#bloqueo-modal >> text=🔑 Entrar con mi clave'); await d1.fill('#login-codigo', codigo);
  await d1.click('#login-boton'); await d1.waitForTimeout(800);
  log('d1 clave vieja →', await d1.textContent('#login-mensaje'));
  await d1.fill('#login-codigo', codigo2);
  await Promise.all([d1.waitForLoadState('load').catch(() => {}), d1.click('#login-boton')]); await d1.waitForTimeout(1800);
  log('d1 con clave nueva: bloqueo', await d1.isVisible('#bloqueo-modal'), '| nombre', await d1.textContent('#header-name'));

  // d1 cierra sesión
  await d1.click('#cuenta-btn'); 
  await Promise.all([d1.waitForLoadState('load').catch(() => {}), d1.click('text=Cerrar sesión')]); await d1.waitForTimeout(1500);
  log('d1 tras cerrar sesión: setup visible', await d1.isVisible('#setup-modal'), '| localStorage', await d1.evaluate(() => Object.keys(localStorage).sort().join(',')), '| audio', await d1.evaluate(() => audioAll().then(a => a.length)));
  await profe.click('text=Actualizar lista'); await profe.waitForTimeout(500);
  log('profe dispositivos tras cerrar sesión d1:', await profe.evaluate(() => document.getElementById('admin-lista')._ninos[0].dispositivos.length));

  // PROFE borra al niño
  await profe.evaluate(() => adminBorrar(document.getElementById('admin-lista')._ninos[0].id)); await profe.waitForTimeout(700);
  log('profe tras borrar:', (await profe.textContent('#admin-lista')).trim(), '|', await profe.textContent('#admin-mensaje'));

  // Modo solo local sigue funcionando sin servidor de claves
  log('\ndiálogos:', dialogs);
  log('errores JS:', errors.filter(e => !/favicon/.test(e)));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
