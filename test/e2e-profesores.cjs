// Prueba en navegador de los profesores (varias cuentas de docente aparte del administrador), de punta a punta con
// el servidor local (PGlite). Comprueba: el admin crea profesores (clave PROF-… mostrada una vez), crea alumnos en
// una clase, filtra por clase, reasigna y ve el registro; cada profesor entra con SU clave en la misma pantalla,
// solo ve a sus alumnos y crea claves en su clase; el servidor rechaza tocar alumnos de otra clase; un profesor
// desactivado vuelve a la pantalla de acceso.
// Requiere: node test/servidor-local.mjs 8811 (con ALTOYCLARO_CLAVE=profe-local-prueba) y playwright-core + Chrome.
// Uso: node test/e2e-profesores.cjs   (CAPTURAS=1 guarda capturas en /workspace)
const { chromium } = require('playwright-core');
const BASE = process.env.BASE || 'http://localhost:8811/';
const CLAVE_PROFE = process.env.CLAVE_PROFE || 'profe-local-prueba';
const CAPTURAS = !!process.env.CAPTURAS;
let fallos = 0;
const ok = (cond, msg, extra = '') => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg + (extra ? '  ' + extra : '')); if (!cond) fallos++; };

(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
  const errores = [];
  const mk = async (nombre) => {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 1800 } });
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
  const entrarProfe = async (clave, nombre) => {
    const p = await mk(nombre);
    await p.click('#acceso-soy-profe'); await p.fill('#acceso-clave-profe', clave);
    await Promise.all([p.waitForEvent('load'), p.click('#acceso-profe-boton')]); await esperarCarga(p);
    await p.evaluate(() => { gameState.name = 'Profe'; finishSetup(); });
    await p.click('#profe-btn'); await p.waitForTimeout(700);
    return p;
  };
  const alumnos = p => p.$$eval('#admin-lista [data-nino] div.font-bold', els => els.map(e => e.childNodes[0].textContent.trim()).sort());
  const seccion = p => p.$('#admin-titulo >> xpath=..');

  console.log('Profesores (navegador)');
  // 1. Admin: crea dos profesores y alumnos
  const admin = await entrarProfe(CLAVE_PROFE, 'admin');
  ok(await admin.isVisible('#admin-profesores-bloque'), 'admin: ve la sección «Profesores»');
  ok(/administrador/.test(await admin.textContent('#admin-sesion-profe')), 'admin: «Has entrado como administrador»');
  await admin.fill('#prof-nombre', 'Marta'); await admin.fill('#prof-clase', '4.º A'); await admin.click('#prof-crear'); await admin.waitForTimeout(700);
  const claveMarta = (await admin.textContent('#prof-clave-texto')).trim();
  await admin.fill('#prof-nombre', 'Laura'); await admin.fill('#prof-clase', '3.º B'); await admin.click('#prof-crear'); await admin.waitForTimeout(900);
  const claveLaura = (await admin.textContent('#prof-clave-texto')).trim();
  ok(/^PROF-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(claveLaura) && claveLaura !== claveMarta, 'admin crea profesores: clave PROF-XXXX-XXXX-XXXX distinta para cada uno');
  ok(/Por seguridad no se volverá a mostrar/.test(await admin.textContent('#prof-clave-nueva')), 'la clave se muestra una sola vez (aviso)');
  ok(/Laura – 3\.º B/.test(await admin.textContent('#prof-lista')) && /Marta – 4\.º A/.test(await admin.textContent('#prof-lista')), 'lista de profesores con nombre y clase');
  ok(await admin.isVisible('#admin-crear-profesor'), 'admin: puede elegir la clase al crear un alumno');
  await admin.fill('#admin-alias', 'Carla'); await admin.click('text=Crear clave'); await admin.waitForTimeout(700);
  await admin.selectOption('#admin-crear-profesor', { label: 'Laura – 3.º B' });
  await admin.fill('#admin-alias', 'Dani'); await admin.click('text=Crear clave'); await admin.waitForTimeout(900);
  await admin.fill('#prof-nombre', 'Pablo'); await admin.fill('#prof-clase', '5.º C'); await admin.click('#prof-crear'); await admin.waitForTimeout(900);
  if (CAPTURAS) { await admin.$eval('#admin-profesores-bloque', e => e.scrollIntoView()); await (await admin.$('#admin-profesores-bloque')).screenshot({ path: '/workspace/shot-profesores-admin.png' }); }

  // 2. Marta entra con su clave y crea a Bruno
  const marta = await entrarProfe(claveMarta, 'marta');
  await marta.fill('#admin-alias', 'Bruno'); await marta.click('text=Crear clave'); await marta.waitForTimeout(900);
  ok(JSON.stringify(await alumnos(marta)) === '["Bruno"]', 'Marta: solo ve a su alumno', JSON.stringify(await alumnos(marta)));

  // 3. Laura entra con su clave (minúsculas): solo su clase, sin «Profesores»
  const laura = await entrarProfe(claveLaura.toLowerCase(), 'laura');
  ok(await laura.isHidden('#admin-profesores-bloque'), 'Laura: no ve la sección «Profesores»');
  ok(await laura.isHidden('#admin-filtro-bloque') && await laura.isHidden('#admin-crear-profesor'), 'Laura: sin filtro de clases ni selector de clase');
  ok(/Laura – 3\.º B/.test(await laura.textContent('#admin-sesion-profe')), 'Laura: «Has entrado como Laura – 3.º B»');
  ok(/3\.º B/.test(await laura.textContent('#admin-titulo')), 'título «Claves de la clase · 3.º B»');
  ok(JSON.stringify(await alumnos(laura)) === '["Dani"]', 'Laura: solo ve a Dani (creado por el admin en su clase), no a Carla ni a Bruno', JSON.stringify(await alumnos(laura)));
  if (CAPTURAS) { const s = await seccion(laura); await s.scrollIntoViewIfNeeded(); await s.screenshot({ path: '/workspace/shot-profe-login-docente.png' }); }
  await laura.fill('#admin-alias', 'Ana'); await laura.click('text=Crear clave'); await laura.waitForTimeout(900);
  const codigoAna = (await laura.textContent('#admin-codigo-texto')).trim();
  ok(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(codigoAna), 'Laura crea la clave de Ana', codigoAna);
  ok(JSON.stringify(await alumnos(laura)) === '["Ana","Dani"]', 'Laura: ve a Ana y Dani');
  if (CAPTURAS) { const s = await seccion(laura); await s.scrollIntoViewIfNeeded(); await s.screenshot({ path: '/workspace/shot-claves-docente.png' }); }
  // el niño entra con la clave que creó Laura
  const nino = await mk('ana');
  await nino.fill('#login-codigo', codigoAna);
  await Promise.all([nino.waitForEvent('load', { timeout: 8000 }).catch(() => {}), nino.click('#login-boton')]); await esperarCarga(nino);
  ok(await nino.evaluate(() => rolActual === 'nino' && syncMeta.alias === 'Ana'), 'Ana entra con la clave creada por su profesora');

  // 4. El servidor no deja a Laura tocar alumnos de otra clase (aunque se salte la interfaz)
  const idBruno = await marta.evaluate(() => document.getElementById('admin-lista')._ninos[0].id);
  const intentos = await laura.evaluate(async id => {
    const r = {};
    for (const accion of ['borrar', 'regenerar', 'revocar', 'entregar', 'reasignar', 'profesores', 'profesor_crear', 'auditoria']) {
      const x = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion, id, pegatina: 'hola', nombre: 'X' }) });
      r[accion] = x.status;
    }
    return r;
  }, idBruno);
  ok(Object.values(intentos).every(s => s === 403 || s === 404), 'Laura no puede borrar/regenerar/anular/entregar/reasignar a Bruno ni gestionar profesores', JSON.stringify(intentos));
  await marta.click('text=Actualizar lista'); await marta.waitForTimeout(700);
  ok(JSON.stringify(await alumnos(marta)) === '["Bruno"]', 'Bruno sigue intacto en la clase de Marta');

  // 5. Admin: ve todo, filtra por clase, reasigna y ve el registro
  await admin.click('text=Actualizar lista'); await admin.waitForTimeout(800);
  ok(JSON.stringify(await alumnos(admin)) === '["Ana","Bruno","Carla","Dani"]', 'admin ve a todos los alumnos', JSON.stringify(await alumnos(admin)));
  await admin.selectOption('#admin-filtro', { label: 'Laura – 3.º B (2)' }); await admin.waitForTimeout(200);
  ok(JSON.stringify(await alumnos(admin)) === '["Ana","Dani"]', 'filtro por clase: Laura – 3.º B');
  await admin.selectOption('#admin-filtro', '_'); await admin.waitForTimeout(200);
  ok(JSON.stringify(await alumnos(admin)) === '["Carla"]', 'filtro: alumnos del administrador (sin profesor)');
  await admin.selectOption('#admin-lista [data-nino] select', { label: 'Laura – 3.º B' }); await admin.waitForTimeout(900);
  await laura.click('text=Actualizar lista'); await laura.waitForTimeout(700);
  ok(JSON.stringify(await alumnos(laura)) === '["Ana","Carla","Dani"]', 'admin reasigna a Carla a Laura y ella ya la ve');
  await admin.click('#admin-auditoria summary'); await admin.waitForTimeout(800);
  const reg = await admin.textContent('#auditoria-lista');
  ok(/Laura – 3\.º B.*creó la clave de.*Ana/s.test(reg) && /creó al profesor/.test(reg) && /cambió de clase a/.test(reg), 'registro de cambios: quién creó qué');
  ok(!reg.includes(claveLaura) && !reg.includes(codigoAna), 'el registro no muestra claves');

  // 6. Admin desactiva a Marta: su sesión cae y no puede volver a entrar
  await admin.evaluate(() => { const p = document.getElementById('prof-lista')._profs.find(x => x.nombre === 'Marta'); return profActivo(p.id, false); }); await admin.waitForTimeout(700);
  ok(/desactivado/.test(await admin.textContent('#prof-lista')), 'admin: Marta aparece desactivada');
  await marta.click('text=Actualizar lista'); await marta.waitForTimeout(1500);
  ok(await marta.evaluate(() => document.documentElement.classList.contains('sin-acceso') && !document.getElementById('acceso-formulario').classList.contains('hidden')), 'Marta desactivada: vuelve a la pantalla de acceso');
  await marta.click('#acceso-soy-profe').catch(() => {}); await marta.fill('#acceso-clave-profe', claveMarta); await marta.click('#acceso-profe-boton'); await marta.waitForTimeout(800);
  ok(/desactivada/.test(await marta.textContent('#acceso-profe-mensaje')), 'Marta no puede volver a entrar (clave desactivada)');

  ok(!errores.length, 'sin errores de JavaScript', errores.join(' | '));
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTodo correcto');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
