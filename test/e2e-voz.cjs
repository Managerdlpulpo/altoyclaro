// Prueba en navegador de la voz: audios grabados (HTTP 200 y reproducción), voz del navegador de respaldo,
// elección de la voz más natural, selector del profe y que no haya errores en consola.
// Requiere: node test/servidor-local.mjs 8811  y playwright-core + Chrome.
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8811/';
const ESTADO = JSON.stringify({ name: 'Iryna', age: 8, country: 'Ucrania', hobby: 'futbol', level: 1, xp: 0 });
let fallos = 0;
const ok = (cond, msg) => { console.log((cond ? '✔ ' : '✘ ') + msg); if (!cond) fallos++; };

// Voces falsas (como las de Chrome, Edge, Safari y Linux), que llegan tarde con "voiceschanged".
function vocesFalsas() {
  const voces = [
    { name: 'eSpeak Spanish', lang: 'es', default: true, localService: true, voiceURI: 'espeak-es' },
    { name: 'Mónica (compact)', lang: 'es-ES', localService: true, voiceURI: 'com.apple.compact.Monica' },
    { name: 'Google español', lang: 'es-ES', localService: false, voiceURI: 'Google español' },
    { name: 'Microsoft Elvira Online (Natural) - Spanish (Spain)', lang: 'es-ES', localService: false, voiceURI: 'elvira' },
    { name: 'Paulina', lang: 'es-MX', localService: true, voiceURI: 'paulina' },
    { name: 'Google US English', lang: 'en-US', localService: false, voiceURI: 'g-en' }
  ];
  let listas = false;
  const oyentes = [];
  window.__dichos = [];
  const ss = {
    getVoices: () => listas ? voces : [],
    addEventListener: (ev, f) => { if (ev === 'voiceschanged') oyentes.push(f); },
    speak: u => { window.__dichos.push({ texto: u.text, voz: u.voice && u.voice.name, rate: u.rate, pitch: u.pitch, lang: u.lang }); setTimeout(() => u.onend && u.onend(), 50); },
    cancel: () => {}, pause: () => {}, resume: () => {}, speaking: false, pending: false
  };
  Object.defineProperty(window, 'speechSynthesis', { value: ss, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(t) { this.text = t; } };
  setTimeout(() => { listas = true; oyentes.forEach(f => f()); }, 600);
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--autoplay-policy=user-gesture-required'] });
  const errores = [];
  const nuevaPagina = async (nombre, { falsas = true, bloquear } = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errores.push(nombre + ': ' + m.text() + ' ' + ((m.location() || {}).url || '')); });
    page.on('pageerror', e => errores.push(nombre + ' pageerror: ' + e.message));
    page.__audios = [];
    page.on('response', r => { if (r.url().includes('/audio/')) page.__audios.push({ url: r.url(), status: r.status(), tipo: r.headers()['content-type'] }); });
    if (bloquear) await page.route(bloquear, r => r.fulfill({ status: 404, body: '' }));
    await page.addInitScript(s => localStorage.setItem('ligaHablaVisual', s), ESTADO);
    if (falsas) await page.addInitScript(vocesFalsas);
    await page.goto(BASE);
    await page.waitForTimeout(800);
    return page;
  };
  const log = p => p.evaluate(() => window.__vozLog || []);
  const esperar = (p, f, ms = 6000) => p.waitForFunction(f, null, { timeout: ms }).then(() => true).catch(() => false);

  // 1) Todos los archivos del manifiesto existen (HTTP 200, audio/mpeg)
  const p = await nuevaPagina('p1');
  const comprob = await p.evaluate(async () => {
    const m = await (await fetch('audio/manifest.json')).json();
    const r = [];
    for (const [t, a] of Object.entries(m.archivos)) {
      const x = await fetch('audio/' + a.f + '?v=' + a.v);
      r.push({ t, st: x.status, tipo: x.headers.get('content-type'), n: (await x.arrayBuffer()).byteLength });
    }
    return { voz: m.voz, r };
  });
  ok(comprob.r.length >= 40 && comprob.r.every(x => x.st === 200 && x.tipo === 'audio/mpeg' && x.n > 2000),
     `${comprob.r.length} audios del manifiesto responden 200 audio/mpeg (voz: ${comprob.voz})`);

  // 2) Botón del Diccionario Visual: suena el MP3 grabado y termina bien (sin voz del navegador)
  await p.click('#tab-btn-pictionary');
  await p.locator('#pictionary-grid button').first().click();
  ok(await esperar(p, () => (window.__vozLog || []).some(e => e.via === 'archivo' && e.ok === true)), 'Diccionario: se reproduce el audio grabado hasta el final');
  let l = await log(p);
  ok(l[0] && /audio\/la-cama\.mp3\?v=/.test(l[0].url), 'usa audio/la-cama.mp3 para «la cama»: ' + (l[0] && l[0].url));
  ok(!(await p.evaluate(() => window.__dichos.length)), 'no se usa la voz del navegador cuando hay grabación');
  ok(p.__audios.some(a => a.url.includes('la-cama.mp3') && (a.status === 200 || a.status === 206)), 'el navegador descarga la-cama.mp3 (HTTP ' + (p.__audios.find(a => a.url.includes('la-cama'))||{}).status + ')');

  // 3) Secuencia: "¡Perfecto!" + palabra, las dos grabadas y en orden
  await p.evaluate(() => { window.__vozLog = []; decir([FRASES_VOZ.perfecto, 'el perro']); });
  ok(await esperar(p, () => (window.__vozLog || []).filter(e => e.ok).length === 2), 'secuencia ¡Perfecto! + «el perro» con 2 audios grabados');
  l = await log(p);
  ok(l.map(e => e.url.split('/').pop().split('?')[0]).join(',') === 'perfecto.mp3,el-perro.mp3', 'orden: ' + l.map(e => e.url.split('/').pop().split('?')[0]).join(','));

  // 4) Texto sin grabar -> voz del navegador: la más natural (Edge Online Natural es-ES), rate 0.9, pitch 1.05
  await p.evaluate(() => { window.__vozLog = []; decir('Yo veo un dinosaurio.'); });
  ok(await esperar(p, () => window.__dichos.length === 1), 'texto dinámico usa la voz del navegador');
  let d = await p.evaluate(() => window.__dichos[0]);
  ok(d.voz === 'Microsoft Elvira Online (Natural) - Spanish (Spain)' && d.rate === 0.9 && d.pitch === 1.05 && d.lang === 'es-ES', `voz elegida: ${d.voz}, rate ${d.rate}, pitch ${d.pitch}, ${d.lang}`);
  const orden = await p.evaluate(() => vocesEspanolasOrdenadas(speechSynthesis.getVoices()).map(v => v.name));
  ok(orden[orden.length - 1] === 'eSpeak Spanish' && orden[orden.length - 2] === 'Mónica (compact)' && !orden.includes('Google US English'), 'ranking: ' + orden.join(' > '));

  // 5) Selector del profe: lista voces en español, recuerda la elegida y la usa
  await p.click('text=Profe').catch(() => p.evaluate(() => toggleTeacherModal()));
  await p.waitForTimeout(300);
  if (await p.locator('#teacher-modal').evaluate(e => e.classList.contains('hidden'))) await p.evaluate(() => toggleTeacherModal());
  const opciones = await p.locator('#voz-select option').allTextContents();
  ok(opciones.length === 6 && /^Automática \(Microsoft Elvira/.test(opciones[0]), 'selector: ' + opciones.join(' | '));
  await p.selectOption('#voz-select', 'Google español');
  await p.click('text=Probar');
  ok(await esperar(p, () => window.__dichos.length === 2), 'botón Probar habla');
  d = await p.evaluate(() => window.__dichos[1]);
  ok(d.voz === 'Google español', 'Probar usa la voz elegida: ' + d.voz);
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('altoyclaroVoz')).nombre) === 'Google español', 'la voz elegida se guarda en localStorage');
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate(() => decir('Texto nuevo sin grabar.'));
  ok(await esperar(p, () => window.__dichos.length === 1), 'tras recargar habla');
  ok((await p.evaluate(() => window.__dichos[0].voz)) === 'Google español', 'tras recargar sigue la voz elegida');
  // Desactivar voz grabada -> todo por el navegador
  await p.evaluate(() => { cambiarVozGrabada(false); window.__vozLog = []; window.__dichos = []; decir('la cama'); });
  ok(await esperar(p, () => window.__dichos.length === 1) && !(await log(p)).some(e => e.via === 'archivo'), 'con «voz grabada» desactivada usa el navegador');
  await p.evaluate(() => cambiarVozGrabada(true));

  // 6) Modo Hablar: al acertar dice ¡Perfecto! + palabra con audio grabado
  await p.evaluate(() => { window.__vozLog = []; switchTab('hablar'); mostrarResultado({ resultado: 'perfecto', oido: hablaItem.es }, { item: hablaItem, modo: 'palabra' }); });
  ok(await esperar(p, () => (window.__vozLog || []).filter(e => e.via === 'archivo' && e.ok).length === 2), 'Modo Hablar: feedback hablado con audios grabados');
  // Ejemplo de frase
  await p.evaluate(() => { window.__vozLog = []; hablaEjemplo(); });
  ok(await esperar(p, () => (window.__vozLog || []).some(e => e.via === 'archivo' && e.ok)), 'Modo Hablar: frase de ejemplo grabada');
  // Interrumpir: una nueva frase corta la anterior
  await p.evaluate(() => { window.__vozLog = []; decir(['¡Muy bien!', 'el gato']); setTimeout(() => decir('la mesa'), 100); });
  await p.waitForTimeout(2500);
  l = await log(p);
  ok(l.length && l[l.length - 1].url.includes('la-mesa.mp3') && l[l.length - 1].ok && !l.some(e => e.url && e.url.includes('el-gato')), 'una frase nueva interrumpe la anterior');

  // 7) Respaldo: si el archivo falla (404), habla el navegador
  const p2 = await nuevaPagina('p2-404', { bloquear: '**/audio/la-cama.mp3*' });
  await p2.click('#tab-btn-pictionary');
  await p2.locator('#pictionary-grid button').first().click();
  ok(await esperar(p2, () => window.__dichos.length === 1), 'archivo 404 -> voz del navegador');
  ok((await p2.evaluate(() => window.__dichos[0].texto)) === 'la cama' && (await log(p2))[0].ok === false, 'respaldo dice «la cama» con la voz del navegador');

  // 8) Respaldo: sin manifiesto
  const p3 = await nuevaPagina('p3-sin-manifiesto', { bloquear: '**/audio/manifest.json*' });
  await p3.evaluate(() => decir('la silla'));
  ok(await esperar(p3, () => window.__dichos.length === 1), 'sin manifiesto -> voz del navegador');

  // 9) Navegador real (sin voces falsas): no rompe nada
  const p4 = await nuevaPagina('p4-real', { falsas: false });
  await p4.click('#tab-btn-pictionary');
  await p4.locator('#pictionary-grid button').nth(2).click();
  ok(await esperar(p4, () => (window.__vozLog || []).some(e => e.via === 'archivo' && e.ok)), 'Chrome real: reproduce el audio grabado');
  await p4.evaluate(() => decir('Una frase sin grabar.'));
  await p4.waitForTimeout(1500);

  const inesperados = errores.filter(e => !(e.startsWith('p2-404') && /404/.test(e)) && !(e.startsWith('p3-sin-manifiesto') && /404/.test(e)));
  ok(inesperados.length === 0, 'sin errores en consola' + (inesperados.length ? ': ' + inesperados.join(' || ') : ''));
  console.log('Errores esperados (404 simulados):', errores.length - inesperados.length);
  await browser.close();
  console.log(fallos ? `\n${fallos} fallos` : '\nTodo bien');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
