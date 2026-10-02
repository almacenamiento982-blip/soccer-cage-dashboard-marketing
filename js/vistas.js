// Vistas de Resumen, Meta Ads, Email y Hoja de ruta. Instagram, Contenido y Evolución tienen su propio archivo.
import { json, parrilla, SHEET_ID } from './datos.js?v=20261002a';
import * as K from './calculos.js?v=20261002a';
import * as C from './componentes.js?v=20261002a';
import { frecuencias, tablaProyeccion, notaProyeccion } from './vista_instagram.js?v=20261002a';
import { graficoEstados } from './vista_contenido.js?v=20261002a';
import { cargar as cargarEvolucion, bloque as bloqueEvolucion } from './vista_evolucion.js?v=20261002a';
export { instagram } from './vista_instagram.js?v=20261002a';
export { contenido } from './vista_contenido.js?v=20261002a';
export { evolucion } from './vista_evolucion.js?v=20261002a';
const { n0, n1, usd, pct, fecha, esc } = K;

const mes = (k) => { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 15).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }); };
const corta = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
const urlSheet = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

// =====================================================================
export async function resumen(v) {
  const [ig, pre, idc, em, est] = await Promise.all([json('instagram'), json('meta_preacademy'), json('meta_idcamps'), json('email'), json('estrategia')]);
  const p = await parrilla();
  const evo = bloqueEvolucion(await cargarEvolucion(), false, 'evoR');
  const regs = p.tabs.flatMap(t => t.registros);
  const rp = K.resumenParrilla(regs);
  const kp = K.preacademyKPIs(pre), ki = K.idcampsKPIs(idc);
  const seg = ig.cuentas.reduce((s, c) => s + (c.seguidores.actual || 0), 0);
  const conSerie = ig.cuentas.filter(c => c.seguidores.nuevos_por_dia?.length);
  const sinSerie = ig.cuentas.filter(c => !c.seguidores.nuevos_por_dia?.length);
  const nuevos = conSerie.reduce((s, c) => s + K.crecimiento(c).nuevos, 0);
  const plan = em.plan_cifras;
  const temp = K.historicoTemporadas(idc).at(-1);

  v.innerHTML = C.cabecera({ kicker: 'Centro de control', titulo: 'Resumen ejecutivo',
    texto: `Estado del marketing digital de Soccer Cage. Cada cifra se calcula de su fuente: informes y campañas actualizados el ${fecha(ig.generado.slice(0, 10))}; el plan de contenido se lee del Sheet al abrir la página.`,
    extra: C.badgeParrilla(p) })
  + `<div class="grid g3">
    ${C.kpi({ valor: n0(seg), etiqueta: `Seguidores en Instagram (${ig.cuentas.length} cuentas)`, detalle: sinSerie.length ? `${sinSerie.map(c => '@' + c.usuario).join(', ')}: última lectura del ${fecha(sinSerie[0].seguidores.fecha)} (conexión por renovar).` : `Lectura de la API del ${fecha(ig.cuentas[0].seguidores.fecha)}.` })}
    ${C.kpi({ valor: '+' + n0(nuevos), etiqueta: 'Nuevos seguidores en 30 días', detalle: `${conSerie.length} cuentas con serie diaria. Cifra bruta: no descuenta a quienes dejaron de seguir.${sinSerie.length ? ` ${sinSerie.map(c => '@' + c.usuario).join(', ')}: pendiente de medición.` : ''}` })}
    ${C.kpi({ valor: usd(kp.cpa), etiqueta: 'Pre-Academy · costo por conversación', detalle: `${n0(kp.conv)} conversaciones por ${usd(kp.gasto)} en ${kp.dias} días. Campaña previa: ${usd(kp.cpaPrevio)}.` })}
    ${C.kpi({ valor: n0(ki.leads), etiqueta: 'ID Camps · leads (clics en «Register now»)', detalle: `${usd(ki.cpl)} por lead · ${usd(ki.gasto)} invertidos en ${ki.dias} días${ki.parcial ? ' (último día parcial)' : ''}. Temporada ${esc(temp?.temporada || '')}: ${usd(temp?.cpl)} por lead.` })}
    ${C.kpi({ valor: pct(rp.avance, 0), tipo: 'actividad', etiqueta: 'Avance de producción de contenido', detalle: `${n0(rp.producidas)} de ${n0(rp.activas)} piezas activas producidas · ${n0(rp.pend_aprob)} esperan aprobación · ${n0(rp.listas)} listas para publicar · ${n0(rp.publicadas)} publicadas.` })}
    ${C.kpi({ valor: plan ? `${n0(plan.enviados)} de ${n0(plan.emails)}` : '—', tipo: 'plan', etiqueta: 'Email · envíos del plan nuevo', detalle: plan ? `Plan publicado de ${n0(plan.emails)} emails y ${n0(plan.sms)} SMS. ${esc(plan.nota)}` : 'Cifras del plan no disponibles.' })}
  </div>`
  + `<section class="seccion">${evo.html}</section>`
  + C.seccion('Comparación de las dos campañas activas', 'Las dos campañas miden resultados distintos: una conversación de WhatsApp no equivale a un clic hacia el formulario. Por eso se comparan lado a lado y no se suman.',
    `<div class="tabla-wrap"><table class="compara"><thead><tr><th scope="col">Indicador</th><th scope="col">Pre-Academy Miami</th><th scope="col">ID Camps USA</th></tr></thead><tbody>
      <tr><td>Campaña</td><td>${esc(pre.campana)}</td><td>${esc(idc.campana)}</td></tr>
      <tr><td>Resultado que se mide</td><td>Conversación iniciada en WhatsApp</td><td>Clic en «Register now» hacia la app de inscripción</td></tr>
      <tr><td>Activa desde</td><td>${fecha(pre.inicio)} (${kp.dias} días)</td><td>${fecha(idc.activa_desde)} (${ki.dias} días)</td></tr>
      <tr><td>Presupuesto diario</td><td class="mono">${usd(kp.presup, 0)}</td><td class="mono">${usd(ki.presup, 0)}</td></tr>
      <tr><td>Inversión acumulada</td><td class="mono">${usd(kp.gasto)}</td><td class="mono">${usd(ki.gasto)}</td></tr>
      <tr><td>Resultados</td><td class="mono">${n0(kp.conv)}</td><td class="mono">${n0(ki.leads)}</td></tr>
      <tr><td>Costo por resultado</td><td class="mono"><b>${usd(kp.cpa)}</b></td><td class="mono"><b>${usd(ki.cpl)}</b></td></tr>
      <tr><td>Referencia anterior</td><td>${usd(kp.cpaPrevio)} por conversación (últimos ${pre.mes_previo.dias} días de la campaña previa)</td><td>${usd(temp?.cpl)} por lead (temporada ${esc(temp?.temporada || '')}, mismo tipo de lead)</td></tr>
      <tr><td>Resultado comercial</td><td>Clases de prueba agendadas: ${C.PENDIENTE}</td><td>Registros por anuncio: ${C.PENDIENTE} (la app suma ${n0(ki.registros)} registros de todos los canales)</td></tr>
      <tr><td>Próxima revisión</td><td>${esc(pre.proxima_revision)}</td><td>10–13 de octubre</td></tr>
    </tbody></table></div>`)
  + C.seccion('Avance de los contenidos', `Piezas del Sheet por estado. «Producidas» = por aprobar + aprobadas + programadas + publicadas; el avance se calcula sobre las piezas activas (sin pospuestas ni rechazadas). Son las mismas cifras de la sección Plan de contenido.`,
    `<div class="card"><h3>Piezas por estado y cuenta</h3><p class="sub">El número al final de cada barra es el total de piezas de la cuenta.</p>${C.lienzo('gAvance', 'bajo', 'Piezas por estado y cuenta')}</div>${C.fuente('Google Sheet «Social Media Content Plan», pestañas Athletum, Juve Camps USA, Juve Camps MEXICO y Juve Las Vegas', urlSheet)}`)
  + C.seccion('Escenarios de seguidores a 90 días', 'Proyecciones condicionadas a que se mantenga el ritmo reciente. No son resultados ni metas.', tablaProyeccion(ig, frecuencias(ig, p)) + notaProyeccion(ig))
  + C.seccion('Frentes de trabajo', 'Cada frente separa lo que se planificó, lo que ya se hizo y lo que falta. El estado se asigna solo con evidencia.',
    `<div class="grid gauto">${est.frentes.map(f => `<article class="card frente">
      <div class="t"><h3>${esc(f.titulo)}</h3>${C.estado(f.estado)}</div>
      <dl><div><dt>Objetivo</dt><dd>${esc(f.objetivo)}</dd></div><div><dt>Qué se hizo</dt><dd>${esc(f.realizado)}</dd></div>
      <div><dt>Hallazgo principal</dt><dd>${esc(f.hallazgo)}</dd></div><div><dt>Evidencia</dt><dd>${esc(f.evidencia)}</dd></div></dl>
      <div class="sig"><b>Siguiente paso:</b> ${esc(f.siguiente)} <a href="#${esc(f.seccion)}">Ver sección →</a></div></article>`).join('')}</div>`);

  evo.dibujar();
  graficoEstados('gAvance', p.tabs);
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
  + C.seccion('Entrega diaria', 'Inversión y leads por conjunto, según el seguimiento diario de Meta.', `<div class="card"><h3>Leads por conjunto e inversión diaria</h3><p class="sub">Barras: leads (clics en «Register now») de cada conjunto. Línea: inversión del día en USD.</p>${C.lienzo('gDiario', '', 'Inversión y leads por día')}${C.lectura(lecturaDiario(d))}</div>`)
  + C.seccion('Estructura de la campaña', '', C.tabla([
      { t: 'Conjunto', k: c => `<b>${esc(c)}</b><br><small>${esc(d.conjuntos[c])}</small>` },
      { t: 'Presupuesto diario', num: 1, k: c => usd(d.presupuesto_diario[c], 0) },
      { t: 'Leads acumulados', num: 1, k: c => n0(leadsConj[c]) },
      { t: 'Anuncios', k: c => (d.anuncios_por_conjunto[c] || []).map(esc).join('<br>') }], conj)
    + `<p class="fuente">Zonas del retargeting: ${d.rtg_zonas.map(esc).join(' · ')}.</p>`)
  + C.seccion('Registros en la app por sede', esc(d.app.nota), `<div class="grid g2">
      <div class="card">${C.tabla([{ t: 'Sede', k: x => esc(x[0]) }, { t: 'Registros', num: 1, k: x => n0(x[1].registros) }, { t: 'Pagados', num: 1, k: x => n0(x[1].pagados) }, { t: 'Niños pagados', num: 1, k: x => n0(x[1].ninos_pagados) }],
        Object.entries(d.app.sedes).sort((a, b) => b[1].registros - a[1].registros))}<p class="fuente">Leído el ${fecha(d.app.leido)}.</p></div>
      <div class="card"><h3>Registros y pagos por día en la app</h3><p class="sub">Todos los canales, desde la apertura de la temporada 2026-27.</p>${C.lienzo('gApp', 'bajo', 'Registros y pagos por día')}${C.lectura(`${n0(k.registros)} registros y ${n0(k.pagados)} pagos (${pct(k.registros ? k.pagados / k.registros : null, 0)} de los registros). No se pueden atribuir a Meta mientras la app no envíe el evento de registro.`)}</div></div>`)
  + C.seccion('Temporadas anteriores (referencia)', 'Diagnóstico de las clínicas pasadas. Allí el «lead» también era el clic en «Register now», por eso el costo por lead es comparable; las familias y pagos vienen del cruce con la base de inscritos.',
    C.tabla([{ t: 'Temporada', k: 'temporada' }, { t: 'Clínicas', num: 1, k: x => n0(x.campanas) }, { t: 'Inversión', num: 1, k: x => usd(x.inversion) }, { t: 'Leads', num: 1, k: x => n0(x.leads) },
      { t: 'Costo por lead', num: 1, k: x => usd(x.cpl) }, { t: 'Familias que pagaron', num: 1, k: x => n0(x.pagaron) }, { t: 'Inversión por familia que pagó', num: 1, k: x => usd(x.costo_pago) }], temp)
    + `<details style="margin-top:12px"><summary>Ver detalle por clínica</summary><div style="margin-top:10px">${C.tabla([
      { t: 'Clínica', k: 'clinica' }, { t: 'Inversión', num: 1, k: x => usd(x.inversion) }, { t: 'Alcance', num: 1, k: x => n0(x.alcance) }, { t: 'Leads', num: 1, k: x => n0(x.leads) },
      { t: 'Costo por lead', num: 1, k: x => usd(x.leads ? x.inversion / x.leads : null) }, { t: 'Familias', num: 1, k: x => n0(x.familias) }, { t: 'Pagaron', num: 1, k: x => n0(x.pagaron) }], d.historico_temporadas)}</div></details>`)
  + C.seccion('Pendiente para la revisión del 10–13 de octubre', '', `<div class="card"><ul class="lista">${d.pendiente_revision.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${C.fuente(d.fuente, d.informe)}`);

  C.grafico('gDiario', { data: { labels: d.meta_diario.map(x => fecha(x.fecha) + (x.parcial ? ' (parcial)' : '')), datasets: [
    ...conj.map((c, i) => ({ type: 'bar', label: `Leads ${c}`, data: d.meta_diario.map(x => x.leads[c] || 0), backgroundColor: ['#111214', '#B8862F', '#7F8792'][i % 3], stack: 'l', yAxisID: 'y' })),
    { type: 'line', label: 'Inversión del día (USD)', data: d.meta_diario.map(x => x.gasto), borderColor: '#B5112F', backgroundColor: '#B5112F', yAxisID: 'y1' }] },
    options: { plugins: { valores: { mostrar: true } }, scales: { y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Leads (clics en «Register now»)' }, ticks: { precision: 0 } }, x: { stacked: true, title: { display: true, text: 'Día' } }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Inversión (USD)' } } } } });
  C.grafico('gApp', { type: 'bar', data: { labels: d.app.dias.map(x => corta(x.fecha)), datasets: [
    { label: 'Registros', data: d.app.dias.map(x => x.registros), backgroundColor: '#111214' }, { label: 'Pagos', data: d.app.dias.map(x => x.pagos), backgroundColor: '#B8862F' }] },
    options: { plugins: { valores: { mostrar: true } }, scales: { x: { title: { display: true, text: 'Día' } }, y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Registros / pagos' } } } } });
}

function lecturaDiario(d) {
  const ult = d.meta_diario.filter(x => !x.parcial);
  if (!ult.length) return '';
  const tot = (x) => Object.values(x.leads).reduce((a, b) => a + b, 0);
  const lid = Object.keys(d.presupuesto_diario).map(c => [c, d.meta_diario.reduce((s, x) => s + (x.leads[c] || 0), 0)]).sort((a, b) => b[1] - a[1])[0];
  return `Con ${n0(d.meta_diario.length)} días de entrega${d.meta_diario.some(x => x.parcial) ? ' (el último, parcial)' : ''}, ${esc(lid[0])} acumula más leads (${n0(lid[1])}). Es muy pronto para comparar conjuntos: la campaña sigue en fase de aprendizaje y la revisión está prevista del 10 al 13 de octubre.`;
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
  + C.seccion('Evolución acumulada', 'Lecturas de Ads Manager registradas en cada revisión.', `<div class="card"><h3>Conversaciones acumuladas y costo por conversación</h3><p class="sub">Barras: conversaciones acumuladas desde el ${fecha(d.inicio)}. Línea: costo acumulado por conversación (USD).</p>${C.lienzo('gPre', '', 'Conversaciones e inversión acumuladas')}${C.lectura(lecturaPre(d, k))}</div>`)
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
    options: { plugins: { valores: { mostrar: true } }, scales: { x: { title: { display: true, text: 'Fecha de la lectura' } }, y: { beginAtZero: true, title: { display: true, text: 'Conversaciones (acumulado)' } }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'USD por conversación' } } } } });
}

