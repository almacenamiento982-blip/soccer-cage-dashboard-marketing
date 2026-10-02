// Componentes de presentación: devuelven HTML (strings) o crean gráficos. Sin lógica de negocio.
import { esc, fecha, claseEstado, n0, pct } from './calculos.js?v=20261002f';
import { MODOS, periodo, rangos, CORTE } from './periodo.js?v=20261002f';

export const PENDIENTE = '<span class="vacio">pendiente de medición</span>';

export function cabecera({ kicker, titulo, texto, informe, extra = '' }) {
  return `<header class="cab"><div><div class="kicker">${esc(kicker)}</div><h1>${esc(titulo)}</h1>${texto ? `<p>${texto}</p>` : ''}</div>
  <div class="acciones">${extra}${informe ? `<a class="btn oro" href="${esc(informe)}" target="_blank" rel="noopener">Abrir informe original ↗</a>` : ''}</div></header>`;
}

// Tipo de información: separa actividad, resultados, planes y proyecciones
const TIPOS = {
  real: ['resultado', 'Resultado real'], resultado: ['resultado', 'Resultado real'],
  impl: ['actividad', 'Actividad'], actividad: ['actividad', 'Actividad'],
  plan: ['plan', 'Planificado'], proyeccion: ['proyeccion', 'Proyección'],
  doc: ['doc', 'Documentado'], pend: ['sin', 'Sin medición'], ref: ['doc', 'Referencia'],
};
export const tipo = (t) => { const [c, n] = TIPOS[t] || TIPOS.doc; return `<span class="tipo ${c}">${n}</span>`; };

export function kpi({ valor, etiqueta, detalle = '', tipo: t = 'real' }) {
  return `<div class="card kpi"><div class="v mono">${valor}</div><div class="l">${esc(etiqueta)}</div>${detalle ? `<div class="d">${detalle}</div>` : ''}${tipo(t)}</div>`;
}

// Tarjeta comparativa antes → después con variación
export function comparativa({ etiqueta, antes, despues, formato = n0, detalle = '', tipo: t = 'resultado', invertir = false }) {
  const ok = antes != null && despues != null;
  const dif = ok ? despues - antes : null;
  const rel = ok && antes ? dif / antes : null;
  const clase = !ok || dif === 0 ? 'igual' : (dif > 0) !== invertir ? 'sube' : 'baja';
  const signo = dif > 0 ? '+' : dif < 0 ? '−' : '';
  const delta = !ok ? '' : `<span class="delta ${clase}">${signo}${formato(Math.abs(dif))}${rel != null ? ` (${signo}${pct(Math.abs(rel), 0)})` : ''}</span>`;
  return `<div class="card cmp"><div class="l">${esc(etiqueta)}</div>
    <div class="fila"><span class="a" title="Antes">${antes == null ? '—' : formato(antes)}</span><span class="flecha" aria-hidden="true">→</span><span class="b" title="Después">${despues == null ? '—' : formato(despues)}</span>${delta}</div>
    ${detalle ? `<div class="d">${detalle}</div>` : ''}${tipo(t)}</div>`;
}

export const estado = (e) => `<span class="est ${claseEstado(e)}">${esc(e)}</span>`;
export const etiquetaEstado = (texto, clase) => `<span class="est ${clase}">${esc(texto)}</span>`;

export function seccion(titulo, intro, cuerpo, id = '') {
  return `<section class="seccion"${id ? ` id="${id}"` : ''}><h2>${esc(titulo)}</h2>${intro ? `<p class="intro">${intro}</p>` : ''}${cuerpo}</section>`;
}

