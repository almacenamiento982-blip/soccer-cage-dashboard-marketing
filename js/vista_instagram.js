// Sección Instagram: estado actual, comparación antes / desde el 15-sep y evolución temporal.
import { json, parrilla } from './datos.js?v=20261002i';
import * as K from './calculos.js?v=20261002i';
import * as C from './componentes.js?v=20261002i';
import { CORTE, rangos, rangoActivo, periodo, sumarDias, diasEntre } from './periodo.js?v=20261002i';
const { n0, n1, pct, fecha, esc, signo } = K;

export const IG_DE_PESTANA = { athletum: 'juventusacademymiami', camps_usa: 'juventuscampsusa', camps_mx: 'juventuscampsmx', las_vegas: 'jacademylasvegas' };
const mes = (k) => { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 15).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }); };
const corta = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

// ---------------------------------------------------------------- piezas reutilizables
// Comparación por cuenta en ventanas de igual duración (la usan Instagram, Evolución y Resumen)
export function comparacionIG(ig) {
  const r = rangos(K.finIG(ig));
  return ig.cuentas.map(c => {
    const v = c.ventanas;
    return {
      c, r, base: K.lineaBase(c), brutos: K.nuevosDesdeCorte(c, r.despues.hasta),
      pa: K.resumenPosts(c.publicaciones, r.antes), pd: K.resumenPosts(c.publicaciones, r.despues),
      va: v?.antes || null, vd: v?.despues || null, diasV: v?.dias || null,
    };
  });
}

export function totalesComparacion(filas) {
  const suma = (f) => { const vals = filas.map(f); return vals.some(x => x == null) ? null : vals.reduce((a, b) => a + b, 0); };
  return {
    posts: [suma(x => x.pa.n), suma(x => x.pd.n)],
    alcance: [suma(x => x.va?.reach ?? null), suma(x => x.vd?.reach ?? null)],
    visitas: [suma(x => x.va?.profile_views ?? null), suma(x => x.vd?.profile_views ?? null)],
    clics: [suma(x => x.va?.website_clicks ?? null), suma(x => x.vd?.website_clicks ?? null)],
    interacciones: [suma(x => x.va?.total_interactions ?? null), suma(x => x.vd?.total_interactions ?? null)],
  };
}

export function tablaSeguidores(filas) {
  return C.tabla([
    { t: 'Cuenta', k: x => `<b>@${esc(x.c.usuario)}</b>` },
    { t: 'Línea base disponible', k: x => x.base.base ? `${n0(x.base.base.seguidores)}<br><small>${fecha(x.base.base.fecha)}${x.base.exacta ? '' : ` · ${diasEntre(CORTE, x.base.base.fecha) - 1} días después del corte`}</small>` : C.PENDIENTE },
    { t: 'Seguidores actuales', num: 1, k: x => x.base.actual ? `${n0(x.base.actual.seguidores)}<br><small>${fecha(x.base.actual.fecha)}</small>` : '—' },
    { t: 'Variación neta', num: 1, k: x => x.base.abs != null ? `<b>${signo(x.base.abs)}</b> (${signo(x.base.rel, v => pct(v, 1))})<br><small>en ${x.base.dias} ${x.base.dias === 1 ? 'día' : 'días'}</small>` : '<span class="vacio">falta una segunda captura</span>' },
    { t: 'Nuevos seguidores desde el 15-sep', num: 1, k: x => x.brutos ? `+${n0(x.brutos.n)}<br><small>brutos, sin restar bajas (${x.brutos.dias} días)</small>` : C.PENDIENTE },
  ], filas);
}

export function tablaActividad(filas) {
  const par = (a, b, f = n0) => `${a == null ? '—' : f(a)} → <b>${b == null ? '—' : f(b)}</b>`;
  return C.tabla([
    { t: 'Cuenta', k: x => `<b>@${esc(x.c.usuario)}</b>` },
    { t: 'Publicaciones', num: 1, k: x => par(x.pa.n, x.pd.n) },
    { t: 'Por semana', num: 1, k: x => par(x.pa.por_semana, x.pd.por_semana, n1) },
    { t: 'Alcance medio por publicación', num: 1, k: x => par(x.pa.alcance_prom, x.pd.alcance_prom) },
    { t: 'Alcance de la cuenta (cuentas únicas)', num: 1, k: x => par(x.va?.reach, x.vd?.reach) },
    { t: 'Visitas al perfil', num: 1, k: x => par(x.va?.profile_views, x.vd?.profile_views) },
    { t: 'Clics en el enlace', num: 1, k: x => par(x.va?.website_clicks, x.vd?.website_clicks) },
  ], filas);
}

