"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, Stethoscope } from "lucide-react";
import { site } from "@/content";

function LoginForm() {
  const searchParams = useSearchParams();
  const created = searchParams.get("created") === "1";
  const isDev = process.env.NODE_ENV === "development";
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid email or password.");
        return;
      }

      const next =
        searchParams.get("next") ||
        (data.user?.role === "dentist" ? "/admin/my-day" : "/admin");
      window.location.assign(next);
    } catch {
      setError("Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh">
      <div className="hidden w-1/2 bg-linear-to-br from-dark via-dark-light to-primary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/10">
            <Stethoscope className="size-6 text-primary-light" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">{site.name}</p>
            <p className="text-sm text-white/60">Staff dashboard</p>
          </div>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-white">
            Manage appointments, hours, and clinic schedule in one place.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Approve bookings, assign dentists, block leave, and keep the front desk organized.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/50">
          <ShieldCheck className="size-4" />
          Secure staff access only
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#eef3f0] px-4 py-10">
        <div className="admin-card w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Stethoscope className="size-6" />
            </div>
            <h1 className="text-2xl font-bold text-dark">Staff login</h1>
            <p className="mt-1 text-sm text-muted">{site.name}</p>
          </div>

          <div className="mb-6 hidden lg:block">
            <h2 className="text-2xl font-bold tracking-tight text-dark">Welcome back</h2>
            <p className="mt-1 text-sm text-muted">Sign in with your clinic email and password.</p>
          </div>

          {created && (
            <div className="mb-4 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-sm text-primary">
              Your dentist account is ready. Sign in below with the same email you used for the
              invite{email ? ` (${email})` : ""}.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                Work email
              </label>
              <input
                id="email"
                type={isDev ? "text" : "email"}
                inputMode="email"
                required
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder={isDev ? "owner or you@clinic.ph" : "you@clinic.ph"}
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Enter password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-cta w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-xs leading-relaxed text-muted">
            Dentists join through an invite link from the clinic owner. If you received an invite,
            open that link first to create your password.
          </p>

          {process.env.NODE_ENV === "development" && (
            <p className="mt-4 text-xs leading-relaxed text-muted">
              Local dev: owner email and password from your <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px]">.env</code>{" "}
              (<code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px]">ADMIN_OWNER_EMAIL</code> /{" "}
              <code className="rounded bg-surface px-1.5 py-0.5 font-mono text-[11px]">ADMIN_PASSWORD</code>).
              Dentists use the email and password from their invite setup.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#eef3f0]" />}>
      <LoginForm />
    </Suspense>
  );
}
