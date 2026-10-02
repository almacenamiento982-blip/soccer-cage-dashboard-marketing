// Componentes de presentación: devuelven HTML (strings) o crean gráficos. Sin lógica de negocio.
import { esc, fecha, claseEstado } from './calculos.js';

export const PENDIENTE = '<span class="vacio">pendiente de medición</span>';

export function cabecera({ kicker, titulo, texto, informe, extra = '' }) {
  return `<header class="cab"><div><div class="kicker">${esc(kicker)}</div><h1>${esc(titulo)}</h1>${texto ? `<p>${texto}</p>` : ''}</div>
  <div class="acciones">${extra}${informe ? `<a class="btn oro" href="${esc(informe)}" target="_blank" rel="noopener">Abrir informe original ↗</a>` : ''}</div></header>`;
}

// tipo: 'real' (resultado medido), 'plan' (planificado), 'impl' (implementado)
const ETQ = { real: 'Resultado real', plan: 'Planificado', impl: 'Implementado', ref: 'Referencia', pend: 'Sin medición' };
export function kpi({ valor, etiqueta, detalle = '', tipo = 'real' }) {
  return `<div class="card kpi"><div class="v mono">${valor}</div><div class="l">${esc(etiqueta)}</div>${detalle ? `<div class="d">${detalle}</div>` : ''}<span class="p">${ETQ[tipo]}</span></div>`;
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
export const aviso = (html, tipo = '') => `<div class="aviso ${tipo}">${html}</div>`;

export function badgeParrilla(p) {
  const hora = p.leido.toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return p.origen === 'vivo'
    ? `<span class="badge vivo" title="Lectura pública de solo lectura al abrir la página">En vivo desde Google Sheets · leído ${esc(hora)}</span>`
    : `<span class="badge copia" title="${esc(p.error || '')}">Copia de respaldo del ${esc(fecha(p.leido))} (no se pudo leer el Sheet)</span>`;
}

// ---------- gráficos ----------
const graficos = new Set();
export function destruirGraficos() { graficos.forEach(g => g.destroy()); graficos.clear(); }

export const PALETA = ['#111214', '#B8862F', '#6E747D', '#2F5D8A', '#C8143A', '#1E7A4C', '#C9CDD2', '#E3C27A'];

export function lienzo(id, clase = '', etiqueta = '') {
  return `<div class="chart ${clase}"><canvas id="${id}" role="img" aria-label="${esc(etiqueta)}"></canvas></div>`;
}

export function grafico(id, config) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (!window.Chart) { el.parentElement.innerHTML = '<p class="vacio">No se pudo cargar la librería de gráficos. Los datos siguen disponibles en las tablas.</p>'; return null; }
  const C = window.Chart;
  C.defaults.font.family = getComputedStyle(document.body).fontFamily;
  C.defaults.color = '#4A4F57';
  C.defaults.borderColor = '#ECEEF1';
  const g = new C(el, {
    ...config,
    options: {
      responsive: true, maintainAspectRatio: false, animation: matchMedia('(prefers-reduced-motion: reduce)').matches ? false : { duration: 300 },
      ...config.options,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 12 } }, ...(config.options?.plugins || {}) },
    },
  });
  graficos.add(g);
  return g;
}
