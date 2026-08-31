-- ============================================================================
--  Módulo: DOCUMENTOS / PROYECTOS
--  Branch: Act
--
--  IMPORTANTE: este script NO modifica ni elimina las tablas existentes
--  `activities` ni `projects`. Solo agrega objetos nuevos.
--
--  Objetos creados:
--    - Tipos     : documento_tipo, responsable_enfoque
--    - Funciones : documentos_avance_global(), documentos_estado(), triggers
--    - Tablas    : lineas_negocio, procesos, documentos, documento_historial
--    - Vistas    : v_documentos_detalle, v_resumen_linea_negocio,
--                  v_resumen_proceso, v_resumen_tipo
-- ============================================================================

create extension if not exists "pgcrypto";

-- ============================================================================
--  1. TIPOS
-- ============================================================================

do $$ begin
  create type documento_tipo as enum ('App', 'Dashboard', 'Forms', 'Excel', 'Script');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type responsable_enfoque as enum ('Juan', 'Valentina');
exception when duplicate_object then null;
end $$;


-- ============================================================================
--  2. FUNCIONES DE CÁLCULO
--     Declaradas IMMUTABLE para poder usarse en columnas generadas.
--     Ponderación acordada: Planificación 20% / Contexto 20% /
--                           Desarrollo 50% / Entrega a TIC 10%.
-- ============================================================================

create or replace function documentos_avance_global(
  p_planificacion smallint,
  p_contexto      smallint,
  p_desarrollo    smallint,
  p_entregado_tic boolean
) returns smallint
language sql
immutable
as $$
  select round(
      coalesce(p_planificacion, 0) * 0.20
    + coalesce(p_contexto, 0)      * 0.20
    + coalesce(p_desarrollo, 0)    * 0.50
    + (case when p_entregado_tic then 100 else 0 end) * 0.10
  )::smallint;
$$;

comment on function documentos_avance_global is
  'Avance global ponderado de un documento (0-100). Plan 20%, Contexto 20%, Desarrollo 50%, Entrega TIC 10%.';

create or replace function documentos_estado(
  p_planificacion smallint,
  p_contexto      smallint,
  p_desarrollo    smallint,
  p_entregado_tic boolean
) returns text
language sql
immutable
as $$
  select case
    when p_entregado_tic                     then 'Entregada a TIC'
    when coalesce(p_desarrollo, 0)    >= 100 then 'Lista para TIC'
    when coalesce(p_desarrollo, 0)    > 0    then 'En desarrollo'
    when coalesce(p_contexto, 0)      > 0    then 'En contexto'
    when coalesce(p_planificacion, 0) > 0    then 'En planificación'
    else 'Sin iniciar'
  end;
$$;

comment on function documentos_estado is
  'Estado derivado del documento. Se calcula solo a partir de los porcentajes; no existe un campo de estado editable a mano.';

-- Mantiene updated_at al día en cualquier tabla del módulo.
create or replace function documentos_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- ============================================================================
--  3. CATÁLOGO: LÍNEAS DE NEGOCIO (empresas del grupo)
-- ============================================================================

create table if not exists lineas_negocio (
  id            uuid primary key default gen_random_uuid(),
  nombre        text        not null,
  color         text        not null default '#1067f2',
  orden         smallint    not null default 0,
  activo        boolean     not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  created_by_id text,

  constraint lineas_negocio_nombre_no_vacio check (length(btrim(nombre)) > 0),
  constraint lineas_negocio_color_hex       check (color ~* '^#[0-9a-f]{6}$')
);

-- Nombre único solo entre las vivas: permite reusar un nombre tras un borrado lógico.
create unique index if not exists ux_lineas_negocio_nombre_vivas
  on lineas_negocio (lower(btrim(nombre)))
  where deleted_at is null;

create index if not exists ix_lineas_negocio_activas
  on lineas_negocio (orden, nombre)
  where deleted_at is null and activo;

drop trigger if exists tg_lineas_negocio_updated_at on lineas_negocio;
create trigger tg_lineas_negocio_updated_at
  before update on lineas_negocio
  for each row execute function documentos_touch_updated_at();

comment on table lineas_negocio is
  'Catálogo de líneas de negocio / empresas del grupo. Editable desde la aplicación.';


-- ============================================================================
--  4. CATÁLOGO: PROCESOS (departamentos)
--     linea_negocio_id NULL = proceso transversal, disponible para toda empresa.
-- ============================================================================

