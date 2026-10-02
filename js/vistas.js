// Vistas: arman cada sección con la capa de datos (datos.js), los cálculos (calculos.js)
// y los componentes (componentes.js).
import { json, parrilla, SHEET_ID } from './datos.js';
import * as K from './calculos.js';
import * as C from './componentes.js';
const { n0, n1, usd, pct, fecha, esc } = K;

const IG_DE_PESTANA = { athletum: 'juventusacademymiami', camps_usa: 'juventuscampsusa', camps_mx: 'juventuscampsmx' };
const mes = (k) => { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 15).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }); };
const urlFila = (gid, fila) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${gid}&range=A${fila}`;
const urlSheet = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

// Publicaciones de feed por mes: históricas (auditoría) y planificadas (parrilla, sin Stories)
function frecuencias(ig, p) {
  const out = {};
  ig.cuentas.forEach(c => {
    const ult = (c.mensual || []).slice(-6);
    out[c.usuario] = { hist: ult.length ? ult.reduce((s, m) => s + m.posts, 0) / ult.length : null, plan: null };
  });
  if (p) p.tabs.forEach(t => {
    const u = IG_DE_PESTANA[t.clave]; if (!out[u]) return;
    const hoy = new Date(); const desde = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    const meses = K.porMes(t.registros.filter(r => (r.Format || '') !== 'Story')).filter(([k]) => k >= desde);
    out[u].plan = meses.length ? meses.reduce((s, [, n]) => s + n, 0) / meses.length : null;
  });
  return out;
}

function tablaProyeccion(ig, frec) {
  const filas = ig.cuentas.map(c => {
    const f = frec[c.usuario] || {};
    return { c, g: K.crecimiento(c), pr: K.proyeccion(c, f.plan, f.hist, 90), f };
  });
  return C.tabla([
    { t: 'Cuenta', k: x => `<b>@${esc(x.c.usuario)}</b>` },
    { t: 'Seguidores hoy', num: 1, k: x => n0(x.g.actual) + (x.c.seguidores.fecha !== ig.generado.slice(0, 10) ? `<br><small class="vacio">lectura del ${fecha(x.c.seguidores.fecha)}</small>` : '') },
    { t: 'Nuevos 30 días', num: 1, k: x => x.g.dias ? '+' + n0(x.g.nuevos) : C.PENDIENTE },
    { t: 'Conservador (90 d)', num: 1, k: x => x.pr ? n0(x.pr.escenarios.conservador.final) : '—' },
    { t: 'Intermedio (90 d)', num: 1, k: x => x.pr ? n0(x.pr.escenarios.intermedio.final) : '—' },
    { t: 'Alto (90 d)', num: 1, k: x => x.pr ? n0(x.pr.escenarios.alto.final) : '—' },
    { t: 'Posts/mes: histórico → plan', num: 1, k: x => `${n1(x.f.hist)} → ${x.f.plan != null ? n1(x.f.plan) : '<span class="vacio">sin parrilla aquí</span>'}` },
  ], filas);
}

const notaProyeccion = `<p class="fuente"><b>Cómo se calcula (escenarios, no promesas):</b> se parte de los seguidores de hoy y se suma, durante 90 días,
el ritmo de nuevos seguidores de los últimos 30 días que entrega la API. <b>Conservador</b> = el menor valor entre la mediana y el promedio diario; <b>intermedio</b> = promedio diario;
<b>alto</b> = promedio diario multiplicado por cuánto aumenta la frecuencia de publicación planificada frente a la histórica (con un tope de +50 %).
La API no descuenta a quienes dejan de seguir, así que las tres cifras tienden a ser optimistas. Sin serie diaria no se proyecta.</p>`;

// =====================================================================
export async function resumen(v) {
  const [ig, pre, idc, em, est] = await Promise.all([json('instagram'), json('meta_preacademy'), json('meta_idcamps'), json('email'), json('estrategia')]);
  const p = await parrilla();
  const regs = p.tabs.flatMap(t => t.registros);
  const rp = K.resumenParrilla(regs);
  const kp = K.preacademyKPIs(pre), ki = K.idcampsKPIs(idc);
  const seg = ig.cuentas.reduce((s, c) => s + (c.seguidores.actual || 0), 0);
  const conSerie = ig.cuentas.filter(c => c.seguidores.nuevos_por_dia?.length);
  const sinSerie = ig.cuentas.filter(c => !c.seguidores.nuevos_por_dia?.length);
  const nuevos = conSerie.reduce((s, c) => s + K.crecimiento(c).nuevos, 0);
  const frec = frecuencias(ig, p);

  v.innerHTML = C.cabecera({ kicker: 'Centro de control', titulo: 'Resumen ejecutivo',
    texto: `Estado del marketing digital de Soccer Cage con datos de los informes del proyecto, las campañas de Meta y el plan de contenido. Datos generados el ${fecha(ig.generado.slice(0, 10))}; el plan de contenido se lee del Sheet al abrir la página.`,
    extra: C.badgeParrilla(p) })
  + `<div class="grid g3">
    ${C.kpi({ valor: n0(seg), etiqueta: `Seguidores en Instagram (${ig.cuentas.length} cuentas)`, detalle: sinSerie.length ? `${sinSerie.map(c => '@' + c.usuario).join(', ')}: última lectura del ${fecha(sinSerie[0].seguidores.fecha)} (conexión por renovar).` : 'Leídos hoy por la API.' })}
    ${C.kpi({ valor: '+' + n0(nuevos), etiqueta: 'Nuevos seguidores en 30 días', detalle: `${conSerie.length} cuentas con serie diaria.${sinSerie.length ? ` ${sinSerie.map(c => '@' + c.usuario).join(', ')}: pendiente de medición.` : ''} No descuenta bajas.` })}
    ${C.kpi({ valor: usd(kp.cpa), etiqueta: 'Pre-Academy · costo por conversación', detalle: `${n0(kp.conv)} conversaciones por ${usd(kp.gasto)} en ${kp.dias} días. Campaña anterior: ${usd(kp.cpaPrevio)}.` })}
    ${C.kpi({ valor: n0(ki.leads), etiqueta: 'ID Camps · leads (clics en «Register now»)', detalle: `${usd(ki.cpl)} por lead · ${usd(ki.gasto)} invertidos en ${ki.dias} días${ki.parcial ? ' (último día parcial)' : ''}. Registros confirmados por anuncio: pendiente de medición.` })}
    ${C.kpi({ valor: pct(rp.avance, 0), etiqueta: 'Avance de producción de contenido', detalle: `${n0(rp.producidas)} de ${n0(rp.activas)} piezas activas producidas · ${n0(rp.publicadas)} publicadas · ${n0(rp.pend_aprob)} esperan aprobación.` })}
    ${C.kpi({ valor: '0 de 56', tipo: 'plan', etiqueta: 'Email · envíos del plan nuevo', detalle: `Plan publicado de 56 emails y 36 SMS. ${esc(em.estado.primeros_envios)}.` })}
  </div>`
  + C.seccion('Frentes de trabajo', 'Cada frente separa lo que se planificó, lo que ya se hizo y lo que falta. El estado se asigna solo con evidencia.',
    `<div class="grid gauto">${est.frentes.map(f => `<article class="card frente">
      <div class="t"><h3>${esc(f.titulo)}</h3>${C.estado(f.estado)}</div>
      <dl><div><dt>Objetivo</dt><dd>${esc(f.objetivo)}</dd></div><div><dt>Qué se hizo</dt><dd>${esc(f.realizado)}</dd></div>
      <div><dt>Hallazgo principal</dt><dd>${esc(f.hallazgo)}</dd></div><div><dt>Evidencia</dt><dd>${esc(f.evidencia)}</dd></div></dl>
      <div class="sig"><b>Siguiente paso:</b> ${esc(f.siguiente)} <a href="#${esc(f.seccion)}">Ver sección →</a></div></article>`).join('')}</div>`)
  + C.seccion('Comparación de las dos campañas activas', 'Las dos campañas miden resultados distintos: una conversación de WhatsApp no equivale a un clic hacia el formulario. Por eso se comparan lado a lado y no se suman.',
    `<div class="tabla-wrap"><table class="compara"><thead><tr><th scope="col">Indicador</th><th scope="col">Pre-Academy Miami</th><th scope="col">ID Camps USA</th></tr></thead><tbody>
      <tr><td>Campaña</td><td>${esc(pre.campana)}</td><td>${esc(idc.campana)}</td></tr>
      <tr><td>Resultado que se mide</td><td>Conversación iniciada en WhatsApp</td><td>Clic en «Register now» hacia la app de inscripción</td></tr>
      <tr><td>Activa desde</td><td>${fecha(pre.inicio)} (${kp.dias} días)</td><td>${fecha(idc.activa_desde)} (${ki.dias} días)</td></tr>
      <tr><td>Presupuesto diario</td><td class="mono">${usd(kp.presup, 0)}</td><td class="mono">${usd(ki.presup, 0)}</td></tr>
      <tr><td>Inversión acumulada</td><td class="mono">${usd(kp.gasto)}</td><td class="mono">${usd(ki.gasto)}</td></tr>
      <tr><td>Resultados</td><td class="mono">${n0(kp.conv)}</td><td class="mono">${n0(ki.leads)}</td></tr>
      <tr><td>Costo por resultado</td><td class="mono"><b>${usd(kp.cpa)}</b></td><td class="mono"><b>${usd(ki.cpl)}</b></td></tr>
      <tr><td>Referencia anterior</td><td>${usd(kp.cpaPrevio)} por conversación (últimos 30 días de la campaña previa)</td><td>${usd(K.historicoTemporadas(idc).at(-1)?.cpl)} por lead (temporada ${esc(K.historicoTemporadas(idc).at(-1)?.temporada || '')}, mismo tipo de lead)</td></tr>
      <tr><td>Resultado comercial</td><td>Clases de prueba agendadas: ${C.PENDIENTE}</td><td>Registros por anuncio: ${C.PENDIENTE} (la app suma ${n0(ki.registros)} registros de todos los canales)</td></tr>
      <tr><td>Próxima revisión</td><td>${esc(pre.proxima_revision)}</td><td>10–13 de octubre</td></tr>
    </tbody></table></div>`)
  + C.seccion('Crecimiento en Instagram y escenarios a 90 días', '', `<div class="grid">
      <div class="card"><h3>Nuevos seguidores acumulados · últimos 30 días</h3><p class="sub">Serie diaria de la API de Instagram.</p>${C.lienzo('gNuevos', 'bajo', 'Nuevos seguidores acumulados por cuenta')}</div>
      <div><h3 style="margin:0 0 4px">Escenarios de seguidores a 90 días</h3><p class="fuente" style="margin:0 0 10px">Proyecciones condicionadas, no resultados.</p>${tablaProyeccion(ig, frec)}</div>
    </div>${notaProyeccion}`)
  + C.seccion('Avance de los contenidos', `Piezas del Sheet por estado. «Producidas» = por aprobar + aprobadas + programadas + publicadas; el avance se calcula sobre las piezas activas (sin pospuestas ni rechazadas).`,
    `<div class="card">${C.lienzo('gAvance', 'bajo', 'Piezas por estado y cuenta')}</div>${C.fuente('Google Sheet «Social Media Content Plan», pestañas Athletum, Juve Camps USA y Juve Camps MEXICO', urlSheet)}`);

  // gráficos
  C.grafico('gNuevos', { type: 'line', data: { labels: conSerie[0]?.seguidores.nuevos_por_dia.map(x => x.fecha.slice(5)) || [],
    datasets: conSerie.map((c, i) => { let a = 0; return { label: '@' + c.usuario, data: c.seguidores.nuevos_por_dia.map(x => (a += x.n)), borderColor: C.PALETA[i], backgroundColor: C.PALETA[i], pointRadius: 0, tension: .2 }; }) },
    options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'Nuevos seguidores (acumulado)' } } } } });
  graficoEstados('gAvance', p.tabs);
}

function graficoEstados(id, tabs) {
  C.grafico(id, { type: 'bar', data: { labels: tabs.map(t => t.cuenta),
    datasets: K.GRUPOS.map(g => ({ label: g.nombre, backgroundColor: g.color, data: tabs.map(t => t.registros.filter(r => K.grupoDe(r.Status) === g.id).length) })).filter(d => d.data.some(Boolean)) },
    options: { indexAxis: 'y', scales: { x: { stacked: true, title: { display: true, text: 'Piezas' } }, y: { stacked: true } } } });
}

// =====================================================================
let cuentaIG = null;
export async function instagram(v) {
  const ig = await json('instagram');
  let hist = []; try { hist = (await json('seguidores_historial')).lecturas || []; } catch { /* aún sin historial */ }
  let p = null; try { p = await parrilla(); } catch { /* la proyección alta queda sin plan */ }
  const frec = frecuencias(ig, p);
  cuentaIG = cuentaIG || ig.cuentas.find(c => c.seguidores.nuevos_por_dia?.length)?.usuario || ig.cuentas[0].usuario;

  const resumenCuentas = C.tabla([
    { t: 'Cuenta', k: c => `<a href="${esc(c.url)}" target="_blank" rel="noopener">@${esc(c.usuario)}</a><br><small>${esc(c.propiedad)}</small>` },
    { t: 'Seguidores', num: 1, k: c => n0(c.seguidores.actual) },
    { t: 'Nuevos 30 días', num: 1, k: c => c.seguidores.nuevos_por_dia?.length ? '+' + n0(K.crecimiento(c).nuevos) : C.PENDIENTE },
    { t: 'Periodo auditado', k: c => `${fecha(c.auditoria.desde)} – ${fecha(c.auditoria.hasta)}` },
    { t: 'Publicaciones auditadas', num: 1, k: c => n0(c.auditoria.publicaciones) },
    { t: 'Alcance total', num: 1, k: c => n0(c.totales.reach) },
    { t: 'Interacción / alcance', num: 1, k: c => pct(c.totales.reach ? c.totales.interactions / c.totales.reach : null, 2) },
  ], ig.cuentas);

  v.innerHTML = C.cabecera({ kicker: 'Social media', titulo: 'Instagram y crecimiento', informe: ig.informe,
    texto: 'Auditoría de las cuentas por propiedad (publicaciones, alcance, interacción y formatos) y seguidores actuales leídos de la API de Instagram.' })
  + (ig.cuentas.some(c => !c.seguidores.nuevos_por_dia?.length) ? C.aviso(`<b>Conexión por renovar:</b> ${ig.cuentas.filter(c => !c.seguidores.nuevos_por_dia?.length).map(c => '@' + c.usuario).join(', ')} no respondió a la API (token vencido). Se muestran los seguidores de su última lectura y su crecimiento queda pendiente de medición.`, 'rojo') : '')
  + C.seccion('Las cuatro cuentas', esc(ig.nota_seguidores), resumenCuentas + C.fuente(ig.fuente, ig.informe))
  + `<section class="seccion"><div class="filtros"><div class="tabs" role="group" aria-label="Cuenta">${ig.cuentas.map(c => `<button type="button" data-cuenta="${esc(c.usuario)}" aria-pressed="${c.usuario === cuentaIG}">@${esc(c.usuario)}</button>`).join('')}</div></div><div id="detalleIG"></div></section>`
  + C.seccion('Escenarios de seguidores a 90 días', '', tablaProyeccion(ig, frec) + notaProyeccion
    + `<p class="fuente">Historial de seguidores totales guardado desde el ${hist.length ? fecha(hist[0].fecha) : '—'} (${n0(hist.length)} ${hist.length === 1 ? 'lectura' : 'lecturas'}). Cada vez que se actualizan los datos se agrega una lectura; con el tiempo permitirá medir el crecimiento neto real.</p>`);

  const pintar = () => {
    if (!v.isConnected) return;
    C.destruirGraficos();
    const c = ig.cuentas.find(x => x.usuario === cuentaIG); const g = K.crecimiento(c);
    const mejor = [...c.por_formato].sort((a, b) => b.er_alcance - a.er_alcance)[0];
    document.getElementById('detalleIG').innerHTML = `<h2>@${esc(c.usuario)}</h2><p class="intro">${esc(c.propiedad)} · auditoría de ${n0(c.auditoria.publicaciones)} publicaciones (${fecha(c.auditoria.desde)} – ${fecha(c.auditoria.hasta)}), extraída el ${fecha(c.auditoria.extraido)}.</p>
      <div class="grid g4">
        ${C.kpi({ valor: n0(g.actual), etiqueta: 'Seguidores', detalle: `Lectura del ${fecha(c.seguidores.fecha)}` })}
        ${C.kpi({ valor: g.dias ? '+' + n0(g.nuevos) : '—', etiqueta: 'Nuevos seguidores (30 días)', detalle: g.dias ? `${pct(g.var_pct)} sobre la base aproximada · ${n1(g.media_dia)} por día` : 'pendiente de medición' })}
        ${C.kpi({ valor: n0(c.totales.reach), etiqueta: 'Alcance acumulado', detalle: `${n0(c.totales.views)} visualizaciones en el periodo auditado` })}
        ${C.kpi({ valor: mejor ? esc(mejor.formato) : '—', etiqueta: 'Formato con más interacción', detalle: mejor ? `${pct(mejor.er_alcance / 100, 2)} de interacción sobre alcance (${n0(mejor.n)} publicaciones)` : '' })}
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><h3>Nuevos seguidores por día</h3><p class="sub">Últimos 30 días (API).</p>${g.dias ? C.lienzo('gDia', '', 'Nuevos seguidores por día') : `<p class="vacio">Pendiente de medición: la conexión de esta cuenta debe renovarse.</p>`}</div>
        <div class="card"><h3>Alcance mensual y publicaciones</h3><p class="sub">Periodo auditado.</p>${C.lienzo('gMes', '', 'Alcance mensual y publicaciones')}</div>
      </div>
      <div class="grid g2" style="margin-top:16px">
        <div class="card"><h3>Rendimiento por formato</h3>${C.tabla([
          { t: 'Formato', k: 'formato' }, { t: 'Publicaciones', num: 1, k: x => `${n0(x.n)} (${n1(x.pct)} %)` },
          { t: 'Alcance prom.', num: 1, k: x => n0(x.alcance_prom) }, { t: 'Interacciones prom.', num: 1, k: x => n0(x.interacciones_prom) },
          { t: 'Interacción / alcance', num: 1, k: x => pct(x.er_alcance / 100, 2) }], c.por_formato)}</div>
        <div class="card"><h3>Publicaciones con más alcance</h3>${C.tabla([
          { t: 'Fecha', k: x => fecha(x.fecha) }, { t: 'Formato', k: 'formato' },
          { t: 'Publicación', k: x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc((x.texto || 'Ver publicación').slice(0, 70))}${(x.texto || '').length > 70 ? '…' : ''}</a>` },
          { t: 'Alcance', num: 1, k: x => n0(x.alcance) }], c.top)}</div>
      </div>`;
    if (g.dias) C.grafico('gDia', { type: 'bar', data: { labels: g.serie.map(x => x.fecha.slice(5)), datasets: [{ label: 'Nuevos seguidores', data: g.serie.map(x => x.n), backgroundColor: '#B8862F' }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
    C.grafico('gMes', { data: { labels: c.mensual.map(m => mes(m.mes)), datasets: [
      { type: 'bar', label: 'Alcance', data: c.mensual.map(m => m.alcance), backgroundColor: '#111214', yAxisID: 'y' },
      { type: 'line', label: 'Publicaciones', data: c.mensual.map(m => m.posts), borderColor: '#B8862F', backgroundColor: '#B8862F', yAxisID: 'y1', tension: .2 }] },
      options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'Alcance' } }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Publicaciones' }, ticks: { precision: 0 } } } } });
  };
  v.querySelectorAll('[data-cuenta]').forEach(b => b.addEventListener('click', () => {
    cuentaIG = b.dataset.cuenta; v.querySelectorAll('[data-cuenta]').forEach(x => x.setAttribute('aria-pressed', x === b)); pintar();
  }));
  pintar();
}

// =====================================================================
export async function metaIdcamps(v) {
  const d = await json('meta_idcamps');
  const k = K.idcampsKPIs(d); const temp = K.historicoTemporadas(d);
  const conj = Object.keys(d.presupuesto_diario);
  const leadsConj = Object.fromEntries(conj.map(c => [c, d.meta_diario.reduce((s, x) => s + (x.leads[c] || 0), 0)]));

  v.innerHTML = C.cabecera({ kicker: 'Meta Ads', titulo: 'Juventus Camps USA · ID Camps', informe: d.informe,
    texto: `${esc(d.objetivo)}. Campaña <b>${esc(d.campana)}</b>, montada el ${fecha(d.montada)} y activa desde el ${fecha(d.activa_desde)}.` })
  + C.aviso(`<b>Qué es un «lead» aquí:</b> ${esc(d.medicion)} ${esc(d.revision)}`)
  + `<div class="grid g3" style="margin-top:16px">
    ${C.kpi({ valor: usd(k.presup, 0), tipo: 'plan', etiqueta: 'Presupuesto diario', detalle: conj.map(c => `${c} ${usd(d.presupuesto_diario[c], 0)}`).join(' · ') })}
    ${C.kpi({ valor: usd(k.gasto), etiqueta: 'Inversión acumulada', detalle: `${k.dias} días de entrega${k.parcial ? '; el último día es parcial' : ''}.` })}
    ${C.kpi({ valor: n0(k.leads), etiqueta: 'Leads (clics en «Register now»)', detalle: `${usd(k.cpl)} por lead · ${n0(k.clics)} clics en total (${usd(k.cpc)} por clic).` })}
    ${C.kpi({ valor: n0(k.registros), etiqueta: 'Registros en la app (todos los canales)', detalle: `${n0(k.pagados)} pagados. ${esc(d.app.nota)}` })}
    ${C.kpi({ valor: n0(d.total_anuncios), tipo: 'impl', etiqueta: 'Anuncios activos', detalle: `${conj.length} conjuntos; retargeting hasta el ${fecha(d.rtg_fin)}.` })}
    ${C.kpi({ valor: '—', tipo: 'pend', etiqueta: 'Registros atribuidos a Meta', detalle: 'Pendiente de medición: la app no envía el evento de registro a Meta.' })}
  </div>`
  + C.seccion('Entrega diaria', 'Inversión y leads por conjunto, según el seguimiento diario de Meta.', `<div class="card">${C.lienzo('gDiario', '', 'Inversión y leads por día')}</div>`)
  + C.seccion('Estructura de la campaña', '', C.tabla([
      { t: 'Conjunto', k: c => `<b>${esc(c)}</b><br><small>${esc(d.conjuntos[c])}</small>` },
      { t: 'Presupuesto diario', num: 1, k: c => usd(d.presupuesto_diario[c], 0) },
      { t: 'Leads acumulados', num: 1, k: c => n0(leadsConj[c]) },
      { t: 'Anuncios', k: c => (d.anuncios_por_conjunto[c] || []).map(esc).join('<br>') }], conj)
    + `<p class="fuente">Zonas del retargeting: ${d.rtg_zonas.map(esc).join(' · ')}.</p>`)
  + C.seccion('Registros en la app por sede', esc(d.app.nota), `<div class="grid g2">
      <div class="card">${C.tabla([{ t: 'Sede', k: x => esc(x[0]) }, { t: 'Registros', num: 1, k: x => n0(x[1].registros) }, { t: 'Pagados', num: 1, k: x => n0(x[1].pagados) }, { t: 'Niños pagados', num: 1, k: x => n0(x[1].ninos_pagados) }],
        Object.entries(d.app.sedes).sort((a, b) => b[1].registros - a[1].registros))}<p class="fuente">Leído el ${fecha(d.app.leido)}.</p></div>
      <div class="card"><h3>Registros y pagos por día</h3>${C.lienzo('gApp', 'bajo', 'Registros y pagos por día')}</div></div>`)
  + C.seccion('Temporadas anteriores (referencia)', 'Diagnóstico de las clínicas pasadas. Allí el «lead» también era el clic en «Register now», por eso el costo por lead es comparable; las familias y pagos vienen del cruce con la base de inscritos.',
    C.tabla([{ t: 'Temporada', k: 'temporada' }, { t: 'Clínicas', num: 1, k: x => n0(x.campanas) }, { t: 'Inversión', num: 1, k: x => usd(x.inversion) }, { t: 'Leads', num: 1, k: x => n0(x.leads) },
      { t: 'Costo por lead', num: 1, k: x => usd(x.cpl) }, { t: 'Familias que pagaron', num: 1, k: x => n0(x.pagaron) }, { t: 'Inversión por familia que pagó', num: 1, k: x => usd(x.costo_pago) }], temp)
    + `<details style="margin-top:12px"><summary>Ver detalle por clínica</summary><div style="margin-top:10px">${C.tabla([
      { t: 'Clínica', k: 'clinica' }, { t: 'Inversión', num: 1, k: x => usd(x.inversion) }, { t: 'Alcance', num: 1, k: x => n0(x.alcance) }, { t: 'Leads', num: 1, k: x => n0(x.leads) },
      { t: 'Costo por lead', num: 1, k: x => usd(x.leads ? x.inversion / x.leads : null) }, { t: 'Familias', num: 1, k: x => n0(x.familias) }, { t: 'Pagaron', num: 1, k: x => n0(x.pagaron) }], d.historico_temporadas)}</div></details>`)
  + C.seccion('Pendiente para la revisión del 10–13 de octubre', '', `<div class="card"><ul class="lista">${d.pendiente_revision.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${C.fuente(d.fuente, d.informe)}`);

  C.grafico('gDiario', { data: { labels: d.meta_diario.map(x => fecha(x.fecha) + (x.parcial ? ' (parcial)' : '')), datasets: [
    ...conj.map((c, i) => ({ type: 'bar', label: `Leads ${c}`, data: d.meta_diario.map(x => x.leads[c] || 0), backgroundColor: C.PALETA[i], stack: 'l', yAxisID: 'y' })),
    { type: 'line', label: 'Inversión (USD)', data: d.meta_diario.map(x => x.gasto), borderColor: '#C8143A', backgroundColor: '#C8143A', yAxisID: 'y1' }] },
    options: { scales: { y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Leads' }, ticks: { precision: 0 } }, x: { stacked: true }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'USD' } } } } });
  C.grafico('gApp', { type: 'bar', data: { labels: d.app.dias.map(x => x.fecha.slice(5)), datasets: [
    { label: 'Registros', data: d.app.dias.map(x => x.registros), backgroundColor: '#111214' }, { label: 'Pagos', data: d.app.dias.map(x => x.pagos), backgroundColor: '#B8862F' }] },
    options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } } } });
}

// =====================================================================
export async function metaPreacademy(v) {
  const d = await json('meta_preacademy'); const k = K.preacademyKPIs(d);
  const fila = ([n, x]) => ({ n, ...x, cpa: x.conv ? x.gasto / x.conv : null, ctr: x.imp ? x.clics / x.imp : null });
  const conj = Object.entries(d.ultima.conjuntos).map(fila).sort((a, b) => (a.cpa ?? 1e9) - (b.cpa ?? 1e9));
  const ads = Object.entries(d.ultima.anuncios).map(fila).sort((a, b) => b.conv - a.conv);
  const cols = (nombre) => [{ t: nombre, k: x => `<b>${esc(x.n)}</b>` }, { t: 'Conversaciones', num: 1, k: x => n0(x.conv) }, { t: 'Inversión', num: 1, k: x => usd(x.gasto) },
    { t: 'Costo por conversación', num: 1, k: x => x.conv ? usd(x.cpa) : '<span class="vacio">sin conversaciones</span>' }, { t: 'Impresiones', num: 1, k: x => n0(x.imp) }, { t: 'CTR', num: 1, k: x => pct(x.ctr, 2) }];
  const m = d.mensajes;

  v.innerHTML = C.cabecera({ kicker: 'Meta Ads', titulo: 'Pre-Academy Miami', informe: d.informe,
    texto: `${esc(d.objetivo)}. Campaña <b>${esc(d.campana)}</b>, activa desde el ${fecha(d.inicio)}. Próxima revisión: ${esc(d.proxima_revision)}.` })
  + `<div class="grid g4">
    ${C.kpi({ valor: n0(k.conv), etiqueta: 'Conversaciones iniciadas', detalle: `Acumulado al ${fecha(k.fecha)} (${k.dias} días).` })}
    ${C.kpi({ valor: usd(k.cpa), etiqueta: 'Costo por conversación', detalle: `Campaña anterior: ${usd(k.cpaPrevio)} (${n0(d.mes_previo.conv)} conversaciones por ${usd(d.mes_previo.gasto)} en ${d.mes_previo.dias} días).` })}
    ${C.kpi({ valor: usd(k.gasto), etiqueta: 'Inversión acumulada', detalle: `Presupuesto actual ${usd(k.presup, 0)} por día: ${Object.entries(d.presupuesto_diario).map(([a, b]) => `${a} ${usd(b, 0)}`).join(' · ')}.` })}
    ${C.kpi({ valor: '—', tipo: 'pend', etiqueta: 'Clases de prueba agendadas', detalle: 'Pendiente de medición: hoy no se registra cuántas conversaciones terminan en clase de prueba.' })}
  </div>`
  + C.seccion('Evolución acumulada', 'Lecturas de Ads Manager registradas en cada revisión.', `<div class="card">${C.lienzo('gPre', '', 'Conversaciones e inversión acumuladas')}</div>`)
  + C.seccion('Públicos', 'Ordenados del más barato al más caro por conversación.', C.tabla(cols('Público'), conj))
  + C.seccion('Anuncios', 'Ordenados por conversaciones.', C.tabla(cols('Anuncio'), ads))
  + (m ? C.seccion('Conversaciones en WhatsApp', esc(m.fuente), `<div class="grid g4">
      ${C.kpi({ valor: n0(m.iniciadas), etiqueta: 'Conversaciones iniciadas', detalle: `Al ${fecha(m.fecha)}` })}
      ${C.kpi({ valor: n0(m.nuevos), etiqueta: 'Contactos nuevos', detalle: 'Personas que escribían por primera vez' })}
      ${C.kpi({ valor: n0(m.totales), etiqueta: 'Mensajes totales', detalle: '' })}
      ${C.kpi({ valor: n0(m.respondidas), etiqueta: 'Respondidas (dato de Meta)', detalle: 'Dato tal como lo reporta Ads Manager' })}</div>`) : '')
  + C.seccion('Cambios y decisiones', '', `<div class="card"><ul class="lista">${d.cambios.map(c => `<li><b>${fecha(c.fecha)}:</b> ${esc(c.texto)}</li>`).join('')}</ul></div>${C.fuente(d.fuente, d.informe)}`);

  C.grafico('gPre', { data: { labels: d.lecturas.map(x => fecha(x.fecha)), datasets: [
    { type: 'bar', label: 'Conversaciones (acumulado)', data: d.lecturas.map(x => x.conv), backgroundColor: '#111214', yAxisID: 'y' },
    { type: 'line', label: 'Costo por conversación (USD)', data: d.lecturas.map(x => x.conv ? +(x.gasto / x.conv).toFixed(2) : null), borderColor: '#B8862F', backgroundColor: '#B8862F', yAxisID: 'y1', tension: .2 }] },
    options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'Conversaciones' } }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'USD por conversación' } } } } });
}

