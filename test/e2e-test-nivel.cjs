// Prueba en navegador del test de nivel adaptativo: reconocimiento de voz simulado con respuestas
// flojas, medias y fuertes; nivel resultante, adaptación (para antes / se salta lo difícil), modo adulto
// sin reconocimiento, cambio a adulto si falla el micro, perfiles antiguos, repetir test y privacidad
// (lo que dice el niño no va en la sincronización). Requiere: node test/servidor-local.mjs 8811
// y playwright-core + Chrome.   Uso: node test/e2e-test-nivel.cjs  (CAPTURAS=1 guarda capturas en /workspace)
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8811/';
let fallos = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg); if (!cond) fallos++; };

// Reconocimiento falso: cada start() toma la siguiente respuesta de window.__srCola.
function srFalso() {
  window.__srCola = [];
  window.__srUsos = 0;
  class FakeSR {
    start() {
      window.__srUsos++;
      const r = window.__srCola.shift() || { texto: '' };
      setTimeout(() => {
        if (r.error || !r.texto) { this.onerror && this.onerror({ error: r.error || 'no-speech' }); this._fin(); return; }
        this.onspeechstart && this.onspeechstart();
        setTimeout(() => {
          const res = [{ transcript: r.texto, confidence: 0.9 }]; res.isFinal = true;
          this.onresult && this.onresult({ resultIndex: 0, results: [res] });
          if (!this.continuous) this._fin();
        }, 60);
      }, r.lat || 80);
    }
    _fin() { if (!this._acabado) { this._acabado = true; setTimeout(() => this.onend && this.onend(), 5); } }
    stop() { this._fin(); } abort() { this._fin(); }
  }
  window.SpeechRecognition = FakeSR; window.webkitSpeechRecognition = FakeSR;
}
function sinSR() { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; Object.defineProperty(window, 'webkitSpeechRecognition', { value: undefined, configurable: true }); }

