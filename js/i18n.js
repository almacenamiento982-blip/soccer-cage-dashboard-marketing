// Traducción español → inglés de la interfaz.
// Los textos se buscan en data/i18n_en.json por su «clave»: el texto con las fechas y cifras
// reemplazadas por {0}, {1}… Las cifras y fechas se convierten solas al formato inglés, así que una
// misma frase sirve para cualquier valor. Lo que no está en el diccionario se queda en español.
// Los elementos con translate="no" (contenido del Sheet, textos de publicaciones) no se tocan.

const CLAVE = 'idioma-dashboard';
let lang = 'es';
try { if (localStorage.getItem(CLAVE) === 'en') lang = 'en'; } catch { /* sin almacenamiento */ }
let DIC = {};
const RECOLECTAR = /[?&]recolectar\b/.test(location.search);
export const recolectadas = new Set();
if (RECOLECTAR) window.__claves = recolectadas;

export const idioma = () => (RECOLECTAR ? 'es' : lang);
export function fijarIdioma(l) {
  lang = l === 'en' ? 'en' : 'es';
  try { localStorage.setItem(CLAVE, lang); } catch { /* sin almacenamiento */ }
  document.documentElement.lang = lang;
  window.dispatchEvent(new CustomEvent('idioma'));
}
export async function cargarDiccionario(v) {
  try { DIC = await (await fetch(`data/i18n_en.json?v=${v}`, { cache: 'no-cache' })).json(); } catch { DIC = {}; }
  document.documentElement.lang = idioma();
}

const MESES = { ene: 'Jan', feb: 'Feb', mar: 'Mar', abr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', ago: 'Aug', sep: 'Sep', sept: 'Sep', oct: 'Oct', nov: 'Nov', dic: 'Dec' };
const DIAS = { lun: 'Mon', mar: 'Tue', 'mié': 'Wed', jue: 'Thu', vie: 'Fri', 'sáb': 'Sat', dom: 'Sun' };
const M = 'ene|feb|mar|abr|may|jun|jul|ago|sept|sep|oct|nov|dic';
const PATRON = new RegExp(
  `(?<fecha>(?:(?<dia>lun|mar|mié|jue|vie|sáb|dom)\\.?,\\s)?(?<d>\\d{1,2})\\s(?<m>${M})\\.?(?:\\s(?<a>\\d{4}))?(?![\\p{L}]))` +
  `|(?<mesano>(?<!\\p{L})(?<m2>${M})\\.?\\s(?<a2>\\d{4}))` +
  `|(?<num>[+−-]?\\$?\\d+(?:[.,]\\d+)*(?:\\u00a0?\\s?%)?)`, 'giu');

// Convierte una cifra con formato español al inglés (separadores invertidos, % pegado)
const numEn = (s) => s.replace(/[.,]/g, c => (c === '.' ? ',' : '.')).replace(/[ \s]%/, '%');

function tokenizar(texto) {
  const valores = [];
  const clave = texto.replace(PATRON, (...args) => {
    const g = args.at(-1);
    let en;
    if (g.fecha) {
      const mes = MESES[g.m.toLowerCase()];
      en = `${g.dia ? DIAS[g.dia.toLowerCase()] + ', ' : ''}${mes} ${g.d}${g.a ? ', ' + g.a : ''}`;
    } else if (g.mesano) en = `${MESES[g.m2.toLowerCase()]} ${g.a2}`;
    else en = numEn(g.num);
    valores.push(en);
    return `{${valores.length - 1}}`;
  });
  return { clave, valores };
}

const rellenar = (plantilla, valores) => plantilla.replace(/\{(\d+)\}/g, (_, i) => valores[+i] ?? '');

// Traduce un texto suelto (también se usa en los gráficos)
export function T(texto) {
  if (texto == null || typeof texto !== 'string') return texto;
  const limpio = texto.replace(/\s+/g, ' ').trim();
  if (!limpio) return texto;
  const { clave, valores } = tokenizar(limpio);
  if (RECOLECTAR) { if (/\p{L}{2,}/u.test(clave.replace(/\{\d+\}/g, ''))) recolectadas.add(clave); return texto; }
  if (lang !== 'en') return texto;
  const ini = texto.match(/^\s*/)[0], fin = texto.match(/\s*$/)[0];
  if (!/\p{L}{2,}/u.test(clave.replace(/\{\d+\}/g, ''))) return ini + rellenar(clave, valores) + fin;   // solo cifras y fechas
  const t = DIC[clave];
  return ini + rellenar(t || clave, valores) + fin;   // sin traducción: queda el texto, con cifras y fechas en formato inglés
}

// Traduce todos los textos de un elemento (texto, title, aria-label y placeholder)
const originales = new WeakMap();
export function restaurar(raiz) {
  if (!raiz) return;
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
  while (w.nextNode()) { const n = w.currentNode; if (originales.has(n)) n.nodeValue = originales.get(n); }
  raiz.querySelectorAll('[data-i18n-orig]').forEach(el => { const o = JSON.parse(el.dataset.i18nOrig); Object.entries(o).forEach(([a, v]) => el.setAttribute(a, v)); delete el.dataset.i18nOrig; });
}

export function traducir(raiz) {
  if (!raiz || (!RECOLECTAR && lang !== 'en')) return;
  const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest('[translate="no"],script,style') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodos = []; while (w.nextNode()) nodos.push(w.currentNode);
  nodos.forEach(n => { const t = T(n.nodeValue); if (t !== n.nodeValue) { if (!originales.has(n)) originales.set(n, n.nodeValue); n.nodeValue = t; } });
  raiz.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el => {
    if (el.closest('[translate="no"]')) return;
    ['title', 'aria-label', 'placeholder'].forEach(a => { if (el.hasAttribute(a)) { const v = el.getAttribute(a), t = T(v); if (t !== v) { const o = el.dataset.i18nOrig ? JSON.parse(el.dataset.i18nOrig) : {}; if (!(a in o)) o[a] = v; el.dataset.i18nOrig = JSON.stringify(o); el.setAttribute(a, t); } } });
  });
}
