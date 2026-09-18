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
   | `20260911000000_fecha_estimada_entrega.sql` | Agrega la fecha estimada de entrega y el semáforo de vencimientos en la vista. |
   | `20260911120000_progreso_mantenimientos.sql` | Da progreso y fechas propias a los mantenimientos, deriva su estado y acota los días en curso. |

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
| **Estatus %** | Se captura con tres barras (Planificación, Contexto, Desarrollo) + dos hitos: entrega a TIC y puesta en producción. En la tabla se muestra como **una sola barra** con el porcentaje debajo. |
| **Fecha de inicio** | Cuándo se empezó a trabajar de verdad. La escribe el usuario, no la base: la fecha en que se registra el documento casi nunca es la fecha en que se arranca. De aquí salen los **días en curso** (contra hoy, nunca negativos). |
| **Entrega estimada** | Para cuándo se comprometió el entregable. Opcional. La tabla muestra la fecha y, debajo, cuánto falta: rojo si ya se venció, naranja si vence hoy, ámbar si faltan 7 días o menos. |
| **Enfoque** | Ganchito azul (Juan) o rosado (Valentina). Uno solo a la vez; el mismo ganchito lo quita. |
| **Imprimir** | La casilla de la primera columna. Marca las filas que van al PDF. |

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
- La **barra de avance** lleva un solo color: azul mientras se construye, verde
  cuando ya está en producción (o, en un mantenimiento, cuando está cerrado).
  Antes era una rampa de cinco tramos, uno por fase; decía cinco cosas a la vez
  y ninguna se leía de un vistazo, que es para lo único que sirve una barra en
  una tabla de cuarenta filas. El desglose por fase no se perdió: sigue en el
  formulario, que es donde se edita, y en la ficha del reporte impreso.
- El **porcentaje no se pinta del color de la barra**. El verde legible sobre
  blanco a 12 px habría que oscurecerlo tanto que dejaría de ser el mismo verde;
  el color vive donde hay superficie —la barra— y el número se queda en el gris
  de siempre.
- **Enfoque**: azul para Juan, rosado para Valentina. Sin iniciales, por pedido
  expreso; lo que sostiene la distinción además del color es la posición fija
  (Juan siempre a la izquierda) y el nombre en el título y la etiqueta accesible.
- Todas las paletas se validaron con el verificador de daltonismo del skill
  `dataviz`, en modo claro y oscuro.

## Las fechas

Hay tres fechas y cada una responde algo distinto. La confusión entre las dos
primeras era el problema original: la base ponía como "inicio" el día en que se
registraba el documento, que casi nunca es el día en que alguien se puso a
trabajarlo.

| Fecha | Qué responde | Quién la pone |
|---|---|---|
| **Registro** (`created_at`) | Cuándo se dio de alta en la aplicación. | La base. No se muestra. |
| **Fecha de inicio** | Cuándo se empezó a trabajar de verdad. | **El usuario**, en el formulario. |
| **Entrega estimada** | Para cuándo se comprometió. | El usuario. Opcional. |