// Conjuntos de respuestas. comp: true = toca la foto correcta. voc/conv: lo que "dice" el niño ('' = silencio).
const RAPIDO = 60, LENTO = 1800; // con TN_CFG.rapidoMs = 1500 en la prueba
const FUERTE = {
  comp: { k1: true, k2: true, k3: true, k4: true, k5: true },
  voc: { v1: 'el gato', v2: 'la pelota', v3: 'una mesa', v4: 'la camiseta', v5: 'el cepillo de dientes' },
  conv: {
    c1: 'Estoy muy bien, gracias', c2: 'La camiseta es blanca', c3: 'Yo juego al fútbol con mis amigos', c4: 'Me gusta mucho comer pizza y manzanas',
    c5: 'Veo un perro marrón que está sentado en la hierba y me mira', c6: 'Ayer fui al parque y jugué al fútbol con mi hermano',
    c7: 'El sábado voy a jugar con mis amigos en el parque', d1: 'Quiero comprar manzanas, por favor', d2: 'Quiero dos, por favor', d3: 'No, gracias. ¡Adiós!'
  }
};
// Repetición con mejora parcial (para ver diferencias en el informe del profe)
const MEJOR = {
  comp: FUERTE.comp,
  voc: { ...FUERTE.voc, v5: 'cepillo' },
  conv: { ...FUERTE.conv, c5: 'un perro con una flor', c6: 'el parque', c7: 'jugar', d2: 'dos' }
};
const MEDIO = {
  comp: { k1: true, k2: true, k3: true, k4: false, k5: true },
  voc: { v1: 'gato', v2: 'balón', v3: 'la meza', v4: 'no sé', v5: 'cepillo' },
  conv: { c1: 'bien', c2: 'rojo', c3: 'jugar fútbol', c4: 'me gusta pizza', c5: 'perro grande', c6: 'parque', c7: 'no sé', d1: 'manzanas', d2: 'dos', d3: 'no' }
};
const FLOJO = {
  comp: { k1: true, k2: false, k3: false, k4: false, k5: false },
  voc: { v1: '', v2: 'gato', v3: '', v4: '', v5: '' },
  conv: { c1: { texto: 'hola', lat: LENTO }, c2: '', c3: '', c4: '', c5: '', c6: '', c7: '', d1: '', d2: '', d3: '' }
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const errores = [];
  async function nuevaPagina(nombre, { sr = true, estado = null, sync = false } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/favicon|images\.unsplash|ERR_|status of 503/.test(m.text())) errores.push(nombre + ': ' + m.text()); });
    page.on('pageerror', e => errores.push(nombre + ' pageerror: ' + e.message));
    page.on('dialog', d => d.accept());
    page.__envios = [];
    await page.route('**/api/sync', async r => { page.__envios.push(r.request().postData()); await r.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"mensaje":"prueba"}' }); });
    await page.addInitScript(sr ? srFalso : sinSR);
    if (estado) await page.addInitScript(s => { if (!sessionStorage.getItem('ya')) { localStorage.setItem('ligaHablaVisual', s); sessionStorage.setItem('ya', 1); } }, JSON.stringify(estado));
    if (sync) await page.addInitScript(() => localStorage.setItem('ligaHablaSync', JSON.stringify({ conectado: true, ninoId: 'n1', alias: 'Prueba', perfilT: 1, cursor: 0 })));
    await page.goto(BASE);
    await page.waitForFunction(() => typeof iniciarTestNivel === 'function');
    // Voz instantánea (las grabaciones se comprueban aparte) y tiempos cortos
    await page.evaluate(() => {
      window.__dichos = [];
      window.decir = async p => { window.__dichos.push(...(Array.isArray(p) ? p : [p])); await new Promise(r => setTimeout(r, 20)); };
      window.pararVoz = () => {};
      TN_CFG.rapidoMs = 1500; TN_CFG.silencioMs = 200;
    });
    return page;
  }
  // Contesta el test según un conjunto de respuestas hasta llegar a la pantalla de resultados.
  async function contestar(page, set, { adulto = null, capturar = null, terminarEn = null } = {}) {
    const visto = [];
    for (let vueltas = 0; vueltas < 2000; vueltas++) {
      if (await page.isVisible('#setup-step-result')) break;
      const s = await page.evaluate(() => ({ id: tn && tn.actual, espera: !!(tn && tn.esperando), foto: !!document.querySelector('.tn-foto'), mic: !!document.getElementById('tn-mic'), adulto: !!document.getElementById('tn-adulto-0'), dialogo: (document.getElementById('tn-pregunta') || {}).textContent }));
      if (!s.espera || !s.id) { await page.waitForTimeout(30); continue; }
      if (!visto.includes(s.id)) visto.push(s.id);
      if (capturar && capturar.id === s.id) { await page.waitForTimeout(1200); await page.screenshot({ path: capturar.ruta }); capturar = null; }
      await page.evaluate(() => { window.__ultEspera = tn.esperando; });
      if (s.foto) {
        const q = await page.evaluate(id => TN_COMP.find(x => x.id === id), s.id);
        const objetivo = set.comp[s.id] ? q.ok : q.otras[0];
        await page.click(`.tn-foto[data-es="${objetivo}"]`);
      } else if (s.adulto) {
        await page.click(`#tn-adulto-${adulto(s.id)}`);
      } else if (s.mic) {
        const v = (s.id[0] === 'v' ? set.voc : set.conv)[s.id];
        const r = typeof v === 'object' ? v : { texto: v, lat: RAPIDO };
        await page.evaluate(r => { window.__srCola.length = 0; window.__srCola.push(r); }, r);
        await page.click('#tn-mic');
      }
      // esperar a la siguiente espera (otra pregunta, o la misma si no se oyó) o al resultado
      await page.waitForFunction(() => !document.getElementById('setup-step-result').classList.contains('hidden') || (tn && tn.esperando && tn.esperando !== window.__ultEspera), null, { timeout: 30000 });
    }
    const p = await page.evaluate(() => gameState.pruebas[gameState.pruebas.length - 1]);
    return { p, visto };
  }
  const resumen = p => `nivel ${p.nivel} · total ${p.total} · Comprensión ${p.comp}% · Vocabulario ${p.voc}% · Conversación ${p.conv}% · ${p.items.length} preguntas · modo ${p.modo}${p.completo ? '' : ' (terminado antes)'}`;
  const resultados = {};
  const empezar = async (page) => { await page.fill('#input-name', 'Prueba'); await page.click('text=Empezar'); };

  console.log('Test de nivel (navegador)');

  // 0) Todas las frases del test tienen audio grabado
  {
    const page = await nuevaPagina('audio');
    const r = await page.evaluate(async () => {
      const m = await (await fetch('audio/manifest.json')).json();
      const claves = new Set(Object.keys(m.archivos).map(t => t.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()));
      const faltan = Object.values(FRASES_TEST).filter(t => !claves.has(t.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase()));
      return { total: Object.keys(FRASES_TEST).length, faltan };
    });
    ok(r.faltan.length === 0, `las ${r.total} frases del test tienen MP3 grabado${r.faltan.length ? ' (faltan: ' + r.faltan.join(' | ') + ')' : ''}`);
    const personales = await page.evaluate(() => Object.values(FRASES_TEST).filter(t => /llamas|años|vives|dirección|colegio|cole\b|apellido/i.test(t)));
    ok(personales.length === 0, 'ninguna pregunta pide datos personales (nombre, edad, dirección, colegio)');
    await page.context().close();
  }

  // 1) Fuerte → nivel 3, llega a la frutería
  {
    const page = await nuevaPagina('fuerte', { sync: true });
    await empezar(page);
    const { p, visto } = await contestar(page, FUERTE, { capturar: process.env.CAPTURAS ? { id: 'c5', ruta: '/workspace/test-nivel-conversacion.png' } : null });
    resultados.fuerte = p;
    console.log('   fuerte:', resumen(p));
    ok(p.nivel === 3, 'respuestas fuertes → nivel 3');
    ok(['d1', 'd2', 'd3'].every(id => visto.includes(id)), 'llega a la mini-conversación de la frutería (3 turnos)');
    const c6 = p.items.find(i => i.id === 'c6'), c7 = p.items.find(i => i.id === 'c7');
    ok(c6.c.includes('T') && c7.c.includes('T'), `detecta pasado («jugué», «fui») y futuro («voy a jugar»): c6 ${c6.c}, c7 ${c7.c}`);
    const dichos = await page.evaluate(() => window.__dichos);
    ok(dichos.includes('¡Claro! ¿Cuántas quieres?') && dichos.includes('¡Perfecto! Son dos euros. ¿Quieres algo más?') && dichos.includes('¡Gracias a ti! ¡Hasta luego!'), 'la frutera contesta según lo que dice el niño');
    const gs = await page.evaluate(() => ({ level: gameState.level, xp: gameState.xp }));
    ok(gs.level === 3 && gs.xp === 510, `nivel y XP aplicados (nivel ${gs.level}, XP ${gs.xp})`);
    const textos = await page.evaluate(() => JSON.parse(localStorage.getItem('ligaHablaTestTextos') || '{}'));
    ok(Object.values(textos)[0] && /parque/.test(Object.values(textos)[0].c6), 'lo que dijo el niño se guarda en el dispositivo (para el profe)');
    await page.waitForFunction(() => true);
    await page.waitForTimeout(3200);
    const envio = page.__envios.map(e => e || '').join('\n');
    ok(envio.includes('"pruebas"') && !/parque|pizza|hermano|sábado/.test(envio), 'la sincronización lleva las puntuaciones pero NO lo que dijo el niño');
    // Pantalla del profe
    await page.click('#tn-ver-profe');
    await page.evaluate(() => { const d = document.querySelector('#tn-informe details'); if (d) d.open = true; });
    const informe = await page.textContent('#tn-informe');
    ok(/Comprensión/.test(informe) && /Vocabulario/.test(informe) && /Conversación/.test(informe) && /Qué trabajar/.test(informe), 'vista del profe con subpuntuaciones y «Qué trabajar»');
    await page.click('#setup-step-result > button');
    ok(await page.isHidden('#setup-modal'), 'entra en la app al terminar');
    await page.context().close();
  }

  // 2) Medio → nivel 2, no llega a la frutería
  {
    const page = await nuevaPagina('medio');
    await empezar(page);
    const { p, visto } = await contestar(page, MEDIO);
    resultados.medio = p;
    console.log('   medio: ', resumen(p));
    ok(p.nivel === 2, 'respuestas medias → nivel 2');
    ok(visto.includes('c7') && !visto.includes('d1'), 'adaptativo: hace las preguntas de pasado/futuro pero se salta la frutería');
    ok(p.items.find(i => i.id === 'v2').r === 'perfecto', '«balón» vale para la pelota');
    ok(p.items.find(i => i.id === 'v3').r !== 'otra' && p.items.find(i => i.id === 'v5').r === 'casi', 'reconocimiento difuso: «la meza» y «cepillo» (casi)');
    await page.context().close();
  }

  // 3) Flojo → nivel 0, termina pronto
  {
    const page = await nuevaPagina('flojo');
    await empezar(page);
    const { p, visto } = await contestar(page, FLOJO);
    resultados.flojo = p;
    console.log('   flojo: ', resumen(p));
    ok(p.nivel === 0, 'respuestas flojas → nivel 0');
    ok(visto.join(',') === 'k1,k2,k3,v1,v2,c1,c2', `para pronto (2 fallos seguidos por parte; conversación solo el 1er escalón): ${visto.join(',')}`);
    const c1 = p.items.find(i => i.id === 'c1');
    ok(c1.c === 'RK', `«hola» lento: responde y relacionada, sin rapidez ni frase (${c1.c})`);
    const xp = await page.evaluate(() => gameState.xp);
    ok(xp === 10, 'nivel 0 empieza con 10 XP');
    await page.context().close();
  }

  // 4) Sin reconocimiento de voz → el adulto valora con 3 botones
  {
    const page = await nuevaPagina('adulto', { sr: false });
    await empezar(page);
    const { p, visto } = await contestar(page, FUERTE, { adulto: id => id[0] === 'v' ? 2 : (id === 'c6' || id === 'c7' ? 1 : 2) });
    resultados.adulto = p;
    console.log('   adulto:', resumen(p));
    ok(p.modo === 'adulto', 'sin reconocimiento: modo adulto');
    ok(p.items.filter(i => i.b === 'conv').every(i => ['frases', 'sueltas', 'nr'].includes(i.r)), 'las preguntas de conversación se valoran con No responde / Palabras sueltas / Frases');
    ok(p.nivel >= 2 && visto.includes('d1'), `nivel ${p.nivel} y adaptativo también en modo adulto`);
    const aviso = await page.evaluate(() => window.__dichos.length > 0);
    ok(aviso, 'la app sigue diciendo las preguntas en voz alta');
    await page.context().close();
  }

  // 5) Micro denegado a mitad → pasa a adulto; "Terminar ahora"
  {
    const page = await nuevaPagina('mixto');
    await empezar(page);
    // Comprensión normal; en la 1ª palabra el micro da "not-allowed"
    let p;
    for (let i = 0; i < 400; i++) {
      const s = await page.evaluate(() => ({ id: tn && tn.actual, espera: !!(tn && tn.esperando), foto: !!document.querySelector('.tn-foto'), mic: !!document.getElementById('tn-mic'), adulto: !!document.getElementById('tn-adulto-0') }));
      if (s.espera && s.foto) { const q = await page.evaluate(id => TN_COMP.find(x => x.id === id), s.id); await page.click(`.tn-foto[data-es="${q.ok}"]`); await page.waitForTimeout(80); continue; }
      if (s.espera && s.mic) { await page.evaluate(() => window.__srCola.push({ error: 'not-allowed' })); await page.click('#tn-mic'); await page.waitForTimeout(300); continue; }
      if (s.espera && s.adulto) { break; }
      await page.waitForTimeout(30);
    }
    ok(await page.isVisible('#tn-adulto-2'), 'micro denegado → aparecen los botones del adulto en la misma pregunta');
    await page.click('#tn-adulto-2');
    await page.waitForFunction(() => tn && tn.actual === 'v2' && tn.esperando);
    await page.click('#tn-terminar');
    await page.waitForSelector('#setup-step-result:not(.hidden)');
    p = await page.evaluate(() => gameState.pruebas[0]);
    console.log('   mixto: ', resumen(p));
    ok(p.modo === 'mixto' && p.completo === false && p.items.length === 6, 'modo mixto, marcado como terminado antes; lo que falta cuenta 0');
    await page.context().close();
  }

  // 6) Perfil antiguo: no se repite el test; repetir desde el panel del profe
  {
    const viejo = { name: 'Iryna', age: 8, country: 'Ucrania', hobby: 'futbol', level: 1, xp: 700 };
    const page = await nuevaPagina('viejo', { estado: viejo });
    ok(await page.isHidden('#setup-modal'), 'perfil guardado sin test nuevo: entra directamente (no obliga a repetir el test)');
    const gs = await page.evaluate(() => ({ level: gameState.level, xp: gameState.xp, pruebas: gameState.pruebas }));
    ok(gs.level === 1 && gs.xp === 700 && gs.pruebas === undefined, 'el perfil antiguo no cambia');
    await page.evaluate(() => toggleTeacherModal());
    await page.click('#btn-repetir-test');
    ok(await page.isVisible('#setup-step-test') && await page.isHidden('#setup-step-profile'), 'repetir test desde el panel del profe (sin pedir el perfil otra vez)');
    const { p } = await contestar(page, MEDIO);
    const gs2 = await page.evaluate(() => ({ level: gameState.level, xp: gameState.xp, n: gameState.pruebas.length, name: gameState.name }));
    ok(p.nivelAntes === 1 && gs2.level === p.nivel && gs2.xp === 700 && gs2.name === 'Iryna', `repetido: nivel ${p.nivelAntes} → ${p.nivel}, XP no baja (${gs2.xp})`);
    // Una segunda repetición (mejor) muestra la mejora
    await page.click('#setup-step-result > button');
    await page.evaluate(() => repetirTestNivel());
    const { p: p3 } = await contestar(page, MEJOR);
    console.log('   repetido 2:', resumen(p3));
    if (process.env.CAPTURAS) {
      await page.click('#tn-ver-profe');
      await page.evaluate(() => { const d = document.querySelector('#tn-informe details'); if (d) d.open = true; });
      await page.setViewportSize({ width: 460, height: 2600 }); await page.waitForTimeout(600);
      const b = await page.locator('#tn-informe').boundingBox();
      await page.screenshot({ path: '/workspace/test-nivel-profe.png', clip: { x: b.x - 8, y: b.y - 8, width: b.width + 16, height: Math.min(b.height + 16, 760) } });
    }
    ok(/mejorado/.test(await page.textContent('#result-level-text')), 'al repetir y mejorar, el niño ve «¡Has mejorado!»');
    await page.click('#setup-step-result > button');
    await page.evaluate(() => switchTab('progreso'));
    const hist = await page.textContent('#prog-test');
    ok(/\(\+\d+\)/.test(hist) && (await page.$$('#prog-test tbody tr')).length >= 2, '«Mi progreso» muestra el historial de tests con la mejora');
    await page.context().close();
  }

  ok(errores.length === 0, 'sin errores de JavaScript' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
