/**
 * `next/image` que sabe cuándo no debe optimizar.
 *
 * Para todo lo que vive en el proyecto (`/img/…`) se comporta exactamente
 * como el `Image` de Next.
 *
 * Para las fotos subidas por el panel, que están en ImageKit, deja la URL
 * intacta y añade la transformación de tamaño (`tr:w-…,q-…,f-auto`) para que
 * sea el propio ImageKit el que redimensione y sirva en WebP o AVIF.
 *
 * ¿Por qué? ImageKit rechaza (`403 Blocked`) las peticiones que salen de un
 * Worker de Cloudflare, que es justo lo que hace el optimizador de Next al
 * ejecutarse en el Worker. Y aunque las aceptara, sería peor: ImageKit ya
 * optimiza, así que pasar por Next sería descargar la foto dos veces.
 */
import Image, { type ImageProps } from "next/image";

import { imageKitTransform, isImageKitUrl, widthFromSizes } from "@/lib/media/imagekit-url";

/** El `src` como texto, si lo es. Los imports estáticos no se tocan. */
function asUrl(src: ImageProps["src"]): string | null {
  if (typeof src === "string") return src;
  // `StaticImport` es un objeto con la ruta; los imports compilados de Next
  // llegan como `{ src: string }`.
  const posible = src as { src?: unknown };
  return typeof posible?.src === "string" ? posible.src : null;
}

export function SafeImage(props: ImageProps) {
  // `alt` y `src` se sacan del resto a propósito: el aviso de accesibilidad
  // no ve las props que llegan por `...rest` y se quejaría de un <img> sin
  // texto alternativo aunque sí lo lleve.
  const { src, alt, sizes, quality, ...rest } = props;
  const url = asUrl(src);

  if (!url || !isImageKitUrl(url)) {
    return <Image src={src} alt={alt} sizes={sizes} quality={quality} {...rest} />;
  }

  // `fill` no trae ancho propio: lo deducimos del `sizes`, que es donde
  // siempre está escrito el tamaño real que se va a pintar.
  const ancho = widthFromSizes(sizes);

  return (
    <Image
      {...rest}
      src={imageKitTransform(url, { width: ancho })}
      alt={alt}
      sizes={sizes}
      unoptimized
    />
  );
}