function lecturaPre(d, k) {
  const l = d.lecturas.filter(x => x.conv);
  if (l.length < 2) return '';
  const a = l[1], b = l[l.length - 1];
  return `El costo acumulado por conversación pasó de ${usd(a.gasto / a.conv)} (${fecha(a.fecha)}) a ${usd(b.gasto / b.conv)} (${fecha(b.fecha)}). La referencia de la campaña previa es ${usd(k.cpaPrevio)} en ${d.mes_previo.dias} días. Cuántas conversaciones terminan en clase de prueba no se mide en este dashboard.`;
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
    + C.aviso(`<b>SMS:</b> el plan incluye ${d.plan_cifras ? n0(d.plan_cifras.sms) : '—'} SMS, pero todavía no hay envíos del plan: sus resultados quedan pendientes de medición. La línea base de SMS (469 campañas, 11,5 % de clic) está en el informe original.`, 'gris'))
  + C.seccion('Hallazgos de la auditoría', '', `<div class="card"><ul class="lista">${d.hallazgos.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>`)
  + C.seccion('Evolución mensual', 'Clic y rebote de cada mes, como porcentaje de los envíos.', `<div class="card"><h3>Clic y rebote por mes (% de los envíos)</h3><p class="sub">Del ${fecha(d.periodo[0])} al ${fecha(d.periodo[1])}. Histórico previo al plan nuevo.</p>${C.lienzo('gEmail', '', 'Clic y rebote mensual')}${C.lectura(`En todo el periodo, el clic fue de ${pct(t.click, 2)} y el rebote de ${pct(t.bounce, 2)}; en los últimos 12 meses, ${pct(u.click, 2)} y ${pct(u.bounce, 2)}. Las listas de menos de 1.000 contactos son las que más clic consiguen.`)}</div>`)
  + C.seccion('Resultados por tamaño de envío y por público', '', `<div class="grid g2">
      <div class="card"><h3>Por tamaño de la lista</h3>${C.tabla([{ t: 'Contactos', k: 'label' }, { t: 'Campañas', num: 1, k: x => n0(x.n) }, { t: 'Clic', num: 1, k: x => pct(x.click, 2) }, { t: 'Rebote', num: 1, k: x => pct(x.bounce, 2) }], d.por_tamano)}</div>
      <div class="card"><h3>Por público</h3>${C.tabla([{ t: 'Grupo', k: 'g' }, { t: 'Campañas', num: 1, k: x => n0(x.n) }, { t: 'Clic', num: 1, k: x => pct(x.click, 2) }, { t: 'Rebote', num: 1, k: x => pct(x.bounce, 2) }], grupos)}</div></div>`)
  + C.seccion('Metas a 90 días', 'Metas del plan. «Hoy» es el valor de la auditoría.', C.tabla([{ t: 'Métrica', k: x => `<b>${esc(x.metrica)}</b>` }, { t: 'Hoy', k: 'hoy' }, { t: 'Meta', k: 'meta' }], d.metas_90_dias))
  + C.seccion('Plan de acción (17 pasos)', 'Planificado; ningún paso se marca como hecho hasta que haya evidencia.', C.tabla([{ t: '#', num: 1, k: 'n' }, { t: 'Paso', k: 'paso' }, { t: 'Cuándo', k: 'cuando' }, { t: 'Responsable', k: 'quien' }], d.pasos)
    + C.fuente(d.fuente, d.informe));

  C.grafico('gEmail', { type: 'line', data: { labels: d.mensual.map(x => mes(x.mes)), datasets: [
    { label: 'Clic', data: d.mensual.map(x => +(x.click * 100).toFixed(2)), borderColor: '#B8862F', backgroundColor: '#B8862F', tension: .2 },
    { label: 'Rebote', data: d.mensual.map(x => +(x.bounce * 100).toFixed(2)), borderColor: '#B5112F', backgroundColor: '#B5112F', tension: .2 }] },
    options: { scales: { x: { title: { display: true, text: 'Mes de envío' } }, y: { beginAtZero: true, title: { display: true, text: 'Porcentaje de los envíos' }, ticks: { callback: (x) => x + ' %' } } } } });
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
