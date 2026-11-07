"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSuperAdminEmail, requireStaffRoles } from "./access";
import { changeBookingReporting, type ReportingAction } from "@/lib/db/booking-reporting";

export async function updateBookingReporting(rawLocale: string, id: number, action: ReportingAction, data: FormData) {
  const { locale, session } = await requireStaffRoles(rawLocale, "admin", "editor");
  if (!Number.isSafeInteger(id) || id <= 0 ||
      !["archive", "restore", "exclude", "include"].includes(action)) throw new Error("invalid");
  if ((action === "exclude" || action === "include") &&
      (session.user.role !== "admin" || !isSuperAdminEmail(session.user.email))) throw new Error("forbidden");

  const reason = data.get("reason");
  const path = `/${locale}/admin/bookings/${id}`;
  if (typeof reason !== "string" || !reason.trim() || reason.trim().length > 240) redirect(path + "?reporting=invalid");
  const changed = await changeBookingReporting(id, action, reason.trim(), session.user);
  revalidatePath(`/${locale}/admin/bookings`);
  revalidatePath(`/${locale}/admin/finance`);
  revalidatePath(`/${locale}/admin`);
  redirect(path + (changed ? "?reporting=saved" : "?reporting=unchanged"));
}
