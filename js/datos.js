// Capa de datos: carga los JSON generados por actualizar_datos.py y lee la parrilla
// EN VIVO desde Google Sheets (exportación CSV pública por pestaña, solo lectura, sin credenciales).
// Se usa export?format=csv&gid= y no gviz porque gviz omite filas vacías y desplaza los números de fila.
// Si la lectura en vivo falla, usa la copia de respaldo guardada en data/parrilla_respaldo.json.

export const SHEET_ID = '1woCECOH5D4uaUU_d5i9Baf53PZKS5jq8qNZkttKoozI';
export const PESTANAS = [
  { clave: 'athletum', nombre: 'Athletum (Juve Miami)', cuenta: 'Athletum', gid: 2019029769 },
  { clave: 'camps_usa', nombre: 'Juve Camps USA', cuenta: 'Juventus Camps USA', gid: 401158311 },
  { clave: 'camps_mx', nombre: 'Juve Camps MEXICO', cuenta: 'Juventus Camps México', gid: 1554982198 },
];

const cache = {};
export async function json(nombre) {
  if (!cache[nombre]) {
    cache[nombre] = fetch(`data/${nombre}.json`, { cache: 'no-cache' }).then(r => {
      if (!r.ok) throw new Error(`No se pudo cargar ${nombre}.json (${r.status})`);
      return r.json();
    }).catch(e => { delete cache[nombre]; throw e; });   // permite reintentar
  }
  return cache[nombre];
}

// CSV RFC 4180 (comillas, comas y saltos de línea dentro de celdas)
export function parseCSV(txt) {
  const filas = []; let fila = []; let celda = ''; let q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"') { if (txt[i + 1] === '"') { celda += '"'; i++; } else q = false; }
      else celda += c;
    } else if (c === '"') q = true;
    else if (c === ',') { fila.push(celda); celda = ''; }
    else if (c === '\n') { fila.push(celda); filas.push(fila); fila = []; celda = ''; }
    else if (c !== '\r') celda += c;
  }
  if (celda !== '' || fila.length) { fila.push(celda); filas.push(fila); }
  return filas;
}

// Convierte el CSV de una pestaña en registros. La fila de encabezado es la que tiene
// "Day of the Week" en la columna B (las pestañas tienen bloques de notas o logística arriba).
export function normalizarPestana(csv, pestana) {
  const filas = parseCSV(csv);
  const h = filas.findIndex(f => (f[1] || '').trim() === 'Day of the Week');
  if (h < 0) return { registros: [], columnas: [] };
  const columnas = filas[h].map(c => c.trim()); columnas[0] = 'Date';
  const registros = [];
  filas.slice(h + 1).forEach((f, i) => {
    const r = {}; columnas.forEach((c, j) => { if (c) r[c] = (f[j] || '').trim(); });
    if (r.Status === 'Status' || r.Format === 'Format') return;          // encabezado repetido por mes
    if (!r.Format && !r.Content && !r.Description) return;                // fila vacía o separador de mes
    r._cuenta = pestana.cuenta; r._clave = pestana.clave; r._fila = h + 2 + i;
    r._fecha = aFecha(r.Date);
    registros.push(r);
  });
  return { registros, columnas: columnas.filter(Boolean) };
}

function aFecha(s) {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s || '');
  return m ? new Date(+m[3], +m[1] - 1, +m[2]) : null;
}

// Una lectura por carga de página (se comparte entre secciones); recargar la página vuelve a leer el Sheet.
let lectura = null;
export function parrilla() { return (lectura = lectura || leerParrilla()); }

async function leerParrilla() {
  try {
    const tabs = await Promise.all(PESTANAS.map(async p => {
      const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${p.gid}`;
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`Sheet ${p.nombre}: ${r.status}`);
      return { ...p, ...normalizarPestana(await r.text(), p) };
    }));
    return { origen: 'vivo', leido: new Date(), tabs };
  } catch (e) {
    const resp = await json('parrilla_respaldo');
    const tabs = PESTANAS.map(p => {
      const t = resp.pestanas.find(x => x.clave === p.clave);
      return { ...p, ...normalizarPestana(t ? t.csv : '', p) };
    });
    return { origen: 'copia', leido: new Date(resp.generado), error: e.message, tabs };
  }
}
