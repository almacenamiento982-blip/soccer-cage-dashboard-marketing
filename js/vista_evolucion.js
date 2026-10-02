// Evolución de la gestión de marketing desde el 15-sep-2026: bloque del resumen y sección completa.
import { json, parrilla } from './datos.js?v=20261002a';
import * as K from './calculos.js?v=20261002a';
import * as C from './componentes.js?v=20261002a';
import { CORTE, sumarDias, hoyISO, diasEntre } from './periodo.js?v=20261002a';
import { comparacionIG, totalesComparacion, tablaSeguidores, tablaActividad, lecturaComparacion, IG_DE_PESTANA } from './vista_instagram.js?v=20261002a';
import { comparacionContenido, tablaPlanificacion, tablaCumplimiento, lecturaContenido } from './vista_contenido.js?v=20261002a';
const { n0, n1, usd, pct, fecha, esc } = K;
const corta = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

export async function cargar() {
  const [ig, pre, idc, evo] = await Promise.all([json('instagram'), json('meta_preacademy'), json('meta_idcamps'), json('evolucion')]);
  const p = await parrilla();
  return { ig, pre, idc, evo, p };
}

const leyenda = `<div class="leyenda-tipos" aria-label="Tipos de información"><span>Cada dato indica su tipo:</span>
  ${[['doc', 'situación previa con evidencia'], ['actividad', 'trabajo ejecutado'], ['resultado', 'cambio medido'], ['plan', 'definido sin ejecutar'], ['proyeccion', 'estimación futura'], ['pend', 'aún no se mide']]
    .map(([t, x]) => `<span class="item">${C.tipo(t)} ${x}</span>`).join('')}</div>`;

