/**
 * Encabezado de sección reutilizable: etiqueta pequeña + título + subtítulo.
 */
type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
};

export function SectionHeading({ eyebrow, title, subtitle, align = "center" }: Props) {
  const alignClass = align === "center" ? "text-center mx-auto" : "text-left";
  return (
    <div className={`max-w-2xl ${alignClass}`}>
      {eyebrow && (
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-coral-600">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 text-base leading-relaxed text-ink-500">{subtitle}</p>
      )}
    </div>
  );
}
