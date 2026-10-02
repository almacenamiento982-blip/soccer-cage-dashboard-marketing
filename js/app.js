// Enrutador por hash, menú móvil y estados de carga y error.
import * as V from './vistas.js';
import { json } from './datos.js';
import { destruirGraficos } from './componentes.js';
import { esc, fecha } from './calculos.js';

const RUTAS = {
  resumen: ['Resumen ejecutivo', V.resumen],
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

async function mostrar() {
  const id = location.hash.slice(1) in RUTAS ? location.hash.slice(1) : 'resumen';
  const [titulo, render] = RUTAS[id];
  const mio = ++turno;
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
    document.getElementById('reintentar').addEventListener('click', mostrar);
  } finally {
    if (mio === turno) vista.removeAttribute('aria-busy');
  }
  if (mio === turno) { window.scrollTo(0, 0); vista.focus({ preventScroll: true }); }
}

function cerrarMenu() { menu.classList.remove('abierto'); botonMenu.setAttribute('aria-expanded', 'false'); }
botonMenu.addEventListener('click', () => {
  const abierto = menu.classList.toggle('abierto');
  botonMenu.setAttribute('aria-expanded', String(abierto));
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrarMenu(); });

window.addEventListener('hashchange', mostrar);
mostrar();

json('instagram').then(d => {
  document.getElementById('pieDatos').innerHTML = `Datos de informes y campañas: ${esc(fecha(d.generado.slice(0, 10)))}.<br>Plan de contenido: lectura en vivo del Sheet.`;
}).catch(() => {});