// Interacción y tráfico de la cuenta (totales de la API por ventana)
export function tablaTrafico(filas) {
  const par = (a, b, f = n0) => `${a == null ? '—' : f(a)} → <b>${b == null ? '—' : f(b)}</b>`;
  return C.tabla([
    { t: 'Cuenta', k: x => `<b>@${esc(x.c.usuario)}</b>` },
    { t: 'Alcance de la cuenta (cuentas únicas)', num: 1, k: x => par(x.va?.reach, x.vd?.reach) },
    { t: 'Cuentas que interactuaron', num: 1, k: x => par(x.va?.accounts_engaged, x.vd?.accounts_engaged) },
    { t: 'Visitas al perfil', num: 1, k: x => par(x.va?.profile_views, x.vd?.profile_views) },
    { t: 'Clics en el enlace', num: 1, k: x => par(x.va?.website_clicks, x.vd?.website_clicks) },
  ], filas);
}

// Publicaciones del feed por ventana
export function tablaPublicaciones(filas) {
  const par = (a, b, f = n0) => `${a == null ? '—' : f(a)} → <b>${b == null ? '—' : f(b)}</b>`;
  return C.tabla([
    { t: 'Cuenta', k: x => `<b>@${esc(x.c.usuario)}</b>` },
    { t: 'Publicaciones', num: 1, k: x => par(x.pa.n, x.pd.n) },
    { t: 'Por semana', num: 1, k: x => par(x.pa.por_semana, x.pd.por_semana, n1) },
    { t: 'Alcance medio por publicación', num: 1, k: x => par(x.pa.alcance_prom, x.pd.alcance_prom) },
    { t: 'Interacciones medias por publicación', num: 1, k: x => par(x.pa.interacciones_prom, x.pd.interacciones_prom, n1) },
  ], filas);
}

export function lecturaComparacion(filas) {
  const conBase = filas.filter(x => x.base.abs != null).sort((a, b) => b.base.abs - a.base.abs);
  const conBrutos = filas.filter(x => x.brutos).sort((a, b) => b.brutos.n - a.brutos.n);
  const partes = [];
  if (conBrutos.length) partes.push(`La cuenta con más seguidores nuevos desde el 15-sep es <b>@${esc(conBrutos[0].c.usuario)}</b> (+${n0(conBrutos[0].brutos.n)} brutos).`);
  if (conBase.length) partes.push(`Entre sus dos capturas verificadas, la mayor variación neta es la de @${esc(conBase[0].c.usuario)} (${signo(conBase[0].base.abs)} en ${conBase[0].base.dias} días).`);
  partes.push('Estos datos describen lo ocurrido; no alcanzan para atribuir los cambios solo a la nueva gestión.');
  return partes.join(' ');
}

// ---------------------------------------------------------------- vista
let cuentaIG = null, metricaIG = 'alcance';
const METRICAS = [
  { id: 'alcance', nombre: 'Alcance diario de la cuenta', eje: 'Cuentas alcanzadas por día', tipo: 'line' },
  { id: 'nuevos', nombre: 'Nuevos seguidores por día', eje: 'Nuevos seguidores (brutos)', tipo: 'bar' },
  { id: 'posts', nombre: 'Publicaciones por semana', eje: 'Publicaciones', tipo: 'bar' },
  { id: 'interacciones', nombre: 'Interacciones por semana', eje: 'Interacciones de las publicaciones', tipo: 'line' },
];

