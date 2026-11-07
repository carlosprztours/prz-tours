import { LOYALTY_DISCOUNT, TRIPS_PER_COUPON } from "@/lib/db/loyalty";
import type { Locale } from "@/types";

export function LoyaltyPassport({ locale, trips, hasActiveCoupon, hasUsedReward }: {
  locale: Locale;
  trips: number;
  hasActiveCoupon: boolean;
  hasUsedReward: boolean;
}) {
  const es = locale === "es";
  const stamps = Math.min(trips, TRIPS_PER_COUPON);
  const progress = es
    ? `${stamps} de ${TRIPS_PER_COUPON} viajes completados`
    : `${stamps} of ${TRIPS_PER_COUPON} trips completed`;
  const status = hasActiveCoupon
    ? es ? "Tienes un cupón activo." : "You have an active coupon."
    : hasUsedReward
      ? es ? "Tu recompensa anterior ya se usó." : "Your previous reward has been used."
      : es ? "Aún no tienes un cupón activo." : "You do not have an active coupon yet.";

  return (
    <section aria-labelledby="loyalty-passport-title" className="rounded-2xl border border-ocean-200 bg-ocean-50 p-5">
      <h2 id="loyalty-passport-title" className="font-display text-xl font-extrabold text-ink-900">
        {es ? "Pasaporte Perez Tours" : "Perez Tours Passport"}
      </h2>
      <p className="mt-1 text-sm text-ink-700">
        {es
          ? `Gana un ${LOYALTY_DISCOUNT} % de descuento cada ${TRIPS_PER_COUPON} viajes completados si no tienes otro cupón activo.`
          : `Earn ${LOYALTY_DISCOUNT}% off every ${TRIPS_PER_COUPON} completed trips if you do not have another active coupon.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-3" aria-hidden="true">
        {Array.from({ length: TRIPS_PER_COUPON }, (_, index) => (
          <span key={index} className={`grid size-12 place-items-center rounded-full border-2 text-lg font-bold ${
            index < stamps ? "border-ocean-800 bg-ocean-800 text-white" : "border-dashed border-ocean-700 text-ocean-800"
          }`}>
            {index < stamps ? "✓" : index + 1}
          </span>
        ))}
      </div>
      <p className="mt-2 text-sm font-bold text-ink-900">{progress}</p>
      <p className="mt-3 text-sm text-ink-700">{status}</p>
      <a href="#my-coupons" className="mt-2 inline-flex min-h-11 items-center font-semibold text-ocean-800 underline focus-visible:outline-2 focus-visible:outline-offset-2">
        {es ? "Ver mis cupones" : "View my coupons"}
      </a>
    </section>
  );
}
