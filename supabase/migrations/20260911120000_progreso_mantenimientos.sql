-- ============================================================================
--  MANTENIMIENTOS CON AVANCE, Y FECHA DE INICIO REAL
--
--  Tres cambios que van juntos porque tocan la misma idea: un mantenimiento
--  es trabajo, no un recadito, así que se mide igual que un documento.
--
--  1. Los mantenimientos tienen `progreso` (0-100) y `fecha_estimada_entrega`.
--  2. `estado` deja de escribirse a mano y pasa a derivarse del progreso y de
--     la fecha de inicio, igual que `documentos.estado` se deriva de sus fases.
--     Así no puede existir un "Cerrado" con 20% de avance.
--  3. Aparece `fecha_inicio`: cuándo empezamos a trabajarlo de verdad, que no
--     es lo mismo que cuándo se registró. En `documentos` esa columna ya
--     existía pero la ponía la base y nadie podía corregirla; ahora la manda
--     el formulario.
--
--  `dias_en_curso` se cuenta siempre desde la fecha de inicio real contra hoy,
--  y nunca baja de cero: una tarea con fecha de inicio futura lleva 0 días, no
--  días negativos.
--
--  Objetos que toca:
--    - documento_mantenimientos : 3 columnas nuevas, trigger de estado
--    - v_mantenimientos_detalle : vista nueva
--    - v_documentos_detalle     : se recrea con dias_en_curso acotado
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. Columnas nuevas en los mantenimientos
-- ---------------------------------------------------------------------------

alter table documento_mantenimientos
  add column if not exists progreso               smallint not null default 0,
  add column if not exists fecha_inicio           date,
  add column if not exists fecha_estimada_entrega date;

comment on column documento_mantenimientos.progreso is
  'Avance del mantenimiento (0-100). Es la fuente de verdad del estado: 0 = Abierto, 100 = Cerrado.';
comment on column documento_mantenimientos.fecha_inicio is
  'Cuándo se empezó a trabajar de verdad. NULL = todavía no se ha empezado. No es la fecha de solicitud.';
comment on column documento_mantenimientos.fecha_estimada_entrega is
  'Para cuándo se comprometió. NULL = sin fecha pactada.';

alter table documento_mantenimientos
  drop constraint if exists mantenimientos_progreso_rango;
alter table documento_mantenimientos
  add constraint mantenimientos_progreso_rango check (progreso between 0 and 100);

-- No se puede prometer una entrega para antes de haber empezado. Si todavía no
-- hay fecha de inicio, cualquier fecha estimada vale.
alter table documento_mantenimientos
  drop constraint if exists mantenimientos_estimada_posterior_inicio;
alter table documento_mantenimientos
  add constraint mantenimientos_estimada_posterior_inicio check (
    fecha_estimada_entrega is null
    or fecha_inicio is null
    or fecha_estimada_entrega >= fecha_inicio
  );

create index if not exists ix_mantenimientos_fecha_estimada
  on documento_mantenimientos (fecha_estimada_entrega)
  where deleted_at is null
    and estado <> 'Cerrado'
    and fecha_estimada_entrega is not null;


-- ---------------------------------------------------------------------------
--  2. Relleno de lo que ya existe
--
--     Hay que hacerlo ANTES de montar el trigger: en cuanto el estado pase a
--     derivarse, un mantenimiento cerrado con progreso 0 se "reabriría" solo
--     en la primera edición. Se traduce el estado actual a los campos nuevos
--     sin inventar porcentajes intermedios:
--
--       Cerrado  -> 100% y, si no la tenía, fecha de inicio = la de solicitud
--       En curso -> fecha de inicio = la de solicitud (progreso se queda en 0)
--       Abierto  -> no se toca
-- ---------------------------------------------------------------------------

update documento_mantenimientos
   set progreso     = 100,
       fecha_inicio = coalesce(fecha_inicio, fecha_solicitud)
 where estado = 'Cerrado'
   and progreso <> 100;

update documento_mantenimientos
   set fecha_inicio = fecha_solicitud
 where estado = 'En curso'
   and fecha_inicio is null;


