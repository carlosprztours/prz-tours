/**
 * Login del staff. Si ya hay sesión, el proxy redirige al panel.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getDictionary, isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { LoginForm } from "./LoginForm";

type Props = {
  params: Promise<{ lang: string }>;
  searchParams: Promise<{ next?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: lang === "es" ? "Acceso" : "Sign in",
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage({ params, searchParams }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;
  const { next } = await searchParams;
  await getDictionary(locale);

  const labels =
    locale === "es"
      ? {
          title: "Acceso",
          subtitle: "Entra a tu cuenta o al panel del personal.",
          email: "Correo electrónico",
          password: "Contraseña",
          submit: "Entrar",
          submitting: "Verificando…",
          invalid: "Credenciales incorrectas.",
          required: "Completa todos los campos.",
          server: "Error del servidor. Inténtalo de nuevo.",
          noAccount: "¿No tienes cuenta?",
          signUp: "Crea una gratis",
        }
      : {
          title: "Sign in",
          subtitle: "Access your account or the staff panel.",
          email: "Email address",
          password: "Password",
          submit: "Sign in",
          submitting: "Checking…",
          invalid: "Incorrect credentials.",
          required: "Please complete all fields.",
          server: "Server error. Please try again.",
          noAccount: "No account yet?",
          signUp: "Create one free",
        };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-sand-50/50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-sand-200 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Image
            src="/img/logo.jpg"
            alt="Perez Tours"
            width={200}
            height={64}
            className="mx-auto h-16 w-auto object-contain"
          />
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">
            {labels.title}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>
        </div>
        <LoginForm locale={locale} next={next} labels={labels} />
        <p className="mt-5 text-center text-sm text-ink-500">
          {labels.noAccount}{" "}
          <Link href={`/${locale}/signup`} className="font-bold text-ocean-700 hover:underline">
            {labels.signUp}
          </Link>
        </p>
      </div>
    </div>
  );
}
