// Cálculos puros (sin DOM). Todo sale de los datos; nada de cifras escritas a mano.

// ---------- formato ----------
const nf = (d) => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
export const n0 = (x) => (x == null || isNaN(x) ? '—' : nf(0).format(x));
export const n1 = (x) => (x == null || isNaN(x) ? '—' : nf(1).format(x));
export const usd = (x, d = 2) => (x == null || isNaN(x) ? '—' : '$' + nf(d).format(x));
export const pct = (x, d = 1) => (x == null || isNaN(x) ? '—' : nf(d).format(x * 100) + ' %');
export const fecha = (s) => {
  if (!s) return '—';
  const d = s instanceof Date ? s : new Date(s.length === 10 ? s + 'T12:00:00' : s);
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ---------- estados de la parrilla ----------
// Vocabulario real del Sheet (reglas de la pestaña Athletum): Idea → To be created →
// To be approved → Approved → Scheduled → Posted; POSTPONED y NOT approved quedan fuera del plan.
export const GRUPOS = [
  { id: 'pend_prod', nombre: 'Pendiente de producción', estados: ['Idea', 'To be created'], color: '#C9CDD2' },
  { id: 'pend_aprob', nombre: 'Producida, pendiente de aprobación', estados: ['To be approved'], color: '#E3C27A' },
  { id: 'aprobada', nombre: 'Lista para publicar (aprobada)', estados: ['Approved'], color: '#B8862F' },
  { id: 'programada', nombre: 'Programada', estados: ['Scheduled'], color: '#2F5D8A' },
  { id: 'publicada', nombre: 'Publicada', estados: ['Posted'], color: '#1E7A4C' },
  { id: 'fuera', nombre: 'Fuera del plan (pospuesta o no aprobada)', estados: ['POSTPONED', 'NOT approved'], color: '#E8B4BF' },
  { id: 'sin', nombre: 'Sin estado', estados: [''], color: '#EFEFF2' },
];
export function grupoDe(status) {
  const s = (status || '').trim();
  return (GRUPOS.find(g => g.estados.some(e => e.toLowerCase() === s.toLowerCase())) || GRUPOS.find(g => g.id === 'sin')).id;
}
const PRODUCIDAS = ['pend_aprob', 'aprobada', 'programada', 'publicada'];

export function resumenParrilla(regs) {
  const por = Object.fromEntries(GRUPOS.map(g => [g.id, 0]));
  regs.forEach(r => { por[grupoDe(r.Status)]++; });
  const total = regs.length;
  const activas = total - por.fuera;
  const producidas = PRODUCIDAS.reduce((s, g) => s + por[g], 0);
  return {
    total, activas, por,
    producidas, listas: por.aprobada, programadas: por.programada, publicadas: por.publicada,
    pend_prod: por.pend_prod + por.sin, pend_aprob: por.pend_aprob,
    avance: activas ? producidas / activas : null,
  };
}

export function contar(regs, campo, vacio = '(sin dato)') {
  const m = new Map();
  regs.forEach(r => { const k = (r[campo] || '').trim() || vacio; m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

// Clave para no duplicar piezas al consolidar: pestaña + fila del Sheet
export const claveRegistro = (r) => `${r._clave}#${r._fila}`;

// Publicaciones planificadas por mes (para la frecuencia prevista)
export function porMes(regs) {
  const m = new Map();
  regs.forEach(r => { if (!r._fecha || grupoDe(r.Status) === 'fuera') return;
    const k = `${r._fecha.getFullYear()}-${String(r._fecha.getMonth() + 1).padStart(2, '0')}`; m.set(k, (m.get(k) || 0) + 1); });
  return [...m.entries()].sort();
}

// ---------- Instagram ----------
export function crecimiento(c) {
  const serie = c.seguidores?.nuevos_por_dia || [];
  const nuevos = serie.reduce((s, x) => s + x.n, 0);
  const actual = c.seguidores?.actual ?? null;
  const dias = serie.length;
  const inicio = actual != null && dias ? actual - nuevos : null;   // aproximado: no descuenta bajas
  return { actual, nuevos, dias, inicio, var_pct: inicio ? nuevos / inicio : null, media_dia: dias ? nuevos / dias : null, serie };
}

const mediana = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// Proyección a `dias` días con tres escenarios transparentes. Solo si hay serie diaria real.
export function proyeccion(c, frecPlan, frecHist, dias = 90) {
  const g = crecimiento(c);
  if (!g.dias || g.actual == null) return null;
  const vals = g.serie.map(x => x.n);
  const factor = frecPlan && frecHist ? Math.min(1.5, Math.max(1, frecPlan / frecHist)) : 1;
  const tasas = { conservador: Math.min(mediana(vals), g.media_dia), intermedio: g.media_dia, alto: g.media_dia * factor };
  const esc = {};
  for (const [k, t] of Object.entries(tasas)) esc[k] = { tasa: t, final: Math.round(g.actual + t * dias) };
  return { base: g.actual, dias, factor, escenarios: esc };
}

// ---------- campañas ----------
export function preacademyKPIs(d) {
  const u = d.ultima;
  const dias = Math.round((new Date(u.fecha) - new Date(d.inicio)) / 864e5) + 1;
  const cpa = u.conv ? u.gasto / u.conv : null;
  const cpaPrevio = d.mes_previo.conv ? d.mes_previo.gasto / d.mes_previo.conv : null;
  const ctr = u.imp ? u.clics / u.imp : null;
  const presup = Object.values(d.presupuesto_diario).reduce((a, b) => a + b, 0);
  return { dias, cpa, cpaPrevio, ctr, presup, ...u };
}

export function idcampsKPIs(d) {
  const gasto = d.meta_diario.reduce((s, x) => s + x.gasto, 0);
  const clics = d.meta_diario.reduce((s, x) => s + x.clics, 0);
  const leads = d.meta_diario.reduce((s, x) => s + Object.values(x.leads).reduce((a, b) => a + b, 0), 0);
  const presup = Object.values(d.presupuesto_diario).reduce((a, b) => a + b, 0);
  const pagados = d.app.estados?.Paid ?? 0;
  return { gasto, clics, leads, cpl: leads ? gasto / leads : null, cpc: clics ? gasto / clics : null, presup, dias: d.meta_diario.length,
    registros: d.app.total_registros, pagados, parcial: d.meta_diario.some(x => x.parcial) };
}

export function historicoTemporadas(d) {
  const t = {};
  d.historico_temporadas.forEach(c => {
    const k = c.temporada; t[k] = t[k] || { temporada: k, inversion: 0, leads: 0, familias: 0, pagaron: 0, campanas: 0 };
    t[k].inversion += c.inversion; t[k].leads += c.leads; t[k].familias += c.familias; t[k].pagaron += c.pagaron; t[k].campanas++;
  });
  return Object.values(t).map(x => ({ ...x, cpl: x.leads ? x.inversion / x.leads : null, costo_pago: x.pagaron ? x.inversion / x.pagaron : null }));
}

export const claseEstado = (e) => ({ 'Implementado': 'implementado', 'En progreso': 'progreso', 'Planificado': 'planificado', 'Pendiente de validación': 'validacion' }[e] || 'validacion');
