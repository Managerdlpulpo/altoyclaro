// Prueba en navegador del test de nivel adaptativo: reconocimiento de voz simulado con respuestas
// flojas, medias y fuertes; nivel resultante, adaptación (para antes / se salta lo difícil), modo adulto
// sin reconocimiento, cambio a adulto si falla el micro, perfiles antiguos, repetir test y privacidad
// (lo que dice el niño no va en la sincronización). Las preguntas se sortean: comprueba que dos tests salen
// distintos, que no se repiten preguntas de los 2 últimos tests y que el nivel no depende de la semilla. Requiere: node test/servidor-local.mjs 8811
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

// Conjuntos de respuestas. Las preguntas se sortean en cada test, así que las respuestas se generan a partir
// de los datos de cada pregunta (q): comp(q, i) → true = toca la foto correcta; voc/conv(q, i) → lo que "dice"
// el niño ('' = silencio), o { texto, lat }. i = posición dentro de su parte.
const RAPIDO = 60, LENTO = 1800; // con TN_CFG.rapidoMs = 1500 en la prueba
const sinArticulo = es => es.replace(/^(el|la|los|las) /, '');
const fuerteConv = q => {
  const k = q.claves[0];
  if (q.dlg && q.n === 1) return 'Quiero comprar ' + k + ', por favor';
  if (q.digitos) return 'Quiero dos, por favor';
  if (q.permiteNo) return 'No, gracias. ¡Adiós!';
  if (q.tipo === 'saludo') return 'Estoy muy bien, gracias';
  if (q.tipo === 'pasado') return 'Ayer fui con mis amigos y jugué mucho en el parque';
  if (q.tipo === 'futuro') return 'Mañana voy a jugar con mis amigos en el parque';
  if (q.largo) return 'Veo un ' + sinArticulo(q.foto) + ' muy bonito que está en el ' + (q.claves.includes('campo') ? 'campo' : 'suelo') + ' y me mira';
  return 'Yo creo que es ' + k + ' y me gusta mucho';
};
const FUERTE = { comp: () => true, voc: q => q.es, conv: fuerteConv };
// Repetición con mejora parcial (para ver diferencias en el informe del profe)
const MEJOR = {
  comp: () => true, voc: (q, i) => i < 4 ? q.es : sinArticulo(q.es).split(' ')[0],
  conv: q => q.tipo === 'describir' ? 'un ' + sinArticulo(q.foto) + ' con una flor' : q.tipo === 'pasado' ? 'el parque' : q.tipo === 'futuro' ? 'jugar' : q.digitos ? 'dos' : fuerteConv(q)
};
const MEDIO = {
  comp: (q, i) => i !== 3,
  voc: (q, i) => [sinArticulo(q.es), (q.otrasValidas || [])[0] || q.es, sinArticulo(q.es) + sinArticulo(q.es).slice(-1), 'no sé', 'no sé'][i],
  conv: q => {
    if (q.dlg) return q.n === 1 ? q.claves[0] : q.digitos ? 'dos' : 'no';
    if (q.nivel === 1) return q.claves[0];
    if (q.tipo === 'uso') return q.claves[1] + ' ' + q.claves[0];
    if (q.tipo === 'gusto') return 'me gusta ' + q.claves[0];
    if (q.tipo === 'describir') return sinArticulo(q.foto) + ' grande';
    if (q.tipo === 'pasado') return 'parque';
    return 'no sé';
  }
};
const FLOJO = {
  comp: (q, i) => i === 0,
  voc: (q, i) => i === 1 ? (q.es === 'el gato' ? 'perro' : 'gato') : '',
  conv: (q, i) => i === 0 ? { texto: 'hola', lat: LENTO } : ''
};

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const errores = [];
  async function nuevaPagina(nombre, { sr = true, estado = null, sync = false, semilla = null } = {}) {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 } });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error' && !/favicon|images\.unsplash|ERR_|status of 503/.test(m.text())) errores.push(nombre + ': ' + m.text()); });
    page.on('pageerror', e => errores.push(nombre + ' pageerror: ' + e.message));
    page.on('dialog', d => d.accept());
    page.__envios = [];
    // El acceso es obligatorio: simulamos una sesión (profe, o el niño n1 si se prueba la sincronización)
    await page.route('**/api/acceso', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sync ? { ok: true, nino: { id: 'n1', alias: 'Prueba' }, profe: false } : { ok: true, nino: null, profe: true }) }));
    await page.route('**/api/admin', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"ninos":[],"pendientes":[],"entregadas":[]}' })); // sesión de profe simulada: panel vacío
    await page.route('**/api/sync', async r => { page.__envios.push(r.request().postData()); await r.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false,"mensaje":"prueba"}' }); });
    await page.addInitScript(sr ? srFalso : sinSR);
    if (semilla != null) await page.addInitScript(s => { window.__tnSemilla = s; }, semilla);
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
      if (capturar && typeof capturar.id === 'function') capturar.id = capturar.id(await page.evaluate(() => tn.plan));
      if (capturar && capturar.id === s.id) { await page.waitForTimeout(1200); await page.screenshot({ path: capturar.ruta }); capturar = null; }
      await page.evaluate(() => { window.__ultEspera = tn.esperando; });
      const { q, i } = await page.evaluate(id => {
        const p = tn.plan, listas = [p.comp, p.voc, tnConvDelPlan(p)];
        for (const l of listas) { const i = l.findIndex(x => x.id === id); if (i >= 0) return { q: l[i], i }; }
        return {};
      }, s.id);
      if (s.foto) {
        const objetivo = set.comp(q, i) ? q.ok : q.otras[0];
        await page.click(`.tn-foto[data-es="${objetivo}"]`);
      } else if (s.adulto) {
        await page.click(`#tn-adulto-${adulto(q)}`);
      } else if (s.mic) {
        const v = (q.es ? set.voc : set.conv)(q, i);
        const r = typeof v === 'object' ? v : { texto: v, lat: RAPIDO };
        await page.evaluate(r => { window.__srCola.length = 0; window.__srCola.push(r); }, r);
        await page.click('#tn-mic');
      }
      // esperar a la siguiente espera (otra pregunta, o la misma si no se oyó) o al resultado
      await page.waitForFunction(() => !document.getElementById('setup-step-result').classList.contains('hidden') || (tn && tn.esperando && tn.esperando !== window.__ultEspera), null, { timeout: 30000 });
    }
    const p = await page.evaluate(() => gameState.pruebas[gameState.pruebas.length - 1]);
    const plan = await page.evaluate(() => JSON.parse(JSON.stringify(tn.plan)));
    return { p, visto, plan };
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
    ok(!(await page.$('#input-age')) && !(await page.$('#input-country')) && !(await page.$('#input-hobby')), 'el perfil solo pide nombre o apodo (sin edad, país ni afición)');
    ok(r.faltan.length === 0, `las ${r.total} frases del test tienen MP3 grabado${r.faltan.length ? ' (faltan: ' + r.faltan.join(' | ') + ')' : ''}`);
    const personales = await page.evaluate(() => Object.values(FRASES_TEST).filter(t => /te llamas|cuántos años|tienes años|dónde vives|dirección|a qué (colegio|cole)\b|cómo se llama tu|apellido|tu casa|tu familia/i.test(t)));
    ok(personales.length === 0, 'ninguna pregunta pide datos personales (nombre, edad, dirección, colegio)');
    await page.context().close();
  }

  const tipoDe = (plan, id) => { const q = [...plan.comp, ...plan.voc, ...[1, 2, 3].flatMap(n => plan.conv[n]), ...plan.dialogo.turnos].find(x => x.id === id); return q && (q.dlg ? 'dialogo' : q.es ? 'voc' : q.tipo); };
  const porTipo = (p, plan, tipo) => p.items.find(i => tipoDe(plan, i.id) === tipo);

  // 1) Fuerte → nivel 3, llega a la mini-conversación
  {
    const page = await nuevaPagina('fuerte', { sync: true });
    await empezar(page);
    const { p, visto, plan } = await contestar(page, FUERTE, { capturar: process.env.CAPTURAS ? { id: plan => plan.conv[3][0].id, ruta: '/workspace/test-nivel-conversacion.png' } : null });
    resultados.fuerte = p;
    console.log('   fuerte:', resumen(p), '·', plan.dialogo.titulo);
    ok(p.nivel === 3, 'respuestas fuertes → nivel 3');
    ok(plan.dialogo.turnos.every(t => visto.includes(t.id)), `llega a la mini-conversación (${plan.dialogo.titulo}, 3 turnos)`);
    const c6 = porTipo(p, plan, 'pasado'), c7 = porTipo(p, plan, 'futuro');
    ok(c6.c.includes('T') && c7.c.includes('T'), `detecta pasado («jugué», «fui») y futuro («voy a jugar»): ${c6.id} ${c6.c}, ${c7.id} ${c7.c}`);
    const dichos = await page.evaluate(() => window.__dichos);
    const esperadas = await page.evaluate(() => tn.plan.dialogo.turnos.map(t => FRASES_TEST[t.si]));
    ok(esperadas.every(f => dichos.includes(f)), 'la mini-conversación contesta según lo que dice el niño');
    ok(p.sem === plan.sem && Array.isArray(p.ids) && p.ids.length === 20 && p.ids.join() === plan.ids.join(), `la prueba guarda la semilla y los ids de las 20 preguntas (sem ${p.sem})`);
    const gs = await page.evaluate(() => ({ level: gameState.level, xp: gameState.xp }));
    ok(gs.level === 3 && gs.xp === 510, `nivel y XP aplicados (nivel ${gs.level}, XP ${gs.xp})`);
    const textos = await page.evaluate(() => JSON.parse(localStorage.getItem('ligaHablaTestTextos') || '{}'));
    ok(Object.values(textos)[0] && /parque/.test(Object.values(textos)[0][c6.id]), 'lo que dijo el niño se guarda en el dispositivo (para el profe)');
    await page.waitForTimeout(3200);
    const envio = page.__envios.map(e => e || '').join('\n');
    ok(envio.includes('"pruebas"') && envio.includes('"ids"') && envio.includes(plan.ids[0]) && !/parque|gracias|Quiero|mucho|bonito/.test(envio), 'la sincronización lleva puntuaciones e ids de preguntas pero NO lo que dijo el niño');
    await page.click('#tn-ver-profe');
    await page.evaluate(() => { const d = document.querySelector('#tn-informe details'); if (d) d.open = true; });
    const informe = await page.textContent('#tn-informe');
    ok(/Comprensión/.test(informe) && /Vocabulario/.test(informe) && /Conversación/.test(informe) && /Qué trabajar/.test(informe), 'vista del profe con subpuntuaciones y «Qué trabajar»');
    const enunciado = await page.evaluate(() => FRASES_TEST[tn.plan.dialogo.turnos[0].pregunta] ? tnNombreItem(tn.plan.comp[2].id) : '');
    ok(enunciado && informe.includes(enunciado), `el detalle del profe nombra la pregunta sorteada («${enunciado}»)`);
    await page.click('#setup-step-result > button');
    ok(await page.isHidden('#setup-modal'), 'entra en la app al terminar');
    await page.context().close();
  }

  // 2) Medio → nivel 2, no llega a la mini-conversación
  {
    const page = await nuevaPagina('medio');
    await empezar(page);
    const { p, visto, plan } = await contestar(page, MEDIO);
    resultados.medio = p;
    console.log('   medio: ', resumen(p));
    ok(p.nivel === 2, 'respuestas medias → nivel 2');
    ok(visto.includes(plan.conv[3][2].id) && !visto.includes(plan.dialogo.turnos[0].id), 'adaptativo: hace las preguntas de pasado/futuro pero se salta la mini-conversación');
    const v = plan.voc.map(q => p.items.find(i => i.id === q.id));
    ok(v[0].r === 'perfecto' && v[1].r === 'perfecto', `sin artículo y sinónimos valen («${sinArticulo(plan.voc[0].es)}», «${(plan.voc[1].otrasValidas || [])[0] || plan.voc[1].es}»)`);
    ok(v[2].r !== 'otra', `reconocimiento difuso («${sinArticulo(plan.voc[2].es) + sinArticulo(plan.voc[2].es).slice(-1)}» → ${v[2].r})`);
    await page.context().close();
  }

  // 3) Flojo → nivel 0, termina pronto
  {
    const page = await nuevaPagina('flojo');
    await empezar(page);
    const { p, visto, plan } = await contestar(page, FLOJO);
    resultados.flojo = p;
    console.log('   flojo: ', resumen(p));
    ok(p.nivel === 0, 'respuestas flojas → nivel 0');
    const esperado = [...plan.comp.slice(0, 3), ...plan.voc.slice(0, 2), ...plan.conv[1]].map(q => q.id).join();
    ok(visto.join(',') === esperado, `para pronto (2 fallos seguidos por parte; conversación solo el 1er escalón): ${visto.join(',')}`);
    const c1 = p.items.find(i => i.id === plan.conv[1][0].id);
    ok(c1.c === 'RK', `«hola» lento: responde y relacionada, sin rapidez ni frase (${c1.c})`);
    ok(await page.evaluate(() => gameState.xp) === 10, 'nivel 0 empieza con 10 XP');
    await page.context().close();
  }

  // 4) Sin reconocimiento de voz → el adulto valora con 3 botones
  {
    const page = await nuevaPagina('adulto', { sr: false });
    await empezar(page);
    const { p, visto, plan } = await contestar(page, FUERTE, { adulto: q => q.es ? 2 : (q.tipo === 'pasado' || q.tipo === 'futuro' ? 1 : 2) });
    resultados.adulto = p;
    console.log('   adulto:', resumen(p));
    ok(p.modo === 'adulto', 'sin reconocimiento: modo adulto');
    ok(p.items.filter(i => i.b === 'conv').every(i => ['frases', 'sueltas', 'nr'].includes(i.r)), 'las preguntas de conversación se valoran con No responde / Palabras sueltas / Frases');
    ok(p.nivel >= 2 && visto.includes(plan.dialogo.turnos[0].id), `nivel ${p.nivel} y adaptativo también en modo adulto`);
    ok(await page.evaluate(() => window.__dichos.length > 0), 'la app sigue diciendo las preguntas en voz alta');
    await page.context().close();
  }

  // 5) Micro denegado a mitad → pasa a adulto; "Terminar ahora"
  {
    const page = await nuevaPagina('mixto');
    await empezar(page);
    for (let i = 0; i < 400; i++) {
      const s = await page.evaluate(() => ({ id: tn && tn.actual, espera: !!(tn && tn.esperando), foto: !!document.querySelector('.tn-foto'), mic: !!document.getElementById('tn-mic'), adulto: !!document.getElementById('tn-adulto-0') }));
      if (s.espera && s.foto) { const q = await page.evaluate(id => tn.plan.comp.find(x => x.id === id), s.id); await page.click(`.tn-foto[data-es="${q.ok}"]`); await page.waitForTimeout(80); continue; }
      if (s.espera && s.mic) { await page.evaluate(() => window.__srCola.push({ error: 'not-allowed' })); await page.click('#tn-mic'); await page.waitForTimeout(300); continue; }
      if (s.espera && s.adulto) { break; }
      await page.waitForTimeout(30);
    }
    ok(await page.isVisible('#tn-adulto-2'), 'micro denegado → aparecen los botones del adulto en la misma pregunta');
    await page.click('#tn-adulto-2');
    await page.waitForFunction(() => tn && tn.actual === tn.plan.voc[1].id && tn.esperando);
    await page.click('#tn-terminar');
    await page.waitForSelector('#setup-step-result:not(.hidden)');
    const p = await page.evaluate(() => gameState.pruebas[0]);
    console.log('   mixto: ', resumen(p));
    ok(p.modo === 'mixto' && p.completo === false && p.items.length === 6 && p.ids.length === 20, 'modo mixto, marcado como terminado antes; lo que falta cuenta 0');
    await page.context().close();
  }

  // 6) Perfil antiguo: no se repite el test; repetir desde el panel del profe (3 veces: sin repetir preguntas)
  {
    const viejo = { name: 'Iryna', age: 8, country: 'Ucrania', hobby: 'futbol', level: 1, xp: 700 };
    const page = await nuevaPagina('viejo', { estado: viejo });
    ok(await page.isHidden('#setup-modal'), 'perfil guardado sin test nuevo: entra directamente (no obliga a repetir el test)');
    const gs = await page.evaluate(() => ({ level: gameState.level, xp: gameState.xp, pruebas: gameState.pruebas }));
    ok(gs.level === 1 && gs.xp === 700 && gs.pruebas === undefined, 'el perfil antiguo no cambia');
    const limpio = await page.evaluate(() => ({ g: JSON.parse(localStorage.getItem('ligaHablaVisual')), cab: document.getElementById('header-info').innerText, profe: document.getElementById('teacher-info').innerText }));
    ok(!('age' in limpio.g) && !('country' in limpio.g) && !('hobby' in limpio.g) && limpio.g.name === 'Iryna', 'edad, país y afición del perfil antiguo se descartan (el nombre se queda)');
    ok(!/Ucrania/.test(limpio.cab + limpio.profe), `la cabecera muestra solo el nivel («${limpio.cab}»)`);
    await page.evaluate(() => toggleTeacherModal());
    await page.click('#btn-repetir-test');
    ok(await page.isVisible('#setup-step-test') && await page.isHidden('#setup-step-profile'), 'repetir test desde el panel del profe (sin pedir el perfil otra vez)');
    const { p, plan: plan1 } = await contestar(page, MEDIO);
    const gs2 = await page.evaluate(() => ({ level: gameState.level, xp: gameState.xp, n: gameState.pruebas.length, name: gameState.name }));
    ok(p.nivelAntes === 1 && gs2.level === p.nivel && gs2.xp === 700 && gs2.name === 'Iryna', `repetido: nivel ${p.nivelAntes} → ${p.nivel}, XP no baja (${gs2.xp})`);
    await page.click('#setup-step-result > button');
    await page.evaluate(() => repetirTestNivel());
    const { p: p3, plan: plan2 } = await contestar(page, MEJOR);
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
    await page.evaluate(() => repetirTestNivel());
    const { plan: plan3 } = await contestar(page, FLOJO);
    const rep12 = plan2.ids.filter(id => plan1.ids.includes(id)), rep3 = plan3.ids.filter(id => plan1.ids.includes(id) || plan2.ids.includes(id));
    ok(rep12.length === 0 && rep3.length === 0, `3 tests seguidos sin repetir ninguna pregunta (${plan1.dialogo.titulo} → ${plan2.dialogo.titulo} → ${plan3.dialogo.titulo})${rep12.concat(rep3).length ? ': repite ' + rep12.concat(rep3) : ''}`);
    const fotosComp = pl => pl.comp.map(q => q.ok).join(', ');
    console.log('   «Toca/¿Qué…?» test 1: ' + fotosComp(plan1) + '\n   test 2: ' + fotosComp(plan2) + '\n   test 3: ' + fotosComp(plan3));
    await page.click('#setup-step-result > button');
    await page.evaluate(() => switchTab('progreso'));
    const hist = await page.textContent('#prog-test');
    ok(/\(\+\d+\)/.test(hist) && (await page.$$('#prog-test tbody tr')).length >= 3, '«Mi progreso» muestra el historial de tests con la mejora');
    await page.context().close();
  }

  // 7) Dos dispositivos distintos → preguntas distintas; misma semilla → mismo test
  {
    const planes = [];
    for (const n of [1, 2]) {
      const page = await nuevaPagina('dispositivo' + n);
      await empezar(page);
      await page.waitForFunction(() => tn && tn.plan && tn.esperando);
      planes.push(await page.evaluate(() => ({ ids: tn.plan.ids, sem: tn.plan.sem, comp: tn.plan.comp.map(q => q.texto + ' [' + q.opciones.join(', ') + ']'), pant: document.getElementById('tn-pregunta') ? document.getElementById('tn-pregunta').textContent : '' })));
      await page.context().close();
    }
    const comunes = planes[0].ids.filter(id => planes[1].ids.includes(id));
    console.log('   dispositivo 1: ' + planes[0].comp[0] + '\n   dispositivo 2: ' + planes[1].comp[0]);
    ok(planes[0].sem !== planes[1].sem && comunes.length < 8, `dos dispositivos → tests distintos (${comunes.length} de 20 preguntas en común)`);
    const mismo = [];
    for (const n of [1, 2]) {
      const page = await nuevaPagina('semilla' + n, { semilla: 777 });
      await empezar(page);
      await page.waitForFunction(() => tn && tn.plan && tn.esperando);
      mismo.push(await page.evaluate(() => JSON.stringify(tn.plan)));
      await page.context().close();
    }
    ok(mismo[0] === mismo[1], 'con la misma semilla sale exactamente el mismo test (reproducible)');
  }

  // 8) El nivel no depende de qué preguntas salgan: flojo/medio/fuerte con varias semillas
  {
    const SEM = (process.env.SEMILLAS || '11,2024,31337,424242,987654321,3141592653').split(',').map(Number);
    const tabla = { fuerte: [], medio: [], flojo: [] }, sets = { fuerte: FUERTE, medio: MEDIO, flojo: FLOJO };
    for (const sem of SEM) for (const nom of Object.keys(sets)) {
      const page = await nuevaPagina(nom + '-' + sem, { semilla: sem });
      await empezar(page);
      const { p, plan } = await contestar(page, sets[nom]);
      tabla[nom].push({ sem, nivel: p.nivel, total: p.total, comp: p.comp, voc: p.voc, conv: p.conv, dlg: plan.dialogo.titulo });
      await page.context().close();
    }
    for (const nom of Object.keys(tabla)) console.log(`   ${nom.padEnd(6)}: ` + tabla[nom].map(r => `${r.nivel} (${r.total})`).join(' · '));
    ok(tabla.fuerte.every(r => r.nivel === 3) && tabla.medio.every(r => r.nivel === 2) && tabla.flojo.every(r => r.nivel === 0), `con ${SEM.length} semillas: fuerte → 3, medio → 2, flojo → 0 siempre`);
    resultados.semillas = tabla;
  }
  if (process.env.SALIDA) require('fs').writeFileSync(process.env.SALIDA, JSON.stringify(resultados, null, 1));

  ok(errores.length === 0, 'sin errores de JavaScript' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo bien');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
