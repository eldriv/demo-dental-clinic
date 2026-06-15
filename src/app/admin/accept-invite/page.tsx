"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck, Stethoscope } from "lucide-react";
import { site } from "@/content";

interface InvitePreview {
  email: string;
  name: string;
  expiresAt: string;
}

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This invite link is missing a token.");
      setLoadingInvite(false);
      return;
    }

    async function loadInvite() {
      try {
        const res = await fetch(
          `/api/admin/invites/accept?token=${encodeURIComponent(token)}`
        );
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Invalid invite.");
          return;
        }
        setInvite(data.invite);
      } catch {
        setError("Unable to load invite.");
      } finally {
        setLoadingInvite(false);
      }
    }

    loadInvite();
  }, [token]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create account.");
        return;
      }

      if (!invite) {
        setError("Invite details missing. Please open the invite link again.");
        return;
      }

      router.push(
        `/admin/login?created=1&email=${encodeURIComponent(invite.email)}`
      );
      router.refresh();
    } catch {
      setError("Failed to create account.");
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
            <p className="text-sm text-white/60">Dentist account setup</p>
          </div>
        </div>
        <div>
          <h1 className="max-w-md text-4xl font-bold leading-tight tracking-tight text-white">
            Create your password to access My Day and patient visits.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/70">
            Only invited dentists can join. Your clinic owner approved this invite before it was
            sent.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/50">
          <ShieldCheck className="size-4" />
          Invite-only dentist access
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-[#eef3f0] px-4 py-10">
        <div className="admin-card w-full max-w-md">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-dark">Set up your account</h2>
            <p className="mt-1 text-sm text-muted">
              Choose a password for your dentist dashboard login.
            </p>
          </div>

          {loadingInvite ? (
            <div className="flex items-center gap-2 text-sm text-muted">
              <Loader2 className="size-4 animate-spin" />
              Checking invite…
            </div>
          ) : invite ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm">
                <p className="font-medium text-dark">{invite.name}</p>
                <p className="text-muted">{invite.email}</p>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  placeholder="At least 8 characters"
                />
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field"
                  placeholder="Repeat password"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-cta w-full">
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
              </button>
            </form>
          ) : (
            <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error || "This invite link is not valid."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[#eef3f0]" />}>
      <AcceptInviteForm />
    </Suspense>
  );
}