export async function instagram(v) {
  const ig = await json('instagram');
  let p = null; try { p = await parrilla(); } catch { /* sin plan: el escenario alto queda sin ajuste */ }
  const fin = K.finIG(ig);
  const filas = comparacionIG(ig);
  const r = rangos(fin);
  const sinSerie = ig.cuentas.filter(c => !c.seguidores.nuevos_por_dia?.length);
  cuentaIG = cuentaIG || ig.cuentas[0].usuario;
  const t = totalesComparacion(filas);
  const crec = ig.cuentas.map(c => ({ c, g: K.crecimiento(c) }));
  const lider = [...crec].filter(x => x.g.dias).sort((a, b) => b.g.nuevos - a.g.nuevos)[0];

  const textoVentanas = `Ventanas de igual duración: ${fecha(r.antes.desde)} – ${fecha(r.antes.hasta)} frente a ${fecha(r.despues.desde)} – ${fecha(r.despues.hasta)} (${r.despues.dias} días cada una).`;
  v.innerHTML = C.cabecera({ kicker: 'Social media', titulo: 'Instagram y crecimiento', informe: ig.informe,
    texto: `Cuatro cuentas por propiedad. Seguidores y alcance leídos de la API de Instagram; publicaciones con sus métricas desde el ${fecha('2026-06-01')}. Datos hasta el ${fecha(fin)}.` })
  + C.guia({ muestra: 'Comunidad, interacción y tráfico, y publicaciones de las cuatro cuentas, con la comparación antes y desde el 15-sep.', estado: `Lectura de la API del ${fecha(ig.cuentas[0].seguidores.fecha)}. ${ig.cuentas.filter(c => c.seguidores.nuevos_por_dia?.length).length} de ${ig.cuentas.length} cuentas con serie diaria.`, siguiente: 'Publicar la parrilla aprobada con constancia y medir cada mes seguidores, alcance e interacción por formato.' })
  + (sinSerie.length ? C.aviso(`<b>Conexión por renovar:</b> ${sinSerie.map(c => '@' + c.usuario).join(', ')} no respondió a la API. Se muestran sus últimos datos y lo que falta aparece como pendiente de medición.`, 'rojo') : '')
  + C.barraPeriodo(fin, '· La comparación antes/después usa siempre ventanas de igual duración.')
  // --- 1. comunidad
  + C.bloque('1 · Comunidad: seguidores', 'Cuántas personas siguen cada cuenta y cómo cambia ese número.', `<div class="grid g2">
      <div class="card"><h3>Seguidores actuales por cuenta</h3><p class="sub">Total de seguidores en la última lectura de la API.</p>${C.lienzo('gSeg', 'bajo', 'Seguidores actuales por cuenta')}</div>
      <div class="card"><h3>Nuevos seguidores en los últimos 30 días ${C.ayuda('Suma de los nuevos seguidores por día que entrega la API. No descuenta a quienes dejan de seguir.')}</h3><p class="sub">Brutos, sin restar bajas.</p>${C.lienzo('gNuevos30', 'bajo', 'Nuevos seguidores en 30 días por cuenta')}</div></div>
    <h3 style="margin:22px 0 8px">Línea base y variación neta ${C.ayuda('No existe una captura de seguidores del 15-sep. Se usa la primera captura verificada después del corte y se indica su fecha; la variación neta se mide entre esa captura y la actual.')}</h3>
    ${tablaSeguidores(filas)}`
    + C.lectura(lider ? `<b>@${esc(lider.c.usuario)}</b> concentra el mayor crecimiento absoluto de los últimos 30 días (+${n0(lider.g.nuevos)} nuevos, ${n1(lider.g.media_dia)} por día). Las cifras son brutas: no descuentan a quienes dejaron de seguir.` : ''))
  // --- 2. interacción y tráfico
  + C.bloque('2 · Interacción y tráfico', `Alcance, interacción, visitas al perfil y clics al enlace: totales de cada cuenta según la API. ${textoVentanas}`, tablaTrafico(filas))
  // --- 3. publicaciones y formatos
  + C.bloque('3 · Publicaciones y formatos', `Frecuencia y rendimiento medio de las publicaciones del feed. ${textoVentanas}`, tablaPublicaciones(filas)
    + `<h3 style="margin:24px 0 8px">Evolución por cuenta</h3><p class="fuente" style="margin:0 0 10px">Elige la cuenta y la métrica. La línea punteada marca el 15-sep; el periodo seleccionado arriba limita las fechas.</p>
    <div class="filtros"><div class="tabs" role="group" aria-label="Cuenta">${ig.cuentas.map(c => `<button type="button" data-cuenta="${esc(c.usuario)}" aria-pressed="${c.usuario === cuentaIG}">@${esc(c.usuario)}</button>`).join('')}</div>
    <label for="selMetrica">Métrica<select id="selMetrica">${METRICAS.map(m => `<option value="${m.id}"${m.id === metricaIG ? ' selected' : ''}>${esc(m.nombre)}</option>`).join('')}</select></label></div>
    <div id="detalleIG"></div>`)
  // --- 4. proyección y 5. histórico
  + C.bloque('4 · Proyección de seguidores a 90 días', 'Escenarios condicionados a que se mantenga el ritmo reciente. No son resultados ni metas.', tablaProyeccion(ig, frecuencias(ig, p)) + notaProyeccion(ig))
  + C.bloque('5 · Histórico de la auditoría (hasta 24 meses)', 'Alcance mensual y publicaciones del periodo auditado de cada cuenta, como referencia de largo plazo.', `<div class="card"><h3 id="tMes">Alcance mensual y publicaciones</h3>${C.lienzo('gMes', '', 'Alcance mensual y publicaciones')}</div>`
    + C.fuente(ig.fuente, ig.informe))
  + C.volver();

  // gráficos de estado actual
  const orden = [...ig.cuentas].sort((a, b) => (b.seguidores.actual || 0) - (a.seguidores.actual || 0));
  C.grafico('gSeg', { type: 'bar', data: { labels: orden.map(c => '@' + c.usuario), datasets: [{ label: 'Seguidores', data: orden.map(c => c.seguidores.actual), backgroundColor: orden.map(c => C.COLOR[c.usuario]) }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, valores: { mostrar: true } }, scales: { x: { beginAtZero: true, title: { display: true, text: 'Seguidores' } }, y: {} } } });
  const ordenN = crec.filter(x => x.g.dias).sort((a, b) => b.g.nuevos - a.g.nuevos);
  C.grafico('gNuevos30', { type: 'bar', data: { labels: ordenN.map(x => '@' + x.c.usuario), datasets: [{ label: 'Nuevos seguidores (30 días)', data: ordenN.map(x => x.g.nuevos), backgroundColor: ordenN.map(x => C.COLOR[x.c.usuario]) }] },
    options: { indexAxis: 'y', plugins: { legend: { display: false }, valores: { mostrar: true, formato: x => '+' + n0(x) } }, scales: { x: { beginAtZero: true, title: { display: true, text: 'Nuevos seguidores en 30 días' } }, y: {} } } });

  const pintar = () => {
    if (!v.isConnected) return;
    const c = ig.cuentas.find(x => x.usuario === cuentaIG);
    detalleCuenta(c, fin, ig);
  };
  v.querySelectorAll('[data-cuenta]').forEach(b => b.addEventListener('click', () => {
    cuentaIG = b.dataset.cuenta; v.querySelectorAll('[data-cuenta]').forEach(x => x.setAttribute('aria-pressed', x === b)); pintar();
  }));
  v.querySelector('#selMetrica').addEventListener('change', e => { metricaIG = e.target.value; pintar(); });
  pintar();
}

