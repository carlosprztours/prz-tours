/**
 * Página legal genérica (aviso legal, privacidad, cookies, términos).
 *
 * Recibe el contenido ya planteado por idioma para no duplicar el layout de
 * tres páginas casi idénticas. **No es asesoramiento jurídico:** el texto es
 * una base razonable para una agencia de viajes dominicana, pero conviene que
 * lo revise alguien que conozca la normativa (RGPD, Ley 172-13).
 */

type Parrafo = {
  subtitulo?: string;
  texto: string;
};

type Props = {
  titulo: string;
  actualizado: string;
  parrafos: Parrafo[];
};

export function LegalPage({ titulo, actualizado, parrafos }: Props) {
  return (
    <div className="bg-sand-50/50 py-14 sm:py-18">
      <div className="container-site max-w-3xl">
        <h1 className="font-display text-3xl font-extrabold text-ink-900">{titulo}</h1>
        <p className="mt-2 text-sm text-ink-500">{actualizado}</p>
        <div className="mt-8 grid gap-6">
          {parrafos.map((p, i) => (
            <section key={i}>
              {p.subtitulo && (
                <h2 className="font-display text-xl font-bold text-ink-900">{p.subtitulo}</h2>
              )}
              <p className="mt-2 whitespace-pre-line leading-relaxed text-ink-700">{p.texto}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
