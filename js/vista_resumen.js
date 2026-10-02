// Resumen ejecutivo: una ruta de lectura en cinco niveles.
// qué gestionamos → qué hicimos → en qué estado está → qué avances se pueden demostrar → qué sigue.
// Cada cifra aparece una sola vez aquí; el detalle vive en su sección.
import { json, parrilla } from './datos.js?v=20261002i';
import * as K from './calculos.js?v=20261002i';
import * as C from './componentes.js?v=20261002i';
import { hoyISO, diasEntre } from './periodo.js?v=20261002i';
import { piezasHechas, graficoHechas } from './vista_contenido.js?v=20261002i';
const { n0, usd, pct, fecha, esc } = K;

const ORDEN_ESTADOS = ['Implementado', 'En progreso', 'Pendiente de validación', 'Planificado'];
const ORDEN_FASES = [1, 2, 4, 5, 3];   // prioridad operativa: web y medición → Meta → email en paralelo → medición → Google Ads

export async function resumen(v) {
  const [ig, pre, idc, em, est, evo] = await Promise.all([json('instagram'), json('meta_preacademy'), json('meta_idcamps'), json('email'), json('estrategia'), json('evolucion')]);
  const p = await parrilla();
  const hoy = hoyISO();
  const frentes = est.frentes;
  const porId = Object.fromEntries(frentes.map(f => [f.id, f]));

  // nivel 2: qué se hizo por frente (antes → después) y tareas de la bitácora
  const bit = evo.bitacora || [];
  const tareas = bit.flatMap(d => d.tareas.map(t => ({ ...t, fecha: d.fecha, frente: evo.area_frente?.[t.area] || 'analitica' })));
  const tareasPor = (id) => tareas.filter(t => t.frente === id).length;
  const filasHecho = frentes.map(f => {
    const ops = evo.operativo.filter(o => o.frente === f.id);
    return { f, antes: ops.map(o => o.antes).join(' ') || 'Sin registro disponible.', despues: ops.map(o => o.despues).join(' ') || f.realizado, n: tareasPor(f.id) };
  });
  const diasBit = bit.length ? diasEntre(bit[0].fecha, bit.at(-1).fecha) : 0;
  const implementadas = frentes.filter(f => f.estado === 'Implementado' || f.estado === 'En progreso').length;
  const proximas = evo.proximas.filter(x => !x.fecha || x.fecha >= hoy);

  // nivel 4: indicadores por categoría
  const seg = ig.cuentas.reduce((s, c) => s + (c.seguidores.actual || 0), 0);
  const conSerie = ig.cuentas.filter(c => c.seguidores.nuevos_por_dia?.length);
  const nuevos = conSerie.reduce((s, c) => s + K.crecimiento(c).nuevos, 0);
  const bases = ig.cuentas.map(c => ({ c, b: K.lineaBase(c) })).filter(x => x.b.abs != null).sort((a, b) => b.b.abs - a.b.abs);
  const fechaSeg = ig.cuentas[0].seguidores.fecha;
  const hechas = piezasHechas(p.tabs), totHechas = hechas.reduce((s, x) => s + x.total, 0);
  const kp = K.preacademyKPIs(pre), ki = K.idcampsKPIs(idc), temp = K.historicoTemporadas(idc).at(-1);
  const plan = em.plan_cifras;

  const salto = (id, n, txt) => `<a href="#resumen" data-salto="${id}"><span>${n}</span>${esc(txt)}</a>`;

  v.innerHTML = C.cabecera({ kicker: 'Centro de control', titulo: 'Resumen ejecutivo',
    texto: `Cómo va el marketing digital de Soccer Cage desde el 15 de septiembre de 2026, en cinco pasos. Informes y campañas actualizados el ${fecha(ig.generado.slice(0, 10))}; el plan de contenido se lee del Sheet al abrir la página.`,
    extra: C.badgeParrilla(p) })
  + `<nav class="saltos" aria-label="Ir a">${salto('n-gestion', 1, 'Qué gestionamos')}${salto('n-hecho', 2, 'Qué hicimos')}${salto('n-estado', 3, 'En qué estado está')}${salto('n-avances', 4, 'Qué avances hay')}${salto('n-sigue', 5, 'Qué sigue')}</nav>`

  // ---------------------------------------------------------------- 1
  + C.nivel(1, '¿Qué estamos gestionando?', 'Frentes de trabajo', 'Siete frentes con objetivos distintos. Sus indicadores no se suman entre sí.',
    `<div class="frentes-g">${frentes.map(f => `<a class="frente-c" href="#${esc(f.seccion)}"><b>${esc(f.corto || f.titulo)}</b><span>${esc(f.objetivo)}</span><em>Ver detalle →</em></a>`).join('')}</div>`, 'n-gestion')

  // ---------------------------------------------------------------- 2
  + C.nivel(2, '¿Qué hemos hecho?', 'Desde el 15 de septiembre de 2026', 'De la situación documentada antes del corte a lo realizado desde entonces, frente por frente. Solo se incluye trabajo con evidencia.',
    `<ol class="etapas" aria-label="Etapas de la evolución">
      <li><b>1 · Situación inicial</b>${n0(evo.situacion_inicial.length)} áreas documentadas antes del 15-sep. <a href="#evolucion">Ver</a></li>
      <li><b>2 · Acciones</b>${n0(tareas.length)} tareas en ${n0(bit.length)} días con trabajo (${n0(diasBit)} días del periodo). <a href="#evolucion">Bitácora</a></li>
      <li><b>3 · Avances operativos</b>${n0(implementadas)} de ${n0(frentes.length)} frentes implementados o en progreso. <a href="#resumen" data-salto="n-estado">Ver estado</a></li>
      <li><b>4 · Resultados medidos</b>Comunidad, contenido y campañas, cada uno con su periodo. <a href="#resumen" data-salto="n-avances">Ver avances</a></li>
      <li><b>5 · Pendientes</b>${n0(proximas.length)} próximas acciones ordenadas por prioridad. <a href="#resumen" data-salto="n-sigue">Ver ruta</a></li>
    </ol>`
    + C.tabla([
      { t: 'Frente', k: x => `<b>${esc(x.f.corto || x.f.titulo)}</b>` },
      { t: 'Antes del 15-sep', k: x => `<small>${esc(x.antes)}</small>` },
      { t: 'Qué se hizo desde el 15-sep', k: x => esc(x.despues) },
      { t: 'Tareas registradas', num: 1, k: x => x.n ? n0(x.n) : '—' },
    ], filasHecho)
    + `<p class="fuente">Tareas de la bitácora diaria asignadas a su frente. El detalle día a día, los hitos con su evidencia y las piezas producidas están en <a href="#evolucion">Evolución desde el 15-sep</a>.</p>`, 'n-hecho')

  // ---------------------------------------------------------------- 3
  + C.nivel(3, '¿En qué estado estamos?', 'Estado de cada frente', 'Cada estado se asigna con evidencia; una propuesta no cuenta como implementación.',
    `<div class="tablero">${ORDEN_ESTADOS.map(e => {
      const fs = frentes.filter(f => f.estado === e);
      return `<div class="col-estado"><h3>${C.estado(e)}<span class="fuente" style="margin:0">${n0(fs.length)}</span></h3>
        <p class="fuente" style="margin:-4px 0 10px">${esc(est.estados[e] || '')}</p>
        ${fs.length ? `<ul>${fs.map(f => `<li><b>${esc(f.corto || f.titulo)}</b><small>${esc(f.atencion || f.siguiente)}</small></li>`).join('')}</ul>` : '<p class="vacio">Ningún frente en este estado.</p>'}</div>`;
    }).join('')}</div>`, 'n-estado')

  // ---------------------------------------------------------------- 4
  + C.nivel(4, '¿Qué avances podemos demostrar?', 'Indicadores por categoría', 'Cada grupo indica qué mide, a qué cuenta o campaña pertenece y su periodo. La actividad (piezas, auditorías) no se presenta como resultado comercial.',
    // a) comunidad
    `<div class="grupo-ind"><h3>Comunidad en Instagram ${C.tipo('resultado')}</h3><p class="ctx">4 cuentas · lectura de la API del ${fecha(fechaSeg)} · <a href="#instagram">ver Instagram</a></p>
      <div class="grid g3">
        ${C.kpi({ valor: n0(seg), etiqueta: 'Seguidores actuales (suma de las 4 cuentas)', detalle: ig.cuentas.map(c => `@${esc(c.usuario)} ${n0(c.seguidores.actual)}`).join(' · ') })}
        ${C.kpi({ valor: '+' + n0(nuevos), etiqueta: 'Nuevos seguidores en 30 días', detalle: `Brutos: la API no resta a quienes dejan de seguir. ${C.ayuda('Suma de los nuevos seguidores por día de los últimos 30 días que entrega la API de Instagram. No descuenta bajas, por eso no es el crecimiento neto.')}` })}
        ${bases.length ? C.kpi({ valor: K.signo(bases[0].b.abs), etiqueta: `Mayor variación neta · @${bases[0].c.usuario}`, detalle: `Del ${fecha(bases[0].b.base.fecha)} al ${fecha(bases[0].b.actual.fecha)} (${n0(bases[0].b.dias)} días), entre dos capturas verificadas. ${C.ayuda('Diferencia entre el total de seguidores de dos lecturas reales de la cuenta. No hay captura del 15-sep: se usa la primera posterior.')}` }) : ''}
      </div></div>`
    // b) contenido
    + `<div class="grupo-ind"><h3>Producción de contenido ${C.tipo('actividad')}</h3><p class="ctx">4 pestañas del Sheet · en vivo · <a href="#contenido">ver Plan de contenido</a></p>
      <div class="grid g-kpi-graf">
        ${C.kpi({ valor: n0(totHechas), etiqueta: 'Piezas de contenido hechas', detalle: `Piezas producidas en las 4 cuentas (por aprobar, aprobadas, programadas o publicadas). ${C.ayuda('Una pieza es un post, carrusel, flyer o reel de la parrilla. Se cuenta una vez, sin importar su etapa.')}`, tipo: 'actividad' })}
        <div class="card"><h3 style="font-size:16px">Las ${n0(totHechas)} piezas por cuenta y formato</h3>${C.lienzo('gHechasR', 'bajo', 'Piezas hechas por cuenta y formato')}</div>
      </div></div>`
    // c) campañas
    + `<div class="grupo-ind"><h3>Campañas de Meta Ads ${C.tipo('resultado')}</h3><p class="ctx">Dos campañas que miden resultados distintos: se comparan lado a lado, no se suman.</p>
      <div class="tabla-wrap"><table class="compara"><thead><tr><th scope="col">Indicador</th><th scope="col"><a href="#meta-preacademy">Pre-Academy Miami</a></th><th scope="col"><a href="#meta-idcamps">Juventus Camps USA · ID Camps</a></th></tr></thead><tbody>
        <tr><td>Qué se mide ${C.ayuda('Pre-Academy cuenta conversaciones de WhatsApp; ID Camps cuenta clics en «Register now» (todavía no es un registro confirmado).')}</td><td>Conversación iniciada en WhatsApp</td><td>Clic en «Register now» (lead)</td></tr>
        <tr><td>Periodo</td><td>${fecha(pre.inicio)} → ${fecha(pre.ultima.fecha)} (${kp.dias} días)</td><td>${fecha(idc.activa_desde)} → ${fecha(idc.meta_diario.at(-1).fecha)} (${ki.dias} días${ki.parcial ? ', último parcial' : ''})</td></tr>
        <tr><td>Presupuesto diario ${C.tipo('plan')}</td><td class="mono">${usd(kp.presup, 0)}</td><td class="mono">${usd(ki.presup, 0)}</td></tr>
        <tr><td>Inversión acumulada ${C.tipo('resultado')}</td><td class="mono">${usd(kp.gasto)}</td><td class="mono">${usd(ki.gasto)}</td></tr>
        <tr><td>Resultados</td><td class="mono">${n0(kp.conv)} conversaciones</td><td class="mono">${n0(ki.leads)} leads</td></tr>
        <tr><td>Costo por resultado</td><td class="mono"><b>${usd(kp.cpa)}</b> <small>· campaña previa ${usd(kp.cpaPrevio)}</small></td><td class="mono"><b>${usd(ki.cpl)}</b> <small>· temporada ${esc(temp?.temporada || '')} ${usd(temp?.cpl)}</small></td></tr>
        <tr><td>Resultado comercial</td><td>Clases de prueba: ${C.PENDIENTE}</td><td>Registros por anuncio: ${C.PENDIENTE}</td></tr>
      </tbody></table></div>
      <p class="fuente">Referencias de duración distinta y campañas recién iniciadas: señal temprana, no resultado consolidado. Los datos de Meta se actualizan con un paso manual (ver cada campaña).</p></div>`
    // d) email y web
    + `<div class="grid g2" style="margin-top:22px">
      <div class="grupo-ind" style="margin:0"><h3>Email y SMS ${C.tipo('doc')}</h3><p class="ctx">Línea base de la auditoría (${fecha(em.periodo[0])} – ${fecha(em.periodo[1])}) · <a href="#email">ver Email</a></p>
        <div class="grid g2">${C.kpi({ valor: n0(em.total.n), etiqueta: 'Campañas de email auditadas', detalle: `Clic ${pct(em.total.click, 2)} · rebote ${pct(em.total.bounce, 2)}`, tipo: 'doc' })}
        ${C.kpi({ valor: plan ? `${n0(plan.emails)} + ${n0(plan.sms)}` : '—', etiqueta: 'Emails + SMS en el plan nuevo', detalle: plan ? `${n0(plan.enviados)} enviados todavía; primeros envíos del 8 al 20 de octubre.` : '', tipo: 'plan' })}</div></div>
      <div class="grupo-ind" style="margin:0"><h3>Web y medición ${C.tipo('pend')}</h3><p class="ctx">Registro real en la app de inscripción · <a href="#ruta">ver ruta</a></p>
        ${C.aviso(`<b>Registros atribuidos a las campañas: pendiente de medición.</b> La app no envía el evento de registro a Meta; el brief para el programador ya está entregado. Mientras tanto, la app suma ${n0(ki.registros)} registros de todos los canales en la temporada 2026-27.`, 'gris')}</div>
    </div>`, 'n-avances')

  // ---------------------------------------------------------------- 5
  + C.nivel(5, '¿Qué sigue?', 'Ruta de trabajo', 'Ordenada por prioridad operativa y dependencias: primero páginas y medición, después ampliar la inversión, y Google Ads más adelante.',
    `<div class="ruta-flujo">${ORDEN_FASES.map((n, i) => {
      const f = est.fases.find(x => x.n === n);
      return `<div class="paso-ruta${i === 0 ? ' p1' : ''}"><div class="num" aria-hidden="true">${i + 1}</div><div>
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap"><h3>${esc(f.titulo)}</h3>${C.estado(f.estado)}</div>
        <div class="meta"><span class="chip prio">${esc(f.nivel)}</span>${(f.depende_de || []).map(d => `<span class="chip dep">Depende de: ${esc(est.fases.find(x => x.n === d).titulo)}</span>`).join('')}</div>
        <p style="margin:0">${esc(f.objetivo)}</p><p class="req"><b>Requisito para avanzar:</b> ${esc(f.requisito)}</p></div></div>`;
    }).join('')}</div>
    <div class="card" style="margin-top:16px"><h3>Agenda próxima</h3><ul class="linea-tiempo">${proximas.map(x => `<li><time${x.fecha ? ` datetime="${x.fecha}"` : ''}>${x.fecha ? fecha(x.fecha) : 'Sin fecha'}</time><div>${esc(x.texto)}</div></li>`).join('')}</ul></div>
    <p class="fuente">Detalle de las fases en <a href="#ruta">Hoja de ruta</a>. Escenarios de seguidores (proyección) en <a href="#instagram">Instagram</a>.</p>`, 'n-sigue');

  graficoHechas('gHechasR', p.tabs);
}
