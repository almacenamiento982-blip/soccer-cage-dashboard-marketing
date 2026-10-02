// Vistas de Meta Ads, Email y Hoja de ruta. Resumen, Instagram, Contenido y Evolución tienen su propio archivo.
// Estructura común de cada sección: guía (qué muestra · estado · qué sigue) → indicadores → detalle → lectura → fuente.
import { json } from './datos.js?v=20261002j';
import * as K from './calculos.js?v=20261002j';
import * as C from './componentes.js?v=20261002j';
import { hoyISO } from './periodo.js?v=20261002j';
export { resumen } from './vista_resumen.js?v=20261002j';
export { instagram } from './vista_instagram.js?v=20261002j';
export { contenido } from './vista_contenido.js?v=20261002j';
export { evolucion } from './vista_evolucion.js?v=20261002j';
const { n0, usd, pct, fecha, esc } = K;

const mes = (k) => { const [y, m] = k.split('-'); return new Date(+y, +m - 1, 15).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }); };
const corta = (f) => new Date(f + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

// Aviso de frescura: estas campañas no se actualizan con la tarea automática
function avisoFrescura(f) {
  const viejo = f.dias != null && f.dias > 3;
  return C.aviso(`<b>Datos hasta el ${fecha(f.hasta)}${f.parcial ? ' (último día parcial)' : ''}${f.app ? ` · registros y pagos leídos el ${fecha(f.app)}` : ''}.</b>
    ${esc(f.como)} La actualización automática del dashboard no puede traer estos datos por sí sola: publica lo último que se haya cargado.${viejo ? ` <b>Han pasado ${f.dias} días desde la última lectura.</b>` : ''}`, viejo ? 'rojo' : 'gris');
}

// =====================================================================
export async function metaIdcamps(v) {
  const d = await json('meta_idcamps');
  const k = K.idcampsKPIs(d); const temp = K.historicoTemporadas(d);
  const conj = Object.keys(d.presupuesto_diario);
  const leadsConj = Object.fromEntries(conj.map(c => [c, d.meta_diario.reduce((s, x) => s + (x.leads[c] || 0), 0)]));
  const f = K.frescuraMeta('idcamps', d, hoyISO());

  v.innerHTML = C.cabecera({ kicker: 'Meta Ads', titulo: 'Juventus Camps USA · ID Camps', informe: d.informe,
    texto: `Campaña <b>${esc(d.campana)}</b> para captar familias interesadas en los ID Camps 2026-27.` })
  + C.guia({ muestra: 'Objetivo, estructura, creatividades, presupuesto y resultados disponibles de la campaña de ID Camps.',
    estado: `Activa desde el ${fecha(d.activa_desde)}, en fase de aprendizaje. Datos hasta el ${fecha(f.hasta)}${f.parcial ? ' (último día parcial)' : ''}.`,
    siguiente: esc(d.revision) })
  + avisoFrescura(f)
  // 1. objetivo y medición
  + C.bloque('1 · Objetivo y medición', '', `<div class="grid g2">
      <div class="card"><h3>Objetivo</h3><p style="margin:0">${esc(d.objetivo)}.</p></div>
      <div class="card"><h3>Qué es un «lead» aquí ${C.ayuda('Un lead es un clic en «Register now» que lleva a la app de inscripción. No confirma que la familia se registró.')}</h3><p style="margin:0">${esc(d.medicion)}</p></div></div>`)
  // 2. estructura y públicos
  + C.bloque('2 · Estructura y públicos', `${conj.length} conjuntos de anuncios, cada uno con su público y su presupuesto.`, C.tabla([
      { t: 'Conjunto', k: c => `<b>${esc(c)}</b>` }, { t: 'Público y alcance', k: c => esc(d.conjuntos[c]) },
      { t: 'Presupuesto diario (planificado)', num: 1, k: c => usd(d.presupuesto_diario[c], 0) }], conj)
    + `<p class="fuente">Zonas del retargeting: ${d.rtg_zonas.map(esc).join(' · ')}. Retargeting activo hasta el ${fecha(d.rtg_fin)}.</p>`)
  // 3. creatividades
  + C.bloque('3 · Creatividades', `${n0(d.total_anuncios)} anuncios activos repartidos en los conjuntos.`, C.tabla([
      { t: 'Conjunto', k: c => `<b>${esc(c)}</b>` }, { t: 'Anuncios', num: 1, k: c => n0((d.anuncios_por_conjunto[c] || []).length) },
      { t: 'Piezas', k: c => (d.anuncios_por_conjunto[c] || []).map(esc).join(' · ') }], conj))
  // 4. presupuesto e implementación
  + C.bloque('4 · Presupuesto e implementación', '', `<div class="grid g3">
      ${C.kpi({ valor: usd(k.presup, 0), tipo: 'plan', etiqueta: 'Presupuesto diario planificado', detalle: conj.map(c => `${c} ${usd(d.presupuesto_diario[c], 0)}`).join(' · ') })}
      ${C.kpi({ valor: fecha(d.montada), tipo: 'actividad', etiqueta: 'Campaña montada', detalle: `Publicada y activa desde el ${fecha(d.activa_desde)}.` })}
      ${C.kpi({ valor: n0(d.total_anuncios), tipo: 'actividad', etiqueta: 'Anuncios activos', detalle: `${conj.length} conjuntos en fase de aprendizaje.` })}</div>`)
  // 5. resultados
  + C.bloque('5 · Resultados disponibles', `Del ${fecha(d.activa_desde)} al ${fecha(f.hasta)} (${k.dias} días${k.parcial ? ', el último parcial' : ''}).`, `<div class="grid g4">
      ${C.kpi({ valor: usd(k.gasto), etiqueta: 'Inversión real acumulada', detalle: `Frente a ${usd(k.presup * k.dias, 0)} planificados para ${k.dias} días.` })}
      ${C.kpi({ valor: n0(k.leads), etiqueta: 'Leads (clics en «Register now»)', detalle: `${n0(k.clics)} clics en total en los anuncios.` })}
      ${C.kpi({ valor: usd(k.cpl), etiqueta: 'Costo por lead', detalle: `Temporada ${esc(temp.at(-1)?.temporada || '')}: ${usd(temp.at(-1)?.cpl)} con el mismo tipo de lead.` })}
      ${C.kpi({ valor: '—', tipo: 'pend', etiqueta: 'Registros atribuidos a Meta', detalle: 'Pendiente de medición: la app no envía el evento de registro a Meta.' })}</div>
    <div class="card" style="margin-top:16px"><h3>Leads por conjunto e inversión diaria</h3><p class="sub">Barras: leads de cada conjunto por día. Línea: inversión del día en USD.</p>${C.lienzo('gDiario', '', 'Inversión y leads por día')}${C.lectura(lecturaDiario(d))}</div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>Registros en la app por sede ${C.tipo('resultado')}</h3><p class="sub">Todos los canales (voz a voz, WhatsApp, email y anuncios). Leído el ${fecha(d.app.leido)}.</p>${C.tabla([{ t: 'Sede', k: x => esc(x[0]) }, { t: 'Registros', num: 1, k: x => n0(x[1].registros) }, { t: 'Pagados', num: 1, k: x => n0(x[1].pagados) }, { t: 'Niños pagados', num: 1, k: x => n0(x[1].ninos_pagados) }],
        Object.entries(d.app.sedes).sort((a, b) => b[1].registros - a[1].registros))}</div>
      <div class="card"><h3>Registros y pagos por día en la app</h3><p class="sub">Desde la apertura de la temporada 2026-27.</p>${C.lienzo('gApp', 'bajo', 'Registros y pagos por día')}${C.lectura(`${n0(k.registros)} registros y ${n0(k.pagados)} pagos. No se pueden atribuir a Meta mientras la app no envíe el evento de registro.`)}</div></div>`)
  // 6. referencia
  + C.bloque('6 · Temporadas anteriores (referencia)', 'Allí el «lead» también era el clic en «Register now», por eso el costo por lead es comparable. Familias y pagos vienen del cruce con la base de inscritos.',
    C.tabla([{ t: 'Temporada', k: 'temporada' }, { t: 'Clínicas', num: 1, k: x => n0(x.campanas) }, { t: 'Inversión', num: 1, k: x => usd(x.inversion) }, { t: 'Leads', num: 1, k: x => n0(x.leads) },
      { t: 'Costo por lead', num: 1, k: x => usd(x.cpl) }, { t: 'Familias que pagaron', num: 1, k: x => n0(x.pagaron) }, { t: 'Inversión por familia que pagó', num: 1, k: x => usd(x.costo_pago) }], temp)
    + `<details style="margin-top:12px"><summary>Ver detalle por clínica</summary><div style="margin-top:10px">${C.tabla([
      { t: 'Clínica', k: 'clinica' }, { t: 'Inversión', num: 1, k: x => usd(x.inversion) }, { t: 'Alcance', num: 1, k: x => n0(x.alcance) }, { t: 'Leads', num: 1, k: x => n0(x.leads) },
      { t: 'Costo por lead', num: 1, k: x => usd(x.leads ? x.inversion / x.leads : null) }, { t: 'Familias', num: 1, k: x => n0(x.familias) }, { t: 'Pagaron', num: 1, k: x => n0(x.pagaron) }], d.historico_temporadas)}</div></details>`)
  // 7. qué sigue
  + C.bloque('7 · Qué sigue', '', `<div class="card"><h3>Para la revisión del 10 al 13 de octubre ${C.tipo('plan')}</h3><ul class="lista">${d.pendiente_revision.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>${C.fuente(d.fuente, d.informe)}`)
  + C.volver();

  C.grafico('gDiario', { data: { labels: d.meta_diario.map(x => fecha(x.fecha) + (x.parcial ? ' (parcial)' : '')), datasets: [
    ...conj.map((c, i) => ({ type: 'bar', label: `Leads ${c}`, data: d.meta_diario.map(x => x.leads[c] || 0), backgroundColor: ['#111214', '#B8862F', '#7F8792'][i % 3], stack: 'l', yAxisID: 'y' })),
    { type: 'line', label: 'Inversión del día (USD)', data: d.meta_diario.map(x => x.gasto), borderColor: '#B5112F', backgroundColor: '#B5112F', yAxisID: 'y1' }] },
    options: { plugins: { valores: { mostrar: true } }, scales: { y: { stacked: true, beginAtZero: true, title: { display: true, text: 'Leads (clics en «Register now»)' }, ticks: { precision: 0 } }, x: { stacked: true, title: { display: true, text: 'Día' } }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Inversión (USD)' } } } } });
  C.grafico('gApp', { type: 'bar', data: { labels: d.app.dias.map(x => corta(x.fecha)), datasets: [
    { label: 'Registros', data: d.app.dias.map(x => x.registros), backgroundColor: '#111214' }, { label: 'Pagos', data: d.app.dias.map(x => x.pagos), backgroundColor: '#B8862F' }] },
    options: { plugins: { valores: { mostrar: true } }, scales: { x: { title: { display: true, text: 'Día' } }, y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: 'Registros / pagos' } } } } });
}

function lecturaDiario(d) {
  if (!d.meta_diario.length) return '';
  const lid = Object.keys(d.presupuesto_diario).map(c => [c, d.meta_diario.reduce((s, x) => s + (x.leads[c] || 0), 0)]).sort((a, b) => b[1] - a[1])[0];
  return `Con ${n0(d.meta_diario.length)} días de entrega${d.meta_diario.some(x => x.parcial) ? ' (el último, parcial)' : ''}, ${esc(lid[0])} acumula más leads (${n0(lid[1])}). Es muy pronto para comparar conjuntos: la campaña sigue en fase de aprendizaje y la revisión está prevista del 10 al 13 de octubre.`;
}

// =====================================================================
const PUBLICOS_PRE = {
  INTERESTS: 'Por intereses relacionados con fútbol juvenil y familias.',
  BROAD: 'Abierto: sin segmentación por intereses, solo ubicación y edad.',
  LAL: 'Similar a las personas que interactuaron con Instagram en el último año.',
};

export async function metaPreacademy(v) {
  const d = await json('meta_preacademy'); const k = K.preacademyKPIs(d);
  const fila = ([n, x]) => ({ n, ...x, cpa: x.conv ? x.gasto / x.conv : null, ctr: x.imp ? x.clics / x.imp : null });
  const conj = Object.entries(d.ultima.conjuntos).map(fila).sort((a, b) => (a.cpa ?? 1e9) - (b.cpa ?? 1e9));
  const ads = Object.entries(d.ultima.anuncios).map(fila).sort((a, b) => b.conv - a.conv);
  const cols = (nombre) => [{ t: nombre, k: x => `<b>${esc(x.n)}</b>` }, { t: 'Conversaciones', num: 1, k: x => n0(x.conv) }, { t: 'Inversión real', num: 1, k: x => usd(x.gasto) },
    { t: 'Costo por conversación', num: 1, k: x => x.conv ? usd(x.cpa) : '<span class="vacio">sin conversaciones</span>' }, { t: 'Impresiones', num: 1, k: x => n0(x.imp) }, { t: 'CTR', num: 1, k: x => pct(x.ctr, 2) }];
  const m = d.mensajes;
  const f = K.frescuraMeta('preacademy', d, hoyISO());

  v.innerHTML = C.cabecera({ kicker: 'Meta Ads', titulo: 'Pre-Academy Miami', informe: d.informe,
    texto: `Campaña <b>${esc(d.campana)}</b> para generar conversaciones de WhatsApp con familias interesadas en Pre-Academy.` })
  + C.guia({ muestra: 'Objetivo, públicos, anuncios, presupuesto, decisiones tomadas y resultados de la campaña de Pre-Academy.',
    estado: `Activa desde el ${fecha(d.inicio)} (${k.dias} días). Datos hasta el ${fecha(f.hasta)}.`,
    siguiente: `Próxima revisión: ${esc(d.proxima_revision)}.` })
  + avisoFrescura(f)
  + C.bloque('1 · Objetivo y medición', '', `<div class="grid g2">
      <div class="card"><h3>Objetivo</h3><p style="margin:0">${esc(d.objetivo)}.</p></div>
      <div class="card"><h3>Qué se mide ${C.ayuda('Una conversación iniciada es cuando una persona escribe por WhatsApp desde el anuncio. Cuántas terminan en clase de prueba lo registra el equipo de WhatsApp, fuera de este dashboard.')}</h3><p style="margin:0">Conversaciones iniciadas en WhatsApp desde los anuncios. Las clases de prueba agendadas: ${C.PENDIENTE}.</p></div></div>`)
  + C.bloque('2 · Públicos y presupuesto planificado', `${conj.length} públicos con presupuesto diario propio (total ${usd(k.presup, 0)} por día).`, C.tabla([
      { t: 'Público', k: x => `<b>${esc(x[0])}</b>` }, { t: 'Descripción', k: x => esc(PUBLICOS_PRE[x[0]] || '') }, { t: 'Presupuesto diario (planificado)', num: 1, k: x => usd(x[1], 0) }],
      Object.entries(d.presupuesto_diario)))
  + C.bloque('3 · Creatividades', `${ads.length} anuncios activos, ordenados por conversaciones.`, C.tabla(cols('Anuncio'), ads))
  + C.bloque('4 · Implementación y decisiones', '', `<div class="card"><ul class="linea-tiempo">${d.cambios.map(c => `<li><time datetime="${c.fecha}">${fecha(c.fecha)}</time><div>${esc(c.texto)}</div></li>`).join('')}</ul></div>`)
  + C.bloque('5 · Resultados disponibles', `Del ${fecha(d.inicio)} al ${fecha(k.fecha)} (${k.dias} días), según Ads Manager.`, `<div class="grid g3">
      ${C.kpi({ valor: n0(k.conv), etiqueta: 'Conversaciones iniciadas', detalle: `Acumulado al ${fecha(k.fecha)}.` })}
      ${C.kpi({ valor: usd(k.gasto), etiqueta: 'Inversión real acumulada', detalle: `Frente a ${usd(k.presup * k.dias, 0)} al presupuesto actual durante ${k.dias} días.` })}
      ${C.kpi({ valor: usd(k.cpa), etiqueta: 'Costo por conversación', detalle: `Campaña previa: ${usd(k.cpaPrevio)} (${n0(d.mes_previo.conv)} conversaciones en ${d.mes_previo.dias} días).` })}</div>
    <div class="card" style="margin-top:16px"><h3>Conversaciones acumuladas y costo por conversación</h3><p class="sub">Línea negra: conversaciones acumuladas en cada lectura. Línea dorada: costo acumulado por conversación (USD).</p>${C.lienzo('gPre', '', 'Conversaciones acumuladas y costo por conversación')}${C.lectura(lecturaPre(d, k))}</div>
    <h3 style="margin:20px 0 8px">Resultados por público</h3>${C.tabla(cols('Público'), conj)}
    ${m ? `<details style="margin-top:14px"><summary>Detalle de mensajes de WhatsApp al ${fecha(m.fecha)}</summary><p class="fuente">${esc(m.fuente)} Por ser de otra fecha, la cifra de conversaciones no coincide con la última lectura de arriba.</p><div class="grid g4">
      ${C.kpi({ valor: n0(m.iniciadas), etiqueta: 'Conversaciones iniciadas', detalle: `Al ${fecha(m.fecha)}` })}
      ${C.kpi({ valor: n0(m.nuevos), etiqueta: 'Contactos nuevos', detalle: 'Personas que escribían por primera vez' })}
      ${C.kpi({ valor: n0(m.totales), etiqueta: 'Mensajes totales', detalle: '' })}
      ${C.kpi({ valor: n0(m.respondidas), etiqueta: 'Respondidas (dato de Meta)', detalle: 'Dato tal como lo reporta Ads Manager' })}</div></details>` : ''}`)
  + C.bloque('6 · Qué sigue', '', `<div class="card"><p style="margin:0"><b>Próxima revisión:</b> ${esc(d.proxima_revision)}. Se decidirá si se mueve presupuesto entre públicos según el costo por conversación.</p></div>${C.fuente(d.fuente, d.informe)}`)
  + C.volver();

  C.grafico('gPre', { type: 'line', data: { labels: d.lecturas.map(x => fecha(x.fecha)), datasets: [
    { label: 'Conversaciones (acumulado)', data: d.lecturas.map(x => x.conv), borderColor: '#111214', backgroundColor: '#111214', yAxisID: 'y', tension: .2, pointRadius: 4 },
    { label: 'Costo por conversación (USD)', data: d.lecturas.map(x => x.conv ? +(x.gasto / x.conv).toFixed(2) : null), borderColor: '#B8862F', backgroundColor: '#B8862F', yAxisID: 'y1', tension: .2, pointRadius: 4 }] },
    options: { scales: { x: { title: { display: true, text: 'Fecha de la lectura' } }, y: { beginAtZero: true, title: { display: true, text: 'Conversaciones (acumulado)' } }, y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'USD por conversación' } } } } });
}

function lecturaPre(d, k) {
  const l = d.lecturas.filter(x => x.conv);
  if (l.length < 2) return '';
  const a = l[1], b = l[l.length - 1];
  return `El costo acumulado por conversación pasó de ${usd(a.gasto / a.conv)} (${fecha(a.fecha)}) a ${usd(b.gasto / b.conv)} (${fecha(b.fecha)}). La referencia de la campaña previa es ${usd(k.cpaPrevio)} en ${d.mes_previo.dias} días.`;
}

// =====================================================================
export async function email(v) {
  const d = await json('email'); const t = d.total, u = d.ultimos_12;
  const grupos = Object.entries(d.por_grupo).map(([g, x]) => ({ g, ...x }));
  const nombres = { auditoria: 'Auditoría de Constant Contact', plan_email_sms: 'Plan de email y SMS', primeros_envios: 'Primeros envíos del plan', dkim_dmarc: 'Autenticación DKIM y DMARC', automatizaciones: 'Secuencias automáticas' };
  const hechos = Object.entries(d.estado).filter(([, s]) => /^(Implementado|Planificado y publicado)/.test(s));
  const pendientes = Object.entries(d.estado).filter(([, s]) => !/^(Implementado|Planificado y publicado)/.test(s));

  v.innerHTML = C.cabecera({ kicker: 'Email marketing y SMS', titulo: 'Email marketing y SMS', informe: d.informe,
    texto: `Diagnóstico de ${n0(t.n)} campañas de email enviadas entre el ${fecha(d.periodo[0])} y el ${fecha(d.periodo[1])}, y plan nuevo de email y SMS.`,
    extra: `<a class="btn" href="${esc(d.plan)}" target="_blank" rel="noopener">Ver plan email/SMS ↗</a>` })
  + C.guia({ muestra: 'Qué pasaba con el email (diagnóstico), qué se hizo, qué se recomienda y qué falta para empezar.',
    estado: 'Auditoría y plan terminados. El plan nuevo todavía no tiene envíos.',
    siguiente: 'Configurar DKIM y DMARC con el administrador del DNS y arrancar los primeros envíos (8 al 20 de octubre).' })
  // 1. diagnóstico
  + C.bloque('1 · Diagnóstico', `Línea base histórica, antes del plan nuevo. ${C.tipo('doc')}`, `<div class="grid g4">
      ${C.kpi({ valor: n0(t.sends), etiqueta: 'Envíos auditados', detalle: `${n0(t.n)} campañas · ${n0(u.sends)} en los últimos 12 meses`, tipo: 'doc' })}
      ${C.kpi({ valor: pct(t.click, 2), etiqueta: 'Clic sobre entregados', detalle: `Últimos 12 meses: ${pct(u.click, 2)}`, tipo: 'doc' })}
      ${C.kpi({ valor: pct(t.bounce, 2), etiqueta: 'Rebote', detalle: `Últimos 12 meses: ${pct(u.bounce, 2)}`, tipo: 'doc' })}
      ${C.kpi({ valor: pct(t.open, 1), etiqueta: 'Apertura', detalle: `Dato de Constant Contact. ${C.ayuda('La protección de privacidad de Apple Mail marca correos como abiertos aunque no se lean: por eso se usa el clic como indicador principal.')}`, tipo: 'doc' })}</div>
    <div class="card" style="margin-top:16px"><h3>Hallazgos principales</h3><ul class="lista">${d.hallazgos.map(h => `<li>${esc(h)}</li>`).join('')}</ul></div>
    <div class="card" style="margin-top:16px"><h3>Clic y rebote por mes (% de los envíos)</h3><p class="sub">Del ${fecha(d.periodo[0])} al ${fecha(d.periodo[1])}.</p>${C.lienzo('gEmail', '', 'Clic y rebote mensual')}${C.lectura(`En todo el periodo, el clic fue de ${pct(t.click, 2)} y el rebote de ${pct(t.bounce, 2)}; en los últimos 12 meses, ${pct(u.click, 2)} y ${pct(u.bounce, 2)}. Las listas de menos de 1.000 contactos son las que más clic consiguen.`)}</div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><h3>Por tamaño de la lista</h3>${C.tabla([{ t: 'Contactos', k: 'label' }, { t: 'Campañas', num: 1, k: x => n0(x.n) }, { t: 'Clic', num: 1, k: x => pct(x.click, 2) }, { t: 'Rebote', num: 1, k: x => pct(x.bounce, 2) }], d.por_tamano)}</div>
      <div class="card"><h3>Por público</h3>${C.tabla([{ t: 'Grupo', k: 'g' }, { t: 'Campañas', num: 1, k: x => n0(x.n) }, { t: 'Clic', num: 1, k: x => pct(x.click, 2) }, { t: 'Rebote', num: 1, k: x => pct(x.bounce, 2) }], grupos)}</div></div>`)
  // 2. ejecutado
  + C.bloque('2 · Acciones ejecutadas', '', C.tabla([{ t: 'Acción', k: x => `<b>${esc(nombres[x[0]] || x[0])}</b>` }, { t: 'Estado', k: x => C.etiquetaEstado(x[1].split(/[:(]/)[0].trim(), 'implementado') }, { t: 'Detalle', k: x => esc(x[1]) }], hechos))
  // 3. recomendaciones
  + C.bloque('3 · Recomendaciones', `Plan de acción de ${d.pasos.length} pasos y metas a 90 días. ${C.tipo('plan')}`, `<div class="grid g2">
      <div class="card"><h3>Metas a 90 días</h3><p class="sub">«Hoy» es el valor de la auditoría.</p>${C.tabla([{ t: 'Métrica', k: x => `<b>${esc(x.metrica)}</b>` }, { t: 'Hoy', k: 'hoy' }, { t: 'Meta', k: 'meta' }], d.metas_90_dias)}</div>
      <div class="card"><h3>Plan de acción</h3><p class="sub">Ningún paso se marca como hecho sin evidencia.</p>${C.tabla([{ t: '#', num: 1, k: 'n' }, { t: 'Paso', k: 'paso' }, { t: 'Cuándo', k: 'cuando' }], d.pasos)}</div></div>`)
  // 4. pendientes
  + C.bloque('4 · Pendientes de implementación', '', C.tabla([{ t: 'Pendiente', k: x => `<b>${esc(nombres[x[0]] || x[0])}</b>` }, { t: 'Estado', k: x => C.etiquetaEstado(/^Planificado/.test(x[1]) ? 'Planificado' : 'Pendiente', /^Planificado/.test(x[1]) ? 'planificado' : 'validacion') }, { t: 'Detalle', k: x => esc(x[1]) }], pendientes)
    + C.aviso(`<b>SMS:</b> el plan incluye ${d.plan_cifras ? n0(d.plan_cifras.sms) : '—'} SMS, pero todavía no hay envíos del plan: sus resultados quedan pendientes de medición. La línea base de SMS (469 campañas, 11,5 % de clic) está en el informe original.`, 'gris')
    + C.fuente(d.fuente, d.informe))
  + C.volver();

  C.grafico('gEmail', { type: 'line', data: { labels: d.mensual.map(x => mes(x.mes)), datasets: [
    { label: 'Clic', data: d.mensual.map(x => +(x.click * 100).toFixed(2)), borderColor: '#B8862F', backgroundColor: '#B8862F', tension: .2 },
    { label: 'Rebote', data: d.mensual.map(x => +(x.bounce * 100).toFixed(2)), borderColor: '#B5112F', backgroundColor: '#B5112F', tension: .2, borderDash: [5, 4] }] },
    options: { scales: { x: { title: { display: true, text: 'Mes de envío' } }, y: { beginAtZero: true, title: { display: true, text: 'Porcentaje de los envíos' }, ticks: { callback: (x) => x + ' %' } } } } });
}

// =====================================================================
const ORDEN_FASES = [1, 2, 4, 5, 3];
export async function ruta(v) {
  const e = await json('estrategia');
  const fase = (n) => e.fases.find(x => x.n === n);
  v.innerHTML = C.cabecera({ kicker: 'Hoja de ruta', titulo: 'Próximos pasos',
    texto: 'Las fases están ordenadas por prioridad y dependencias: no todas pueden ejecutarse a la vez.' })
  + C.guia({ muestra: 'El orden de trabajo, qué depende de qué y qué se necesita para avanzar en cada fase.',
    estado: `${e.fases.filter(f => f.estado === 'En progreso').length} fases en progreso, ${e.fases.filter(f => f.estado === 'Planificado').length} planificada, ${e.fases.filter(f => f.estado === 'Pendiente de validación').length} pendiente de validación y ${e.fases.filter(f => f.estado === 'Idea').length} idea en evaluación (Google Ads).`,
    siguiente: esc(fase(1).requisito) })
  + `<div class="card" style="margin-bottom:16px"><b>Qué significa cada estado:</b> ${Object.entries(e.estados).map(([k, x]) => `${C.estado(k)} ${esc(x)}`).join(' &nbsp; ')}</div>`
  + `<div class="ruta-flujo">${ORDEN_FASES.map((n, i) => { const f = fase(n); return `<article class="paso-ruta${i === 0 ? ' p1' : ''}"><div class="num" aria-hidden="true">${i + 1}</div><div>
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>${esc(f.titulo)}</h3>${C.estado(f.estado)}</div>
      <div class="meta"><span class="chip prio">${esc(f.nivel)}</span>${(f.depende_de || []).map(dd => `<span class="chip dep">Depende de: ${esc(fase(dd).titulo)}</span>`).join('')}</div>
      <p style="margin:0 0 8px">${esc(f.objetivo)}</p>
      <ul class="lista">${f.acciones.map(a => `<li>${esc(a)}</li>`).join('')}</ul>
      <p class="req"><b>Requisito para avanzar:</b> ${esc(f.requisito)}</p>
      <p class="fuente"><b>Hecho hasta hoy:</b> ${esc(f.hecho)}</p></div></article>`; }).join('')}</div>`
  + C.bloque('Frentes y siguiente paso', '', C.tabla([{ t: 'Frente', k: f => `<b>${esc(f.titulo)}</b>` }, { t: 'Estado', k: f => C.estado(f.estado) }, { t: 'Siguiente paso', k: 'siguiente' }, { t: 'Requisito', k: f => esc(f.atencion || '') }], e.frentes)
    + `<p class="fuente">Contenido editorial actualizado el ${fecha(e.actualizado)} (data/estrategia.json). ${esc(e.nota)}</p>`)
  + C.volver();
}
