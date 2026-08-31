# Módulo de Documentos — branch `Act`

Reemplaza la agenda diaria por un seguimiento de **documentos / proyectos**:
qué se está construyendo, para qué empresa y proceso, en qué punto va y quién
lo está trabajando.

## Puesta en marcha

1. **Aplicar el esquema.** En el SQL Editor de Supabase, ejecuta los archivos de
   `supabase/migrations/` **en orden de nombre**:

   | Archivo | Qué hace |
   |---|---|
   | `20260831000000_documentos.sql` | Esquema base. |
   | `20260831010000_fix_historial_rls.sql` | Corrige el trigger de la bitácora, que sin esto se bloquea a sí mismo por RLS y hace fallar todo guardado con un 401. |
   | `20260831020000_hito_produccion.sql` | Agrega el hito "En producción" y recalcula la ponderación. |
   | `20260831030000_mantenimientos.sql` | Agrega la tabla hija de mantenimientos y los contadores en la vista. |

   Son idempotentes: se pueden volver a ejecutar sin romper nada.
   *(Con el MCP de Supabase conectado también se pueden aplicar desde Claude
   Code — ver más abajo.)*
2. **Variables de entorno.** El proyecto necesita `.env.local` con las claves
   que están en `env.download`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=…
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=…
   ```
3. `npm run dev`.

No hay que crear las empresas ni los procesos por adelantado: se escriben en el
formulario y se crean desde ahí.

## Qué se agregó y qué NO se tocó

| | |
|---|---|
| **Tablas nuevas** | `lineas_negocio`, `procesos`, `documentos`, `documento_historial` |
| **Vistas nuevas** | `v_documentos_detalle`, `v_resumen_linea_negocio`, `v_resumen_proceso`, `v_resumen_tipo` |
| **Sin tocar** | `activities` y `projects` siguen intactas, con todos sus datos |
| **Código de agenda** | Sigue en `src/components/agenda/` y `src/components/projects/`, ya sin uso: `src/app/page.tsx` no lo importa. Volver a colgarlo es una línea |

Detalle completo del esquema: [`docs/database/documentos-dictionary.md`](database/documentos-dictionary.md).

## Las columnas

| Columna | Qué es |
|---|---|
| **Línea de Negocio** | La empresa del grupo. Catálogo editable desde el formulario. |
| **Proceso** | Departamento o proceso. Los que se crean desde el formulario nacen *transversales* (sirven para todas las empresas), para no duplicar "Compras" una vez por empresa. |
| **Tipo** | Lista desplegable: App · Dashboard · Forms · Excel · Script. |
| **Nombre del Documento** | Cómo se llama el entregable. |
| **Estatus %** | Tres barras (Planificación, Contexto, Desarrollo) + dos hitos: entrega a TIC y puesta en producción. |
| **Enfoque** | Ganchito azul (Juan) o rosado (Valentina). Uno solo a la vez; el mismo ganchito lo quita. |

## Cómo funciona el "Estatus %"

En vez de un porcentaje inventado a ojo, se capturan tres fases y la entrega, y
el global sale de una fórmula fija:

```
Global = Planificación×0.20 + Contexto×0.20 + Desarrollo×0.40
       + (Entregada a TIC ? 100 : 0)×0.10
       + (En producción   ? 100 : 0)×0.10
