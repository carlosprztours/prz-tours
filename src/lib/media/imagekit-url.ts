/**
 * Utilidades para las imágenes que viven en ImageKit.
 *
 * ImageKit ya es un optimizador y un CDN, así que sus URLs **no deben pasar**
 * por el optimizador de `next/image`: sería descargar dos veces la misma foto y
 * además ahora mismo no funciona, porque ImageKit rechaza las peticiones que
 * salen de un Worker de Cloudflare (`403 Blocked`). El navegador sí las carga
 * bien, porque quien las pide es el navegador, no el Worker.
 *
 * Para eso está `SafeImage`: si la URL es de ImageKit, la deja pasar tal cual
 * (añadiendo la transformación de tamaño que toque), y si no, se comporta
 * como el `Image` de siempre.
 */

/** Dominios de ImageKit. Se comparan en minúsculas. */
const IMAGEKIT_HOSTS = ["ik.imagekit.io", "imagekit.io"];

/** Ancho de referencia para convertir los `vw` de un `sizes` a píxeles. */
const VIEWPORT_FOR_VW = 1280;

/** ¿Esta URL la sirve ImageKit? */
export function isImageKitUrl(src: string | undefined | null): boolean {
  if (!src || !src.startsWith("http")) return false;
  try {
    const host = new URL(src).hostname.toLowerCase();
    return IMAGEKIT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

/**
 * Mayor ancho en píxeles que puede pedir el navegador según un `sizes`.
 *
 * Ejemplo: `"(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"` con
 * `fill` → 25 % de 1280 = 320 px. Nos quedamos con el mayor de todos, que es
 * el que hace falta para no servir una imagen más pequeña de lo debido.
 */
export function widthFromSizes(sizes: string | undefined): number {
  if (!sizes) return VIEWPORT_FOR_VW;
  let max = 0;
  for (const parte of sizes.split(",")) {
    const px = parte.match(/(\d+(?:\.\d+)?)px/);
    if (px) {
      max = Math.max(max, Number(px[1]));
      continue;
    }
    const vw = parte.match(/(\d+(?:\.\d+)?)vw/);
    if (vw) {
      max = Math.max(max, (Number(vw[1]) / 100) * VIEWPORT_FOR_VW);
    }
  }
  return Math.ceil(max) || VIEWPORT_FOR_VW;
}

/**
 * Añade la transformación de ImageKit a una URL.
 *
 * ImageKit mete la transformación justo después del identificador del
 * endpoint:
 *   https://ik.imagekit.io/PrzCV/prz/gallery/a.png
 *   https://ik.imagekit.io/PrzCV/tr:w-800,q-75,f-auto/prz/gallery/a.png
 *
 * `f-auto` deja que ImageKit sirva WebP o AVIF según lo que acepte el
 * navegador, que es justo lo que se busca.
 */
export function imageKitTransform(
  src: string,
  options: { width?: number; quality?: number } = {},
): string {
  const { width, quality = 75 } = options;

  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return src;
  }

  const partes = url.pathname.split("/").filter(Boolean);
  if (partes.length === 0) return src;

  // El identificador del endpoint es el primer segmento; si el endpoint tiene
  // subcarpeta, se conserva tal cual y la transformación va detrás.
  const idEndpoint = partes[0];
  const resto = partes.slice(1);

  const transform = [`q-${quality}`, "f-auto"];
  if (width) transform.unshift(`w-${Math.round(width)}`);

  url.pathname = [idEndpoint, `tr:${transform.join(",")}`, ...resto].join("/");
  return url.toString();
}