-- ---------------------------------------------------------------------------
--  3. El estado pasa a derivarse
--
--     No es columna generada sino un trigger BEFORE porque `estado` ya existe
--     como columna normal con su enum y su restricción de coherencia con
--     `fecha_cierre`; convertirla en generada obligaría a tirar la columna, y
--     con ella el índice y la restricción, para no ganar nada. El resultado
--     para la aplicación es el mismo: mande lo que mande, la base lo recalcula.
--
--     "En curso" no espera a que haya porcentaje: tener fecha de inicio ya
--     significa que alguien lo está trabajando, aunque todavía marque 0%.
-- ---------------------------------------------------------------------------

create or replace function mantenimientos_normalizar_cierre()
returns trigger
language plpgsql
as $$
begin
  new.estado := case
    when coalesce(new.progreso, 0) >= 100                                then 'Cerrado'
    when coalesce(new.progreso, 0) > 0 or new.fecha_inicio is not null   then 'En curso'
    else 'Abierto'
  end::mantenimiento_estado;

  if new.estado = 'Cerrado' then
    if new.fecha_cierre is null then
      new.fecha_cierre := current_date;
    end if;
    -- Cerrar algo que nunca se marcó como empezado: la fecha de inicio se
    -- rellena sola, porque si se terminó es que en algún momento se empezó.
    if new.fecha_inicio is null then
      new.fecha_inicio := coalesce(new.fecha_solicitud, current_date);
    end if;
  else
    new.fecha_cierre := null;
  end if;

  return new;
end;
$$;

comment on function mantenimientos_normalizar_cierre is
  'Deriva estado y fecha de cierre a partir del progreso y la fecha de inicio. El front no manda el estado.';


-- ---------------------------------------------------------------------------
--  4. Vista de lectura de los mantenimientos
--
--     Misma forma que `v_documentos_detalle`: los días los cuenta Postgres
--     contra `current_date`, no el navegador, para que la aplicación y el
--     reporte impreso no discrepen por la zona horaria del equipo.
-- ---------------------------------------------------------------------------

drop view if exists v_mantenimientos_detalle;

create view v_mantenimientos_detalle as
select
  m.id,
  m.documento_id,
  m.titulo,
  m.descripcion,
  m.clase,
  m.estado,
  m.responsable,
  m.progreso,
  m.fecha_solicitud,
  m.fecha_inicio,
  m.fecha_estimada_entrega,
  m.fecha_cierre,
  (m.fecha_estimada_entrega - current_date)     as dias_para_entrega,
  (
    m.fecha_estimada_entrega is not null
    and m.estado <> 'Cerrado'
    and m.fecha_estimada_entrega < current_date
  )                                             as entrega_vencida,
  -- NULL mientras no se haya empezado: cero días sonaría a "empezó hoy".
  case
    when m.fecha_inicio is null then null
    else greatest(current_date - m.fecha_inicio, 0)
  end                                           as dias_en_curso,
  m.created_at,
  m.updated_at
from documento_mantenimientos m
where m.deleted_at is null;

comment on view v_mantenimientos_detalle is
  'Mantenimientos vivos con el semáforo de la fecha estimada y los días en curso desde la fecha de inicio real.';


-- ---------------------------------------------------------------------------
--  5. `v_documentos_detalle`: los días en curso nunca son negativos
--
--     Ahora que la fecha de inicio la escribe el usuario, puede quedar en el
--     futuro ("esto lo arrancamos el lunes"). Sin el `greatest`, ese documento
--     mostraría -4 días en curso.
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
  greatest(current_date - d.fecha_inicio, 0)  as dias_en_curso,
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


-- ---------------------------------------------------------------------------
--  6. Permisos
--
--     Al eliminar una vista se van con ella sus concesiones. Supabase las
--     repone por privilegios por defecto, pero dejarlas escritas evita el
--     clásico "la tabla no carga y nadie sabe por qué" si esos defaults
--     cambian algún día.
-- ---------------------------------------------------------------------------

grant select on v_documentos_detalle    to anon, authenticated;
grant select on v_mantenimientos_detalle to anon, authenticated;


-- ---------------------------------------------------------------------------
--  7. Recalcular el estado de todo lo existente
--
--     Un UPDATE que no cambia nada, solo para que el trigger pase por cada
--     fila y deje los estados coherentes con el relleno del paso 2.
-- ---------------------------------------------------------------------------

update documento_mantenimientos set progreso = progreso;
