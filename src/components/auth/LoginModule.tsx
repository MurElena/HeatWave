"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock, User as UserIcon, ArrowLeft } from "lucide-react";
import { login, register } from "@/lib/auth";

type Mode = "login" | "register" | "forgot";

const inputClass =
  "w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";

export function LoginModule() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function reset() {
    setError(null);
    setInfo(null);
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    login(email.trim());
    router.push("/");
  }

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (!name.trim() || !email.trim() || !password) {
      setError("Fill in all fields to create an account.");
      return;
    }
    register(name.trim(), email.trim());
    router.push("/");
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (!email.trim()) {
      setError("Enter your email to receive a reset link.");
      return;
    }
    setInfo(`Password reset link sent to ${email.trim()}.`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-white to-coral-50 px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="HeatWave"
            width={360}
            height={360}
            priority
            className="h-64 w-auto"
          />
        </div>

        <div className="mt-2 rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
          <h1 className="text-center text-xl font-bold text-slate-900">
            {mode === "login" && "Welcome back"}
            {mode === "register" && "Create your account"}
            {mode === "forgot" && "Reset your password"}
          </h1>
          <p className="mt-1 text-center text-sm text-slate-500">
            {mode === "login" && "Sign in to continue to HeatWave."}
            {mode === "register" && "Join HeatWave to evaluate translation models."}
            {mode === "forgot" && "We'll email you a secure reset link."}
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          {info && (
            <div className="mt-4 rounded-lg border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm text-teal-700">
              {info}
            </div>
          )}

          {mode === "login" && (
            <form className="mt-6 space-y-4" onSubmit={handleLogin}>
              <Field icon={Mail}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field icon={Lock}>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setMode("forgot");
                  }}
                  className="text-xs font-medium text-teal-700 hover:text-teal-800"
                >
                  Forgot your password?
                </button>
              </div>
              <SubmitButton>Log in</SubmitButton>
              <p className="text-center text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <SwitchButton onClick={() => { reset(); setMode("register"); }}>
                  Register
                </SwitchButton>
              </p>
            </form>
          )}

          {mode === "register" && (
            <form className="mt-6 space-y-4" onSubmit={handleRegister}>
              <Field icon={UserIcon}>
                <input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field icon={Mail}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field icon={Lock}>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <SubmitButton>Create account</SubmitButton>
              <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <SwitchButton onClick={() => { reset(); setMode("login"); }}>
                  Log in
                </SwitchButton>
              </p>
            </form>
          )}

          {mode === "forgot" && (
            <form className="mt-6 space-y-4" onSubmit={handleForgot}>
              <Field icon={Mail}>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <SubmitButton>Send reset link</SubmitButton>
              <button
                type="button"
                onClick={() => { reset(); setMode("login"); }}
                className="flex w-full items-center justify-center gap-1 text-sm font-medium text-teal-700 hover:text-teal-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      {children}
    </div>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="submit"
      className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700"
    >
      {children}
    </button>
  );
}

function SwitchButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="font-semibold text-teal-700 hover:text-teal-800"
    >
      {children}
    </button>
  );
}
