// Prueba en navegador de «Frases cotidianas» y de las pegatinas, de punta a punta con el servidor local
// (PGlite) y reconocimiento de voz simulado. Comprueba: situaciones y las 3 actividades (repetir, «¿qué dirías
// si…?» y diálogo), que se sincronizan solo puntuaciones, que el servidor da las pegatinas y el niño las celebra
// y las ve en su álbum; el profe ve el aviso, el número en el botón, el motivo, marca «Entregada» (historial)
// e imprime la hoja A4 (todas o solo las pendientes con el nombre).
// Requiere: node test/servidor-local.mjs 8811 recién arrancado (base de datos vacía) (con ALTOYCLARO_CLAVE=profe-local-prueba) y playwright-core + Chrome.
// Uso: node test/e2e-frases.cjs   (CAPTURAS=1 guarda capturas en /workspace)
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8811/';
const CLAVE_PROFE = process.env.CLAVE_PROFE || 'profe-local-prueba';
const CAPTURAS = !!process.env.CAPTURAS;
let fallos = 0;
const ok = (cond, msg, extra = '') => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg + (extra ? '  ' + extra : '')); if (!cond) fallos++; };

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const errores = [];
  const mk = async (nombre, vp = { width: 1100, height: 900 }) => {
    const ctx = await browser.newContext({ viewport: vp, permissions: ['microphone'] });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/favicon|images\.unsplash|ERR_|status of (401|503)/.test(m.text())) errores.push(nombre + ': ' + m.text()); });
    page.on('pageerror', e => errores.push(nombre + ' pageerror: ' + e.message));
    page.on('dialog', d => d.accept());
    await page.addInitScript(() => {
      window.__say = ''; window.__impreso = 0;
      window.print = () => { window.__impreso++; };
      class FakeSR {
        start() { this._v = true; setTimeout(() => { if (!this._v) return; const t = window.__say; if (t) { const r = [{ transcript: t, confidence: 0.9 }]; r.isFinal = true; this.onresult && this.onresult({ resultIndex: 0, results: [r] }); } else this.onerror && this.onerror({ error: 'no-speech' }); this._v = false; setTimeout(() => this.onend && this.onend(), 5); }, 150); }
        stop() { if (this._v) { this._v = false; setTimeout(() => this.onend && this.onend(), 5); } } abort() { this.stop(); }
      }
      window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
    });
    await page.goto(BASE);
    await page.waitForFunction(() => document.getElementById('acceso-cargando') && (document.getElementById('acceso-cargando').classList.contains('hidden') || !document.documentElement.classList.contains('sin-acceso')), null, { timeout: 15000 });
    await page.waitForTimeout(300);
    return page;
  };
  const esperarCarga = p => p.waitForFunction(() => !document.documentElement.classList.contains('sin-acceso') || document.getElementById('acceso-cargando').classList.contains('hidden'), null, { timeout: 15000 }).then(() => p.waitForTimeout(400));

  console.log('Frases cotidianas y pegatinas (navegador)');
  // 1. Profe crea una clave para un niño
  const profe = await mk('profe');
  await profe.click('#acceso-soy-profe'); await profe.fill('#acceso-clave-profe', CLAVE_PROFE);
  await Promise.all([profe.waitForEvent('load'), profe.click('#acceso-profe-boton')]); await esperarCarga(profe);
  await profe.evaluate(() => { gameState.name = 'Profe'; finishSetup(); });
  ok(await profe.isHidden('#pegatinas-btn'), 'profe: no ve el botón de «Mis pegatinas» (es del niño)');
  await profe.click('button[title^="Panel del profe"]');
  await profe.fill('#admin-alias', 'Iryna'); await profe.click('text=Crear clave'); await profe.waitForTimeout(700);
  const codigo = (await profe.textContent('#admin-codigo-texto')).trim();
  ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(codigo), 'profe crea la clave de prueba');
  await profe.waitForSelector('#admin-pegatinas :text("No hay pegatinas pendientes")', { timeout: 5000 }).catch(() => {});
  ok(/No hay pegatinas pendientes/.test(await profe.textContent('#admin-pegatinas')), 'al principio no hay pegatinas por entregar');

  // 2. El niño entra
  const nino = await mk('niño');
  const envios = [];
  nino.on('request', r => { if (r.url().endsWith('/api/sync')) envios.push(r.postData() || ''); });
  await nino.fill('#login-codigo', codigo);
  await Promise.all([nino.waitForEvent('load', { timeout: 8000 }).catch(() => {}), nino.click('#login-boton')]); await esperarCarga(nino);
  await nino.evaluate(() => { gameState.name = 'Iryna'; finishSetup(); });
  await nino.waitForTimeout(300);
  await nino.evaluate(() => { new MutationObserver(() => { const b = document.getElementById('pegatina-nueva'); if (b && !b.classList.contains('hidden') && ['repetir','dirias','dialogo'].includes(frVista.modo) && !document.getElementById('fr-dial-fin')) window.__celebradaEnEjercicio = true; }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] }); });
  await nino.click('#tab-btn-frases');
  ok(await nino.locator('#fr-situaciones .fr-sit').count() === 6, '6 situaciones del cole');
  await nino.click('.fr-sit[data-sit="llegar"]');
  ok(await nino.isVisible('#fr-act-repetir') && await nino.isVisible('#fr-act-dirias') && await nino.isVisible('#fr-act-dialogo'), 'cada situación tiene 3 actividades');

  // 2a. Escucha y repite: 3 frases bien y una mal
  await nino.click('#fr-act-repetir');
  for (let k = 0; k < 3; k++) {
    const t = await nino.textContent('#fr-texto');
    await nino.evaluate(t => { window.__say = t.replace(/[¡!¿?.,]/g, ''); }, t);
    await nino.click('#fr-hablar'); await nino.waitForSelector('#fr-resultado :text("Muy bien")', { timeout: 4000 }).catch(() => {});
    ok(/Muy bien/.test(await nino.textContent('#fr-resultado')), `repite «${t}» → ¡Muy bien! y palabras en verde`);
    if (k === 0 && CAPTURAS) await nino.screenshot({ path: '/workspace/shot-frases.png' });
    await nino.click('#fr-siguiente');
  }
  await nino.evaluate(() => { window.__say = 'me gusta el chocolate'; });
  await nino.click('#fr-hablar'); await nino.waitForTimeout(700);
  ok(/practicar|Casi/.test(await nino.textContent('#fr-resultado')), 'frase distinta → «¡A practicar!» (no cuenta)');
  const regs = await nino.evaluate(() => frasesData.registros.map(r => ({ fid: r.fid, ok: r.ok, act: r.act })));
  ok(regs.length === 4 && regs.filter(r => r.ok).length === 3, 'se guardan 4 intentos, 3 bien', JSON.stringify(regs));

  // 2b. ¿Qué dirías si…?
  await nino.click('text=← Llegar a clase'); await nino.click('#fr-act-dirias');
  const r0 = await nino.evaluate(() => frListaDirias()[0].r);
  await nino.evaluate(t => { window.__say = t; }, r0);
  await nino.click('#fr-hablar'); await nino.waitForTimeout(700);
  ok(/Muy bien|bien/i.test(await nino.textContent('#fr-resultado')), '«¿Qué dirías si…?» con una respuesta adecuada → bien');

  // 2c. Diálogo
  await nino.click('text=← Llegar a clase'); await nino.click('#fr-act-dialogo');
  const turnos = await nino.evaluate(() => FR_DIALOGOS.find(d => d.sit === 'llegar').turnos.map(t => t.nino));
  for (const t of turnos) {
    await nino.evaluate(t => { window.__say = t; }, t);
    await nino.waitForSelector('#fr-hablar', { timeout: 3000 }).catch(() => {});
    if (!(await nino.$('#fr-hablar'))) break;
    await nino.click('#fr-hablar'); await nino.waitForTimeout(1300);
  }
  ok(await nino.isVisible('#fr-dial-fin') && /3 de 3/.test(await nino.textContent('#fr-dial-fin')), 'diálogo completo: 3 de 3 respuestas bien');
  ok(await nino.locator('.fr-turno-nino').count() === 3, 'las respuestas del niño aparecen en el chat');

  // (la sincronización automática ya pudo dar la pegatina durante los ejercicios: la celebración espera)
  ok(await nino.evaluate(() => !window.__celebradaEnEjercicio), 'la celebración no interrumpe un ejercicio a medias');
  // 3. Sincronizar → el servidor da la pegatina «hola» (3 frases de «Llegar a clase»)
  await nino.evaluate(() => sincronizar()); await nino.waitForTimeout(2600);
  const cuerpo = envios.map(e => { try { return JSON.parse(e); } catch (_) { return {}; } }).find(e => Array.isArray(e.frases) && e.frases.length);
  ok(cuerpo && cuerpo.frases.every(f => Object.keys(f).sort().join() === 'act,fid,id,metodo,ok,score,sit,t'), 'al servidor solo van ids y puntuaciones de las frases');
  ok(!envios.join('').includes('chocolate') && !envios.join('').includes('Buenos'), 'lo que se oyó no sale del dispositivo');
  ok(await nino.isVisible('#pegatina-nueva') && await nino.locator('#pegatina-nueva svg[data-pegatina="hola"]').count() === 1, 'celebración: «¡Nueva pegatina!» con la de «Llegar a clase»');
  await nino.click('#pegatina-nueva-ok');
  ok((await nino.textContent('#pegatinas-cuenta')).trim() !== '0', 'el botón 🏅 cuenta las pegatinas');
  await nino.click('#pegatinas-btn');
  ok(await nino.locator('.peg-album-item').count() === 19 && await nino.locator('.peg-album-item[data-conseguida="1"][data-pegatina="hola"]').count() === 1, 'álbum: 19 pegatinas, «hola» conseguida y las demás bloqueadas');
  await nino.click('#pegatinas-modal button[aria-label="Cerrar"]');
  await nino.click('#tab-btn-progreso');
  ok(/Llegar a clase/.test(await nino.textContent('#prog-frases')), '«Mi progreso» muestra el avance por situación');

  // 4. Profe: aviso al entrar, número en el botón, motivo y «Entregada»
  await profe.reload(); await esperarCarga(profe); await profe.waitForTimeout(800);
  ok(await profe.isVisible('#aviso-pegatinas') && /pegatina/.test(await profe.textContent('#aviso-pegatinas')), 'profe: aviso al entrar «Tienes N pegatina(s) por entregar»');
  const badge = (await profe.textContent('#badge-pegatinas')).trim();
  ok(await profe.isVisible('#badge-pegatinas') && +badge >= 1, 'número de pendientes en el botón del panel', badge);
  await profe.click('#aviso-pegatinas >> text=Ver'); await profe.waitForTimeout(900);
  const fila = profe.locator('.peg-pendiente[data-pegatina="hola"]');
  ok(await fila.count() === 1 && /Iryna/.test(await fila.textContent()), 'pendiente: alias, pegatina y fecha');
  ok(/3 frases/.test(await fila.locator('.peg-motivo').textContent()), 'motivo concreto', await fila.locator('.peg-motivo').textContent());
  if (CAPTURAS) { await profe.locator('#admin-pegatinas-bloque').scrollIntoViewIfNeeded(); await profe.locator('#teacher-modal > div').screenshot({ path: '/workspace/shot-pegatinas-profe.png' }); }

  // 5. Imprimir: pendientes (con nombre) y todas
  await profe.click('#peg-imprimir-pend'); await profe.waitForTimeout(500);
  ok(await profe.evaluate(() => window.__impreso) === 1, 'se abre el diálogo de imprimir');
  await profe.emulateMedia({ media: 'print' });
  const vista = await profe.evaluate(() => {
    const vis = el => el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none';
    return { visibles: [...document.body.children].filter(vis).map(e => e.id || e.tagName), items: document.querySelectorAll('#hoja-pegatinas .hoja-item').length,
      nombre: document.querySelector('#hoja-pegatinas .hoja-nombre').textContent, barra: vis(document.querySelector('#hoja-pegatinas .hoja-barra')),
      ancho: document.querySelector('#hoja-pegatinas .hoja-item svg').getBoundingClientRect().width };
  });
  ok(vista.visibles.join() === 'hoja-pegatinas' && !vista.barra, 'al imprimir solo sale la hoja de pegatinas', JSON.stringify(vista.visibles));
  ok(vista.nombre === 'Iryna' && vista.items >= 1, 'pendientes: con el nombre del niño debajo');
  ok(Math.abs(vista.ancho - 189) < 3, 'tamaño real: 5 cm (189 px a 96 ppp)', String(vista.ancho));
  await profe.emulateMedia({ media: 'screen' });
  await profe.click('#hoja-pegatinas >> text=Cerrar');
  ok(await profe.isVisible('#teacher-modal'), 'al cerrar la hoja se vuelve al panel');
  await profe.click('#peg-imprimir-todas'); await profe.waitForTimeout(400);
  ok(await profe.locator('#hoja-pegatinas .hoja-item').count() === 19, 'hoja con todas: 19 pegatinas');
  if (CAPTURAS) { await profe.emulateMedia({ media: 'print' }); await profe.screenshot({ path: '/workspace/shot-pegatinas-imprimir.png', fullPage: true }); await profe.emulateMedia({ media: 'screen' }); }
  await profe.click('#hoja-pegatinas >> text=Cerrar');
  if (await profe.isHidden('#teacher-modal')) await profe.click('button[title^="Panel del profe"]');
  await profe.waitForTimeout(300);
  const antes = +(await profe.textContent('#badge-pegatinas')).trim();
  await profe.click('.peg-pendiente[data-pegatina="hola"] .peg-entregar'); await profe.waitForTimeout(900);
  ok(await profe.locator('.peg-pendiente[data-pegatina="hola"]').count() === 0, '«Entregada» la quita de pendientes');
  ok(/Iryna/.test(await profe.textContent('#peg-historial')), 'y pasa al historial de entregadas');
  const despues = (await profe.isVisible('#badge-pegatinas')) ? +(await profe.textContent('#badge-pegatinas')).trim() : 0;
  ok(despues === antes - 1, 'el número del botón baja', `${antes} → ${despues}`);

  // 6. El niño ve que ya la tiene en papel
  await nino.evaluate(() => sincronizar()); await nino.waitForTimeout(800);
  await nino.click('#pegatinas-btn');
  ok(/Ya la tienes en papel/.test(await nino.textContent('.peg-album-item[data-pegatina="hola"]')), 'álbum del niño: «Ya la tienes en papel»');

  ok(errores.length === 0, 'sin errores en la consola', errores.join(' | '));
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
