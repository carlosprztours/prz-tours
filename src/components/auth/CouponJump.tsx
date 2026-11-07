"use client";

export function CouponJump({ label }: { label: string }) {
  return (
    <a
      href="#my-coupons"
      className="mt-2 inline-flex min-h-11 items-center font-semibold text-ocean-800 underline focus-visible:outline-2 focus-visible:outline-offset-2"
      onClick={() => {
        const section = document.getElementById("my-coupons")?.closest("details");
        if (section) section.open = true;
      }}
    >
      {label}
    </a>
  );
}
