-- ============================================================================
--  FECHA ESTIMADA DE ENTREGA
--
--  Hasta ahora la tabla solo sabía cuándo empezó un documento y cuándo se
--  entregó de verdad. Faltaba el compromiso: para cuándo se dijo que iba a
--  estar. Sin eso "va en 40%" no se puede leer como bien o mal, porque no hay
--  contra qué compararlo.
--
--  Es un campo opcional: un documento sin fecha comprometida simplemente no
--  entra en el semáforo de vencimientos.
--
--  Objetos que toca:
--    - documentos            : columna nueva `fecha_estimada_entrega`
--    - v_documentos_detalle  : se recrea con la fecha y dos derivados
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. Columna
-- ---------------------------------------------------------------------------

alter table documentos
  add column if not exists fecha_estimada_entrega date;

comment on column documentos.fecha_estimada_entrega is
  'Para cuándo se comprometió el entregable. NULL = sin fecha comprometida. No participa en el cálculo del avance: es el plazo, no el progreso.';

-- Una entrega no puede prometerse para antes de haber arrancado. Se permite el
-- mismo día por si algo se registra ya terminado.
alter table documentos drop constraint if exists documentos_estimada_posterior_inicio;
alter table documentos add constraint documentos_estimada_posterior_inicio
  check (fecha_estimada_entrega is null or fecha_estimada_entrega >= fecha_inicio);

-- Para el reporte de "qué se vence este mes": solo lo que sigue vivo.
create index if not exists ix_documentos_fecha_estimada
  on documentos (fecha_estimada_entrega)
  where deleted_at is null and not en_produccion and fecha_estimada_entrega is not null;


-- ---------------------------------------------------------------------------
--  2. Vista de lectura
--
--     `dias_para_entrega` va con signo: positivo = quedan días, 0 = vence hoy,
--     negativo = se pasó. Un solo número que el front pinta de tres colores,
--     en vez de tres campos que podrían contradecirse.
--
--     `entrega_vencida` excluye lo que ya está en producción: una fecha pasada
--     sobre algo que se entregó no es una alarma, es historia.
-- ---------------------------------------------------------------------------

drop view if exists v_documentos_detalle;

create view v_documentos_detalle as
select
  d.id,
  d.nombre,
  d.descripcion,
  d.tipo,
  d.linea_negocio_id,
  ln.nombre                                   as linea_negocio,
  ln.color                                    as linea_negocio_color,
  d.proceso_id,
  p.nombre                                    as proceso,
  d.pct_planificacion,
  d.pct_contexto,
  d.pct_desarrollo,
  d.entregado_tic,
  d.fecha_entrega_tic,
  d.en_produccion,
  d.fecha_produccion,
  d.responsable,
  d.avance_global,
  d.estado,
  d.fecha_inicio,
  d.fecha_estimada_entrega,
  (d.fecha_estimada_entrega - current_date)   as dias_para_entrega,
  (
    d.fecha_estimada_entrega is not null
    and not d.en_produccion
    and d.fecha_estimada_entrega < current_date
  )                                           as entrega_vencida,
  (current_date - d.fecha_inicio)             as dias_en_curso,
  (current_date - d.updated_at::date)         as dias_sin_movimiento,
  (not d.en_produccion and (current_date - d.updated_at::date) > 21) as estancado,
  coalesce(m.total, 0)                        as mantenimientos_total,
  coalesce(m.abiertos, 0)                     as mantenimientos_abiertos,
  d.created_at,
  d.updated_at
from documentos d
join lineas_negocio ln on ln.id = d.linea_negocio_id
join procesos       p  on p.id  = d.proceso_id
left join lateral (
  select
    count(*)                                       as total,
    count(*) filter (where mm.estado <> 'Cerrado') as abiertos
  from documento_mantenimientos mm
  where mm.documento_id = d.id
    and mm.deleted_at is null
) m on true
where d.deleted_at is null;

comment on view v_documentos_detalle is
  'Modelo de lectura principal: documentos vivos con nombres de catálogo, métricas derivadas y el semáforo de la fecha estimada de entrega.';