const graficosCuenta = [];
function detalleCuenta(c, fin, ig) {
  graficosCuenta.splice(0).forEach(g => C.destruir(g));
  const modo = periodo().modo;
  const ra = rangoActivo(fin);
  const r = rangos(fin);
  const desdeDatos = '2026-06-01';
  const comparar = modo === 'comparar';
  // en «comparar» el gráfico abarca exactamente las dos ventanas iguales
  const desde = comparar ? r.antes.desde : ra?.desde || desdeDatos, hasta = comparar ? r.despues.hasta : ra?.hasta || fin;
  const pa = K.resumenPosts(c.publicaciones, comparar ? r.antes : null);
  const pd = K.resumenPosts(c.publicaciones, comparar ? r.despues : (ra && (ra.desde || ra.hasta) ? ra : null));
  const rTop = comparar ? r.despues : { desde, hasta };
  const top = (c.publicaciones || []).filter(x => x.fecha >= rTop.desde && x.fecha <= rTop.hasta).sort((a, b) => (b.alcance || 0) - (a.alcance || 0)).slice(0, 5);
  const etiquetaR = comparar ? `del ${fecha(r.despues.desde)} al ${fecha(r.despues.hasta)}` : ra?.desde || ra?.hasta ? `del ${fecha(desde)} al ${fecha(hasta)}` : `del ${fecha(desdeDatos)} al ${fecha(fin)}`;
  const met = METRICAS.find(m => m.id === metricaIG);

  // serie de la métrica
  let etiquetas = [], valores = [], porSemana = false;
  if (metricaIG === 'alcance') { const s = (c.alcance_diario || []).filter(x => x.fecha >= desde && x.fecha <= hasta); etiquetas = s.map(x => x.fecha); valores = s.map(x => x.n); }
  else if (metricaIG === 'nuevos') { const s = (c.seguidores?.nuevos_por_dia || []).filter(x => x.fecha >= desde && x.fecha <= hasta); etiquetas = s.map(x => x.fecha); valores = s.map(x => x.n); }
  else { porSemana = true; const s = K.semanal(c.publicaciones, desde, hasta, metricaIG === 'interacciones' ? 'interacciones' : null); etiquetas = s.map(x => x.semana); valores = s.map(x => x.n); }
  const disponible = etiquetas.length > 0;
  const antesVals = valores.filter((_, i) => etiquetas[i] < CORTE), despVals = valores.filter((_, i) => etiquetas[i] >= CORTE);
  const prom = (a) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null;
  const lecturaSerie = disponible && antesVals.length && despVals.length
    ? `${esc(met.nombre)}: promedio de ${n1(prom(antesVals))} ${porSemana ? 'por semana' : 'por día'} antes del 15-sep y de ${n1(prom(despVals))} desde el 15-sep, dentro de las fechas del gráfico (${antesVals.length} y ${despVals.length} ${porSemana ? 'semanas' : 'días'}).${porSemana ? ' La semana del corte se cuenta en «desde el 15-sep».' : ''}${metricaIG === 'alcance' ? ' El promedio diario no equivale a las cuentas únicas de la ventana, que es lo que muestra la tabla de comparación.' : ''}`
    : '';

  const formatos = [...new Set([...Object.keys(pa.formatos), ...Object.keys(pd.formatos)])];
  document.getElementById('detalleIG').innerHTML = `<h3 style="margin:4px 0 4px">@${esc(c.usuario)} · ${esc(c.propiedad)}</h3>
    <p class="fuente" style="margin:0 0 12px">Publicaciones ${etiquetaR}${comparar ? `, comparadas con ${fecha(r.antes.desde)} – ${fecha(r.antes.hasta)}` : ''}.</p>
    <div class="grid g4">
      ${comparar ? C.comparativa({ etiqueta: 'Publicaciones', antes: pa.n, despues: pd.n, detalle: `${r.despues.dias} días antes → después` }) : C.kpi({ valor: n0(pd.n), etiqueta: 'Publicaciones', detalle: pd.por_semana != null ? `${n1(pd.por_semana)} por semana` : '' })}
      ${comparar ? C.comparativa({ etiqueta: 'Publicaciones por semana', antes: pa.por_semana, despues: pd.por_semana, formato: n1 }) : C.kpi({ valor: n0(c.seguidores.actual), etiqueta: 'Seguidores actuales', detalle: `Lectura del ${fecha(c.seguidores.fecha)}` })}
      ${comparar ? C.comparativa({ etiqueta: 'Alcance medio por publicación', antes: pa.alcance_prom, despues: pd.alcance_prom }) : C.kpi({ valor: n0(pd.alcance_prom), etiqueta: 'Alcance medio por publicación', detalle: 'Cuentas únicas alcanzadas por cada publicación' })}
      ${comparar ? C.comparativa({ etiqueta: 'Interacciones medias por publicación', antes: pa.interacciones_prom, despues: pd.interacciones_prom, formato: n1 }) : C.kpi({ valor: n1(pd.interacciones_prom), etiqueta: 'Interacciones medias por publicación', detalle: 'Me gusta, comentarios, guardados y compartidos' })}
    </div>
    <div class="card" style="margin-top:16px"><h3>${esc(met.nombre)} · @${esc(c.usuario)}</h3><p class="sub">${disponible ? `Del ${fecha(etiquetas[0])} al ${fecha(etiquetas[etiquetas.length - 1])}${porSemana ? ' (semanas de lunes a domingo)' : ''}.` : ''}</p>
      ${disponible ? C.lienzo('gSerie', 'alto', met.nombre) : `<p class="vacio">Sin datos de esta métrica para la cuenta en el periodo elegido${!c.seguidores.nuevos_por_dia?.length ? ' (la conexión de la cuenta debe renovarse)' : ''}.</p>`}
      ${C.lectura(lecturaSerie)}</div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>Formatos publicados ${comparar ? 'antes y después' : etiquetaR}</h3><p class="sub">Cantidad de publicaciones por formato${comparar ? ` en cada ventana de ${r.despues.dias} días` : ''}.</p>
        ${formatos.length ? C.lienzo('gFormatos', 'bajo', 'Publicaciones por formato') : '<p class="vacio">Sin publicaciones en el periodo.</p>'}</div>
      <div class="card"><h3>Publicaciones con más alcance ${etiquetaR}</h3>${C.tabla([
        { t: 'Fecha', k: x => fecha(x.fecha) }, { t: 'Formato', k: 'formato' },
        { t: 'Alcance', num: 1, k: x => n0(x.alcance) }, { t: 'Interacciones', num: 1, k: x => n0(x.interacciones) },
        { t: 'Ver', k: x => x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">Abrir ↗</a>` : '' }], top, { vacio: 'Sin publicaciones en el periodo.' })}</div>
    </div>`;

  if (disponible) graficosCuenta.push(C.grafico('gSerie', {
    type: met.tipo,
    data: { labels: etiquetas.map(corta), datasets: [{ label: met.nombre, data: valores, borderColor: C.COLOR[c.usuario], backgroundColor: met.tipo === 'bar' ? etiquetas.map(f => f >= CORTE ? C.COLOR[c.usuario] : C.COLOR_ANTES) : C.COLOR[c.usuario], pointRadius: 0, tension: .25, borderWidth: 2 }] },
    options: { plugins: { legend: { display: false }, corte: { indice: C.indiceCorte(porSemana ? etiquetas.map(s => sumarDias(s, 6)) : etiquetas) } },
      scales: { x: { title: { display: true, text: porSemana ? 'Semana (inicio)' : 'Día' } }, y: { beginAtZero: true, title: { display: true, text: met.eje }, ticks: { precision: 0 } } } },
  }));
  if (formatos.length) graficosCuenta.push(C.grafico('gFormatos', {
    type: 'bar',
    data: { labels: formatos, datasets: comparar
      ? [{ label: `Antes (${fecha(r.antes.desde)} – ${fecha(r.antes.hasta)})`, data: formatos.map(f => pa.formatos[f] || 0), backgroundColor: C.COLOR_ANTES },
         { label: `Después (${fecha(r.despues.desde)} – ${fecha(r.despues.hasta)})`, data: formatos.map(f => pd.formatos[f] || 0), backgroundColor: C.COLOR_DESPUES }]
      : [{ label: 'Publicaciones', data: formatos.map(f => pd.formatos[f] || 0), backgroundColor: C.COLOR[c.usuario] }] },
    options: { indexAxis: 'y', plugins: { legend: { display: comparar, position: 'bottom', labels: { boxWidth: 12, boxHeight: 12, padding: 14 } }, valores: { mostrar: true } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Publicaciones' } }, y: {} } },
  }));
  // histórico mensual de la auditoría para la cuenta elegida
  const tMes = document.getElementById('tMes'); if (tMes) tMes.textContent = `Alcance mensual y publicaciones · @${c.usuario} (auditoría ${fecha(c.auditoria.desde)} – ${fecha(c.auditoria.hasta)})`;
  graficosCuenta.push(C.grafico('gMes', { data: { labels: c.mensual.map(m => mes(m.mes)), datasets: [
    { type: 'bar', label: 'Alcance del mes (suma de publicaciones)', data: c.mensual.map(m => m.alcance), backgroundColor: C.COLOR[c.usuario] === '#111214' ? '#3B4048' : C.COLOR[c.usuario], yAxisID: 'y' },
    { type: 'line', label: 'Publicaciones del mes', data: c.mensual.map(m => m.posts), borderColor: '#B5112F', backgroundColor: '#B5112F', yAxisID: 'y1', tension: .2 }] },
    options: { scales: { x: {}, y: { beginAtZero: true, title: { display: true, text: 'Alcance (cuentas)' } }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Publicaciones' }, ticks: { precision: 0 } } } } }));
}

// ---------------------------------------------------------------- proyección (escenarios)
export function frecuencias(ig, p) {
  const out = {};
  ig.cuentas.forEach(c => { const ult = (c.mensual || []).slice(-6); out[c.usuario] = { hist: ult.length ? ult.reduce((s, m) => s + m.posts, 0) / ult.length : null, plan: null }; });
  if (p) p.tabs.forEach(t => {
    const u = IG_DE_PESTANA[t.clave]; if (!out[u]) return;
    const hoy = new Date(); const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const meses = K.porMes(t.registros.filter(r => (r.Format || '') !== 'Story')).filter(([k]) => k >= desde);
    out[u].plan = meses.length ? meses.reduce((s, [, n]) => s + n, 0) / meses.length : null;
  });
  return out;
}

export function tablaProyeccion(ig, frec) {
  const filas = ig.cuentas.map(c => { const f = frec[c.usuario] || {}; return { c, g: K.crecimiento(c), pr: K.proyeccion(c, f.plan, f.hist, 90), f }; });
  return C.tabla([
    { t: 'Cuenta', k: x => `<b>@${esc(x.c.usuario)}</b>` },
    { t: 'Seguidores hoy', num: 1, k: x => n0(x.g.actual) },
    { t: 'Nuevos en 30 días (brutos)', num: 1, k: x => x.g.dias ? '+' + n0(x.g.nuevos) : C.PENDIENTE },
    { t: 'Conservador · 90 días', num: 1, k: x => x.pr ? n0(x.pr.escenarios.conservador.final) : '—' },
    { t: 'Intermedio · 90 días', num: 1, k: x => x.pr ? n0(x.pr.escenarios.intermedio.final) : '—' },
    { t: 'Alto · 90 días', num: 1, k: x => x.pr ? n0(x.pr.escenarios.alto.final) : '—' },
    { t: 'Publicaciones al mes: histórico → plan', num: 1, k: x => `${n1(x.f.hist)} → ${x.f.plan != null ? n1(x.f.plan) : '<span class="vacio">sin parrilla</span>'}` },
  ], filas) + `<p style="margin-top:10px">${C.tipo('proyeccion')}</p>`;
}

// Contraste entre nuevos seguidores brutos y variación neta, calculado con los datos (no escrito a mano)
export function brutoVsNeto(ig) {
  const casos = ig.cuentas.map(c => {
    const b = K.lineaBase(c); if (b.abs == null) return null;
    const s = (c.seguidores?.nuevos_por_dia || []).filter(x => x.fecha > b.base.fecha && x.fecha < b.actual.fecha);
    return s.length ? { c, neto: b.abs, bruto: s.reduce((a, x) => a + x.n, 0), desde: b.base.fecha, hasta: b.actual.fecha } : null;
  }).filter(Boolean).sort((a, b) => b.bruto - a.bruto);
  return casos[0] || null;
}

export function notaProyeccion(ig) {
  const x = brutoVsNeto(ig);
  return `<p class="fuente"><b>Cómo se calcula (escenarios, no resultados):</b> se parte de los seguidores de hoy y se suma, durante 90 días,
el ritmo de nuevos seguidores de los últimos 30 días. <b>Conservador</b> = el menor valor entre la mediana y el promedio diario; <b>intermedio</b> = promedio diario;
<b>alto</b> = promedio diario multiplicado por cuánto aumenta la frecuencia de publicación planificada frente a la histórica (tope +50 %).
La API no descuenta a quienes dejan de seguir${x ? `: en @${esc(x.c.usuario)}, entre el ${fecha(x.desde)} y el ${fecha(x.hasta)}, la variación neta fue ${signo(x.neto)} frente a ${n0(x.bruto)} nuevos brutos` : ''}. Por eso las tres cifras tienden a ser optimistas.</p>`;
}
