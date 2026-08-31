-- ============================================================================
--  CORRECCIÓN: el trigger de la bitácora no podía escribir
--
--  Síntoma: al guardar un documento, Supabase respondía
--    401 · 42501 · new row violates row-level security policy
--                  for table "documento_historial"
--
--  Causa: `documentos_registrar_historial()` se creó SECURITY INVOKER (el modo
--  por defecto en Postgres), así que su INSERT se ejecutaba con el rol `anon`.
--  Como `documento_historial` solo tiene política de SELECT, la RLS bloqueaba
--  al propio trigger y hacía fallar el INSERT en `documentos`.
--
--  Arreglo: SECURITY DEFINER, para que la función corra con los privilegios de
--  su propietario. La intención del diseño se mantiene intacta: la aplicación
--  sigue pudiendo solo LEER la bitácora, y únicamente el trigger la escribe.
--  Agregar una política de INSERT para `anon` habría resuelto el error, pero
--  dejaría que la app fabricara historial falso.
--
--  `set search_path` es obligatorio en toda función SECURITY DEFINER: sin él,
--  quien pueda manipular el search_path podría resolver los nombres de tabla
--  hacia objetos suyos y ejecutarlos con privilegios elevados.
-- ============================================================================

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

comment on function documentos_registrar_historial is
  'Escribe la bitácora de avance. SECURITY DEFINER: la RLS de documento_historial solo permite SELECT a la aplicación, así que el trigger necesita los privilegios de su propietario para insertar.';
