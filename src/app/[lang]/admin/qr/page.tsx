import { notFound } from "next/navigation";
import { requireSection } from "@/lib/admin/access";
import { validateServiceQr } from "@/lib/admin/operations";
import { isLocale } from "@/lib/i18n";
import { OperationForm } from "../OperationForm";

export default async function QrPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  await requireSection(lang, "qr");
  const es = lang === "es";
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5">
      <h1 className="text-2xl font-bold">{es ? "Validación QR" : "QR validation"}</h1>
      <p>{es ? "Con tu sesión abierta, escanea el QR con la cámara del móvil y abre el enlace, o pega el código aquí." : "While signed in, scan the QR with your phone camera and open its link, or paste the code here."}</p>
      <OperationForm action={validateServiceQr.bind(null, lang)} lang={lang} label={es ? "Validar" : "Validate"} scan />
    </section>
  );
}