// =====================================================================
export async function email(v) {
  const d = await json('email'); const t = d.total, u = d.ultimos_12;
  const grupos = Object.entries(d.por_grupo).map(([g, x]) => ({ g, ...x }));
  const estadoEtq = (s) => /^Implementado/.test(s) ? 'implementado' : /^Planificado/.test(s) ? 'planificado' : 'validacion';
  const nombres = { auditoria: 'Auditoría de Constant Contact', plan_email_sms: 'Plan de email y SMS', primeros_envios: 'Primeros envíos del plan', dkim_dmarc: 'Autenticación DKIM y DMARC', automatizaciones: 'Secuencias automáticas' };

  v.innerHTML = C.cabecera({ kicker: 'Email marketing y SMS', titulo: 'Email marketing y SMS', informe: d.informe,
    texto: `Auditoría de ${n0(t.n)} campañas enviadas entre el ${fecha(d.periodo[0])} y el ${fecha(d.periodo[1])}, y estado del plan nuevo. Las cifras son históricas: el plan nuevo todavía no tiene envíos.`,
    extra: `<a class="btn" href="${esc(d.plan)}" target="_blank" rel="noopener">Ver plan email/SMS ↗</a>` })
  + `<div class="grid g4">
    ${C.kpi({ valor: n0(t.sends), etiqueta: 'Envíos auditados', detalle: `${n0(t.n)} campañas · ${n0(u.sends)} en los últimos 12 meses` })}
    ${C.kpi({ valor: pct(t.click, 2), etiqueta: 'Clic sobre entregados', detalle: `Últimos 12 meses: ${pct(u.click, 2)} · ${n0(t.clicks)} clics en total` })}
    ${C.kpi({ valor: pct(t.bounce, 2), etiqueta: 'Rebote', detalle: `Últimos 12 meses: ${pct(u.bounce, 2)}` })}
    ${C.kpi({ valor: pct(t.open, 1), etiqueta: 'Apertura (dato de Constant Contact)', detalle: 'Inflada por la protección de privacidad de Apple Mail: usar el clic como indicador principal.' })}
  </div>`
  + C.seccion('Estado de implementación', 'Lo que ya se hizo y lo que solo está planificado.', C.tabla([
      { t: 'Elemento', k: x => `<b>${esc(nombres[x[0]] || x[0])}</b>` }, { t: 'Estado', k: x => C.etiquetaEstado(x[1].split(/[:(]/)[0].trim(), estadoEtq(x[1])) }, { t: 'Detalle', k: x => esc(x[1]) }], Object.entries(d.estado))
    + C.aviso('<b>SMS:</b> el plan incluye 36 SMS, pero no hay envíos de SMS registrados: sus resultados quedan pendientes de medición.', 'gris'))
  + C.seccion('Hallazgos de la auditoría', '', `<div class="card"><ul class="lista">${d.hallazgos.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>`)
  + C.seccion('Evolución mensual', 'Clic y rebote de cada mes.', `<div class="card">${C.lienzo('gEmail', '', 'Clic y rebote mensual')}</div>`)
  + C.seccion('Resultados por tamaño de envío y por público', '', `<div class="grid g2">
      <div class="card"><h3>Por tamaño de la lista</h3>${C.tabla([{ t: 'Contactos', k: 'label' }, { t: 'Campañas', num: 1, k: x => n0(x.n) }, { t: 'Clic', num: 1, k: x => pct(x.click, 2) }, { t: 'Rebote', num: 1, k: x => pct(x.bounce, 2) }], d.por_tamano)}</div>
      <div class="card"><h3>Por público</h3>${C.tabla([{ t: 'Grupo', k: 'g' }, { t: 'Campañas', num: 1, k: x => n0(x.n) }, { t: 'Clic', num: 1, k: x => pct(x.click, 2) }, { t: 'Rebote', num: 1, k: x => pct(x.bounce, 2) }], grupos)}</div></div>`)
  + C.seccion('Metas a 90 días', 'Metas del plan. «Hoy» es el valor de la auditoría.', C.tabla([{ t: 'Métrica', k: x => `<b>${esc(x.metrica)}</b>` }, { t: 'Hoy', k: 'hoy' }, { t: 'Meta', k: 'meta' }], d.metas_90_dias))
  + C.seccion('Plan de acción (17 pasos)', 'Planificado; ningún paso se marca como hecho hasta que haya evidencia.', C.tabla([{ t: '#', num: 1, k: 'n' }, { t: 'Paso', k: 'paso' }, { t: 'Cuándo', k: 'cuando' }, { t: 'Responsable', k: 'quien' }], d.pasos)
    + C.fuente(d.fuente, d.informe));

  C.grafico('gEmail', { type: 'line', data: { labels: d.mensual.map(x => mes(x.mes)), datasets: [
    { label: 'Clic', data: d.mensual.map(x => +(x.click * 100).toFixed(2)), borderColor: '#B8862F', backgroundColor: '#B8862F', tension: .2 },
    { label: 'Rebote', data: d.mensual.map(x => +(x.bounce * 100).toFixed(2)), borderColor: '#C8143A', backgroundColor: '#C8143A', tension: .2 }] },
    options: { scales: { y: { beginAtZero: true, title: { display: true, text: '% sobre envíos' }, ticks: { callback: (x) => x + ' %' } } } } });
}

// =====================================================================
const filtrosCont = { cuenta: '', grupo: '', formato: '', pilar: '', mes: '', q: '' };
export async function contenido(v) {
  const p = await parrilla();
  // consolidado sin duplicados (clave = pestaña + fila)
  const vistos = new Set(); const regs = [];
  p.tabs.forEach(t => t.registros.forEach(r => { const k = K.claveRegistro(r); if (!vistos.has(k)) { vistos.add(k); regs.push({ ...r, _gid: t.gid }); } }));
  const posibles = new Map(); regs.forEach(r => { const k = `${r._clave}|${r.Date}|${(r.Hook || r.Description || '').toLowerCase()}`; posibles.set(k, (posibles.get(k) || 0) + 1); });
  const dup = [...posibles.values()].filter(n => n > 1).reduce((s, n) => s + n - 1, 0);
  const rp = K.resumenParrilla(regs);
  const porCuenta = p.tabs.map(t => ({ t, r: K.resumenParrilla(t.registros) }));
  const conPilar = p.tabs.filter(t => t.columnas.includes('Pilar'));
  const sinPilar = p.tabs.filter(t => !t.columnas.includes('Pilar'));
  const ops = (arr) => [...new Set(arr.filter(Boolean))].sort();
  const meses = ops(regs.map(r => r._fecha && `${r._fecha.getFullYear()}-${String(r._fecha.getMonth() + 1).padStart(2, '0')}`));
  const pubStatus = p.tabs.filter(t => t.columnas.includes('Publication Status')).map(t => ({ cuenta: t.cuenta, conteo: K.contar(t.registros, 'Publication Status', '(vacío)') }));

  v.innerHTML = C.cabecera({ kicker: 'Plan de contenido', titulo: 'Plan de contenido', extra: C.badgeParrilla(p) + ` <a class="btn oro" href="${urlSheet}" target="_blank" rel="noopener">Abrir el Sheet ↗</a>`,
    texto: 'Consolidado de las pestañas Athletum (Juve Miami), Juve Camps USA y Juve Camps MEXICO del Sheet «Social Media Content Plan». Lectura pública de solo lectura: el dashboard nunca modifica el documento.' })
  + (p.origen === 'copia' ? C.aviso(`No se pudo leer el Sheet en vivo (${esc(p.error)}). Se muestra la copia guardada el ${fecha(p.leido)}.`, 'rojo') : '')
  + `<div class="grid g4">
    ${C.kpi({ valor: n0(rp.total), tipo: 'plan', etiqueta: 'Piezas en el plan', detalle: `${n0(rp.activas)} activas · ${n0(rp.por.fuera)} pospuestas o no aprobadas` })}
    ${C.kpi({ valor: n0(rp.producidas), tipo: 'impl', etiqueta: 'Producidas', detalle: `${pct(rp.avance, 0)} de las activas · ${n0(rp.pend_prod)} pendientes de producir` })}
    ${C.kpi({ valor: n0(rp.pend_aprob), tipo: 'impl', etiqueta: 'Esperan aprobación', detalle: `${n0(rp.listas)} aprobadas listas para publicar · ${n0(rp.programadas)} programadas` })}
    ${C.kpi({ valor: n0(rp.publicadas), etiqueta: 'Publicadas', detalle: 'Estado «Posted» en el Sheet' })}
  </div>`
  + C.seccion('Avance por cuenta', '', C.tabla([
      { t: 'Cuenta', k: x => `<b>${esc(x.t.cuenta)}</b><br><small><a href="https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${x.t.gid}" target="_blank" rel="noopener">pestaña «${esc(x.t.nombre)}» ↗</a></small>` },
      { t: 'Total', num: 1, k: x => n0(x.r.total) }, { t: 'Fuera del plan', num: 1, k: x => n0(x.r.por.fuera) },
      { t: 'Por producir', num: 1, k: x => n0(x.r.pend_prod) }, { t: 'Por aprobar', num: 1, k: x => n0(x.r.pend_aprob) },
      { t: 'Aprobadas', num: 1, k: x => n0(x.r.listas) }, { t: 'Programadas', num: 1, k: x => n0(x.r.programadas) }, { t: 'Publicadas', num: 1, k: x => n0(x.r.publicadas) },
      { t: 'Avance de producción', k: x => `${C.barra(x.r.avance)}<small class="mono">${pct(x.r.avance, 0)}</small>` }], porCuenta)
    + `<div class="card" style="margin-top:16px">${C.lienzo('gEstados', 'bajo', 'Piezas por estado y cuenta')}</div>`
    + (pubStatus.length ? `<p class="fuente">Estado de publicación (columna aparte «Publication Status»): ${pubStatus.map(x => `${esc(x.cuenta)}: ${x.conteo.map(([a, b]) => `${esc(a)} ${n0(b)}`).join(', ')}`).join(' · ')}.</p>` : ''))
  + C.seccion('Distribución del plan', `Formatos y pilares de las piezas activas. ${sinPilar.map(t => esc(t.cuenta)).join(', ')}: pilar y público no registrados en esta pestaña.`, `<div class="grid g2">
      <div class="card"><h3>Por formato</h3>${C.lienzo('gFormato', '', 'Piezas por formato y cuenta')}</div>
      <div class="card"><h3>Por pilar</h3>${conPilar.length ? C.lienzo('gPilar', '', 'Piezas por pilar y cuenta') : '<p class="vacio">No registrado.</p>'}</div>
      <div class="card"><h3>Piezas planificadas por mes</h3>${C.lienzo('gMesCont', '', 'Piezas planificadas por mes')}</div>
      <div class="card"><h3>Por público</h3>${conPilar.map(t => `<p class="sub" style="margin:8px 0 4px"><b>${esc(t.cuenta)}</b></p>` + C.tabla([{ t: 'Público', k: x => esc(x[0]) }, { t: 'Piezas', num: 1, k: x => n0(x[1]) }],
        K.contar(t.registros.filter(r => K.grupoDe(r.Status) !== 'fuera'), 'Publico'))).join('')}</div>
    </div>`)
  + `<section class="seccion"><h2>Todas las piezas</h2><p class="intro">Filtra por cuenta, estado, formato, pilar o mes, o busca por texto. Cada fila enlaza a su material y a su fila en el Sheet.${dup ? ` <b>Atención:</b> ${dup} ${dup === 1 ? 'pieza parece repetida' : 'piezas parecen repetidas'} en el Sheet (misma cuenta, fecha y texto).` : ' No se encontraron piezas repetidas.'}</p>
    <div class="filtros" role="search">
      <label for="fCuenta">Cuenta<select id="fCuenta"><option value="">Todas</option>${p.tabs.map(t => `<option value="${t.clave}">${esc(t.cuenta)}</option>`).join('')}</select></label>
      <label for="fGrupo">Estado<select id="fGrupo"><option value="">Todos</option>${K.GRUPOS.map(g => `<option value="${g.id}">${esc(g.nombre)}</option>`).join('')}</select></label>
      <label for="fFormato">Formato<select id="fFormato"><option value="">Todos</option>${ops(regs.map(r => r.Format)).map(f => `<option>${esc(f)}</option>`).join('')}</select></label>
      <label for="fPilar">Pilar<select id="fPilar"><option value="">Todos</option>${ops(regs.map(r => r.Pilar)).map(f => `<option>${esc(f)}</option>`).join('')}</select></label>
      <label for="fMes">Mes<select id="fMes"><option value="">Todos</option>${meses.map(m => `<option value="${m}">${esc(mes(m))}</option>`).join('')}</select></label>
      <label for="fQ">Buscar<input type="search" id="fQ" placeholder="Texto, hook, copy…"></label>
      <button type="button" class="btn" id="fLimpiar">Quitar filtros</button>
    </div>
    <p class="fuente" id="fCuenta-n" aria-live="polite"></p><div id="tablaPiezas"></div><div class="mas"><button type="button" class="btn" id="fMas" hidden>Mostrar 40 más</button></div></section>`;

  // gráficos
  graficoEstados('gEstados', p.tabs);
  const activos = (t) => t.registros.filter(r => K.grupoDe(r.Status) !== 'fuera');
  const barrasPor = (id, campo, tabs) => {
    const etiquetas = ops(tabs.flatMap(t => activos(t).map(r => r[campo] || '(sin dato)')));
    C.grafico(id, { type: 'bar', data: { labels: etiquetas, datasets: tabs.map((t, i) => ({ label: t.cuenta, backgroundColor: C.PALETA[i], data: etiquetas.map(e => activos(t).filter(r => (r[campo] || '(sin dato)') === e).length) })) },
      options: { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } } });
  };
  barrasPor('gFormato', 'Format', p.tabs);
  if (conPilar.length) barrasPor('gPilar', 'Pilar', conPilar);
  C.grafico('gMesCont', { type: 'bar', data: { labels: meses.map(mes), datasets: p.tabs.map((t, i) => { const m = Object.fromEntries(K.porMes(t.registros)); return { label: t.cuenta, backgroundColor: C.PALETA[i], data: meses.map(k => m[k] || 0) }; }) },
    options: { scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } } } });

  // tabla filtrable
  const ids = { cuenta: 'fCuenta', grupo: 'fGrupo', formato: 'fFormato', pilar: 'fPilar', mes: 'fMes', q: 'fQ' };
  const enlaces = (r) => [r.Material, r['Material 2 opcional']].flatMap(x => (x || '').match(/https?:\/\/\S+/g) || []);
  const PAGINA = 40; let limite = PAGINA;
  const pintar = (reiniciar = true) => {
    if (reiniciar) limite = PAGINA;
    Object.entries(ids).forEach(([k, id]) => { filtrosCont[k] = document.getElementById(id).value; });
    const f = filtrosCont, q = f.q.trim().toLowerCase();
    const sel = regs.filter(r => (!f.cuenta || r._clave === f.cuenta) && (!f.grupo || K.grupoDe(r.Status) === f.grupo) && (!f.formato || r.Format === f.formato)
      && (!f.pilar || r.Pilar === f.pilar) && (!f.mes || (r._fecha && `${r._fecha.getFullYear()}-${String(r._fecha.getMonth() + 1).padStart(2, '0')}` === f.mes))
      && (!q || [r.Content, r.Description, r.Hook, r.Copy, r.Objetivo].some(x => (x || '').toLowerCase().includes(q))))
      .sort((a, b) => (a._fecha || 9e15) - (b._fecha || 9e15));
    const mas = document.getElementById('fMas'); mas.hidden = sel.length <= limite;
    mas.textContent = `Mostrar ${Math.min(PAGINA, sel.length - limite)} más`;
    document.getElementById('fCuenta-n').textContent = `${sel.length} de ${regs.length} piezas${sel.length > limite ? ` · se muestran las primeras ${limite}` : ''}`;
    document.getElementById('tablaPiezas').innerHTML = C.tabla([
      { t: 'Fecha', k: r => r._fecha ? fecha(r._fecha) : '<span class="vacio">sin fecha</span>' },
      { t: 'Cuenta', k: r => esc(r._cuenta) },
      { t: 'Formato', k: r => esc(r.Format || '—') },
      { t: 'Pieza', k: r => `<b>${esc(r.Hook || r.Content || '')}</b>${r.Description ? `<br><small>${esc(r.Description.slice(0, 140))}${r.Description.length > 140 ? '…' : ''}</small>` : ''}` },
      { t: 'Pilar', k: r => esc(r.Pilar || '—') },
      { t: 'Estado', k: r => { const g = K.GRUPOS.find(x => x.id === K.grupoDe(r.Status)); return `<span class="est ${{ publicada: 'implementado', programada: 'planificado', aprobada: 'progreso', pend_aprob: 'progreso', fuera: 'alerta' }[g.id] || 'validacion'}" title="${esc(g.nombre)}">${esc(r.Status || 'Sin estado')}</span>`; } },
      { t: 'Enlaces', k: r => [...enlaces(r).map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">Material${enlaces(r).length > 1 ? ' ' + (i + 1) : ''} ↗</a>`), `<a href="${urlFila(r._gid, r._fila)}" target="_blank" rel="noopener">Fila ${r._fila} ↗</a>`].join('<br>') },
    ], sel.slice(0, limite), { vacio: 'Ninguna pieza coincide con los filtros.' });
  };
  Object.entries(ids).forEach(([k, id]) => { const el = document.getElementById(id); el.value = filtrosCont[k]; el.addEventListener(id === 'fQ' ? 'input' : 'change', () => pintar()); });
  document.getElementById('fMas').addEventListener('click', () => { limite += PAGINA; pintar(false); });
  document.getElementById('fLimpiar').addEventListener('click', () => { Object.values(ids).forEach(id => { document.getElementById(id).value = ''; }); pintar(); });
  pintar();
}

// =====================================================================
export async function ruta(v) {
  const e = await json('estrategia');
  v.innerHTML = C.cabecera({ kicker: 'Hoja de ruta', titulo: 'Próximos pasos',
    texto: 'Cinco fases en orden de prioridad. Las recomendaciones futuras se muestran como planificadas: nada aparece como ejecutado sin evidencia.' })
  + `<div class="card"><b>Qué significa cada estado:</b> ${Object.entries(e.estados).map(([k, x]) => `${C.estado(k)} ${esc(x)}`).join(' &nbsp; ')}</div>`
  + `<div class="grid" style="margin-top:16px">${e.fases.map(f => `<article class="card fase"><div class="num" aria-hidden="true">${f.n}</div><div>
      <div class="t" style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>Fase ${f.n} · ${esc(f.titulo)}</h3>${C.estado(f.estado)}</div>
      <div class="pri">${esc(f.prioridad)}</div><p style="margin:0 0 8px">${esc(f.objetivo)}</p>
      <ul class="lista">${f.acciones.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
      <p class="fuente"><b>Hecho hasta hoy:</b> ${esc(f.hecho)}</p></div></article>`).join('')}</div>`
  + C.seccion('Frentes y siguiente paso', '', C.tabla([{ t: 'Frente', k: f => `<b>${esc(f.titulo)}</b>` }, { t: 'Estado', k: f => C.estado(f.estado) }, { t: 'Siguiente paso', k: 'siguiente' }], e.frentes)
    + `<p class="fuente">Contenido editorial actualizado el ${fecha(e.actualizado)} (data/estrategia.json). ${esc(e.nota)}</p>`);
}
