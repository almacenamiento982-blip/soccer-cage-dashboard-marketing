// Enrutador por hash, menú móvil, periodo compartido, actualización manual y estados de carga y error.
import * as V from './vistas.js?v=20261002d';
import { json, refrescar } from './datos.js?v=20261002d';
import { destruirGraficos } from './componentes.js?v=20261002d';
import { esc } from './calculos.js?v=20261002d';
import { fijarPeriodo } from './periodo.js?v=20261002d';

const RUTAS = {
  resumen: ['Resumen ejecutivo', V.resumen],
  evolucion: ['Evolución desde el 15-sep', V.evolucion],
  instagram: ['Instagram y crecimiento', V.instagram],
  'meta-idcamps': ['Meta Ads · Camps USA', V.metaIdcamps],
  'meta-preacademy': ['Meta Ads · Pre-Academy', V.metaPreacademy],
  email: ['Email marketing y SMS', V.email],
  contenido: ['Plan de contenido', V.contenido],
  ruta: ['Hoja de ruta', V.ruta],
};

const vista = document.getElementById('vista');
const menu = document.getElementById('menu');
const botonMenu = document.getElementById('abrirMenu');
let turno = 0;

async function mostrar({ mantenerScroll = false } = {}) {
  const id = location.hash.slice(1) in RUTAS ? location.hash.slice(1) : 'resumen';
  const [titulo, render] = RUTAS[id];
  const mio = ++turno;
  const y = window.scrollY;
  document.title = `${titulo} · Marketing Digital Soccer Cage`;
  document.querySelectorAll('.nav a').forEach(a => { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  cerrarMenu();
  destruirGraficos();
  vista.setAttribute('aria-busy', 'true');
  // cada vista se pinta en su propio contenedor; si el usuario cambia de sección antes de que
  // termine, ese contenedor ya no está en la página y su resultado se descarta
  const destino = document.createElement('div');
  destino.innerHTML = `<div class="cargando" role="status">Cargando ${esc(titulo.toLowerCase())}…</div>`;
  vista.replaceChildren(destino);
  try {
    await render(destino);
  } catch (e) {
    if (mio !== turno) return;
    console.error(e);
    vista.innerHTML = `<div class="aviso rojo" role="alert"><b>No se pudo cargar «${esc(titulo)}».</b> ${esc(e.message)}<br>
      Si abriste el archivo directamente desde la carpeta, sírvelo con un servidor web (ver LEEME.md). <button type="button" class="btn" id="reintentar">Reintentar</button></div>`;
    document.getElementById('reintentar').addEventListener('click', () => mostrar());
  } finally {
    if (mio === turno) vista.removeAttribute('aria-busy');
  }
  if (mio === turno) {
    window.scrollTo(0, mantenerScroll ? y : 0);
    if (!mantenerScroll) vista.focus({ preventScroll: true });
  }
}

function cerrarMenu() { menu.classList.remove('abierto'); botonMenu.setAttribute('aria-expanded', 'false'); }
botonMenu.addEventListener('click', () => {
  const abierto = menu.classList.toggle('abierto');
  botonMenu.setAttribute('aria-expanded', String(abierto));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });

// Selector de periodo (el mismo en todas las secciones que lo muestran)
vista.addEventListener('click', e => {
  const b = e.target.closest('[data-modo]');
  if (b) fijarPeriodo({ modo: b.dataset.modo });
});
vista.addEventListener('change', e => {
  if (e.target.id !== 'perDesde' && e.target.id !== 'perHasta') return;
  const desde = document.getElementById('perDesde')?.value, hasta = document.getElementById('perHasta')?.value;
  e.target.setCustomValidity('');
  if (desde && hasta && desde <= hasta) fijarPeriodo({ desde, hasta });
  else if (desde && hasta) { e.target.setCustomValidity('La fecha inicial debe ser anterior a la final.'); e.target.reportValidity(); }
});
window.addEventListener('periodo', () => mostrar({ mantenerScroll: true }));

// Pie del menú: fecha de la última actualización y botón para volver a leer las fuentes
const pie = document.getElementById('pieDatos');
async function pintarPie() {
  let est = null; try { est = await json('estado'); } catch { /* sin estado */ }
  const f = (s) => s ? new Date(s).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';
  const sec = est?.secciones || {};
  const ultima = Object.values(sec).map(x => x.actualizado).filter(Boolean).sort().at(-1);
  const avisos = Object.values(sec).some(x => x.error_ultima_ejecucion);
  pie.innerHTML = `<span>Informes y campañas actualizados: <b>${esc(f(ultima))}</b>${avisos ? ' <span title="Alguna fuente falló en la última actualización y conserva sus datos anteriores">(con avisos)</span>' : ''}</span>
    <span>Plan de contenido: <b>lectura en vivo</b> del Sheet.</span>
    <button type="button" id="btnRefrescar">Volver a leer las fuentes</button>
    <span id="refrescado" aria-live="polite"></span>`;
  document.getElementById('btnRefrescar').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    refrescar();
    await mostrar({ mantenerScroll: true });
    await pintarPie();
    document.getElementById('refrescado').textContent = `Leído de nuevo a las ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}.`;
  });
}

window.addEventListener('hashchange', () => mostrar());
mostrar();
pintarPie();
