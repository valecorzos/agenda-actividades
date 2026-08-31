-- ============================================================================
--  MANTENIMIENTOS
--
--  Los cambios sobre algo que ya está en producción no son documentos nuevos:
--  son trabajo colgado de un documento existente. Modelarlos como tabla hija
--  mantiene UNA fila por app en la vista de la jefa, que era el objetivo de
--  toda la reestructura, y no hace que un entregable en producción "retroceda"
--  de 100% cada vez que le piden un ajuste.
--
--  A cambio aparece una métrica que hoy es invisible: cuánto del tiempo del
--  equipo se va en mantener lo ya entregado frente a construir cosas nuevas.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. Tipos
-- ---------------------------------------------------------------------------

do $$ begin
  create type mantenimiento_clase as enum ('Correctivo', 'Mejora', 'Actualización');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type mantenimiento_estado as enum ('Abierto', 'En curso', 'Cerrado');
exception when duplicate_object then null;
end $$;

comment on type mantenimiento_clase is
  'Correctivo = algo se rompió. Mejora = piden algo nuevo encima. Actualización = mantenimiento técnico sin cambio funcional.';


-- ---------------------------------------------------------------------------
--  2. Tabla
-- ---------------------------------------------------------------------------

create table if not exists documento_mantenimientos (
  id              uuid primary key default gen_random_uuid(),
  documento_id    uuid                 not null references documentos (id) on delete cascade,

  titulo          text                 not null,
  descripcion     text,
  clase           mantenimiento_clase  not null default 'Mejora',
  estado          mantenimiento_estado not null default 'Abierto',
  responsable     responsable_enfoque,

  fecha_solicitud date                 not null default current_date,
  fecha_cierre    date,

  created_at      timestamptz          not null default now(),
  updated_at      timestamptz          not null default now(),
  deleted_at      timestamptz,
  created_by_id   text,

  constraint mantenimientos_titulo_no_vacio check (length(btrim(titulo)) > 0),
  -- Cerrado siempre tiene fecha de cierre, y solo lo cerrado la tiene.
  constraint mantenimientos_cierre_coherente check (
    (estado = 'Cerrado' and fecha_cierre is not null)
    or (estado <> 'Cerrado' and fecha_cierre is null)
  )
);

create index if not exists ix_mantenimientos_documento
  on documento_mantenimientos (documento_id, fecha_solicitud desc)
  where deleted_at is null;

-- Para el listado de "qué tenemos abierto".
create index if not exists ix_mantenimientos_abiertos
  on documento_mantenimientos (documento_id)
  where deleted_at is null and estado <> 'Cerrado';

drop trigger if exists tg_mantenimientos_updated_at on documento_mantenimientos;
create trigger tg_mantenimientos_updated_at
  before update on documento_mantenimientos
  for each row execute function documentos_touch_updated_at();

comment on table documento_mantenimientos is
  'Mantenimientos, correcciones y mejoras sobre un documento ya entregado. El documento padre conserva su avance; estos registros no lo modifican.';


-- ---------------------------------------------------------------------------
--  3. Fecha de cierre automática: el front solo manda el estado
-- ---------------------------------------------------------------------------

create or replace function mantenimientos_normalizar_cierre()
returns trigger
language plpgsql
as $$
begin
  if new.estado = 'Cerrado' and new.fecha_cierre is null then
    new.fecha_cierre := current_date;
  elsif new.estado <> 'Cerrado' then
    new.fecha_cierre := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tg_mantenimientos_normalizar_cierre on documento_mantenimientos;
create trigger tg_mantenimientos_normalizar_cierre
  before insert or update on documento_mantenimientos
  for each row execute function mantenimientos_normalizar_cierre();


-- ---------------------------------------------------------------------------
--  4. Seguridad, igual que el resto del módulo
-- ---------------------------------------------------------------------------

alter table documento_mantenimientos enable row level security;

drop policy if exists documento_mantenimientos_acceso_app on documento_mantenimientos;
create policy documento_mantenimientos_acceso_app
  on documento_mantenimientos for all to anon, authenticated
  using (true) with check (true);


-- ---------------------------------------------------------------------------
--  5. Contadores en la vista principal
--     Van aquí y no en el front para que la tabla pueda pintar el contador sin
--     una segunda consulta por fila.
-- ---------------------------------------------------------------------------

-- `create or replace view` solo admite AGREGAR columnas al final de la lista.
-- Como los contadores se insertan antes de created_at/updated_at, Postgres lo
-- interpretaría como renombrar columnas y falla con 42P16. Hay que eliminarla.
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
    count(*)                                    as total,
    count(*) filter (where mm.estado <> 'Cerrado') as abiertos
  from documento_mantenimientos mm
  where mm.documento_id = d.id
    and mm.deleted_at is null
) m on true
where d.deleted_at is null;


-- ---------------------------------------------------------------------------
--  6. Vista de análisis: construir vs. mantener
--     No la consume ningún dashboard todavía; queda lista para cuando se
--     quiera medir cuánto del esfuerzo se va en sostener lo ya entregado.
-- ---------------------------------------------------------------------------

create or replace view v_resumen_mantenimientos as
select
  ln.nombre                                          as linea_negocio,
  p.nombre                                           as proceso,
  d.tipo,
  mm.clase,
  count(*)                                           as total,
  count(*) filter (where mm.estado <> 'Cerrado')     as abiertos,
  count(*) filter (where mm.estado = 'Cerrado')      as cerrados,
  round(avg(mm.fecha_cierre - mm.fecha_solicitud) filter (where mm.estado = 'Cerrado'), 1)
                                                     as dias_promedio_cierre
from documento_mantenimientos mm
join documentos     d  on d.id  = mm.documento_id and d.deleted_at is null
join lineas_negocio ln on ln.id = d.linea_negocio_id
join procesos       p  on p.id  = d.proceso_id
where mm.deleted_at is null
group by ln.nombre, p.nombre, d.tipo, mm.clase;
