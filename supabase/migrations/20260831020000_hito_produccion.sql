-- ============================================================================
--  Nuevo hito final: EN PRODUCCIÓN
--
--  Entregar a TIC ya no cierra el 100%. Se agrega un segundo hito de 10% que
--  solo se marca cuando el entregable está corriendo y el negocio lo usa.
--
--  Ponderación anterior : Plan 20 / Contexto 20 / Desarrollo 50 / TIC 10
--  Ponderación nueva    : Plan 20 / Contexto 20 / Desarrollo 40 / TIC 10 / Prod 10
--
--  El 10% sale de Desarrollo, que baja de 50 a 40: construir sigue siendo la
--  fase que más pesa, pero terminar de construir algo que nadie usa deja el
--  documento en 90%, no en 100%.
--
--  Los porcentajes ya capturados NO se tocan. Lo único que cambia es cómo se
--  combinan: un documento entregado a TIC que antes marcaba 100% pasará a
--  marcar 90% hasta que se le marque la puesta en producción.
-- ============================================================================

-- ---------------------------------------------------------------------------
--  1. Las vistas y las columnas generadas dependen de las funciones de cálculo,
--     así que hay que desmontarlas antes de poder redefinirlas.
-- ---------------------------------------------------------------------------

drop view if exists v_documentos_detalle;
drop view if exists v_resumen_linea_negocio;
drop view if exists v_resumen_proceso;
drop view if exists v_resumen_tipo;

alter table documentos drop column if exists avance_global;
alter table documentos drop column if exists estado;

-- Cambia la aridad (4 -> 5 argumentos), así que `create or replace` crearía una
-- sobrecarga en vez de reemplazar. Hay que eliminarlas explícitamente.
drop function if exists documentos_avance_global(smallint, smallint, smallint, boolean);
drop function if exists documentos_estado(smallint, smallint, smallint, boolean);


-- ---------------------------------------------------------------------------
--  2. Columnas nuevas
-- ---------------------------------------------------------------------------

alter table documentos
  add column if not exists en_produccion    boolean not null default false,
  add column if not exists fecha_produccion date;

comment on column documentos.en_produccion is
  'El entregable está corriendo y el negocio lo usa. Es el hito que cierra el 100%.';

-- Nada puede estar en producción sin haberse entregado antes a TIC.
alter table documentos drop constraint if exists documentos_produccion_requiere_entrega;
alter table documentos add constraint documentos_produccion_requiere_entrega
  check (not en_produccion or entregado_tic);

alter table documentos drop constraint if exists documentos_produccion_coherente;
alter table documentos add constraint documentos_produccion_coherente
  check (
    (en_produccion and fecha_produccion is not null)
    or (not en_produccion and fecha_produccion is null)
  );


-- ---------------------------------------------------------------------------
--  3. Funciones de cálculo con el hito nuevo
-- ---------------------------------------------------------------------------

create or replace function documentos_avance_global(
  p_planificacion smallint,
  p_contexto      smallint,
  p_desarrollo    smallint,
  p_entregado_tic boolean,
  p_en_produccion boolean
) returns smallint
language sql
immutable
as $$
  select round(
      coalesce(p_planificacion, 0) * 0.20
    + coalesce(p_contexto, 0)      * 0.20
    + coalesce(p_desarrollo, 0)    * 0.40
    + (case when p_entregado_tic then 100 else 0 end) * 0.10
    + (case when p_en_produccion then 100 else 0 end) * 0.10
  )::smallint;
$$;

comment on function documentos_avance_global is
  'Avance global ponderado (0-100). Plan 20%, Contexto 20%, Desarrollo 40%, Entrega a TIC 10%, En producción 10%.';

create or replace function documentos_estado(
  p_planificacion smallint,
  p_contexto      smallint,
  p_desarrollo    smallint,
  p_entregado_tic boolean,
  p_en_produccion boolean
) returns text
language sql
immutable
as $$
  select case
    when p_en_produccion                     then 'En producción'
    when p_entregado_tic                     then 'Entregada a TIC'
    when coalesce(p_desarrollo, 0)    >= 100 then 'Lista para TIC'
    when coalesce(p_desarrollo, 0)    > 0    then 'En desarrollo'
    when coalesce(p_contexto, 0)      > 0    then 'En contexto'
    when coalesce(p_planificacion, 0) > 0    then 'En planificación'
    else 'Sin iniciar'
  end;
$$;

comment on function documentos_estado is
  'Estado derivado del documento. Se calcula solo a partir de los porcentajes y los dos hitos finales.';


-- ---------------------------------------------------------------------------
--  4. Columnas generadas de vuelta
-- ---------------------------------------------------------------------------

alter table documentos
  add column avance_global smallint generated always as (
    documentos_avance_global(pct_planificacion, pct_contexto, pct_desarrollo, entregado_tic, en_produccion)
  ) stored;

alter table documentos
  add column estado text generated always as (
    documentos_estado(pct_planificacion, pct_contexto, pct_desarrollo, entregado_tic, en_produccion)
  ) stored;

comment on column documentos.avance_global is
  'Calculado. Columna generada, de solo lectura.';
comment on column documentos.estado is
  'Calculado a partir de los porcentajes y los hitos. Columna generada, de solo lectura.';

