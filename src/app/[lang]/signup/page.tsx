/**
 * Registro público: crea una cuenta normal. Si ya hay sesión, el proxy
 * redirige a la cuenta o al panel.
 */
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale } from "@/lib/i18n";
import type { Locale } from "@/types";
import { SignupForm } from "./SignupForm";

type Props = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isLocale(lang)) return {};
  return {
    title: lang === "es" ? "Crear cuenta" : "Create account",
    robots: { index: false, follow: false },
  };
}

export default async function SignupPage({ params }: Props) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale = lang as Locale;

  const labels =
    locale === "es"
      ? {
          title: "Crea tu cuenta",
          subtitle: "Guarda tus datos y consulta tus reservas cuando quieras.",
          name: "Nombre completo",
          email: "Correo electrónico",
          password: "Contraseña",
          passwordHint: "Mínimo 8 caracteres.",
          submit: "Crear cuenta",
          submitting: "Creando…",
          invalidName: "Escribe tu nombre (mínimo 2 letras).",
          invalidEmail: "Ese correo no parece válido.",
          weakPassword: "La contraseña debe tener al menos 8 caracteres.",
          emailTaken: "Ese correo ya tiene una cuenta. Inicia sesión.",
          server: "Error del servidor. Inténtalo de nuevo.",
          hasAccount: "¿Ya tienes cuenta?",
          signIn: "Inicia sesión",
        }
      : {
          title: "Create your account",
          subtitle: "Save your details and check your bookings anytime.",
          name: "Full name",
          email: "Email address",
          password: "Password",
          passwordHint: "At least 8 characters.",
          submit: "Create account",
          submitting: "Creating…",
          invalidName: "Please enter your name (at least 2 letters).",
          invalidEmail: "That email address doesn't look valid.",
          weakPassword: "Your password must be at least 8 characters.",
          emailTaken: "That email already has an account. Please sign in.",
          server: "Server error. Please try again.",
          hasAccount: "Already have an account?",
          signIn: "Sign in",
        };

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-sand-50/50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-sand-200 bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <Image
            src="/img/logo.jpg"
            alt="Perez Tours"
            width={120}
            height={48}
            className="mx-auto h-12 w-auto rounded-lg object-cover"
          />
          <h1 className="mt-4 font-display text-2xl font-extrabold text-ink-900">
            {labels.title}
          </h1>
          <p className="mt-1 text-sm text-ink-500">{labels.subtitle}</p>
        </div>
        <SignupForm locale={locale} labels={labels} />
        <p className="mt-5 text-center text-sm text-ink-500">
          {labels.hasAccount}{" "}
          <Link href={`/${locale}/login`} className="font-bold text-ocean-700 hover:underline">
            {labels.signIn}
          </Link>
        </p>
      </div>
    </div>
  );
}