create table if not exists procesos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text        not null,
  linea_negocio_id uuid        references lineas_negocio (id) on delete restrict,
  activo           boolean     not null default true,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  created_by_id    text,

  constraint procesos_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

-- Único por (nombre, empresa). coalesce() para que los transversales (NULL)
-- también compitan entre sí por unicidad: en SQL, NULL <> NULL.
create unique index if not exists ux_procesos_nombre_linea_vivos
  on procesos (lower(btrim(nombre)), coalesce(linea_negocio_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where deleted_at is null;

create index if not exists ix_procesos_linea_negocio
  on procesos (linea_negocio_id)
  where deleted_at is null and activo;

drop trigger if exists tg_procesos_updated_at on procesos;
create trigger tg_procesos_updated_at
  before update on procesos
  for each row execute function documentos_touch_updated_at();

comment on table procesos is
  'Catálogo de procesos / departamentos. Si linea_negocio_id es NULL el proceso es transversal a todas las empresas.';


-- ============================================================================
--  5. TABLA PRINCIPAL: DOCUMENTOS
-- ============================================================================

create table if not exists documentos (
  id                uuid primary key default gen_random_uuid(),

  -- Clasificación
  linea_negocio_id  uuid           not null references lineas_negocio (id) on delete restrict,
  proceso_id        uuid           not null references procesos (id)       on delete restrict,
  tipo              documento_tipo not null,
  nombre            text           not null,
  descripcion       text,

  -- Avance por fase (0-100)
  pct_planificacion smallint       not null default 0,
  pct_contexto      smallint       not null default 0,
  pct_desarrollo    smallint       not null default 0,

  -- Entrega al área de TIC
  entregado_tic     boolean        not null default false,
  fecha_entrega_tic date,

  -- Enfoque: quién está trabajando esto ahora. NULL = sin asignar.
  responsable       responsable_enfoque,

  -- Derivados: los calcula Postgres, no la aplicación.
  avance_global     smallint generated always as (
                      documentos_avance_global(pct_planificacion, pct_contexto, pct_desarrollo, entregado_tic)
                    ) stored,
  estado            text     generated always as (
                      documentos_estado(pct_planificacion, pct_contexto, pct_desarrollo, entregado_tic)
                    ) stored,

  -- Auditoría
  fecha_inicio      date           not null default current_date,
  created_at        timestamptz    not null default now(),
  updated_at        timestamptz    not null default now(),
  deleted_at        timestamptz,
  created_by_id     text,

  constraint documentos_nombre_no_vacio  check (length(btrim(nombre)) > 0),
  constraint documentos_pct_planificacion_rango check (pct_planificacion between 0 and 100),
  constraint documentos_pct_contexto_rango      check (pct_contexto      between 0 and 100),
  constraint documentos_pct_desarrollo_rango    check (pct_desarrollo    between 0 and 100),
  -- Un documento entregado siempre tiene fecha de entrega, y viceversa.
  constraint documentos_entrega_coherente check (
    (entregado_tic and fecha_entrega_tic is not null)
    or (not entregado_tic and fecha_entrega_tic is null)
  )
);

-- Evita registrar dos veces el mismo documento dentro de la misma empresa/proceso.
create unique index if not exists ux_documentos_nombre_vivos
  on documentos (linea_negocio_id, proceso_id, lower(btrim(nombre)))
  where deleted_at is null;

-- Índices para los filtros del dashboard.
create index if not exists ix_documentos_linea_tipo
  on documentos (linea_negocio_id, tipo)
  where deleted_at is null;

create index if not exists ix_documentos_proceso
  on documentos (proceso_id)
  where deleted_at is null;

create index if not exists ix_documentos_responsable
  on documentos (responsable)
  where deleted_at is null;

create index if not exists ix_documentos_estado_avance
  on documentos (estado, avance_global desc)
  where deleted_at is null;

-- Para el reporte de "entregas del mes".
create index if not exists ix_documentos_entrega_tic
  on documentos (fecha_entrega_tic desc)
  where deleted_at is null and entregado_tic;

drop trigger if exists tg_documentos_updated_at on documentos;
create trigger tg_documentos_updated_at
  before update on documentos
  for each row execute function documentos_touch_updated_at();

comment on table documentos is
  'Documentos / proyectos que desarrolla el equipo. avance_global y estado son columnas generadas: no se editan.';
comment on column documentos.avance_global is
  'Calculado: Plan*0.20 + Contexto*0.20 + Desarrollo*0.50 + TIC*0.10. Columna generada, de solo lectura.';
comment on column documentos.estado is
  'Calculado a partir de los porcentajes. Columna generada, de solo lectura.';


-- ------------------------------------------------------------------
--  Coherencia de la entrega a TIC: rellena o limpia la fecha sola,
--  para que el front nunca tenga que acordarse de hacerlo.
-- ------------------------------------------------------------------
create or replace function documentos_normalizar_entrega()
returns trigger
language plpgsql
as $$
begin
  if new.entregado_tic and new.fecha_entrega_tic is null then
    new.fecha_entrega_tic := current_date;
  elsif not new.entregado_tic then
    new.fecha_entrega_tic := null;
  end if;
  return new;
end;
$$;

drop trigger if exists tg_documentos_normalizar_entrega on documentos;
create trigger tg_documentos_normalizar_entrega
  before insert or update on documentos
  for each row execute function documentos_normalizar_entrega();


-- ============================================================================
--  6. HISTORIAL DE AVANCE
--     Snapshot inmutable en cada cambio de porcentaje o de entrega.
--     Redundancia intencional (nombres copiados): congela la foto del momento
--     aunque después se renombre la empresa, el proceso o el documento.
-- ============================================================================

create table if not exists documento_historial (
  id                   uuid primary key default gen_random_uuid(),
  documento_id         uuid           not null references documentos (id) on delete cascade,

  -- Snapshot
  documento_nombre     text           not null,
  linea_negocio_nombre text           not null,
  proceso_nombre       text           not null,
  tipo                 documento_tipo not null,
  responsable          responsable_enfoque,

  pct_planificacion    smallint       not null,
  pct_contexto         smallint       not null,
  pct_desarrollo       smallint       not null,
  entregado_tic        boolean        not null,
  avance_global        smallint       not null,
  estado               text           not null,

  -- Delta contra el registro anterior: permite graficar velocidad sin ventanas SQL.
  delta_avance         smallint       not null default 0,

  registrado_at        timestamptz    not null default now()
);

create index if not exists ix_documento_historial_documento
  on documento_historial (documento_id, registrado_at desc);

create index if not exists ix_documento_historial_fecha
  on documento_historial (registrado_at desc);

comment on table documento_historial is
  'Bitácora de avance. Una fila por cada cambio de porcentaje o de entrega a TIC. Alimenta los gráficos de velocidad del dashboard.';


-- SECURITY DEFINER a propósito: la RLS de `documento_historial` solo concede
-- SELECT a la aplicación, así que el trigger necesita los privilegios de su
-- propietario para poder insertar. Sin esto, la RLS bloquea al propio trigger y
-- hace fallar todo INSERT o UPDATE sobre `documentos`.
-- `set search_path` es obligatorio en funciones SECURITY DEFINER.
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
  -- En UPDATE, solo registrar si de verdad cambió el avance.
  if tg_op = 'UPDATE' then
    if new.pct_planificacion is not distinct from old.pct_planificacion
       and new.pct_contexto   is not distinct from old.pct_contexto
       and new.pct_desarrollo is not distinct from old.pct_desarrollo
       and new.entregado_tic  is not distinct from old.entregado_tic then
      return new;
    end if;
    v_anterior := old.avance_global;
  end if;

  select nombre into v_linea   from lineas_negocio where id = new.linea_negocio_id;
  select nombre into v_proceso from procesos       where id = new.proceso_id;

  insert into documento_historial (
    documento_id, documento_nombre, linea_negocio_nombre, proceso_nombre, tipo, responsable,
    pct_planificacion, pct_contexto, pct_desarrollo, entregado_tic,
    avance_global, estado, delta_avance
  ) values (
    new.id, new.nombre, coalesce(v_linea, '—'), coalesce(v_proceso, '—'), new.tipo, new.responsable,
    new.pct_planificacion, new.pct_contexto, new.pct_desarrollo, new.entregado_tic,
    new.avance_global, new.estado, new.avance_global - v_anterior
  );

  return new;
end;
$$;

-- AFTER: las columnas generadas (avance_global, estado) solo existen ya calculadas
-- después de la escritura, así que el trigger no puede ser BEFORE.
drop trigger if exists tg_documentos_historial on documentos;
create trigger tg_documentos_historial
  after insert or update on documentos
  for each row execute function documentos_registrar_historial();


-- ============================================================================
--  7. VISTAS DE LECTURA
-- ============================================================================

-- Modelo de lectura principal del front: documento + nombres de catálogo + métricas.
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
  d.responsable,
  d.avance_global,
  d.estado,
  d.fecha_inicio,
  (current_date - d.fecha_inicio)             as dias_en_curso,
  (current_date - d.updated_at::date)         as dias_sin_movimiento,
  -- Señal de riesgo para la jefa: lleva más de 21 días sin tocarse y no está entregado.
  (not d.entregado_tic and (current_date - d.updated_at::date) > 21) as estancado,
  d.created_at,
  d.updated_at
from documentos d
join lineas_negocio ln on ln.id = d.linea_negocio_id
join procesos       p  on p.id  = d.proceso_id
where d.deleted_at is null;

comment on view v_documentos_detalle is
  'Modelo de lectura principal: documentos vivos con nombres de catálogo y métricas derivadas (días en curso, días sin movimiento, estancado).';


-- Consolidado por empresa.
create or replace view v_resumen_linea_negocio as
select
  ln.id                                                        as linea_negocio_id,
  ln.nombre                                                    as linea_negocio,
  ln.color                                                     as linea_negocio_color,
  count(d.id)                                                  as total_documentos,
  count(d.id) filter (where d.entregado_tic)                   as entregados,
  count(d.id) filter (where not d.entregado_tic)               as en_curso,
  count(d.id) filter (where d.estado = 'Sin iniciar')          as sin_iniciar,
  coalesce(round(avg(d.avance_global)), 0)::smallint           as avance_promedio
from lineas_negocio ln
left join documentos d
       on d.linea_negocio_id = ln.id
      and d.deleted_at is null
where ln.deleted_at is null
group by ln.id, ln.nombre, ln.color, ln.orden
order by ln.orden, ln.nombre;


-- Consolidado por proceso / departamento.
create or replace view v_resumen_proceso as
select
  p.id                                               as proceso_id,
  p.nombre                                           as proceso,
  ln.nombre                                          as linea_negocio,
  count(d.id)                                        as total_documentos,
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


-- Consolidado por tipo de entregable.
create or replace view v_resumen_tipo as
select
  d.tipo,
  count(*)                                           as total_documentos,
  count(*) filter (where d.entregado_tic)            as entregados,
  coalesce(round(avg(d.avance_global)), 0)::smallint as avance_promedio
from documentos d
where d.deleted_at is null
group by d.tipo
order by count(*) desc;


-- ============================================================================
--  8. SEGURIDAD (RLS)
--     App interna de dos personas que escribe desde el navegador con la
--     publishable key, igual que el módulo de agenda ya existente.
--     Si más adelante se agrega login de Supabase, cambiar `anon` por
--     `authenticated` en las políticas de escritura.
-- ============================================================================

alter table lineas_negocio      enable row level security;
alter table procesos            enable row level security;
alter table documentos          enable row level security;
alter table documento_historial enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['lineas_negocio', 'procesos', 'documentos'] loop
    execute format('drop policy if exists %I on %I', t || '_acceso_app', t);
    execute format(
      'create policy %I on %I for all to anon, authenticated using (true) with check (true)',
      t || '_acceso_app', t
    );
  end loop;
end $$;

-- El historial lo escribe únicamente el trigger: la app solo puede leerlo.
drop policy if exists documento_historial_lectura on documento_historial;
create policy documento_historial_lectura
  on documento_historial for select to anon, authenticated using (true);


-- ============================================================================
--  9. SEMILLA MÍNIMA (opcional)
--     Procesos transversales de arranque. Las líneas de negocio se cargan
--     desde la aplicación porque dependen de las empresas reales del grupo.
-- ============================================================================

insert into procesos (nombre, linea_negocio_id)
select v.nombre, null
from (values
  ('Talento Humano'), ('Compras'), ('Finanzas'), ('Operaciones'),
  ('Comercial'), ('Calidad'), ('Logística'), ('TIC')
) as v(nombre)
where not exists (
  select 1 from procesos p
  where lower(btrim(p.nombre)) = lower(btrim(v.nombre))
    and p.linea_negocio_id is null
    and p.deleted_at is null
);
