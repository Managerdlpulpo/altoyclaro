// Prueba en navegador: un ALUMNO no puede entrar en el «Panel del Profesor» (solo ve el candado y la clave del profe)
// y el juego de penalty varía las preguntas (nivel 0 + tema Naturaleza: 20 seguidas sin repetir la anterior).
// Requiere: node test/servidor-local.mjs 8811 (con ALTOYCLARO_CLAVE=profe-local-prueba) y playwright-core + Chrome.
// Uso: node test/e2e-panel-alumno.cjs   (CAPTURAS=1 guarda capturas y el registro de preguntas en /workspace)
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = process.env.BASE || 'http://localhost:8811/';
const CLAVE_PROFE = process.env.CLAVE_PROFE || 'profe-local-prueba';
const CAPTURAS = !!process.env.CAPTURAS;
let fallos = 0;
const ok = (cond, msg, extra = '') => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg + (extra ? '  ' + extra : '')); if (!cond) fallos++; };

(async () => {
  // El profe (clave local de pruebas) crea la clave de la alumna
  const r = await fetch(BASE + 'api/admin', { method: 'POST', headers: { 'content-type': 'application/json', 'x-clave-profe': CLAVE_PROFE }, body: JSON.stringify({ accion: 'crear', alias: 'Nury' }) });
  const codigo = (await r.json()).codigo;
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|unsplash|ERR_|status of (401|403|404)/.test(m.text())) errores.push(m.text()); });
  p.on('dialog', d => d.accept());
  const peticionesAdmin = [];
  p.on('request', q => { if (q.url().includes('/api/admin')) peticionesAdmin.push(q.postData() || ''); });

  console.log('Panel del profe con sesión de alumno');
  await p.goto(BASE);
  await p.waitForSelector('#login-codigo', { state: 'visible', timeout: 15000 });
  await p.fill('#login-codigo', codigo);
  await Promise.all([p.waitForEvent('load').catch(() => { }), p.click('#login-boton')]);
  await p.waitForFunction(() => typeof rolActual !== 'undefined' && rolActual === 'nino', null, { timeout: 15000 });
  await p.waitForTimeout(500);
  await p.evaluate(() => { gameState.name = 'Nury'; finishSetup(); gameState.level = 0; gameState.tema = 'naturaleza'; saveState(); updateHUD(); });
  await p.waitForTimeout(400);
  ok(await p.evaluate(() => rolActual) === 'nino', 'sesión de alumna (Nury, nivel 0, Naturaleza)');

  // Abre el engranaje del profe: solo candado + clave del profe
  await p.click('#profe-btn'); await p.waitForTimeout(400);
  const vis = s => p.locator(s).isVisible();
  ok(await vis('#teacher-bloqueo'), 'se ve el candado «solo para el profe»');
  ok(await vis('#admin-clave'), 'se pide la clave del profe');
  ok(!(await vis('#teacher-controles')) && !(await vis('#override-level')) && !(await vis('#btn-repetir-test')) && !(await vis('#btn-ver-test')), 'no se ven cambiar nivel, repetir test ni resultados');
  ok(!(await vis('#admin-panel')) && !(await vis('#admin-titulo')), 'no se ve la gestión de claves');
  ok(!(await p.locator('#teacher-modal #voz-select').count()), 'la voz ya no está en el panel del profe');
  if (CAPTURAS) await p.screenshot({ path: '/workspace/shot-alumno-sin-panel.png' });
  // Aunque llame a las funciones a mano, no cambian nada
  const antes = await p.evaluate(() => JSON.stringify({ l: gameState.level, xp: gameState.xp, n: gameState.name }));
  await p.evaluate(() => { const s = document.getElementById('override-level'); s.value = '3'; overrideLevel(); try { repetirTestNivel(); } catch (e) { } resetAll(); });
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => typeof rolActual !== 'undefined' && rolActual === 'nino'), 'resetAll no reinicia ni cierra sin el profe');
  ok(await p.evaluate(() => JSON.stringify({ l: gameState.level, xp: gameState.xp, n: gameState.name })) === antes, 'overrideLevel / repetirTestNivel / resetAll no hacen nada');
  ok(await p.evaluate(() => document.getElementById('test-nivel-modal') ? document.getElementById('test-nivel-modal').classList.contains('hidden') : true), 'el test de nivel no se abre');
  // Directamente contra el servidor con la cookie de la alumna: 401
  const directo = await p.evaluate(async () => (await fetch('/api/admin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accion: 'listar' }) })).status);
  ok(directo === 401, 'POST /api/admin con la cookie de la alumna → 401', String(directo));
  // Clave incorrecta: sigue cerrado
  await p.fill('#admin-clave', 'clave-equivocada'); await p.click('#admin-login button'); await p.waitForTimeout(700);
  ok(await vis('#teacher-bloqueo') && !(await vis('#teacher-controles')), 'clave incorrecta: sigue cerrado');
  if (CAPTURAS) await p.screenshot({ path: '/workspace/shot-panel-candado.png' });
  // Clave correcta del profe (local de pruebas): se abre
  await p.fill('#admin-clave', CLAVE_PROFE); await p.click('#admin-login button'); await p.waitForTimeout(900);
  ok(!(await vis('#teacher-bloqueo')) && await vis('#teacher-controles') && await vis('#admin-panel'), 'con la clave del profe se abre el panel');
  // Al cerrar se olvida la clave: al volver a abrir, candado otra vez
  await p.evaluate(() => toggleTeacherModal()); await p.waitForTimeout(200);
  await p.click('#profe-btn'); await p.waitForTimeout(400);
  ok(await vis('#teacher-bloqueo') && !(await vis('#teacher-controles')) && await p.inputValue('#admin-clave') === '', 'al cerrar y volver a abrir: candado otra vez (la clave se olvida)');
  await p.evaluate(() => toggleTeacherModal()); await p.waitForTimeout(200);

  // «Mi clave y ajustes»: voz y salir, sin nada del profe
  await p.evaluate(() => abrirCuenta()); await p.waitForTimeout(400);
  ok(await vis('#cuenta-modal #voz-select') && await vis('#cuenta-modal #voz-grabada'), 'la alumna tiene la voz en «Mi clave y ajustes»');
  ok(/Salir|Cerrar sesión/i.test(await p.textContent('#cuenta-modal')), 'y el botón de salir');
  ok(!/Cambiar nivel|Reiniciar|Repetir test/i.test(await p.textContent('#cuenta-modal')), 'sin controles del profe');
  if (CAPTURAS) await p.screenshot({ path: '/workspace/shot-alumno-ajustes.png' });
  await p.evaluate(() => document.getElementById('cuenta-modal').classList.add('hidden'));
  await p.waitForTimeout(200);

  // Penalty: nivel 0 + Naturaleza, 20 preguntas seguidas
  console.log('Penalty variado (nivel 0, Naturaleza)');
  await p.evaluate(() => switchTab('penalty')); await p.waitForTimeout(300);
  const nat = await p.evaluate(() => visualVocab.filter(v => v.cat === 'Naturaleza').map(v => v.es));
  const lista = [];
  for (let i = 0; i < 20; i++) {
    const q = (await p.textContent('#penalty-spanish-text')).trim();
    const opciones = await p.$$eval('#penalty-options-grid button', bs => bs.map(b => b.textContent.trim()));
    lista.push({ q, opciones });
    // acierta y pasa a la siguiente (después de acertar los botones quedan desactivados)
    await p.click(`#penalty-options-grid button:has-text("${q.replace(/"/g, '\\"')}")`);
    await p.waitForTimeout(150);
    const desact = await p.$$eval('#penalty-options-grid button', bs => bs.every(b => b.disabled));
    if (i === 0) ok(desact, 'tras acertar no se puede volver a pulsar (sin XP repetido)');
    await p.evaluate(() => nextPenalty()); await p.waitForTimeout(100);
  }
  const qs = lista.map(x => x.q);
  const seguidas = qs.filter((q, i) => i && q === qs[i - 1]).length;
  ok(seguidas === 0, '20 preguntas sin repetir nunca la anterior');
  ok(new Set(qs).size >= 15, `${new Set(qs).size} preguntas distintas de 20`);
  ok(qs.filter(q => nat.includes(q)).length >= 2, 'salen palabras de Naturaleza: ' + qs.filter(q => nat.includes(q)).join(', '));
  ok(lista.every(x => x.opciones.length === 3 && new Set(x.opciones).size === 3 && x.opciones.includes(x.q)), '3 opciones distintas con la correcta');
  ok(!qs.some(q => /\s.*\s.*\s/.test(q) && /[.!?]$/.test(q)), 'nivel 0: solo palabras (sin frases largas)');
  const texto = lista.map((x, i) => `${String(i + 1).padStart(2)}. ${x.q}${nat.includes(x.q) ? '  🌿' : ''}    [${x.opciones.join(' | ')}]`).join('\n');
  console.log(texto);
  if (CAPTURAS) {
    fs.writeFileSync('/workspace/penalty-20.txt', 'Penalty – nivel 0, tema Naturaleza (🌿 = palabra de Naturaleza)\n' + texto + `\n\nDistintas: ${new Set(qs).size}/20 · repeticiones seguidas: ${seguidas}\n`);
    await p.evaluate(t => {
      const d = document.createElement('pre'); d.id = 'registro-penalty'; d.textContent = t;
      d.style.cssText = 'white-space:pre-wrap;font-size:11px;background:#0b1220;color:#e2e8f0;padding:8px;border-radius:8px;margin-top:8px';
      document.getElementById('tab-penalty').appendChild(d);
    }, '20 preguntas seguidas (nivel 0, Naturaleza 🌿):\n' + qs.map((q, i) => `${i + 1}. ${q}${nat.includes(q) ? ' 🌿' : ''}`).join('\n'));
    await (await p.$('#tab-penalty')).screenshot({ path: '/workspace/shot-penalty-variedad.png' });
  }
  ok(!peticionesAdmin.some(b => /regenerar|borrar|revocar|crear/.test(b)), 'la página no intentó acciones de admin por su cuenta');
  ok(errores.length === 0, 'sin errores de JavaScript', errores.join(' | '));
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo OK');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
