/**
 * Mini-logo del header con aparición ligada al scroll.
 *
 * En la home el header arranca SIN logo: la protagonista es la versión
 * grande del hero (`#hero-logo`). Al bajar, el mini-logo entra al header
 * (opacidad + escala, reversible al subir) mientras el logo del hero se
 * desplaza y se atenúa, dando la sensación de que el mismo logo se encoge
 * y se queda fijo arriba.
 *
 * En páginas sin hero (`#hero-logo` no existe) el mini-logo se muestra
 * siempre para no dejar el header sin marca.
 */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

type Props = {
  href: string;
  siteName: string;
};

export function HeaderMiniLogo({ href, siteName }: Props) {
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let raf = 0;

    const update = () => {
      raf = 0;
      const y = window.scrollY;
      const hero = document.getElementById("hero-logo");
      // En páginas sin hero, el logo siempre visible.
      const p = hero
        ? Math.min(1, Math.max(0, (y - 40) / 160))
        : 1;
      const el = ref.current;
      if (el) {
        el.style.opacity = String(p);
        el.style.transform = `scale(${(0.6 + 0.4 * p).toFixed(3)}) translateX(${((1 - p) * -12).toFixed(1)}px)`;
      }
      if (hero) {
        const hp = Math.min(1, Math.max(0, y / 300));
        hero.style.transform = `translateY(${(y * 0.12).toFixed(1)}px) scale(${(1 - hp * 0.12).toFixed(3)})`;
        hero.style.opacity = String((1 - hp * 0.55).toFixed(3));
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <Link
      ref={ref}
      href={href}
      aria-label={siteName}
      tabIndex={-1}
      className="shrink-0 opacity-0 motion-reduce:transform-none motion-reduce:opacity-100"
    >
      <Image
        src="/img/logo.png"
        alt=""
        width={160}
        height={175}
        className="h-12 w-auto object-contain md:h-14"
      />
    </Link>
  );
}
