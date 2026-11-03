// Prueba en navegador de «Leo en voz alta» y del tema favorito, con reconocimiento de voz simulado
// (modo continuo, resultados parciales y finales progresivos). Comprueba: lista de cuentos y desbloqueo,
// lectura en directo, resultado de colores y métricas, preguntas, guardado y sincronización (solo
// puntuaciones), lectura parcial, modo adulto con cronómetro, gráficas en «Mi progreso» y que el tema
// cambia colores, mascota y el orden de las palabras.  Requiere: node test/servidor-local.mjs 8811
// y playwright-core + Chrome.   Uso: node test/e2e-lectura.cjs  (CAPTURAS=1 guarda capturas en /workspace)
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8811/';
const CAPTURAS = !!process.env.CAPTURAS;
let fallos = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg); if (!cond) fallos++; };

// Reconocimiento falso. Continuo: lee window.__guion = { texto, cada (palabras por evento), ms }
// y va emitiendo la lista completa de resultados (finales + el último parcial), como Chrome.
// No continuo (respuestas a preguntas): devuelve window.__respuesta.
function srFalso() {
  window.__guion = null; window.__respuesta = ''; window.__srUsos = 0;
  class FakeSR {
    start() {
      window.__srUsos++;
      this._vivo = true;
      if (!this.continuous) {
        setTimeout(() => {
          if (!this._vivo) return;
          const t = window.__respuesta;
          if (!t) { this.onerror && this.onerror({ error: 'no-speech' }); this._fin(); return; }
          const res = [{ transcript: t, confidence: 0.9 }]; res.isFinal = true;
          this.onresult && this.onresult({ resultIndex: 0, results: [res] });
          this._fin();
        }, 120);
        return;
      }
      const g = window.__guion || { texto: '' };
      const pal = g.texto.split(/\s+/).filter(Boolean);
      const cada = g.cada || 4, ms = g.ms || 120;
      let n = 0;
      setTimeout(() => this.onspeechstart && this.onspeechstart(), 30);
      const paso = () => {
        if (!this._vivo) return;
        n = Math.min(pal.length, n + cada);
        const lista = [];
        for (let i = 0; i < n; i += cada * 2) {
          const trozo = pal.slice(i, Math.min(n, i + cada * 2)).join(' ');
          const r = [{ transcript: trozo, confidence: 0.9 }];
          r.isFinal = i + cada * 2 <= n || n === pal.length;
          lista.push(r);
        }
        this.onresult && this.onresult({ resultIndex: 0, results: lista });
        if (n < pal.length) this._t = setTimeout(paso, ms);
      };
      if (pal.length) this._t = setTimeout(paso, 100);
    }
    _fin() { if (this._vivo) { this._vivo = false; clearTimeout(this._t); setTimeout(() => this.onend && this.onend(), 5); } }
    stop() { this._fin(); } abort() { this._fin(); }
  }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
}
function sinSR() { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true }); }

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const errores = [];
  async function nueva(nombre, { sr = true, nino = false } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 }, permissions: ['microphone'] });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/favicon|images\.unsplash|ERR_|status of 503/.test(m.text())) errores.push(nombre + ': ' + m.text()); });
    page.on('pageerror', e => errores.push(nombre + ' pageerror: ' + e.message));
    await page.addInitScript(sr ? srFalso : sinSR);
    page.__envios = [];
    await page.route('**/api/acceso', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(nino ? { ok: true, nino: { id: 'n1', alias: 'Prueba' }, profe: false } : { ok: true, nino: null, profe: true }) }));
    await page.route('**/api/admin', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"ninos":[],"pendientes":[],"entregadas":[]}' })); // sesión de profe simulada: panel vacío
    await page.route('**/api/sync', async r => { page.__envios.push(r.request().postData() || ''); await r.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"mensaje":"prueba"}' }); });
    await page.goto(BASE);
    await page.waitForFunction(() => typeof finishSetup === 'function' && typeof renderLectura === 'function');
    await page.waitForTimeout(300);
    await page.evaluate(() => { gameState.name = 'Lucía'; finishSetup(); });
    await page.waitForTimeout(300);
    return { ctx, page };
  }

  // ---------- 1. Tema favorito ----------
  console.log('Tema favorito');
  {
    const { ctx, page } = await nueva('tema');
    ok(await page.locator('#tema-btn').isVisible(), 'botón de tema visible en la cabecera');
    const antes = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ac-600').trim());
    await page.click('#tema-btn');
    await page.waitForSelector('#tema-modal:not(.hidden)');
    ok(await page.locator('#tema-opciones button').count() === 13, 'el selector ofrece 13 temas (6 de siempre + 7 países)');
    ok(await page.locator('#tema-opciones .tema-titulo-paises').isVisible(), 'título «Países del mundo» en el selector');
    for (const pais of ['China', 'Ucrania', 'Rusia', 'Marruecos', 'Rumanía', 'Colombia', 'España'])
      ok(await page.locator('#tema-opciones button', { hasText: pais }).count() === 1, 'tema de país: ' + pais);
    await page.locator('#tema-opciones button', { hasText: 'Fútbol' }).click();
    await page.waitForTimeout(400);
    const f = await page.evaluate(() => ({
      v: getComputedStyle(document.documentElement).getPropertyValue('--ac-600').trim(), tema: gameState.tema,
      masc: document.getElementById('header-mascota').textContent, attr: document.documentElement.dataset.tema || document.body.dataset.tema,
      orden: identOrden.slice(0, 9).map(i => visualVocab[i] ? visualVocab[i].cat : i && i.cat),
      guardado: JSON.parse(localStorage.getItem('ligaHablaPro_v2') || localStorage.getItem(Object.keys(localStorage).find(k => /ligaHabla/.test(k) && /tema/.test(localStorage.getItem(k) || '')) || '{}') || '{}').tema
    }));
    ok(f.tema === 'futbol' && f.v && f.v !== antes, 'fútbol: cambia el color principal (' + antes + ' → ' + f.v + ')');
    ok(f.masc.includes('⚽'), 'fútbol: mascota ⚽ en la cabecera');
    ok(f.attr === 'futbol', 'atributo data-tema');
    ok(f.orden.filter(c => c === 'Fútbol').length >= 3, 'Identificar: 1 de cada 3 palabras es de fútbol (' + f.orden.join(',') + ')');
    if (CAPTURAS) await page.screenshot({ path: '/workspace/shot-tema-futbol.png' });
    await page.evaluate(() => elegirTema('animales'));
    await page.waitForTimeout(400);
    const a = await page.evaluate(() => ({ v: getComputedStyle(document.documentElement).getPropertyValue('--ac-600').trim(), masc: document.getElementById('header-mascota').textContent, cel: temaCelebracion() }));
    ok(a.v !== f.v && a.masc.includes('🐶'), 'animales: otro color y mascota 🐶');
    ok(/Guau|selva/.test(a.cel), 'animales: celebración propia («' + a.cel + '»)');
    if (CAPTURAS) await page.screenshot({ path: '/workspace/shot-tema-animales.png' });
    // Hablar «Todas» y Diccionario
    const h = await page.evaluate(() => { switchTab('hablar'); return typeof hablaOrdenNuevo === 'function' ? hablaOrdenNuevo().slice(0, 9).map(v => v.cat) : []; });
    ok(h.filter(c => c === 'Animales').length >= 3, 'Hablar (Todas): prioridad a animales');
    await page.evaluate(() => switchTab('identificar'));
    await page.reload(); await page.waitForTimeout(800);
    ok(await page.evaluate(() => gameState.tema) === 'animales', 'el tema se conserva al recargar');
    await ctx.close();
  }

  // ---------- 1b. Temas de países (en el móvil) ----------
  console.log('Temas de países');
  {
    const { ctx, page } = await nueva('paises');
    await page.setViewportSize({ width: 412, height: 900 });
    await page.click('#tema-btn');
    await page.waitForSelector('#tema-modal:not(.hidden)');
    await page.locator('#tema-opciones .tema-titulo-paises').scrollIntoViewIfNeeded();
    if (CAPTURAS) await page.screenshot({ path: '/workspace/shot-temas-paises.png' });
    await page.locator('#tema-opciones button', { hasText: 'China' }).click();
    await page.waitForTimeout(400);
    const c = await page.evaluate(() => ({ tema: gameState.tema, masc: document.getElementById('header-mascota').textContent, bienv: document.getElementById('welcome-tema').innerText,
      orden: identOrden.slice(0, 9).map(i => i && i.cat), cel: temaCelebracion(),
      pen: typeof penBanco === 'function' ? penBanco(0, { vocab: visualVocab }).filter(x => x.cat === 'China').length : -1,
      rec: lecRecomendado(0, {}, 'china', false) }));
    ok(c.tema === 'china' && c.masc.includes('🐼'), 'China: mascota 🐼');
    ok(/cuentos de China/.test(c.bienv), 'bienvenida: «más palabras y cuentos de China»');
    ok(c.orden.filter(x => x === 'China').length >= 3, 'Identificar: 1 de cada 3 fotos es de China (' + c.orden.join(',') + ')');
    ok(/panda|Muralla/.test(c.cel), 'celebración propia («' + c.cel + '»)');
    ok(c.pen === 5, 'penalty: las 5 palabras de China están en el banco');
    ok(c.rec && c.rec.id === 'l0-panda', 'cuento recomendado: ' + (c.rec && c.rec.titulo));
    // Una foto del tema en Identificar
    const idx = await page.evaluate(() => { const i = identOrden.findIndex(v => v.es === 'la Gran Muralla'); currentIdentIndex = i; renderIdentificar(); return i; });
    await page.waitForFunction(() => { const im = document.getElementById('ident-image'); return im.complete && im.naturalWidth > 0; });
    ok(idx >= 0 && /gran-muralla\.jpg$/.test(await page.getAttribute('#ident-image', 'src')), 'Identificar: foto de la Gran Muralla');
    ok(await page.evaluate(() => document.getElementById('ident-category').textContent) === 'China', 'Identificar: categoría China');
    if (CAPTURAS) { await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: '/workspace/shot-tema-pais.png' }); }
    // Hablar: China tiene su propia categoría (la primera tras «Todas»)
    const cats = await page.evaluate(() => { switchTab('hablar'); return [...document.querySelectorAll('#habla-categorias button')].map(b => b.innerText); });
    ok(cats.length > 1 && /China/.test(cats[1]), 'Hablar: categoría «🇨🇳 China» justo después de «Todas» (' + cats.slice(0, 3).join(' | ') + ')');
    // Todas las fotos de países cargan
    const rotas = await page.evaluate(async () => { const r = []; for (const v of visualVocab.filter(x => /^img\//.test(x.img))) { await new Promise(res => { const im = new Image(); im.onload = () => res(); im.onerror = () => { r.push(v.es); res(); }; im.src = v.img; }); } return r; });
    ok(rotas.length === 0, 'todas las fotos locales cargan' + (rotas.length ? ': ' + rotas.join(', ') : ''));
    await ctx.close();
  }

  // ---------- 2. Lectura con reconocimiento (niño con clave: comprobamos lo que se sincroniza) ----------
  console.log('Leo en voz alta');
  {
    const { ctx, page } = await nueva('lectura', { nino: true });
    await page.evaluate(() => elegirTema('animales'));
    await page.click('#tab-btn-lectura');
    await page.waitForSelector('#lectura-app .lec-tarjeta');
    ok(!(await page.content()).toLowerCase().includes('youtube'), 'ya no hay enlaces a YouTube');
    const tarjetas = await page.locator('.lec-tarjeta').count();
    ok(tarjetas === 26, '26 cuentos en la lista (' + tarjetas + ')');
    const cerrados = await page.locator('.lec-tarjeta', { hasText: '🔒' }).count();
    ok(cerrados > 0, 'hay cuentos bloqueados para el niño (' + cerrados + ')');
    const rec = await page.evaluate(() => lecRecomendado(lecNivel(), lecMejores(), lecTemaClave(), false));
    ok(rec && rec.tema === 'animales', 'cuento recomendado de su tema: ' + (rec && rec.titulo));
    await page.click('#lec-recomendado');
    await page.waitForSelector('#lec-texto .lec-w');
    const cuento = await page.evaluate(() => lecCuento(lecCuentoId));
    // Lee todo bien salvo una palabra parecida (3.ª) y repite otra
    const palabras = cuento.texto.join(' ').replace(/[«»¿?¡!.,;:]/g, '').split(/\s+/);
    const kd = palabras.findIndex((p, i) => i >= 2 && p.length === 4 && /^[a-z]/.test(p));
    const tercera = palabras[kd];
    palabras[kd] = (tercera[0] === 'p' ? 'b' : 'p') + tercera.slice(1); // «gato» → «pato»
    const kr = kd + 2; palabras.splice(kr + 1, 0, palabras[kr]);      // repite una palabra
    await page.check('#lec-guardar-audio');
    await page.evaluate(t => { window.__guion = { texto: t, cada: 2, ms: 600 }; }, palabras.join(' '));
    await page.click('#lec-empezar');
    await page.waitForTimeout(1500);
    ok(await page.locator('#lec-texto .lec-actual').count() === 1, 'en directo se marca la palabra por la que va');
    ok(await page.locator('#lec-texto .lec-b').count() > 2, 'en directo se colorean las palabras ya leídas');
    if (CAPTURAS) await page.screenshot({ path: '/workspace/shot-lectura.png' });
    await page.waitForSelector('#lec-resultado', { timeout: 20000 });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => ({ ...lecRes.met, e: lecRes.estados.join('') }));
    ok(r.compl === 100, 'leído 100 %');
    ok(r.prec === 100 && r.pron < 100, 'precisión ' + r.prec + ' % (con dudas cuenta como leída) y pronunciación ' + r.pron + ' %');
    ok(r.e[kd] === 'd', 'la palabra «' + tercera + '» sale «con dudas»');
    ok(r.ppm > 60 && r.ppm < 300, 'PCPM ' + r.ppm + ' (≈ ritmo simulado)');
    ok(r.repeticiones >= 1, 'la palabra repetida cuenta como repetición (' + r.repeticiones + '), no como error');
    ok(r.est >= 2, 'estrellas: ' + r.est);
    ok(await page.locator('#lec-texto-res .lec-d').count() === 1, 'texto coloreado con 1 palabra amarilla');
    ok(await page.locator('#lec-leyenda').isVisible(), 'leyenda de colores');
    ok(/⭐/.test(await page.locator('#lec-resultado').innerText()), 'estrellas para el niño');
    ok(await page.locator('#lec-profe').count() === 1, 'detalle para el profe');
    if (CAPTURAS) { await page.evaluate(() => { const d = document.getElementById('lec-profe'); if (d) d.open = true; }); await page.screenshot({ path: '/workspace/shot-lectura-resultado.png', fullPage: true }); await page.evaluate(() => { document.getElementById('lec-profe').open = false; }); }
    // Palabras para practicar: la dudosa sale con 🔊 y se puede volver a intentar sola
    const dif = page.locator('#lec-dificiles');
    ok(await dif.isVisible() && /Palabras para practicar/.test(await dif.innerText()), 'tarjeta «Palabras para practicar»');
    const fila = page.locator('#lec-dificiles .lec-pal', { hasText: tercera });
    ok(await fila.count() === 1, 'sale la palabra que costó: «' + tercera + '»');
    ok(await fila.locator('.lec-pal-oir').count() === 1 && await fila.locator('.lec-pal-probar').count() === 1, 'con botón 🔊 para oírla y 🎙️ para probar');
    await fila.locator('.lec-pal-oir').click();
    await page.evaluate(w => { window.__respuesta = 'otra cosa'; }, tercera);
    await fila.locator('.lec-pal-probar').click();
    await page.waitForFunction(() => /Casi/.test((document.querySelector('#lec-dificiles .lec-pal-fb') || {}).textContent || ''), null, { timeout: 8000 });
    ok(true, 'si no la dice bien: «¡Casi!» y puede repetir');
    await page.evaluate(w => { window.__respuesta = w; }, tercera);
    await fila.locator('.lec-pal-probar').click();
    await page.waitForFunction(() => /Conseguido/.test(document.querySelector('#lec-dificiles .lec-pal-probar').textContent), null, { timeout: 8000 });
    ok(await fila.locator('.lec-pal-probar').isDisabled(), 'si la dice bien: «✅ ¡Conseguido!»');
    if (CAPTURAS) { await page.setViewportSize({ width: 412, height: 900 }); await page.evaluate(() => { document.getElementById('lec-dificiles').scrollIntoView({ block: 'start' }); window.scrollBy(0, -330); }); await page.waitForTimeout(300); await page.screenshot({ path: '/workspace/shot-lectura-palabras.png' }); }
    // Preguntas de comprensión: al contestar se ve la correcta y la explicación; no se puede cambiar
    const intro = await page.locator('#lec-preguntas').innerText();
    ok(/Has entendido el cuento/.test(intro) && /\+2 XP/.test(intro), 'presentación de las preguntas con +2 XP por acierto');
    for (let k = 0; k < 3; k++) {
      await page.waitForSelector('#lec-pregunta');
      const q = await page.evaluate(() => lecCuento(lecCuentoId).preguntas[lecRes.preg.i]);
      if (CAPTURAS && k === 0) { await page.evaluate(() => { document.getElementById('lec-preguntas').scrollIntoView({ block: 'start' }); window.scrollBy(0, -100); }); await page.screenshot({ path: '/workspace/shot-lectura-quiz.png' }); }
      // la segunda, mal a propósito
      const elegida = k === 1 ? q.ops.find((o, i) => i !== q.ok) : q.ops[q.ok];
      await page.locator('.lec-op', { hasText: elegida }).first().click();
      await page.waitForSelector('#lec-preg-sig');
      const vista = await page.evaluate(() => ({ fb: document.getElementById('lec-preg-fb').innerText, expl: (document.querySelector('.lec-expl') || {}).innerText || '', des: [...document.querySelectorAll('.lec-op')].every(b => b.disabled) }));
      ok(vista.des, 'pregunta ' + (k + 1) + ': opciones bloqueadas tras contestar');
      ok(vista.expl.includes(q.x), 'pregunta ' + (k + 1) + ': explicación «' + q.x + '»');
      ok(k === 1 ? vista.fb.includes('La respuesta es') && vista.fb.includes(q.ops[q.ok]) : /Correcto/.test(vista.fb), 'pregunta ' + (k + 1) + ': ' + (k === 1 ? 'muestra la correcta' : '¡Correcto!'));
      const antes = await page.evaluate(() => lecRes.preg.aciertos);
      await page.locator('.lec-op').first().click({ force: true }).catch(() => {});
      await page.evaluate(() => lecResponder(true, document.querySelector('.lec-op')));
      ok(await page.evaluate(() => lecRes.preg.aciertos) === antes, 'pregunta ' + (k + 1) + ': no se puede volver a contestar');
      if (CAPTURAS && k === 1) { await page.evaluate(() => { document.getElementById('lec-preguntas').scrollIntoView({ block: 'start' }); window.scrollBy(0, -100); }); await page.screenshot({ path: '/workspace/shot-lectura-quiz-respondida.png' }); }
      await page.click('#lec-preg-sig');
      await page.waitForTimeout(300);
    }
    if (CAPTURAS) await page.setViewportSize({ width: 1100, height: 900 });
    ok(/Has acertado 2 de 3/.test(await page.locator('#lec-comp-total').innerText()), 'resumen: 2 de 3 aciertos');
    ok(await page.locator('#lec-xp').count() === 1, 'al terminar las preguntas se dan puntos');
    const g = await page.evaluate(() => lecturaData.lecturas[lecturaData.lecturas.length - 1]);
    ok(g && g.compN === 3 && g.comp === 67, 'comprensión ' + (g && g.comp) + ' % de ' + (g && g.compN));
    const xp1 = await page.evaluate(() => lecRes.xp);
    ok(g && g.qv === 2 && xp1 === g.est * 5 + 4, 'XP: ' + xp1 + ' (estrellas×5 + 2 por acierto)');
    ok(g && Array.isArray(g.pw) && g.pw.includes(kd), 'la palabra conseguida queda guardada (pw ' + JSON.stringify(g && g.pw) + ')');
    ok(g && g.metodo === 'auto' && g.prec === r.prec, 'lectura guardada con sus métricas');
    await page.waitForTimeout(1200);
    ok(await page.evaluate(() => !!lecturaData.lecturas[0].audioId), 'grabación guardada en el dispositivo');
    const srv = await page.evaluate(() => lecturaParaServidor(lecturaData.lecturas[0]));
    ok(!('oido' in srv) && !('audioId' in srv), 'al servidor no van lo oído ni la grabación');
    // Forzar una sincronización y mirar el cuerpo
    await page.evaluate(() => typeof programarSync === 'function' && programarSync(0));
    await page.waitForTimeout(2500);
    const cuerpo = page.__envios.join('\n');
    ok(cuerpo.includes('"lecturas"') && cuerpo.includes(cuento.id), 'la lectura se envía al sincronizar');
    ok(!cuerpo.includes(palabras[kd]) && !cuerpo.includes('blob') && !cuerpo.includes('audioId'), 'el envío no lleva el texto oído ni audio');
    ok(/"pw":\[/.test(cuerpo) && /"qv":2/.test(cuerpo), 'se envían los números de las palabras conseguidas y la versión de las preguntas');
    // Lectura parcial del siguiente
    await page.click('#lec-siguiente');
    await page.waitForSelector('#lec-texto .lec-w');
    const c2 = await page.evaluate(() => lecCuento(lecCuentoId));
    await page.evaluate(t => { window.__guion = { texto: t, cada: 4, ms: 100 }; }, c2.texto[0]);
    await page.click('#lec-empezar');
    await page.waitForTimeout(1600);
    await page.click('#lec-empezar'); // «He terminado»
    await page.waitForSelector('#lec-resultado');
    const r2 = await page.evaluate(() => lecRes.met);
    ok(r2.compl < 100 && r2.prec === 100, 'lectura parcial: leído ' + r2.compl + ' %, sin errores por lo no leído');
    await page.locator('button', { hasText: 'Saltar preguntas' }).click();
    await page.waitForTimeout(300);
    ok(await page.evaluate(() => lecturaData.lecturas.length) === 2, 'saltar preguntas también guarda la lectura');
    // Volver a leer el primero (para ver la mejora primera → última)
    await page.evaluate(id => lecAbrir(id), cuento.id);
    await page.waitForSelector('#lec-texto .lec-w');
    await page.evaluate(t => { window.__guion = { texto: t, cada: 6, ms: 150 }; }, cuento.texto.join(' '));
    await page.click('#lec-empezar');
    await page.waitForSelector('#lec-resultado', { timeout: 20000 });
    // Las preguntas ya contestadas son de repaso: no dan XP otra vez (sin «farmear»)
    ok(/de repaso/.test(await page.locator('#lec-preguntas').innerText()), 'segunda vez: preguntas de repaso');
    for (let k = 0; k < 3; k++) {
      await page.waitForSelector('#lec-pregunta');
      const q = await page.evaluate(() => lecCuento(lecCuentoId).preguntas[lecRes.preg.i]);
      await page.locator('.lec-op', { hasText: q.ops[q.ok] }).first().click();
      await page.click('#lec-preg-sig');
      await page.waitForTimeout(200);
    }
    const g3 = await page.evaluate(() => lecturaData.lecturas[lecturaData.lecturas.length - 1]);
    const xp3 = await page.evaluate(() => lecRes.xp);
    ok(g3 && g3.comp === 100 && xp3 === g3.est, 'repaso: comprensión ' + (g3 && g3.comp) + ' % y solo XP de estrellas de repetición (' + xp3 + ')');
    // Mi progreso
    await page.evaluate(() => switchTab('progreso'));
    await page.waitForTimeout(500);
    ok(/3 lecturas|3\b/.test(await page.locator('#prog-lectura-resumen').innerText()), 'Mi progreso: resumen de lecturas');
    ok(await page.locator('#prog-lectura svg').count() >= 2, 'Mi progreso: gráficas de PCPM y precisión');
    ok(await page.locator('#prog-lectura-tabla tr').count() >= 4, 'Mi progreso: tabla de lecturas');
    ok(await page.locator('#prog-cuestan .lec-cuesta', { hasText: tercera }).count() === 1, 'Mi progreso: «palabras que me cuestan» con «' + tercera + '»');
    ok(/100/.test(await page.locator('#prog-comprension').innerText()), 'Mi progreso: comprensión por cuento (mejor 100 %)');
    await ctx.close();
  }

  // ---------- 3. Modo adulto sin reconocimiento ----------
  console.log('Modo adulto');
  {
    const { ctx, page } = await nueva('adulto', { sr: false });
    await page.click('#tab-btn-lectura');
    await page.waitForSelector('.lec-tarjeta');
    await page.locator('.lec-tarjeta').first().click();
    await page.waitForSelector('#lec-texto .lec-w');
    ok(await page.locator('#lec-empezar').count() === 0 || await page.locator('#lec-empezar').isDisabled(), 'sin reconocimiento no se ofrece leer solo');
    await page.click('#lec-adulto-btn');
    await page.waitForSelector('#lec-adulto-panel');
    await page.click('#lec-ad-fin');
    ok(await page.locator('#lec-resultado').count() === 0, 'no se puede terminar sin cronometrar');
    await page.click('#lec-ad-crono');
    await page.waitForTimeout(7000);
    await page.locator('#lec-texto .lec-w').nth(2).click();             // mal
    await page.locator('#lec-texto .lec-w').nth(4).click(); await page.locator('#lec-texto .lec-w').nth(4).click(); // saltada
    await page.click('#lec-ad-crono');
    await page.click('#lec-ad-fin');
    await page.waitForSelector('#lec-resultado');
    const m = await page.evaluate(() => ({ ...lecRes.met, metodo: lecRes.metodo, e: lecRes.estados.join('') }));
    ok(m.metodo === 'adulto' && m.e[2] === 'm' && m.e[4] === 's', 'el adulto marca mal y saltada');
    ok(m.ppm > 100 && m.ppm < 300 && m.prec < 100, 'métricas con el cronómetro: ' + m.ppm + ' PCPM, ' + m.prec + ' %');
    await ctx.close();
  }

  await browser.close();
  ok(errores.length === 0, 'sin errores de consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
