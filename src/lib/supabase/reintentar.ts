/**
 * Reintentos para las llamadas a la base.
 *
 * El proyecto de Supabase devuelve de vez en cuando un 502 o un 504 de la
 * pasarela, o se queda colgado diez o quince segundos y acaba cortándose. Son
 * cortes de un segundo: al repetir la petición pasa a la primera. Pero una sola
 * de esas respuestas bastaba para que el usuario viera "No se pudo guardar la
 * actividad" con la base perfectamente sana y su texto perdido.
 *
 * La librería ya reintenta por su cuenta, pero solo lo que no puede salir mal:
 * GET y HEAD, y solo ante un 503 o un 520 (ver `RETRYABLE_METHODS` y
 * `RETRYABLE_STATUS_CODES` en postgrest-js). Un POST o un PATCH no los repite
 * nunca, y con razón: repetir a ciegas un insert que sí llegó a aplicarse crea
 * una fila duplicada. Así que los reintentos de las escrituras se hacen aquí,
 * donde sí se sabe que la escritura se ha construido para poder repetirse —ver
 * `createActivity`, que trae su propio id.
 */

import type { PostgrestError } from "@supabase/supabase-js";

/** La forma que tiene cualquier respuesta de postgrest-js. */
type Respuesta<T> = {
  data: T | null;
  error: PostgrestError | null;
  status: number;
};

/** Lo que se espera antes de cada reintento. Tres intentos en total. */
const ESPERAS_MS = [500, 1500];

/**
 * ¿Falló sin llegar a decidirse?
 *
 * El `status: 0` lo pone postgrest-js cuando revienta el propio fetch —sin red,
 * o la petición cortada a medias—. Del resto solo interesan los errores de la
 * pasarela y la espera de un rato: un 4xx es la base diciendo que no, y
 * repetirlo da exactamente el mismo no.
 */
function esTransitorio(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

function dormir(ms: number): Promise<void> {
  return new Promise((listo) => setTimeout(listo, ms));
}

/**
 * Ejecuta la consulta y la repite mientras el fallo sea de los que se arreglan
 * solos. Devuelve los datos o lanza el error, igual que antes.
 *
 * La consulta se pasa como función, no como promesa ya empezada: una consulta
 * de postgrest-js se dispara al await-earla y solo se puede consumir una vez,
 * así que cada intento necesita construir la suya.
 */
export async function conReintentos<T>(
  consulta: () => PromiseLike<Respuesta<T>>
): Promise<T> {
  for (let intento = 0; ; intento++) {
    const { data, error, status } = await consulta();

    if (!error) return data as T;
    if (intento === ESPERAS_MS.length || !esTransitorio(status)) throw error;

    await dormir(ESPERAS_MS[intento]);
  }
}
