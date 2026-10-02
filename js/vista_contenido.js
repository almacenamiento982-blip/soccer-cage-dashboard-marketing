// Sección Plan de contenido: Sheet en vivo, filtrado por periodo, y comparación antes / desde el 15-sep.
import { json, parrilla, SHEET_ID } from './datos.js?v=20261002i';
import * as K from './calculos.js?v=20261002i';
import * as C from './componentes.js?v=20261002i';
import { CORTE, rangos, rangoActivo, periodo, hoyISO, enRango, sumarDias } from './periodo.js?v=20261002i';
import { IG_DE_PESTANA } from './vista_instagram.js?v=20261002i';
const { n0, n1, pct, fecha, esc } = K;

const mes = (k) => { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 15).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }); };
const corta = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const urlFila = (gid, fila) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${gid}&range=A${fila}`;
const urlSheet = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
export const isoDe = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;

// Registros consolidados de todas las pestañas, sin duplicados (clave = pestaña + fila)
export function consolidar(p) {
  const vistos = new Set(); const regs = [];
  p.tabs.forEach(t => t.registros.forEach(r => { const k = K.claveRegistro(r); if (!vistos.has(k)) { vistos.add(k); regs.push({ ...r, _gid: t.gid, _iso: isoDe(r._fecha) }); } }));
  return regs;
}

// Planificación antes / desde el corte por pestaña (lo que la usan Contenido, Evolución y Resumen)
export function comparacionContenido(p, hoy = hoyISO()) {
  return p.tabs.map(t => {
    const regs = t.registros.map(r => ({ ...r, _iso: isoDe(r._fecha) })).filter(r => r._iso);
    const activos = regs.filter(r => K.grupoDe(r.Status) !== 'fuera');
    const antes = activos.filter(r => r._iso < CORTE), desde = activos.filter(r => r._iso >= CORTE);
    const vencidas = activos.filter(r => r._iso <= hoy);
    const distintos = (arr, campo) => new Set(arr.map(r => (r[campo] || '').trim()).filter(Boolean)).size;
    return {
      t, primera: regs.length ? regs.map(r => r._iso).sort()[0] : null,
      antes: antes.length, desde: desde.length,
      pilares: t.columnas.includes('Pilar') ? distintos(desde, 'Pilar') : null,
      publicos: t.columnas.includes('Publico') ? distintos(desde, 'Publico') : null,
      vencidas: vencidas.length,
      vencidasPublicadas: vencidas.filter(r => K.grupoDe(r.Status) === 'publicada').length,
      vencidasProgramadas: vencidas.filter(r => K.grupoDe(r.Status) === 'programada').length,
    };
  });
}

export function tablaPlanificacion(filas) {
  return C.tabla([
    { t: 'Cuenta', k: x => `<b>${esc(x.t.cuenta)}</b>` },
    { t: 'Primera fecha planificada', k: x => x.primera ? fecha(x.primera) : '—' },
    { t: 'Piezas con fecha antes del 15-sep', num: 1, k: x => x.antes ? n0(x.antes) : '<span class="vacio">sin registro en el Sheet</span>' },
    { t: 'Piezas con fecha desde el 15-sep', num: 1, k: x => n0(x.desde) },
    { t: 'Pilares distintos (desde el 15-sep)', num: 1, k: x => x.pilares == null ? '<span class="vacio">no registrado</span>' : n0(x.pilares) },
    { t: 'Públicos distintos (desde el 15-sep)', num: 1, k: x => x.publicos == null ? '<span class="vacio">no registrado</span>' : n0(x.publicos) },
  ], filas);
}

export function tablaCumplimiento(filas) {
  return C.tabla([
    { t: 'Cuenta', k: x => `<b>${esc(x.t.cuenta)}</b>` },
    { t: 'Piezas con fecha ya cumplida', num: 1, k: x => n0(x.vencidas) },
    { t: 'Marcadas como publicadas', num: 1, k: x => n0(x.vencidasPublicadas) },
    { t: 'Programadas', num: 1, k: x => n0(x.vencidasProgramadas) },
    { t: 'Cumplimiento según el Sheet', k: x => x.vencidas ? `${C.barra(x.vencidasPublicadas / x.vencidas)}<small class="mono">${pct(x.vencidasPublicadas / x.vencidas, 0)}</small>` : '—' },
  ], filas);
}

function graficoEstados(id, tabs) {
  C.grafico(id, { type: 'bar', data: { labels: tabs.map(t => t.cuenta),
    datasets: K.GRUPOS.map(g => ({ label: g.nombre, backgroundColor: g.color, data: tabs.map(t => t.registros.filter(r => K.grupoDe(r.Status) === g.id).length) })).filter(d => d.data.some(Boolean)) },
    options: { indexAxis: 'y', plugins: { valores: { mostrar: true } }, scales: { x: { stacked: true, title: { display: true, text: 'Piezas' } }, y: { stacked: true } } } });
}
export { graficoEstados };

// «Piezas hechas» = producidas: por aprobar, aprobadas, programadas o publicadas
const HECHAS = ['pend_aprob', 'aprobada', 'programada', 'publicada'];
export const hecha = (x) => HECHAS.includes(K.grupoDe(x.Status));

export function piezasHechas(tabs) {
  return tabs.map(t => {
    const h = t.registros.filter(hecha);
    const f = (re) => h.filter(x => re.test(x.Format || '')).length;
    const fotos = f(/photo/i), carruseles = f(/carousel/i), flyers = f(/graphic|flyer/i), reels = f(/reel/i);
    const distintos = (campo) => t.columnas.includes(campo) ? new Set(h.map(x => (x[campo] || '').trim()).filter(Boolean)).size : null;
    return { t, h, total: h.length, fotos, carruseles, flyers, reels, otros: h.length - fotos - carruseles - flyers - reels, pilares: distintos('Pilar'), publicos: distintos('Publico') };
  });
}

export function tablaHechas(filas) {
  const tot = (k) => filas.reduce((s, x) => s + (x[k] || 0), 0);
  const todas = [...filas, { t: { cuenta: 'Total' }, total: tot('total'), fotos: tot('fotos'), carruseles: tot('carruseles'), flyers: tot('flyers'), reels: tot('reels'), otros: tot('otros'), pilares: null, publicos: null, _total: true }];
  return C.tabla([
    { t: 'Cuenta', k: x => x._total ? '<b>Total</b>' : `<b>${esc(x.t.cuenta)}</b><br><small><a href="https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${x.t.gid}" target="_blank" rel="noopener">pestaña «${esc(x.t.nombre)}» ↗</a></small>` },
    { t: 'Piezas hechas', num: 1, k: x => `<b>${n0(x.total)}</b>` },
    { t: 'Posts de foto', num: 1, k: x => n0(x.fotos) },
    { t: 'Carruseles', num: 1, k: x => n0(x.carruseles) },
    { t: 'Flyers', num: 1, k: x => n0(x.flyers) },
    { t: 'Reels', num: 1, k: x => n0(x.reels) },
    { t: 'Otros formatos', num: 1, k: x => n0(x.otros) },
    { t: 'Pilares trabajados', num: 1, k: x => x._total ? '' : x.pilares == null ? '<span class="vacio">no registrado</span>' : n0(x.pilares) },
    { t: 'Públicos', num: 1, k: x => x._total ? '' : x.publicos == null ? '<span class="vacio">no registrado</span>' : n0(x.publicos) },
  ], todas);
}

// Gráfico de piezas hechas por cuenta y formato (lo usan Contenido y Resumen)
export function graficoHechas(id, tabs) {
  const filas = piezasHechas(tabs);
  const series = [['Posts de foto', 'fotos', '#111214'], ['Carruseles', 'carruseles', '#B8862F'], ['Flyers', 'flyers', '#7F8792'], ['Reels', 'reels', '#2F5D8A'], ['Otros formatos', 'otros', '#C9CDD2']];
  C.grafico(id, { type: 'bar', data: { labels: filas.map(x => x.t.cuenta), datasets: series.map(([n, k, c]) => ({ label: n, backgroundColor: c, data: filas.map(x => x[k]) })).filter(d => d.data.some(Boolean)) },
    options: { indexAxis: 'y', plugins: { valores: { mostrar: true } }, scales: { x: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Piezas hechas' } }, y: { stacked: true } } } });
}

const filtrosCont = { cuenta: '', grupo: '', formato: '', pilar: '', mes: '', q: '' };
let cuentaSel = '';   // selector de cuenta de la sección: '' = todas
export async function contenido(v) {
  const [p, ig] = await Promise.all([parrilla(), json('instagram').catch(() => null)]);
  const hoy = hoyISO();
  const modo = periodo().modo, ra = rangoActivo(hoy), r = rangos(hoy);
  const tabsCuenta = cuentaSel ? p.tabs.filter(t => t.clave === cuentaSel) : p.tabs;
  const todos = consolidar({ tabs: tabsCuenta });
  // periodo: «todo» incluye las piezas sin fecha; los demás modos filtran por la fecha planificada
  const regs = modo === 'todo' || modo === 'comparar' || (modo === 'personalizado' && !ra.desde) ? todos : todos.filter(x => enRango(x._iso, ra));
  const tabsF = tabsCuenta.map(t => ({ ...t, registros: regs.filter(x => x._clave === t.clave) }));
  const conPilar = tabsF.filter(t => t.columnas.includes('Pilar'));
  const sinPilar = tabsF.filter(t => !t.columnas.includes('Pilar'));
  const ops = (arr) => [...new Set(arr.filter(Boolean))].sort();
  const meses = ops(regs.filter(hecha).map(x => x._iso && x._iso.slice(0, 7)));
  const posibles = new Map(); todos.forEach(x => { const k = `${x._clave}|${x.Date}|${(x.Hook || x.Description || '').toLowerCase()}`; posibles.set(k, (posibles.get(k) || 0) + 1); });
  const dup = [...posibles.values()].filter(n => n > 1).reduce((s, n) => s + n - 1, 0);
  const cmp = comparacionContenido({ tabs: tabsCuenta }, hoy);
  const hechas = piezasHechas(tabsF);
  const suma = (k) => hechas.reduce((s, x) => s + x[k], 0);
  const totHechas = suma('total');
  const enV = (x, w) => enRango(x._iso, w);
  const planA = todos.filter(x => enV(x, r.antes) && K.grupoDe(x.Status) !== 'fuera'), planD = todos.filter(x => enV(x, r.despues) && K.grupoDe(x.Status) !== 'fuera');
  const etiquetaPeriodo = modo === 'todo' || modo === 'comparar' ? 'todo el plan' : ra.etiqueta;
  const nombreSel = cuentaSel ? p.tabs.find(t => t.clave === cuentaSel)?.cuenta : 'las 4 cuentas';
  const finIg = ig ? K.finIG(ig) : null;
  const semanas = ig ? K.semanal([], '2026-07-01', finIg).map(s => s.semana) : [];

  v.innerHTML = C.cabecera({ kicker: 'Plan de contenido', titulo: 'Plan de contenido', extra: C.badgeParrilla(p) + ` <a class="btn oro" href="${urlSheet}" target="_blank" rel="noopener">Abrir el Sheet ↗</a>`,
    texto: 'Piezas de contenido de Athletum (Juve Miami), Juve Camps USA, Juve Camps MEXICO y Juve Las Vegas, leídas en vivo del Sheet «Social Media Content Plan» (solo lectura).' })
  + (p.origen === 'copia' ? C.aviso(`No se pudo leer el Sheet en vivo (${esc(p.error)}). Se muestra la copia guardada el ${fecha(p.leido)}.`, 'rojo') : '')
  + C.guia({ muestra: 'Cuántas piezas de contenido hay hechas, cómo se reparten por cuenta, formato, pilar y público, y el detalle de cada pieza.',
    estado: `${n0(totHechas)} piezas hechas en ${nombreSel} (${etiquetaPeriodo}).`,
    siguiente: 'Aprobar y programar las piezas producidas en el Sheet.' })
  // filtros que afectan a toda la sección, junto a los datos
  + `<div class="periodo" role="group" aria-label="Cuenta"><span class="t">Cuenta</span><div class="tabs">
      <button type="button" data-cc="" aria-pressed="${!cuentaSel}">Todas</button>${p.tabs.map(t => `<button type="button" data-cc="${t.clave}" aria-pressed="${cuentaSel === t.clave}">${esc(t.cuenta)}</button>`).join('')}</div>
      <span class="rango">Filtra todos los indicadores, gráficos y tablas de esta sección.</span></div>`
  + C.barraPeriodo(hoy, '· Filtra por la fecha planificada de cada pieza.')
  // 1. avance general
  + C.bloque(`1 · Avance general · ${etiquetaPeriodo}`, `Piezas producidas en ${esc(nombreSel)}. Cada pieza se cuenta una vez; los formatos suman el total. ${C.ayuda('Pieza hecha = producida: con estado por aprobar, aprobada, programada o publicada en el Sheet.')}`,
    `<div class="grid g-avance">
      ${C.kpi({ valor: n0(totHechas), tipo: 'actividad', etiqueta: 'Piezas hechas', detalle: `En ${n0(hechas.filter(x => x.total).length)} ${hechas.filter(x => x.total).length === 1 ? 'cuenta' : 'cuentas'}` })}
      <div class="card kpi sec"><div class="v">${n0(suma('carruseles'))}</div><div class="l">Carruseles</div></div>
      <div class="card kpi sec"><div class="v">${n0(suma('fotos'))}</div><div class="l">Posts de foto</div></div>
      <div class="card kpi sec"><div class="v">${n0(suma('flyers'))}</div><div class="l">Flyers</div></div>
      <div class="card kpi sec"><div class="v">${n0(suma('reels') + suma('otros'))}</div><div class="l">Reels y otros formatos</div></div>
    </div>`
    + (modo === 'comparar' ? `<div class="grid g2" style="margin-top:16px">
      ${C.comparativa({ etiqueta: 'Piezas planificadas con fecha en la ventana', antes: planA.length, despues: planD.length, tipo: 'plan', detalle: `${r.despues.dias} días antes → ${r.despues.dias} días desde el 15-sep` })}
      ${C.comparativa({ etiqueta: 'Cuentas con parrilla en la ventana', antes: new Set(planA.map(x => x._clave)).size, despues: new Set(planD.map(x => x._clave)).size, tipo: 'actividad', detalle: `De ${tabsCuenta.length} ${tabsCuenta.length === 1 ? 'pestaña' : 'pestañas'} del Sheet` })}
    </div>` : ''))
  // 2. desglose
  + C.bloque(`2 · Cómo se reparten las ${n0(totHechas)} piezas`, `Primero por cuenta, después por formato, pilar, público y mes. Cada gráfico desglosa el mismo total. ${sinPilar.map(t => esc(t.cuenta)).join(', ')}${sinPilar.length ? ': pilar y público no registrados en su pestaña.' : ''}`,
    tablaHechas(hechas)
    + `<div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>Por formato</h3><p class="sub">Piezas hechas por formato, apiladas por cuenta.</p>${C.lienzo('gFormato', '', 'Piezas por formato y cuenta')}</div>
      <div class="card"><h3>Por mes de publicación</h3><p class="sub">Piezas hechas según su mes planificado.</p>${C.lienzo('gMesCont', '', 'Piezas planificadas por mes')}</div>
      <div class="card"><h3>Por pilar ${C.ayuda('Cada cuenta usa su propio sistema de pilares (por ejemplo, el P3 de Las Vegas es «Competición» y el de Camps es «Autoridad»): se comparan dentro de cada cuenta.')}</h3><p class="sub">Piezas hechas por pilar de contenido.</p>${conPilar.length ? C.lienzo('gPilar', 'alto', 'Piezas por pilar y cuenta') : '<p class="vacio">Pilar no registrado en esta pestaña.</p>'}</div>
      <div class="card"><h3>Por público</h3><p class="sub">Piezas hechas según el público al que se dirigen.</p>${conPilar.length ? conPilar.map(t => `<p class="sub" style="margin:8px 0 4px"><b>${esc(t.cuenta)}</b></p>` + C.tabla([{ t: 'Público', k: x => esc(x[0]) }, { t: 'Piezas', num: 1, k: x => n0(x[1]) }],
        K.contar(t.registros.filter(hecha), 'Publico'))).join('') : '<p class="vacio">Público no registrado en esta pestaña.</p>'}</div>
    </div>${C.lectura(lecturaFormatos(regs))}`)
  // 3. antes y después
  + C.bloque('3 · Antes y desde el 15 de septiembre', 'Lo <b>planificado</b> en el Sheet y lo efectivamente <b>publicado en Instagram</b> son métricas distintas y se muestran por separado.',
    `<h3 style="margin:4px 0 8px">Planificación en el Sheet ${C.tipo('plan')}</h3>${tablaPlanificacion(cmp)}
     ${ig ? `<div class="card" style="margin-top:16px"><h3>Publicaciones reales en Instagram por semana ${C.tipo('resultado')}</h3><p class="sub">Publicaciones del feed leídas de la API, del ${fecha('2026-07-01')} al ${fecha(finIg)}. No es la parrilla: es lo publicado. La semana que empieza el 14-sep (contiene el corte) queda a la derecha de la línea.</p>${C.lienzo('gPubReal', '', 'Publicaciones reales por semana y cuenta')}</div>` : ''}
     ${C.lectura(lecturaContenido(cmp))}`)
  // 4. detalle
  + `<section class="bloque"><div class="bloque-cab"><h2>4 · Detalle de las piezas · ${etiquetaPeriodo}</h2></div><p class="intro">Filtra por estado, formato, pilar o mes, o busca por texto. Cada fila enlaza a su material y a su fila en el Sheet. La producción y la publicación son procesos distintos y tienen su propia columna.${dup ? ` <b>Atención:</b> ${dup} ${dup === 1 ? 'pieza parece repetida' : 'piezas parecen repetidas'} en el Sheet (misma cuenta, fecha y texto).` : ' No se encontraron piezas repetidas.'}</p>
    <div class="filtros" role="search">
      <label for="fGrupo">Producción<select id="fGrupo"><option value="">Todos</option>${K.GRUPOS.map(g => `<option value="${g.id}">${esc(g.nombre)}</option>`).join('')}</select></label>
      <label for="fFormato">Formato<select id="fFormato"><option value="">Todos</option>${ops(regs.map(x => x.Format)).map(f => `<option>${esc(f)}</option>`).join('')}</select></label>
      <label for="fPilar">Pilar<select id="fPilar"><option value="">Todos</option>${ops(regs.map(x => x.Pilar)).map(f => `<option>${esc(f)}</option>`).join('')}</select></label>
      <label for="fMes">Mes<select id="fMes"><option value="">Todos</option>${ops(regs.map(x => x._iso && x._iso.slice(0, 7))).map(m => `<option value="${m}">${esc(mes(m))}</option>`).join('')}</select></label>
      <label for="fQ">Buscar<input type="search" id="fQ" placeholder="Texto, hook, copy…"></label>
      <button type="button" class="btn" id="fLimpiar">Quitar filtros</button>
    </div>
    <p class="fuente" id="fCuenta-n" aria-live="polite"></p><div id="tablaPiezas"></div><div class="mas"><button type="button" class="btn" id="fMas" hidden>Mostrar 40 más</button></div></section>`
  + C.volver();

  // selector de cuenta: vuelve a pintar la sección conservando la posición
  v.querySelectorAll('[data-cc]').forEach(b => b.addEventListener('click', () => { cuentaSel = b.dataset.cc; window.dispatchEvent(new CustomEvent('periodo')); }));

  // gráficos
  const activos = (t) => t.registros.filter(hecha);
  const barrasPor = (id, campo, tabs) => {
    const totales = {}; tabs.forEach(t => activos(t).forEach(x => { const k = x[campo] || '(sin dato)'; totales[k] = (totales[k] || 0) + 1; }));
    const etiquetas = Object.keys(totales).sort((a, b) => totales[b] - totales[a]);
    C.grafico(id, { type: 'bar', data: { labels: etiquetas, datasets: tabs.map(t => ({ label: t.cuenta, backgroundColor: C.COLOR[t.clave], data: etiquetas.map(e => activos(t).filter(x => (x[campo] || '(sin dato)') === e).length) })) },
      options: { indexAxis: 'y', plugins: { valores: { mostrar: true }, legend: { display: tabs.length > 1 } }, scales: { x: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Piezas' } }, y: { stacked: true } } } });
  };
  barrasPor('gFormato', 'Format', tabsF);
  if (conPilar.length) barrasPor('gPilar', 'Pilar', conPilar);
  C.grafico('gMesCont', { type: 'bar', data: { labels: meses.map(mes), datasets: tabsF.map(t => { const m = Object.fromEntries(K.porMes(t.registros.filter(hecha))); return { label: t.cuenta, backgroundColor: C.COLOR[t.clave], data: meses.map(k => m[k] || 0) }; }) },
    options: { plugins: { valores: { mostrar: true }, legend: { display: tabsF.length > 1 } }, scales: { x: { stacked: true, title: { display: true, text: 'Mes planificado' } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Piezas' } } } } });
  if (ig) {
    const cuentas = tabsCuenta.map(t => ig.cuentas.find(c => c.usuario === IG_DE_PESTANA[t.clave])).filter(Boolean);
    C.grafico('gPubReal', { type: 'bar', data: { labels: semanas.map(corta), datasets: cuentas.map(c => ({ label: '@' + c.usuario, backgroundColor: C.COLOR[c.usuario], data: K.semanal(c.publicaciones, '2026-07-01', finIg).map(s => s.n) })) },
      options: { plugins: { corte: { indice: C.indiceCorte(semanas.map(s => sumarDias(s, 6))) }, valores: { mostrar: true } }, scales: { x: { stacked: true, title: { display: true, text: 'Semana (inicio, lunes)' } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Publicaciones en el feed' } } } } });
  }

  // tabla filtrable
  const ids = { grupo: 'fGrupo', formato: 'fFormato', pilar: 'fPilar', mes: 'fMes', q: 'fQ' };
  const enlaces = (x) => [x.Material, x['Material 2 opcional']].flatMap(y => (y || '').match(/https?:\/\/\S+/g) || []);
  const PAGINA = 40; let limite = PAGINA;
  const pintar = (reiniciar = true) => {
    if (!v.isConnected) return;
    if (reiniciar) limite = PAGINA;
    Object.entries(ids).forEach(([k, id]) => { filtrosCont[k] = document.getElementById(id).value; });
    const f = filtrosCont, q = f.q.trim().toLowerCase();
    const sel = regs.filter(x => (!f.grupo || K.grupoDe(x.Status) === f.grupo) && (!f.formato || x.Format === f.formato)
      && (!f.pilar || x.Pilar === f.pilar) && (!f.mes || (x._iso && x._iso.slice(0, 7) === f.mes))
      && (!q || [x.Content, x.Description, x.Hook, x.Copy, x.Objetivo].some(y => (y || '').toLowerCase().includes(q))))
      .sort((a, b) => (a._iso || '9').localeCompare(b._iso || '9'));
    const mas = document.getElementById('fMas'); mas.hidden = sel.length <= limite;
    mas.textContent = `Mostrar ${Math.min(PAGINA, sel.length - limite)} más`;
    document.getElementById('fCuenta-n').textContent = `${sel.length} de ${regs.length} piezas${sel.length > limite ? ` · se muestran las primeras ${limite}` : ''}`;
    document.getElementById('tablaPiezas').innerHTML = C.tabla([
      { t: 'Fecha', k: x => x._iso ? fecha(x._iso) : '<span class="vacio">sin fecha</span>' },
      { t: 'Cuenta', k: x => esc(x._cuenta) },
      { t: 'Formato', k: x => esc(x.Format || '—') },
      { t: 'Pieza', nt: 1, k: x => `<b>${esc(x.Hook || x.Content || '')}</b>${x.Description ? `<br><small>${esc(x.Description.slice(0, 140))}${x.Description.length > 140 ? '…' : ''}</small>` : ''}` },
      { t: 'Pilar', k: x => esc(x.Pilar || '—') },
      { t: 'Producción', k: x => { const g = K.GRUPOS.find(y => y.id === K.grupoDe(x.Status)); return `<span class="est ${{ publicada: 'implementado', programada: 'planificado', aprobada: 'progreso', pend_aprob: 'progreso', fuera: 'alerta' }[g.id] || 'validacion'}" title="${esc(g.nombre)}">${esc(x.Status || 'Sin estado')}</span>`; } },
      { t: 'Publicación', k: x => x['Publication Status'] ? `<span class="chip">${esc(x['Publication Status'])}</span>` : '<span class="vacio">—</span>' },
      { t: 'Enlaces', k: x => [...enlaces(x).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Material${enlaces(x).length > 1 ? ' ' + (i + 1) : ''} ↗</a>`), `<a href="${urlFila(x._gid, x._fila)}" target="_blank" rel="noopener">Fila ${x._fila} ↗</a>`].join('<br>') },
    ], sel.slice(0, limite), { vacio: 'Ninguna pieza coincide con los filtros.' });
    if (document.documentElement.lang === 'en') import('./i18n.js?v=20261002i').then(m => m.traducir(document.getElementById('tablaPiezas')));
  };
  Object.entries(ids).forEach(([k, id]) => { const el = document.getElementById(id); el.value = [...el.options || []].some(o => o.value === filtrosCont[k]) || id === 'fQ' ? filtrosCont[k] : ''; el.addEventListener(id === 'fQ' ? 'input' : 'change', () => pintar()); });
  document.getElementById('fMas').addEventListener('click', () => { limite += PAGINA; pintar(false); });
  document.getElementById('fLimpiar').addEventListener('click', () => { Object.values(ids).forEach(id => { document.getElementById(id).value = ''; }); pintar(); });
  pintar();
}

export function lecturaContenido(cmp) {
  const sinAntes = cmp.filter(x => !x.antes).map(x => x.t.cuenta);
  const conAntes = cmp.filter(x => x.antes).map(x => `${x.t.cuenta} (desde el ${fecha(x.primera)})`);
  const desde = cmp.reduce((s, x) => s + x.desde, 0);
  return `${conAntes.length ? `Antes del 15-sep solo ${K.lista(conAntes)} tenía piezas planificadas en el Sheet.` : 'Antes del 15-sep no hay piezas planificadas en el Sheet.'} ${sinAntes.length ? `Desde el corte se sumaron las parrillas de ${K.lista(sinAntes)}.` : ''} Hoy hay ${n0(desde)} piezas planificadas con fecha desde el 15-sep.`;
}

function lecturaFormatos(regs) {
  const act = regs.filter(hecha);
  if (!act.length) return '';
  const c = K.contar(act, 'Format', '(sin formato)');
  const top = c.slice(0, 2).map(([f, n]) => `${esc(f)} (${n0(n)}, ${pct(n / act.length, 0)})`).join(' y ');
  return `Los formatos que concentran la producción son ${top}, sobre ${n0(act.length)} piezas hechas.`;
}
