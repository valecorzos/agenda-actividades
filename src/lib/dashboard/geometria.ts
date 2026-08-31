/**
 * Geometría compartida entre la vista de React y el HTML exportado.
 *
 * Es aritmética pura, sin DOM: los dos renderizadores calculan las mismas
 * coordenadas y el archivo descargado no puede salir con otra forma que la
 * pantalla.
 */

// ------------------------------------------------------------------ Anillo

/**
 * El anillo se dibuja con `stroke-dasharray` sobre un solo círculo, no con
 * arcos `path`. Es la forma más corta de conseguir dos cosas que con arcos
 * cuestan casos especiales: un segmento del 100% (un `path` de arco no puede
 * cerrar el círculo completo) y el hueco de 2px entre segmentos, que aquí sale
 * de restar 2 unidades a cada trazo.
 */
export const ANILLO = {
  lado: 220,
  radio: 82,
  grosor: 34,
  /** Hueco de superficie entre segmentos, en unidades del viewBox. */
  hueco: 2,
};

/**
 * Tipografía del anillo, en unidades del viewBox.
 *
 * Va aquí y no suelta en cada renderizador porque el SVG escala entero: al
 * agrandar el anillo, un tamaño escrito a ojo crece con él y el número del
 * centro se desborda. Estos valores están calculados para que, al ancho al que
 * se dibuja hoy la tarjeta, la cifra guía ronde los 52 px reales.
 */
export const TIPOGRAFIA_ANILLO = {
  cifraCentral: 32,
  etiquetaCentral: 9,
  cifraSegmento: 9.5,
};

export const CIRCUNFERENCIA_ANILLO = 2 * Math.PI * ANILLO.radio;

export type TrazoAnillo = {
  dash: string;
  offset: number;
  /** Centro del arco, donde va escrita su cifra. */
  etiqueta: { x: number; y: number };
  /** Un arco muy fino no tiene sitio para la cifra encima. */
  cabeEtiqueta: boolean;
};

/** Por debajo de este porcentaje, la cifra no cabe sobre el arco. */
const MINIMO_PARA_ETIQUETA = 7;

/**
 * Convierte una lista de cantidades en los trazos del anillo. Devuelve un
 * trazo por cantidad, en el mismo orden, para que el color de cada segmento
 * siga siendo el de su tramo.
 */
export function trazosAnillo(cantidades: number[]): TrazoAnillo[] {
  const total = cantidades.reduce((s, v) => s + v, 0);
  const C = CIRCUNFERENCIA_ANILLO;
  const centro = ANILLO.lado / 2;
  let acumulado = 0;

  return cantidades.map((cantidad) => {
    const fraccion = total === 0 ? 0 : cantidad / total;
    const largoCompleto = fraccion * C;
    // Un segmento diminuto no puede quedar en negativo tras restarle el hueco,
    // ni desaparecer del todo: si existe, tiene que verse.
    const largo =
      largoCompleto === 0 ? 0 : Math.max(largoCompleto - ANILLO.hueco, 0.6);

    // El anillo arranca arriba y gira en sentido horario, así que el ángulo
    // del centro del arco se mide desde las 12 en punto.
    const anguloMedio =
      ((acumulado + largoCompleto / 2) / C) * 2 * Math.PI - Math.PI / 2;

    const trazo: TrazoAnillo = {
      dash: `${largo} ${C - largo}`,
      offset: -acumulado,
      etiqueta: {
        x: centro + Math.cos(anguloMedio) * ANILLO.radio,
        y: centro + Math.sin(anguloMedio) * ANILLO.radio,
      },
      cabeEtiqueta: fraccion * 100 >= MINIMO_PARA_ETIQUETA,
    };

    acumulado += largoCompleto;
    return trazo;
  });
}

// -------------------------------------------------------------- Columnas

/** Alto del área de trazado de las columnas, en píxeles CSS. */
export const ALTO_COLUMNAS = 200;

/** Grosor máximo de una columna. Nunca rellena su ranura: el resto es aire. */
export const GROSOR_COLUMNA = 44;

// ---------------------------------------------------------- Barras de avance

/**
 * A partir de este porcentaje la cifra cabe dentro de la barra. Por debajo se
 * escribe fuera, junto a la punta: nunca recortada ni encajada a la fuerza.
 */
export const MINIMO_ETIQUETA_DENTRO = 18;