-- Se fue con la columna que lo sostenía.
create index if not exists ix_documentos_estado_avance
  on documentos (estado, avance_global desc)
  where deleted_at is null;

create index if not exists ix_documentos_produccion
  on documentos (fecha_produccion desc)
  where deleted_at is null and en_produccion;


-- ---------------------------------------------------------------------------
--  5. Coherencia de fechas: el front solo manda los booleanos
-- ---------------------------------------------------------------------------

create or replace function documentos_normalizar_entrega()
returns trigger
language plpgsql
as $$
begin
  if new.entregado_tic and new.fecha_entrega_tic is null then
    new.fecha_entrega_tic := current_date;
  elsif not new.entregado_tic then
    new.fecha_entrega_tic := null;
    -- Desmarcar la entrega arrastra la puesta en producción: no puede quedar
    -- un documento "en producción" que oficialmente nunca se entregó.
    new.en_produccion := false;
  end if;

  if new.en_produccion and new.fecha_produccion is null then
    new.fecha_produccion := current_date;
  elsif not new.en_produccion then
    new.fecha_produccion := null;
  end if;

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
--  6. Bitácora: registrar también el hito de producción
-- ---------------------------------------------------------------------------

alter table documento_historial
  add column if not exists en_produccion boolean not null default false;

create or replace function documentos_registrar_historial()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_linea    text;
  v_proceso  text;
  v_anterior smallint := 0;
begin
  if tg_op = 'UPDATE' then
    if new.pct_planificacion is not distinct from old.pct_planificacion
       and new.pct_contexto   is not distinct from old.pct_contexto
       and new.pct_desarrollo is not distinct from old.pct_desarrollo
       and new.entregado_tic  is not distinct from old.entregado_tic
       and new.en_produccion  is not distinct from old.en_produccion then
      return new;
    end if;
    v_anterior := old.avance_global;
  end if;

  select nombre into v_linea   from lineas_negocio where id = new.linea_negocio_id;
  select nombre into v_proceso from procesos       where id = new.proceso_id;

  insert into documento_historial (
    documento_id, documento_nombre, linea_negocio_nombre, proceso_nombre, tipo, responsable,
    pct_planificacion, pct_contexto, pct_desarrollo, entregado_tic, en_produccion,
    avance_global, estado, delta_avance
  ) values (
    new.id, new.nombre, coalesce(v_linea, '—'), coalesce(v_proceso, '—'), new.tipo, new.responsable,
    new.pct_planificacion, new.pct_contexto, new.pct_desarrollo, new.entregado_tic, new.en_produccion,
    new.avance_global, new.estado, new.avance_global - v_anterior
  );

  return new;
end;
$$;


-- ---------------------------------------------------------------------------
--  7. Vistas reconstruidas
-- ---------------------------------------------------------------------------

create or replace view v_documentos_detalle as
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
  -- Ahora el corte es "no está en producción": un documento entregado a TIC
  -- hace tres meses y todavía sin salir a producción también es un problema.
  (not d.en_produccion and (current_date - d.updated_at::date) > 21) as estancado,
  d.created_at,
  d.updated_at
from documentos d
join lineas_negocio ln on ln.id = d.linea_negocio_id
join procesos       p  on p.id  = d.proceso_id
where d.deleted_at is null;


create or replace view v_resumen_linea_negocio as
select
  ln.id                                                        as linea_negocio_id,
  ln.nombre                                                    as linea_negocio,
  ln.color                                                     as linea_negocio_color,
  count(d.id)                                                  as total_documentos,
  count(d.id) filter (where d.en_produccion)                   as en_produccion,
  count(d.id) filter (where d.entregado_tic)                   as entregados,
  count(d.id) filter (where not d.en_produccion)               as en_curso,
  count(d.id) filter (where d.estado = 'Sin iniciar')          as sin_iniciar,
  coalesce(round(avg(d.avance_global)), 0)::smallint           as avance_promedio
from lineas_negocio ln
left join documentos d
       on d.linea_negocio_id = ln.id
      and d.deleted_at is null
where ln.deleted_at is null
group by ln.id, ln.nombre, ln.color, ln.orden
order by ln.orden, ln.nombre;


create or replace view v_resumen_proceso as
select
  p.id                                               as proceso_id,
  p.nombre                                           as proceso,
  ln.nombre                                          as linea_negocio,
  count(d.id)                                        as total_documentos,
  count(d.id) filter (where d.en_produccion)         as en_produccion,
  count(d.id) filter (where d.entregado_tic)         as entregados,
  coalesce(round(avg(d.avance_global)), 0)::smallint as avance_promedio
from procesos p
left join lineas_negocio ln on ln.id = p.linea_negocio_id
left join documentos d
       on d.proceso_id = p.id
      and d.deleted_at is null
where p.deleted_at is null
group by p.id, p.nombre, ln.nombre
order by count(d.id) desc, p.nombre;


create or replace view v_resumen_tipo as
select
  d.tipo,
  count(*)                                           as total_documentos,
  count(*) filter (where d.en_produccion)            as en_produccion,
  count(*) filter (where d.entregado_tic)            as entregados,
  coalesce(round(avg(d.avance_global)), 0)::smallint as avance_promedio
from documentos d
where d.deleted_at is null
group by d.tipo
order by count(*) desc;