Los **días en curso** se cuentan desde la fecha de inicio real contra hoy, y
nunca bajan de cero: una fecha de inicio en el futuro ("esto lo arrancamos el
lunes") da 0 días, no días negativos.

En los mantenimientos son cuatro, porque ahí sí importa cuándo lo pidieron:
**solicitud** (cuándo lo pidieron) · **inicio** (cuándo empezamos, opcional) ·
**entrega estimada** · **cierre** (la pone la base al llegar al 100%).

### La fecha estimada de entrega

Es un campo **opcional**. Un documento sin fecha comprometida no está atrasado:
simplemente no entra en el semáforo.

La base no deja prometer una entrega para antes de haber arrancado
(`fecha_estimada_entrega >= fecha_inicio`), y el formulario valida lo mismo
antes de enviar para que el mensaje salga en español.

Los días que faltan los calcula **Postgres** (`dias_para_entrega` en las vistas),
no el navegador: así la tabla y el reporte impreso no pueden discrepar por la
zona horaria del equipo. Lo que ya está terminado nunca se pinta de rojo —una
fecha pasada sobre algo entregado es historia, no una alarma—, y eso vale igual
para un documento en producción que para un mantenimiento cerrado: es el mismo
semáforo, con un solo ayudante por entidad para llevarlas a la misma forma.

La columna se puede ordenar: el primer clic pone **lo más urgente arriba**, y lo
que no tiene fecha queda siempre al final, se ordene como se ordene.

## Reporte en PDF

Cada fila de la tabla tiene una casilla en la primera columna. Se marcan las que
interesan —o todas de una vez con la casilla del encabezado— y el botón
**Descargar PDF** abre el reporte en una pestaña nueva con el diálogo de
impresión ya levantado: ahí se elige *Guardar como PDF*.

Qué trae el reporte:

| Bloque | Contenido |
|---|---|
| **Resumen** | Total, avance promedio, cuántos en producción, entregados a TIC, en construcción y con la fecha vencida. |
| **Listado** | Una fila por documento: documento, línea de negocio, proceso, tipo, estatus, avance, entrega estimada y enfoque. Con los mismos colores de la aplicación. Se omite si solo se marcó un documento, porque repetiría su ficha. |
| **Detalle** | Una ficha por documento con todo lo demás: desglose de las cinco fases, enfoque, fecha de inicio, entrega estimada, entrega a TIC, puesta en producción, días en curso, días sin movimiento, mantenimientos y descripción. |

Decisiones detrás:

- **Se imprime lo que está a la vista.** La selección se cruza con los filtros:
  marcar un documento y luego filtrarlo fuera lo deja fuera del PDF, en vez de
  imprimir a escondidas filas que ya no se ven en pantalla.
- **Sin librería de PDF.** El motor de impresión del navegador ya sabe paginar,
  repetir la cabecera de la tabla en cada hoja y respetar los colores. Una
  librería tipo jsPDF obligaría a maquetar en coordenadas, pesaría más que el
  resto de la aplicación junta y no se parecería a la pantalla.
- **Una ventana nueva y no un `<iframe>` oculto**, porque el navegador toma el
  nombre propuesto para el PDF del título del documento que imprime. Si el
  bloqueador de ventanas emergentes la impide, el reporte se descarga como
  archivo `.html` con su propio botón de imprimir dentro.
- **Los colores salen de los mismos tokens** de `globals.css`, centralizados en
  `src/lib/reportes/marca.ts`, que es de donde los lee también el dashboard
  exportable. El papel no puede decir un color distinto del que se vio.

## Mantenimientos

Un cambio sobre algo que ya está en producción **no es un documento nuevo**: es
un registro colgado del documento existente, en `documento_mantenimientos`.

Se llega desde la llave inglesa de cada fila. El botón lleva un contador ámbar
con **lo que sigue sin cerrar** — no con el total, que a los pocos meses sería
puro ruido.

Cada mantenimiento tiene título, clase, responsable, **su propio avance** y sus
propias fechas:

| Clase | Cuándo |
|---|---|
| **Correctivo** | Algo se rompió. |
| **Mejora** | Piden funcionalidad nueva sobre lo ya entregado. |
| **Actualización** | Mantenimiento técnico, sin cambio funcional visible. |

### El estado ya no se elige a mano

Antes había tres botones (Abierto · En curso · Cerrado) y nada impedía dejar un
"Cerrado" al 20%. Ahora el estado **se deriva**, igual que el de un documento:

| Situación | Estado |
|---|---|
| Progreso 100% | **Cerrado** (y la fecha de cierre la pone la base) |
| Progreso > 0, **o** ya tiene fecha de inicio | **En curso** |
| Resto | **Abierto** |

Que tener fecha de inicio baste para pasar a "En curso" es deliberado: si
alguien anotó el día en que se puso con ello, ya está en curso aunque todavía
marque 0%.

Lo hace un trigger `BEFORE` y no una columna generada porque `estado` ya existía
como columna normal, con su enum, su índice y su restricción de coherencia con
`fecha_cierre`; convertirla en generada obligaría a tirar la columna y todo lo
que cuelga de ella para no ganar nada. El efecto para la aplicación es el mismo:
mande lo que mande, la base lo recalcula. `src/lib/documentos.ts` tiene una copia
de la regla (`derivarEstadoMantenimiento`) solo para que el badge cambie en el
mismo clic que mueve el progreso, sin esperar a la recarga.

### La tarjeta se edita en vivo

Cada mantenimiento se edita en su propia tarjeta, sin botón de guardar: el
progreso y las fechas se mandan solos, igual que los ganchitos de enfoque de la
tabla. Arrastrar el slider solo mueve la copia local —se guarda al soltar, no en
cada píxel— y las fechas se guardan al salir del campo, porque los navegadores
emiten cambios intermedios mientras se teclea el año (0002, 0020, 0202…) y
mandarlos a la base sería escribir basura.

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