// Arma el bloque. completo=false → versión resumida para el Resumen ejecutivo.
export function bloque(d, completo = false, pref = 'evo') {
  const { ig, pre, idc, evo, p } = d;
  const filas = comparacionIG(ig), t = totalesComparacion(filas), r = filas[0].r;
  const kp = K.preacademyKPIs(pre), ki = K.idcampsKPIs(idc);
  const temp = K.historicoTemporadas(idc).at(-1);
  const rp = K.resumenParrilla(p.tabs.flatMap(x => x.registros));
  const cmpCont = comparacionContenido(p);
  const hitos = [...evo.hitos].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const hitosVer = completo ? hitos : hitos.slice(-6);
  const sit = completo ? evo.situacion_inicial : evo.situacion_inicial.slice(0, 4);
  const hoy = hoyISO();
  const proximas = evo.proximas.filter(x => !x.fecha || x.fecha >= hoy);
  const ver = (txt) => completo ? '' : `<p style="margin:10px 0 0"><a href="#evolucion">${txt} →</a></p>`;

  const html = `<div class="bloque-evo">
    <h2>Evolución de la gestión de marketing | Desde el 15 de septiembre de 2026</h2>
    <p class="intro" style="margin:6px 0 12px;color:var(--ink-2);max-width:80ch">Qué había documentado antes del corte, qué se hizo desde entonces y qué cambió en los datos. El trabajo realizado no se presenta como prueba de resultados comerciales.</p>
    ${leyenda}

    <div class="parte"><h3><span class="n">1</span> Situación inicial documentada ${C.tipo('doc')}</h3>
      <ul class="lista">${sit.map(x => `<li><b>${esc(x.area)}:</b> ${esc(x.texto)} <small style="color:var(--ink-3)">(${x.url ? `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.evidencia)}</a>` : esc(x.evidencia)})</small></li>`).join('')}</ul>
      ${ver(`Ver las ${evo.situacion_inicial.length} áreas documentadas`)}</div>

    <div class="parte"><h3><span class="n">2</span> Acciones realizadas desde el 15-sep ${C.tipo('actividad')}</h3>
      <p style="margin:0 0 8px">${n0(hitos.length)} hitos documentados entre el ${fecha(hitos[0].fecha)} y el ${fecha(hitos.at(-1).fecha)}${completo ? '' : '; se muestran los más recientes'}.</p>
      <ul class="linea-tiempo">${hitosVer.map(h => `<li><time datetime="${h.fecha}">${corta(h.fecha)}</time><div><b>${esc(h.area)}.</b> ${esc(h.texto)}<span class="ev">Evidencia: ${h.url ? `<a href="${esc(h.url)}" target="_blank" rel="noopener">${esc(h.evidencia)}</a>` : esc(h.evidencia)}</span></div></li>`).join('')}</ul>
      ${ver('Ver todos los hitos')}</div>

    <div class="parte"><h3><span class="n">3</span> Avances operativos</h3>
      ${completo ? C.tabla([
        { t: 'Área', k: x => `<b>${esc(x.area)}</b>` },
        { t: 'Antes del 15-sep', k: x => `${esc(x.antes)}${/^Sin registro/.test(x.antes) ? ` ${C.tipo('pend')}` : ''}` },
        { t: 'Desde el 15-sep', k: x => esc(x.despues) },
        { t: 'Estado', k: x => C.estado(x.estado) },
        { t: 'Evidencia', k: x => `<small>${esc(x.evidencia)}</small>` }], evo.operativo)
      : `<div class="tabla-wrap"><table><thead><tr><th scope="col">Área</th><th scope="col">Desde el 15-sep</th><th scope="col">Estado</th></tr></thead><tbody>
          ${evo.operativo.map(x => `<tr><td><b>${esc(x.area)}</b></td><td>${esc(x.despues)}</td><td>${C.estado(x.estado)}</td></tr>`).join('')}</tbody></table></div>`}
      <p class="fuente">«Sin registro disponible» indica que no hay documentación del estado anterior, no que el trabajo no existiera.</p></div>

    <div class="parte"><h3><span class="n">4</span> Indicadores de redes sociales ${C.tipo('resultado')}</h3>
      <p class="fuente" style="margin:0 0 10px">Ventanas de ${r.despues.dias} días: ${fecha(r.antes.desde)} – ${fecha(r.antes.hasta)} frente a ${fecha(r.despues.desde)} – ${fecha(r.despues.hasta)}. Suma de las cuatro cuentas de Instagram.</p>
      <div class="grid g4">
        ${C.comparativa({ etiqueta: 'Publicaciones', antes: t.posts[0], despues: t.posts[1] })}
        ${C.comparativa({ etiqueta: 'Alcance de las cuentas', antes: t.alcance[0], despues: t.alcance[1], detalle: 'Suma del alcance de cada cuenta' })}
        ${C.comparativa({ etiqueta: 'Visitas al perfil', antes: t.visitas[0], despues: t.visitas[1] })}
        ${C.comparativa({ etiqueta: 'Clics en el enlace del perfil', antes: t.clics[0], despues: t.clics[1] })}
      </div>
      <div class="card" style="margin-top:16px"><h3>Publicaciones en el feed por semana y cuenta</h3><p class="sub">Publicaciones reales leídas de la API de Instagram, del ${fecha('2026-07-01')} al ${fecha(K.finIG(ig))}. La línea punteada marca el 15-sep; la semana que empieza el 14-sep, que contiene el corte, queda a la derecha.</p>${C.lienzo(pref + 'Sem', '', 'Publicaciones por semana y cuenta')}</div>
      ${completo ? `<h3 style="margin:22px 0 8px">Seguidores: línea base y variación</h3>${tablaSeguidores(filas)}<h3 style="margin:22px 0 8px">Actividad y alcance por cuenta: antes → después</h3>${tablaActividad(filas)}` : ''}
      ${C.lectura(lecturaComparacion(filas))}${ver('Ver el detalle por cuenta')}</div>

    <div class="parte"><h3><span class="n">5</span> Estado actual de las campañas y del contenido</h3>
      <div class="grid g3">
        ${C.comparativa({ etiqueta: 'Pre-Academy · costo por conversación', antes: kp.cpaPrevio, despues: kp.cpa, formato: (x) => usd(x), invertir: true, detalle: `Campaña previa (${pre.mes_previo.dias} días, hasta el 19-sep) → campaña actual (${kp.dias} días). Duraciones distintas.` })}
        ${C.comparativa({ etiqueta: 'ID Camps · costo por lead (clic)', antes: temp?.cpl, despues: ki.cpl, formato: (x) => usd(x), invertir: true, detalle: `Temporada ${esc(temp?.temporada || '')} completa → ${ki.dias} días de la campaña nueva, en fase de aprendizaje. Registros atribuidos: pendiente de medición.` })}
        ${C.kpi({ valor: pct(rp.avance, 0), tipo: 'actividad', etiqueta: 'Contenido producido sobre el plan activo', detalle: `${n0(rp.producidas)} de ${n0(rp.activas)} piezas · ${n0(rp.pend_aprob)} esperan aprobación · ${n0(rp.publicadas)} publicadas` })}
      </div>
      ${completo ? `<h3 style="margin:22px 0 8px">Planificación de contenido antes y después ${C.tipo('plan')}</h3>${tablaPlanificacion(cmpCont)}<h3 style="margin:22px 0 8px">Cumplimiento del calendario (según el Sheet)</h3>${tablaCumplimiento(cmpCont)}` : ''}
      ${C.lectura(`${lecturaCampanas([['Pre-Academy', kp.cpaPrevio, kp.cpa, kp.dias], ['ID Camps', temp?.cpl, ki.cpl, ki.dias]])} ${lecturaContenido(cmpCont)}`)}</div>

    <div class="parte"><h3><span class="n">6</span> Próximas acciones estratégicas ${C.tipo('plan')}</h3>
      <ul class="linea-tiempo">${proximas.map(x => `<li><time${x.fecha ? ` datetime="${x.fecha}"` : ''}>${x.fecha ? corta(x.fecha) : 'Sin fecha'}</time><div>${esc(x.texto)}</div></li>`).join('')}</ul>
      <p style="margin:10px 0 0">${C.tipo('proyeccion')} Los escenarios de seguidores a 90 días están en <a href="#instagram">Instagram</a>; son estimaciones condicionadas, no metas ni resultados.</p></div>
  </div>`;

  const dibujar = () => {
    const fin = K.finIG(ig);
    const semanas = K.semanal([], '2026-07-01', fin).map(s => s.semana);
    const cuentas = ig.cuentas;
    C.grafico(pref + 'Sem', { type: 'bar', data: { labels: semanas.map(corta), datasets: cuentas.map(c => ({ label: '@' + c.usuario, backgroundColor: C.COLOR[c.usuario], data: K.semanal(c.publicaciones, '2026-07-01', fin).map(s => s.n) })) },
      options: { plugins: { corte: { indice: C.indiceCorte(semanas.map(s => sumarDias(s, 6))) }, valores: { mostrar: true } },
        scales: { x: { stacked: true, title: { display: true, text: 'Semana (inicio, lunes)' } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Publicaciones en el feed' } } } } });
  };
  return { html, dibujar };
}

// Frase sobre las campañas calculada de los valores (menor costo = mejor), sin atribuir causas
function lecturaCampanas(casos) {
  const partes = casos.filter(([, a, b]) => a != null && b != null).map(([n, a, b, dias]) =>
    `${n}: ${usd(b)} por resultado frente a ${usd(a)} de referencia (${b < a ? 'menor' : b > a ? 'mayor' : 'igual'}, con ${dias} días de datos)`);
  return partes.length ? `${partes.join('; ')}. Son periodos de distinta duración y campañas recién iniciadas: es una señal temprana, no un resultado consolidado.` : '';
}

export async function evolucion(v) {
  const d = await cargar();
  const b = bloque(d, true, 'evoC');
  v.innerHTML = C.cabecera({ kicker: 'Desde el 15-sep-2026', titulo: 'Evolución de la gestión',
    texto: `Comparación transparente entre la situación documentada antes del 15 de septiembre de 2026 y lo realizado y medido desde entonces. Contenido editorial actualizado el ${fecha(d.evo.actualizado)} (data/evolucion.json); las cifras se calculan de sus fuentes.` })
    + b.html + `<p class="fuente">${esc(d.evo.nota)}</p>`;
  b.dibujar();
}
