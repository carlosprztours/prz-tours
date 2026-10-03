/**
 * Script JSON-LD para datos estructurados (SEO).
 *
 * Next recomienda `application/ld+json` inline; este componente lo centraliza
 * para no repetir el boilerplate en cada página.
 */
type Props = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: Props) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify es seguro aquí: los datos vienen de nuestra BD.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
