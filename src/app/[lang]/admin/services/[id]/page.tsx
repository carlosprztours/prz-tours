import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSection } from "@/lib/admin/access";
import { issueServiceQr, listServices, progressService, revokeServiceQr, validateServiceQr, withdrawService } from "@/lib/admin/operations";
import { isLocale } from "@/lib/i18n";
import { OperationForm } from "../../OperationForm";

export default async function ServicePage({ params }: { params: Promise<{ lang: string; id: string }> }) {
  const { lang, id: rawId } = await params;
  const id = Number(rawId);
  if (!isLocale(lang) || !Number.isSafeInteger(id) || id < 1) notFound();
  const { user } = await requireSection(lang, "services");
  const [s] = await listServices(lang, id);
  if (!s) notFound();
  const es = lang === "es";
  const admin = user.role === "admin";
  const ongoing = !s.withdrawn_at && !s.finished_at && s.booking_status === "confirmed";
  const next = !s.arrived_at ? "arrive" : !s.started_at ? "start" : "finish";
  const stepLabel = { arrive: es ? "Registrar llegada" : "Mark arrival", start: es ? "Iniciar servicio" : "Start service", finish: es ? "Finalizar servicio" : "Finish service" };
  const details = [
    [es ? "Fecha y hora de recogida" : "Pickup date and time", [s.booked_for, s.pickup_time].filter(Boolean).join(" ")],
    [es ? "Recogida" : "Pickup", s.pickup],
    [es ? "Destino" : "Destination", s.destination],
    [es ? "Pasajeros" : "Passengers", s.guests],
    [es ? "Conductor" : "Driver", s.driver_name],
    [es ? "Asignado (UTC)" : "Assigned (UTC)", s.assigned_at],
    [es ? "Retirado (UTC)" : "Withdrawn (UTC)", s.withdrawn_at],
    [es ? "Llegada (UTC)" : "Arrival (UTC)", s.arrived_at],
    [es ? "Inicio (UTC)" : "Start (UTC)", s.started_at],
    [es ? "Fin (UTC)" : "Finish (UTC)", s.finished_at],
    [es ? "Validación QR (UTC)" : "QR validation (UTC)", s.validated_at],
  ];
  return (
    <section className="space-y-4 rounded-2xl bg-white p-5">
      <Link href={`/${lang}/admin/services`} className="underline">{es ? "Volver a servicios" : "Back to services"}</Link>
      <h1 className="text-2xl font-bold">{s.reference}</h1>
      <dl className="grid gap-3 sm:grid-cols-2">
        {details.map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd>{value || "—"}</dd></div>)}
        {s.phone && <div><dt className="font-semibold">{es ? "Teléfono de recogida" : "Pickup contact"}</dt><dd>{s.phone}</dd></div>}
      </dl>
      {admin && s.validated_by && <p>{es ? "Validado por usuario" : "Validated by user"} #{s.validated_by}</p>}
      {ongoing && (
        <div className="grid gap-4 border-t pt-4">
          <OperationForm action={progressService.bind(null, lang, id, next)} lang={lang} label={stepLabel[next]} />
          {!s.validated_at && <OperationForm action={validateServiceQrForAssignment.bind(null, lang, id)} lang={lang} label={es ? "Validar QR" : "Validate QR"} scan />}
          {admin && !s.validated_at && <>
            <OperationForm action={issueServiceQr.bind(null, lang, id)} lang={lang} label={es ? "Generar o renovar QR" : "Generate or replace QR"} />
            <OperationForm action={revokeServiceQr.bind(null, lang, id)} lang={lang} label={es ? "Revocar QR" : "Revoke QR"} />
          </>}
        </div>
      )}
      {admin && !s.withdrawn_at && !s.finished_at && <OperationForm action={withdrawService.bind(null, lang, id)} lang={lang} label={es ? "Retirar asignación" : "Withdraw assignment"} />}
    </section>
  );
}

async function validateServiceQrForAssignment(lang: string, id: number, form: FormData) {
  "use server";
  return validateServiceQr(lang, form, id);
}