```

Los dos hitos finales valen 10% cada uno, así que **nada llega a 100% hasta que
está corriendo en producción**: entregarlo a TIC lo deja en 90%. Terminar de
construir algo que todavía nadie usa no es haber terminado, y esa diferencia es
justo la que le interesa ver a la jefa.

La puesta en producción está encadenada a la entrega: no se puede marcar sin
haber entregado antes, y desmarcar la entrega arrastra la producción. Lo
garantiza una restricción en la base, no el formulario.

El porcentaje global y el estado los calcula **Postgres**, como columnas
generadas: no son campos editables, así que no pueden quedar desfasados de las
tres barras. `src/lib/documentos.ts` tiene una copia de las dos fórmulas, usada
solo para previsualizar el resultado en el formulario antes de guardar.

Estados derivados: Sin iniciar → En planificación → En contexto → En desarrollo
→ Lista para TIC → Entregada a TIC → En producción.

## El dashboard

Un único juego de filtros (empresa, proceso, tipo, estado, enfoque, búsqueda) se
aplica a la tabla **y** al dashboard: filtrar en una vista y saltar a la otra
conserva el recorte.

Son tres visuales:

| Visual | Qué muestra |
|---|---|
| **Estatus general de los proyectos** | Una sola barra con toda la cartera repartida en cinco tramos (Sin iniciar · Definiendo · Construyendo · Entregada a TIC · En producción), más el desglose de los siete estados con su conteo y su porcentaje. |
| **Distribución de actividades por tipo** | Cuántos entregables de cada tipo, con su porcentaje sobre el total. En orden fijo del catálogo, no por tamaño, para que el color y la posición de cada tipo no bailen al filtrar. |
| **Progreso por área** | Avance promedio de cada área, de mayor a menor. Conmutable entre **por proceso** y **por empresa** desde el propio gráfico. |

### Decisiones de color

- Las **fases y los tramos de estado** llevan una rampa de un solo tono, de claro
  a oscuro: son etapas ordenadas de un mismo proceso, no identidades distintas.
  Los siete estados se agrupan en cinco tramos porque cinco es el máximo que la
  rampa admite manteniendo pasos distinguibles.
- Los **tipos** llevan colores categóricos en orden fijo; filtrar no reasigna
  colores, para que un color signifique siempre lo mismo.
- El **progreso por área** es magnitud de una sola medida, así que va en un solo
  tono: colores distintos por barra sugerirían categorías que no existen.
- **Enfoque**: azul para Juan, rosado para Valentina. Sin iniciales, por pedido
  expreso; lo que sostiene la distinción además del color es la posición fija
  (Juan siempre a la izquierda) y el nombre en el título y la etiqueta accesible.
- Todas las paletas se validaron con el verificador de daltonismo del skill
  `dataviz`, en modo claro y oscuro.

## Mantenimientos

Un cambio sobre algo que ya está en producción **no es un documento nuevo**: es
un registro colgado del documento existente, en `documento_mantenimientos`.

Se llega desde la llave inglesa de cada fila. El botón lleva un contador ámbar
con **lo que sigue sin cerrar** — no con el total, que a los pocos meses sería
puro ruido.

Cada mantenimiento tiene título, clase, estado y responsable:

| Clase | Cuándo |
|---|---|
| **Correctivo** | Algo se rompió. |
| **Mejora** | Piden funcionalidad nueva sobre lo ya entregado. |
| **Actualización** | Mantenimiento técnico, sin cambio funcional visible. |

Estados: Abierto → En curso → Cerrado. La fecha de cierre la pone un trigger.

Por qué así y no de otra forma:

- La lista de la jefa conserva **una fila por app**, que era el objetivo de toda
  la reestructura. Con documentos repetidos (`Portal v2`, `Portal v3`) se
  llenaría de ruido y los conteos por tipo se inflarían.
- Un entregable en producción **no retrocede de 100%** cada vez que le piden un
  ajuste. Los mantenimientos no tocan el avance del padre.
- Aparece una métrica que hoy es invisible: **cuánto se va en sostener lo ya
  entregado frente a construir cosas nuevas**. La vista
  `v_resumen_mantenimientos` ya la calcula, incluido el promedio de días hasta
  el cierre, aunque todavía ningún dashboard la pinte.

> Si un "mantenimiento" resulta ser en realidad un reconstruir completo, con su
> propia planificación y desarrollo, eso sí merece ser un documento nuevo.

## Bitácora automática

Un trigger escribe en `documento_historial` cada vez que cambia un porcentaje o
uno de los dos hitos, guardando una foto de los nombres del momento. Ningún
dashboard actual la consume todavía, pero se sigue llenando: el día que quieras
gráficos de velocidad o de entregas por mes, el histórico ya estará ahí en vez
de empezar desde cero.

La aplicación solo puede **leer** esa tabla; las escrituras las hace el trigger,
declarado `SECURITY DEFINER` justamente para eso.

## MCP de Supabase

`.mcp.json` ya trae el servidor configurado. Para usarlo:

1. Reiniciar Claude Code (los servidores MCP se cargan al arrancar).
2. Ejecutar `/mcp` y autenticar con la cuenta de Supabase.

A partir de ahí se puede aplicar la migración y consultar la base desde el chat.

## Pendiente conocido

`npm run build` falla en este repositorio con
`Can't resolve '@vercel/turbopack-next/internal/font/google/font'`, en las
fuentes de Google de `src/app/layout.tsx`. **Es previo a este trabajo** y no
tiene relación con el módulo: con las fuentes puenteadas, el build de todo lo
nuevo compila y prerenderiza sin errores.
