/**
 * Ficha editable de cada slide del hero (servidor: el guardar va inline).
 */
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteHeroSlide, updateHeroSlide } from "@/lib/admin/content";
import type { HeroSlide } from "@/types";

export function HeroSlideCard({ slide, locale, es }: { slide: HeroSlide; locale: string; es: boolean }) {
  const input =
    "h-9 w-full rounded-xl border border-sand-200 bg-white px-3 text-sm text-ink-900 outline-none focus:border-ocean-500";
  return (
    <div className="grid gap-2 rounded-2xl border border-sand-200 bg-white p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={slide.image_url} alt={slide.alt || "slide"} className="h-36 w-full rounded-xl object-cover" loading="lazy" />
      <form
        action={async (formData: FormData) => {
          "use server";
          await updateHeroSlide(locale, undefined, formData);
        }}
        className="grid gap-2"
      >
        <input type="hidden" name="id" value={slide.id} />
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          URL
          <input name="url" defaultValue={slide.image_url} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Texto alternativo" : "Alt text"}
          <input name="alt" defaultValue={slide.alt} className={input} />
        </label>
        <label className="grid gap-1 text-xs font-bold text-ink-500">
          {es ? "Leyenda" : "Caption"}
          <input name="caption" defaultValue={slide.caption} className={input} />
        </label>
        <div className="flex items-center gap-3">
          <label className="grid flex-1 gap-1 text-xs font-bold text-ink-500">
            {es ? "Orden" : "Order"}
            <input name="sort_order" type="number" defaultValue={slide.sort_order} className={input} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2 text-xs font-bold text-ink-900">
            <input type="checkbox" name="is_published" defaultChecked={slide.is_published === 1} className="h-4 w-4" />
            {es ? "Publicado" : "Published"}
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            className="h-9 flex-1 rounded-full bg-ocean-700 px-4 text-xs font-bold text-white transition hover:bg-ocean-800"
          >
            {es ? "Guardar" : "Save"}
          </button>
        </div>
      </form>
      <DeleteButton
        locale={locale}
        id={slide.id}
        action={deleteHeroSlide}
        confirmMessage={es ? "¿Eliminar este slide?" : "Delete this slide?"}
        label={es ? "Eliminar slide" : "Delete slide"}
      />
    </div>
  );
}
