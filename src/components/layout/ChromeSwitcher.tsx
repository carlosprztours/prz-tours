/**
 * Decide qué chrome público se muestra según la ruta (componente de cliente).
 *
 * En `/admin/*` se ocultan el header, el footer y el botón de WhatsApp: el
 * panel tiene su propio header y el chrome público solo estorba (además el
 * menú hamburguesa no tiene sentido dentro del panel).
 *
 * El header/footer se renderizan en el servidor y llegan como `children`
 * ya resueltos; aquí solo se decide si se muestran.
 */
"use client";

import { usePathname } from "next/navigation";

export function ChromeSwitcher({
  header,
  footer,
  children,
}: {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.split("/").includes("admin");

  if (isAdmin) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      {header}
      <main id="contenido" className="flex-1">
        {children}
      </main>
      {footer}
    </>
  );
}