// columnas: [{t:'Título', k: fn(row)|'campo', num:true}]
export function tabla(columnas, filas, { vacio = 'Sin registros.', caption = '' } = {}) {
  if (!filas.length) return `<p class="vacio">${esc(vacio)}</p>`;
  const celda = (c, f) => (typeof c.k === 'function' ? c.k(f) : esc(f[c.k]));
  return `<div class="tabla-wrap"><table>${caption ? `<caption class="sr">${esc(caption)}</caption>` : ''}
  <thead><tr>${columnas.map(c => `<th scope="col"${c.num ? ' class="num"' : ''}>${esc(c.t)}</th>`).join('')}</tr></thead>
  <tbody>${filas.map(f => `<tr>${columnas.map(c => `<td${c.num ? ' class="num"' : ''}>${celda(c, f) ?? ''}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

export const barra = (v) => `<div class="barra" role="img" aria-label="${Math.round((v || 0) * 100)} %"><i style="width:${Math.min(100, Math.max(0, (v || 0) * 100))}%"></i></div>`;

export const fuente = (texto, url) => `<p class="fuente">Fuente: ${esc(texto)}${url ? ` · <a href="${esc(url)}" target="_blank" rel="noopener">ver origen ↗</a>` : ''}</p>`;
export const aviso = (html, t = '') => `<div class="aviso ${t}">${html}</div>`;
export const lectura = (html) => html ? `<p class="lectura"><b>Lectura:</b> ${html}</p>` : '';

export function badgeParrilla(p) {
  const hora = p.leido.toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return p.origen === 'vivo'
    ? `<span class="badge vivo" title="Lectura pública de solo lectura al abrir la página">En vivo desde Google Sheets · leído ${esc(hora)}</span>`
    : `<span class="badge copia" title="${esc(p.error || '')}">Copia de respaldo del ${esc(fecha(p.leido))} (no se pudo leer el Sheet)</span>`;
}

// Selector de periodo compartido. `hasta` = último día con datos en esa vista.
export function barraPeriodo(hasta, nota = '') {
  const p = periodo(), r = rangos(hasta);
  const texto = {
    todo: 'Todos los datos disponibles.',
    antes: `Hasta el ${fecha(r.antes.hasta)} (antes de la nueva gestión).`,
    despues: `Del ${fecha(r.despues.desde)} al ${fecha(r.despues.hasta)} (${r.despues.dias} días).`,
    comparar: `Antes: ${fecha(r.antes.desde)} – ${fecha(r.antes.hasta)} · Después: ${fecha(r.despues.desde)} – ${fecha(r.despues.hasta)} (${r.despues.dias} días cada uno).`,
    personalizado: p.desde && p.hasta ? `Del ${fecha(p.desde)} al ${fecha(p.hasta)}.` : 'Elige las dos fechas.',
  }[p.modo];
  return `<div class="periodo" role="group" aria-label="Periodo de análisis">
    <span class="t">Periodo</span>
    <div class="tabs">${MODOS.map(m => `<button type="button" data-modo="${m.id}" aria-pressed="${p.modo === m.id}">${esc(m.nombre)}</button>`).join('')}</div>
    ${p.modo === 'personalizado' ? `<div class="fechas"><label for="perDesde">Desde <input type="date" id="perDesde" value="${esc(p.desde || '')}" max="${esc(hasta)}"></label>
      <label for="perHasta">Hasta <input type="date" id="perHasta" value="${esc(p.hasta || '')}" max="${esc(hasta)}"></label></div>` : ''}
    <span class="rango">${esc(texto)}${nota ? ' ' + nota : ''}</span></div>`;
}

// ---------- gráficos ----------
const graficos = new Set();
export function destruirGraficos() { graficos.forEach(g => g.destroy()); graficos.clear(); }
export function destruir(g) { if (g && graficos.has(g)) { g.destroy(); graficos.delete(g); } }

export const PALETA = ['#111214', '#B8862F', '#7F8792', '#2F5D8A', '#B5112F', '#1B6E44', '#C9CDD2', '#E3C27A'];
// Un color fijo por propiedad en toda la aplicación (Instagram y Sheet)
export const COLOR = {
  juventusacademymiami: '#111214', athletum: '#111214',
  juventuscampsusa: '#B8862F', camps_usa: '#B8862F',
  juventuscampsmx: '#7F8792', camps_mx: '#7F8792',
  jacademylasvegas: '#2F5D8A', las_vegas: '#2F5D8A',
};
export const COLOR_ANTES = '#B9BEC6', COLOR_DESPUES = '#B8862F';

export function lienzo(id, clase = '', etiqueta = '') {
  return `<div class="chart ${clase}"><canvas id="${id}" role="img" aria-label="${esc(etiqueta)}"></canvas></div>`;
}

// Línea vertical en el 15-sep: options.plugins.corte = { indice } (posición en las etiquetas)
const pluginCorte = {
  id: 'corte',
  afterDatasetsDraw(chart, _a, o) {
    if (!o || o.indice == null || o.indice < 0) return;
    const { ctx, chartArea: { top, bottom, right }, scales: { x } } = chart;
    const paso = chart.data.labels.length > 1 ? x.getPixelForValue(1) - x.getPixelForValue(0) : 0;
    const px = x.getPixelForValue(o.indice) - paso / 2;
    ctx.save(); ctx.strokeStyle = '#7E5900'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(px, top); ctx.lineTo(px, bottom); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#7E5900'; ctx.font = '600 12px Barlow, Arial, sans-serif';
    const txt = o.texto || '15-sep · nueva gestión';
    const w = ctx.measureText(txt).width;
    ctx.fillText(txt, Math.min(px + 5, right - w), top - (o.alto || 6)); ctx.restore();
  },
};
// Valores sobre las barras: options.plugins.valores = { mostrar: true, formato: fn }
const pluginValores = {
  id: 'valores',
  afterDatasetsDraw(chart, _a, o) {
    if (!o || !o.mostrar) return;
    const { ctx } = chart; const horizontal = chart.options.indexAxis === 'y';
    const eje = horizontal ? chart.options.scales?.x : chart.options.scales?.y;
    const apiladas = !!eje?.stacked;
    ctx.save(); ctx.font = '600 12px Barlow, Arial, sans-serif'; ctx.fillStyle = '#3B4048';
    const visibles = chart.data.datasets.map((_, k) => k).filter(k => !chart.getDatasetMeta(k).hidden && chart.getDatasetMeta(k).type === 'bar');
    visibles.forEach(i => {
      const ds = chart.data.datasets[i], meta = chart.getDatasetMeta(i);
      if (apiladas && i !== visibles[visibles.length - 1]) return;   // en apiladas, solo el total al final
      meta.data.forEach((el, j) => {
        const v = apiladas ? visibles.reduce((s, k) => s + (+chart.data.datasets[k].data[j] || 0), 0) : ds.data[j];
        if (v == null || v === 0) return;
        const t = (o.formato || n0)(v);
        if (horizontal) { ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(t, el.x + 6, el.y); }
        else { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(t, el.x, el.y - 4); }
      });
    });
    ctx.restore();
  },
};

export function grafico(id, config) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (!window.Chart) { el.parentElement.innerHTML = '<p class="vacio">No se pudo cargar la librería de gráficos. Los datos siguen disponibles en las tablas.</p>'; return null; }
  const C = window.Chart;
  C.defaults.font.family = 'Barlow, -apple-system, "Segoe UI", Arial, sans-serif';
  C.defaults.font.size = 13;
  C.defaults.color = '#3B4048';
  C.defaults.borderColor = '#ECEEF1';
  const o = config.options || {};
  const escalas = Object.fromEntries(Object.entries(o.scales || {}).map(([k, s]) => [k, {
    ...s, ticks: { maxRotation: 0, autoSkip: true, autoSkipPadding: 12, ...(s.ticks || {}) },
    ...(s.title ? { title: { font: { weight: '600', size: 13 }, color: '#3B4048', ...s.title } } : {}),
  }]));
  const conValores = o.plugins?.valores?.mostrar;
  if (o.plugins?.corte) o.plugins.corte.alto = conValores ? 24 : 6;   // la etiqueta del corte va por encima de los valores
  // en pantallas angostas, acorta las etiquetas largas del eje de categorías de las barras horizontales
  if (o.indexAxis === 'y' && escalas.y) escalas.y.ticks = { ...escalas.y.ticks, callback(v) { const t = this.getLabelForValue(v); return this.chart.width < 520 && t.length > 15 ? t.slice(0, 14) + '…' : t; } };
  const extraArriba = o.plugins?.corte ? (conValores ? 40 : 22) : conValores ? 18 : 4;
  const g = new C(el, {
    ...config,
    plugins: [pluginCorte, pluginValores, ...(config.plugins || [])],
    options: {
      responsive: true, maintainAspectRatio: false, animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 300 },
      ...o,
      layout: { padding: { top: extraArriba, right: o.plugins?.valores?.mostrar && o.indexAxis === 'y' ? 40 : 8 }, ...(o.layout || {}) },
      scales: escalas,
      plugins: { ...(o.plugins || {}), legend: { position: 'bottom', ...(o.plugins?.legend || {}), labels: { boxWidth: 12, boxHeight: 12, padding: 14, ...(o.plugins?.legend?.labels || {}) } } },
    },
  });
  graficos.add(g);
  return g;
}

// Posición de la primera etiqueta (fecha ISO) igual o posterior al corte
export const indiceCorte = (fechas) => fechas.findIndex(e => e >= CORTE);
