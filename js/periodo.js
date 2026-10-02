// Periodo de análisis compartido por todas las secciones (fecha de corte: 15-sep-2026).
// Se guarda en el navegador para que al cambiar de sección se mantenga la misma selección.

export const CORTE = '2026-09-15';
const CLAVE = 'periodo-dashboard';
export const MODOS = [
  { id: 'todo', nombre: 'Todo' },
  { id: 'antes', nombre: 'Antes del 15-sep' },
  { id: 'despues', nombre: 'Desde el 15-sep' },
  { id: 'comparar', nombre: 'Antes vs. después' },
  { id: 'personalizado', nombre: 'Personalizado' },
];

const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const hoyISO = () => iso(new Date());
export function sumarDias(f, n) { const d = new Date(f + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); }
export const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5) + 1;   // ambos incluidos

let estado = { modo: 'comparar', desde: null, hasta: null };
try { const g = JSON.parse(localStorage.getItem(CLAVE)); if (g && MODOS.some(m => m.id === g.modo)) estado = g; } catch { /* sin almacenamiento */ }

export const periodo = () => ({ ...estado });
export function fijarPeriodo(p) {
  estado = { ...estado, ...p };
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* sin almacenamiento */ }
  window.dispatchEvent(new CustomEvent('periodo'));
}

// Rangos de fechas (ISO, ambos extremos incluidos). «después» va del corte hasta `hasta`;
// «antes» comparable tiene la misma duración y termina el día anterior al corte.
export function rangos(hasta = hoyISO()) {
  const dias = Math.max(1, diasEntre(CORTE, hasta));
  const despues = { desde: CORTE, hasta, dias };
  const antes = { desde: sumarDias(CORTE, -dias), hasta: sumarDias(CORTE, -1), dias };
  return { corte: CORTE, antes, despues };
}

// Rango activo según el modo (en «comparar» devuelve null: cada vista usa antes y después)
export function rangoActivo(hasta = hoyISO()) {
  const r = rangos(hasta);
  switch (estado.modo) {
    case 'antes': return { desde: null, hasta: r.antes.hasta, etiqueta: 'antes del 15-sep' };
    case 'despues': return { ...r.despues, etiqueta: 'desde el 15-sep' };
    case 'personalizado': return estado.desde && estado.hasta ? { desde: estado.desde, hasta: estado.hasta, dias: diasEntre(estado.desde, estado.hasta), etiqueta: 'periodo personalizado' } : { desde: null, hasta: null, etiqueta: 'todo el periodo' };
    case 'comparar': return null;
    default: return { desde: null, hasta: null, etiqueta: 'todo el periodo' };
  }
}

export const enRango = (f, r) => !!f && (!r || ((!r.desde || f >= r.desde) && (!r.hasta || f <= r.hasta)));
