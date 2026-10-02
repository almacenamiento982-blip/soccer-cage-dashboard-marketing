// Sección Plan de contenido: Sheet en vivo, filtrado por periodo, y comparación antes / desde el 15-sep.
import { json, parrilla, SHEET_ID } from './datos.js?v=20261002a';
import * as K from './calculos.js?v=20261002a';
import * as C from './componentes.js?v=20261002a';
import { CORTE, rangos, rangoActivo, periodo, hoyISO, enRango, sumarDias } from './periodo.js?v=20261002a';
import { IG_DE_PESTANA } from './vista_instagram.js?v=20261002a';
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

const filtrosCont = { cuenta: '', grupo: '', formato: '', pilar: '', mes: '', q: '' };
export async function contenido(v) {
  const [p, ig] = await Promise.all([parrilla(), json('instagram').catch(() => null)]);
  const hoy = hoyISO();
  const modo = periodo().modo, ra = rangoActivo(hoy), r = rangos(hoy);
  const todos = consolidar(p);
  // periodo: «todo» incluye las piezas sin fecha; los demás modos filtran por la fecha planificada
  const regs = modo === 'todo' || modo === 'comparar' || (modo === 'personalizado' && !ra.desde) ? todos : todos.filter(x => enRango(x._iso, ra));
  const tabsF = p.tabs.map(t => ({ ...t, registros: regs.filter(x => x._clave === t.clave) }));
  const rp = K.resumenParrilla(regs);
  const porCuenta = tabsF.map(t => ({ t, r: K.resumenParrilla(t.registros) }));
  const conPilar = tabsF.filter(t => t.columnas.includes('Pilar'));
  const sinPilar = tabsF.filter(t => !t.columnas.includes('Pilar'));
  const ops = (arr) => [...new Set(arr.filter(Boolean))].sort();
  const meses = ops(regs.map(x => x._iso && x._iso.slice(0, 7)));
  const pubStatus = tabsF.filter(t => t.columnas.includes('Publication Status')).map(t => ({ cuenta: t.cuenta, conteo: K.contar(t.registros, 'Publication Status', '(vacío)') }));
  const posibles = new Map(); todos.forEach(x => { const k = `${x._clave}|${x.Date}|${(x.Hook || x.Description || '').toLowerCase()}`; posibles.set(k, (posibles.get(k) || 0) + 1); });
  const dup = [...posibles.values()].filter(n => n > 1).reduce((s, n) => s + n - 1, 0);
  const cmp = comparacionContenido(p, hoy);
  // ventanas iguales para el modo comparar
  const enV = (x, w) => enRango(x._iso, w);
  const planA = todos.filter(x => enV(x, r.antes) && K.grupoDe(x.Status) !== 'fuera'), planD = todos.filter(x => enV(x, r.despues) && K.grupoDe(x.Status) !== 'fuera');
  const pubA = planA.filter(x => K.grupoDe(x.Status) === 'publicada').length, pubD = planD.filter(x => K.grupoDe(x.Status) === 'publicada').length;
  const etiquetaPeriodo = modo === 'todo' ? 'todo el plan' : modo === 'comparar' ? 'todo el plan (las comparaciones usan ventanas iguales)' : ra.etiqueta;
  // publicaciones reales en Instagram por semana (no se mezclan con el plan)
  const finIg = ig ? K.finIG(ig) : null;
  const semanas = ig ? K.semanal([], '2026-07-01', finIg).map(s => s.semana) : [];

  v.innerHTML = C.cabecera({ kicker: 'Plan de contenido', titulo: 'Plan de contenido', extra: C.badgeParrilla(p) + ` <a class="btn oro" href="${urlSheet}" target="_blank" rel="noopener">Abrir el Sheet ↗</a>`,
    texto: 'Consolidado de las pestañas Athletum (Juve Miami), Juve Camps USA, Juve Camps MEXICO y Juve Las Vegas del Sheet «Social Media Content Plan». Lectura pública de solo lectura: el dashboard nunca modifica el documento. Los indicadores, gráficos y tablas se recalculan con cada lectura.' })
  + (p.origen === 'copia' ? C.aviso(`No se pudo leer el Sheet en vivo (${esc(p.error)}). Se muestra la copia guardada el ${fecha(p.leido)}.`, 'rojo') : '')
  + C.barraPeriodo(hoy, '· Filtra por la fecha planificada de cada pieza.')
  + (modo === 'comparar'
    ? `<div class="grid g4">
      ${C.comparativa({ etiqueta: 'Piezas planificadas con fecha en la ventana', antes: planA.length, despues: planD.length, tipo: 'plan', detalle: `${r.despues.dias} días antes → ${r.despues.dias} días desde el 15-sep (sin pospuestas)` })}
      ${C.comparativa({ etiqueta: 'Marcadas como publicadas en el Sheet', antes: pubA, despues: pubD, tipo: 'resultado', detalle: 'Estado «Posted» de las piezas de cada ventana' })}
      ${C.comparativa({ etiqueta: 'Cuentas con parrilla en la ventana', antes: new Set(planA.map(x => x._clave)).size, despues: new Set(planD.map(x => x._clave)).size, tipo: 'actividad', detalle: `De ${p.tabs.length} pestañas del Sheet` })}
      ${C.kpi({ valor: n0(rp.pend_aprob), tipo: 'actividad', etiqueta: 'Esperan aprobación (todo el plan)', detalle: `${n0(rp.listas)} aprobadas · ${n0(rp.programadas)} programadas · ${n0(rp.publicadas)} publicadas` })}
    </div>`
    : `<div class="grid g4">
      ${C.kpi({ valor: n0(rp.total), tipo: 'plan', etiqueta: `Piezas en el plan · ${etiquetaPeriodo}`, detalle: `${n0(rp.activas)} activas · ${n0(rp.por.fuera)} pospuestas o no aprobadas` })}
      ${C.kpi({ valor: n0(rp.producidas), tipo: 'actividad', etiqueta: 'Producidas', detalle: `${pct(rp.avance, 0)} de las activas · ${n0(rp.pend_prod)} pendientes de producir` })}
      ${C.kpi({ valor: n0(rp.pend_aprob), tipo: 'actividad', etiqueta: 'Esperan aprobación', detalle: `${n0(rp.listas)} aprobadas listas para publicar · ${n0(rp.programadas)} programadas` })}
      ${C.kpi({ valor: n0(rp.publicadas), etiqueta: 'Publicadas', detalle: 'Estado «Posted» en el Sheet' })}
    </div>`)
  + C.lectura(rp.activas ? `De ${n0(rp.activas)} piezas activas (${etiquetaPeriodo}), ${n0(rp.producidas)} están producidas (${pct(rp.avance, 0)}) y ${n0(rp.pend_prod)} siguen por producir. ${n0(rp.pend_aprob)} esperan aprobación, y ${n0(rp.listas + rp.programadas)} están aprobadas o programadas.${rp.pend_aprob > rp.pend_prod ? ' Hay más piezas esperando aprobación que por producir: el cuello de botella está en la aprobación.' : ''}` : '')
  // --- antes y después
  + C.seccion('Antes y desde el 15 de septiembre', 'Se separan tres cosas que no son la misma métrica: lo <b>planificado</b> en el Sheet, lo que el Sheet marca como <b>publicado</b> y lo que efectivamente se <b>publicó en Instagram</b>.',
    `<h3 style="margin:4px 0 8px">Planificación en el Sheet ${C.tipo('plan')}</h3>${tablaPlanificacion(cmp)}
     <h3 style="margin:22px 0 8px">Cumplimiento del calendario (según el Sheet) ${C.tipo('resultado')}</h3>
     <p class="fuente" style="margin:0 0 10px">Piezas activas cuya fecha planificada ya pasó (hasta hoy, ${fecha(hoy)}) y cuántas figuran como «Posted». El Sheet no registra la fecha real de publicación, así que no se mide el retraso.</p>${tablaCumplimiento(cmp)}
     ${ig ? `<div class="card" style="margin-top:16px"><h3>Publicaciones reales en Instagram por semana ${C.tipo('resultado')}</h3><p class="sub">Publicaciones del feed leídas de la API, del ${fecha('2026-07-01')} al ${fecha(finIg)}. No es la parrilla: es lo publicado. La semana que empieza el 14-sep (contiene el corte) queda a la derecha de la línea.</p>${C.lienzo('gPubReal', '', 'Publicaciones reales por semana y cuenta')}</div>` : ''}
     ${C.lectura(lecturaContenido(cmp))}`)
  // --- avance
  + C.seccion(`Avance por cuenta · ${etiquetaPeriodo}`, '', C.tabla([
      { t: 'Cuenta', k: x => `<b>${esc(x.t.cuenta)}</b><br><small><a href="https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${x.t.gid}" target="_blank" rel="noopener">pestaña «${esc(x.t.nombre)}» ↗</a></small>` },
      { t: 'Total', num: 1, k: x => n0(x.r.total) }, { t: 'Fuera del plan', num: 1, k: x => n0(x.r.por.fuera) },
      { t: 'Por producir', num: 1, k: x => n0(x.r.pend_prod) }, { t: 'Por aprobar', num: 1, k: x => n0(x.r.pend_aprob) },
      { t: 'Aprobadas', num: 1, k: x => n0(x.r.listas) }, { t: 'Programadas', num: 1, k: x => n0(x.r.programadas) }, { t: 'Publicadas', num: 1, k: x => n0(x.r.publicadas) },
      { t: 'Avance de producción', k: x => `${C.barra(x.r.avance)}<small class="mono">${pct(x.r.avance, 0)}</small>` }], porCuenta)
    + `<div class="card" style="margin-top:16px"><h3>Piezas por estado y cuenta</h3><p class="sub">Cantidad de piezas en cada estado del Sheet; el número al final de cada barra es el total de la cuenta.</p>${C.lienzo('gEstados', 'bajo', 'Piezas por estado y cuenta')}</div>`
    + (pubStatus.length ? `<p class="fuente">Estado de publicación (columna aparte «Publication Status»): ${pubStatus.map(x => `${esc(x.cuenta)}: ${x.conteo.map(([a, b]) => `${esc(a)} ${n0(b)}`).join(', ')}`).join(' · ')}.</p>` : ''))
  // --- distribución
  + C.seccion(`Distribución del plan · ${etiquetaPeriodo}`, `Piezas activas por formato, pilar, mes y público. Cada cuenta usa su propio sistema de pilares (por ejemplo, el P3 de Las Vegas es «Competición» y el de Camps es «Autoridad»), así que los pilares se comparan dentro de cada cuenta. ${sinPilar.map(t => esc(t.cuenta)).join(', ')}: pilar y público no registrados en su pestaña.`, `<div class="grid g2">
      <div class="card"><h3>Piezas por formato</h3><p class="sub">Cantidad de piezas activas por formato, apiladas por cuenta.</p>${C.lienzo('gFormato', '', 'Piezas por formato y cuenta')}</div>
      <div class="card"><h3>Piezas planificadas por mes</h3><p class="sub">Cantidad de piezas activas según su mes planificado.</p>${C.lienzo('gMesCont', '', 'Piezas planificadas por mes')}</div>
      <div class="card"><h3>Piezas por pilar</h3><p class="sub">Cantidad de piezas activas por pilar de contenido.</p>${conPilar.length ? C.lienzo('gPilar', 'alto', 'Piezas por pilar y cuenta') : '<p class="vacio">No registrado.</p>'}</div>
      <div class="card"><h3>Piezas por público</h3>${conPilar.map(t => `<p class="sub" style="margin:8px 0 4px"><b>${esc(t.cuenta)}</b></p>` + C.tabla([{ t: 'Público', k: x => esc(x[0]) }, { t: 'Piezas', num: 1, k: x => n0(x[1]) }],
        K.contar(t.registros.filter(x => K.grupoDe(x.Status) !== 'fuera'), 'Publico'))).join('')}</div>
    </div>${C.lectura(lecturaFormatos(regs))}`)
  // --- tabla
  + `<section class="seccion"><h2>Todas las piezas · ${etiquetaPeriodo}</h2><p class="intro">Filtra por cuenta, estado, formato, pilar o mes, o busca por texto. Cada fila enlaza a su material y a su fila en el Sheet.${dup ? ` <b>Atención:</b> ${dup} ${dup === 1 ? 'pieza parece repetida' : 'piezas parecen repetidas'} en el Sheet (misma cuenta, fecha y texto).` : ' No se encontraron piezas repetidas.'}</p>
    <div class="filtros" role="search">
      <label for="fCuenta">Cuenta<select id="fCuenta"><option value="">Todas</option>${p.tabs.map(t => `<option value="${t.clave}">${esc(t.cuenta)}</option>`).join('')}</select></label>
      <label for="fGrupo">Estado<select id="fGrupo"><option value="">Todos</option>${K.GRUPOS.map(g => `<option value="${g.id}">${esc(g.nombre)}</option>`).join('')}</select></label>
      <label for="fFormato">Formato<select id="fFormato"><option value="">Todos</option>${ops(regs.map(x => x.Format)).map(f => `<option>${esc(f)}</option>`).join('')}</select></label>
      <label for="fPilar">Pilar<select id="fPilar"><option value="">Todos</option>${ops(regs.map(x => x.Pilar)).map(f => `<option>${esc(f)}</option>`).join('')}</select></label>
      <label for="fMes">Mes<select id="fMes"><option value="">Todos</option>${meses.map(m => `<option value="${m}">${esc(mes(m))}</option>`).join('')}</select></label>
      <label for="fQ">Buscar<input type="search" id="fQ" placeholder="Texto, hook, copy…"></label>
      <button type="button" class="btn" id="fLimpiar">Quitar filtros</button>
    </div>
    <p class="fuente" id="fCuenta-n" aria-live="polite"></p><div id="tablaPiezas"></div><div class="mas"><button type="button" class="btn" id="fMas" hidden>Mostrar 40 más</button></div></section>`;

  // gráficos
  graficoEstados('gEstados', tabsF);
  const activos = (t) => t.registros.filter(x => K.grupoDe(x.Status) !== 'fuera');
  const barrasPor = (id, campo, tabs) => {
    const totales = {}; tabs.forEach(t => activos(t).forEach(x => { const k = x[campo] || '(sin dato)'; totales[k] = (totales[k] || 0) + 1; }));
    const etiquetas = Object.keys(totales).sort((a, b) => totales[b] - totales[a]);
    C.grafico(id, { type: 'bar', data: { labels: etiquetas, datasets: tabs.map(t => ({ label: t.cuenta, backgroundColor: C.COLOR[t.clave], data: etiquetas.map(e => activos(t).filter(x => (x[campo] || '(sin dato)') === e).length) })) },
      options: { indexAxis: 'y', plugins: { valores: { mostrar: true } }, scales: { x: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Piezas' } }, y: { stacked: true } } } });
  };
  barrasPor('gFormato', 'Format', tabsF);
  if (conPilar.length) barrasPor('gPilar', 'Pilar', conPilar);
  C.grafico('gMesCont', { type: 'bar', data: { labels: meses.map(mes), datasets: tabsF.map(t => { const m = Object.fromEntries(K.porMes(t.registros)); return { label: t.cuenta, backgroundColor: C.COLOR[t.clave], data: meses.map(k => m[k] || 0) }; }) },
    options: { plugins: { valores: { mostrar: true } }, scales: { x: { stacked: true, title: { display: true, text: 'Mes planificado' } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Piezas' } } } } });
  if (ig) {
    const cuentas = p.tabs.map(t => ig.cuentas.find(c => c.usuario === IG_DE_PESTANA[t.clave])).filter(Boolean);
    C.grafico('gPubReal', { type: 'bar', data: { labels: semanas.map(corta), datasets: cuentas.map(c => ({ label: '@' + c.usuario, backgroundColor: C.COLOR[c.usuario], data: K.semanal(c.publicaciones, '2026-07-01', finIg).map(s => s.n) })) },
      options: { plugins: { corte: { indice: C.indiceCorte(semanas.map(s => sumarDias(s, 6))) }, valores: { mostrar: true } }, scales: { x: { stacked: true, title: { display: true, text: 'Semana (inicio, lunes)' } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Publicaciones en el feed' } } } } });
  }

  // tabla filtrable
  const ids = { cuenta: 'fCuenta', grupo: 'fGrupo', formato: 'fFormato', pilar: 'fPilar', mes: 'fMes', q: 'fQ' };
  const enlaces = (x) => [x.Material, x['Material 2 opcional']].flatMap(y => (y || '').match(/https?:\/\/\S+/g) || []);
  const PAGINA = 40; let limite = PAGINA;
  const pintar = (reiniciar = true) => {
    if (!v.isConnected) return;
    if (reiniciar) limite = PAGINA;
    Object.entries(ids).forEach(([k, id]) => { filtrosCont[k] = document.getElementById(id).value; });
    const f = filtrosCont, q = f.q.trim().toLowerCase();
    const sel = regs.filter(x => (!f.cuenta || x._clave === f.cuenta) && (!f.grupo || K.grupoDe(x.Status) === f.grupo) && (!f.formato || x.Format === f.formato)
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
      { t: 'Pieza', k: x => `<b>${esc(x.Hook || x.Content || '')}</b>${x.Description ? `<br><small>${esc(x.Description.slice(0, 140))}${x.Description.length > 140 ? '…' : ''}</small>` : ''}` },
      { t: 'Pilar', k: x => esc(x.Pilar || '—') },
      { t: 'Estado', k: x => { const g = K.GRUPOS.find(y => y.id === K.grupoDe(x.Status)); return `<span class="est ${{ publicada: 'implementado', programada: 'planificado', aprobada: 'progreso', pend_aprob: 'progreso', fuera: 'alerta' }[g.id] || 'validacion'}" title="${esc(g.nombre)}">${esc(x.Status || 'Sin estado')}</span>`; } },
      { t: 'Enlaces', k: x => [...enlaces(x).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Material${enlaces(x).length > 1 ? ' ' + (i + 1) : ''} ↗</a>`), `<a href="${urlFila(x._gid, x._fila)}" target="_blank" rel="noopener">Fila ${x._fila} ↗</a>`].join('<br>') },
    ], sel.slice(0, limite), { vacio: 'Ninguna pieza coincide con los filtros.' });
  };
  Object.entries(ids).forEach(([k, id]) => { const el = document.getElementById(id); el.value = [...el.options || []].some(o => o.value === filtrosCont[k]) || id === 'fQ' ? filtrosCont[k] : ''; el.addEventListener(id === 'fQ' ? 'input' : 'change', () => pintar()); });
  document.getElementById('fMas').addEventListener('click', () => { limite += PAGINA; pintar(false); });
  document.getElementById('fLimpiar').addEventListener('click', () => { Object.values(ids).forEach(id => { document.getElementById(id).value = ''; }); pintar(); });
  pintar();
}

export function lecturaContenido(cmp) {
  const sinAntes = cmp.filter(x => !x.antes).map(x => x.t.cuenta);
  const conAntes = cmp.filter(x => x.antes).map(x => `${x.t.cuenta} (desde el ${fecha(x.primera)})`);
  const venc = cmp.reduce((s, x) => s + x.vencidas, 0), pub = cmp.reduce((s, x) => s + x.vencidasPublicadas, 0);
  return `${conAntes.length ? `Antes del 15-sep solo ${K.lista(conAntes)} tenía piezas planificadas en el Sheet.` : 'Antes del 15-sep no hay piezas planificadas en el Sheet.'} ${sinAntes.length ? `${K.lista(sinAntes)} empiezan su parrilla a partir del corte.` : ''} De ${n0(venc)} piezas activas con fecha ya cumplida, ${n0(pub)} figuran como publicadas en el Sheet${venc ? ` (${pct(pub / venc, 0)})` : ''}.`;
}

function lecturaFormatos(regs) {
  const act = regs.filter(x => K.grupoDe(x.Status) !== 'fuera');
  if (!act.length) return '';
  const c = K.contar(act, 'Format', '(sin formato)');
  const top = c.slice(0, 2).map(([f, n]) => `${esc(f)} (${n0(n)}, ${pct(n / act.length, 0)})`).join(' y ');
  return `Los formatos que concentran la producción son ${top}, sobre ${n0(act.length)} piezas activas.`;
}
