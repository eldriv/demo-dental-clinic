"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Check, Copy, Loader2, Mail, Trash2, UserPlus, XCircle } from "lucide-react";
import { AdminEmptyState, AdminPageHeader } from "@/components/admin/AdminPageHeader";
import type { ClinicDentist } from "@/lib/dentists";
import type { DentistInvite } from "@/lib/admin-invites-store";

interface DentistAccountSummary {
  linkedDentistId?: string;
  email: string;
  name: string;
}

interface AdminDentistsClientProps {
  initialDentists: ClinicDentist[];
  initialInvites: DentistInvite[];
  initialAccounts: DentistAccountSummary[];
}

function formatInviteExpiry(expiresAt: string): string {
  return new Date(expiresAt).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildAcceptInviteUrl(token: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/admin/accept-invite?token=${encodeURIComponent(token)}`;
}

function CopyInviteLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url = buildAcceptInviteUrl(token);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this invite link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={copyLink}
      className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? "Copied" : "Copy invite link"}
    </button>
  );
}

export function AdminDentistsClient({
  initialDentists,
  initialInvites,
  initialAccounts,
}: AdminDentistsClientProps) {
  const [dentists, setDentists] = useState(initialDentists);
  const [invites, setInvites] = useState(initialInvites);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [name, setName] = useState("");
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const accountByDentistId = useMemo(() => {
    return Object.fromEntries(
      accounts
        .filter((account) => account.linkedDentistId)
        .map((account) => [account.linkedDentistId as string, account])
    );
  }, [accounts]);

  const inviteByDentistId = useMemo(() => {
    return Object.fromEntries(invites.map((invite) => [invite.linkedDentistId, invite]));
  }, [invites]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/dentists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to add dentist.");
        return;
      }

      setDentists((current) => [...current, data.dentist]);
      setName("");
      setMessage(
        `${data.dentist.name} added. Send an invite email so they can create their own login.`
      );
    } catch {
      setError("Failed to add dentist.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setError("");
    setMessage("");

    const res = await fetch(`/api/admin/dentists?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Failed to remove dentist.");
      return;
    }

    setDentists((current) => current.filter((dentist) => dentist.id !== id));
    setInvites((current) => current.filter((invite) => invite.linkedDentistId !== id));
    setAccounts((current) => current.filter((account) => account.linkedDentistId !== id));
    setMessage("Dentist removed.");
  }

  async function sendInvite(dentist: ClinicDentist) {
    const email = inviteEmails[dentist.id]?.trim();
    if (!email) {
      setError(`Enter an email address for ${dentist.name}.`);
      return;
    }

    setInviteLoading(dentist.id);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedDentistId: dentist.id, email }),
      });
      const data = await res.json();
      if (!res.ok && !data.invite) {
        setError(data.error ?? data.warning ?? "Failed to send invite.");
        return;
      }

      if (data.invite) {
        setInvites((current) => [
          ...current.filter((invite) => invite.linkedDentistId !== dentist.id),
          data.invite,
        ]);
      }

      setMessage(
        data.warning
          ? `${data.warning} You can copy the invite link below and send it directly.`
          : `Invite ready for ${email}. Email sent if SMTP is configured — you can also copy the link below immediately.`
      );
    } catch {
      setError("Failed to send invite.");
    } finally {
      setInviteLoading(null);
    }
  }

  async function revokeInvite(token: string) {
    setInviteLoading(token);
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/admin/invites?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to revoke invite.");
        return;
      }

      setInvites((current) => current.filter((invite) => invite.token !== token));
      setMessage("Invite revoked.");
    } catch {
      setError("Failed to revoke invite.");
    } finally {
      setInviteLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Dentists"
        description="Add dentists to the clinic, then invite each one to create their own dashboard login."
      />

      <form onSubmit={handleSubmit} className="admin-card space-y-4">
        <h2 className="font-semibold text-dark">Add dentist profile</h2>
        <p className="text-sm text-muted">
          This adds them to online booking and scheduling. After saving, send an invite so they can
          set up their own password.
        </p>
        <div>
          <label htmlFor="dentist-name" className="mb-1.5 block text-sm font-medium text-gray-700">
            Full name
          </label>
          <input
            id="dentist-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="Dr. Juan Reyes"
            required
            minLength={2}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-primary">{message}</p>}

        <button type="submit" disabled={loading} className="btn-cta">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
          Add dentist
        </button>
      </form>

      <section className="space-y-3">
        <h2 className="font-semibold text-dark">Clinic dentists ({dentists.length})</h2>
        {dentists.length === 0 ? (
          <AdminEmptyState message="No dentists yet. Add your clinic dentists above." />
        ) : (
          <div className="grid gap-3">
            {dentists.map((dentist) => {
              const account = accountByDentistId[dentist.id];
              const invite = inviteByDentistId[dentist.id];

              return (
                <div key={dentist.id} className="admin-card space-y-4 p-4!">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-dark">{dentist.name}</p>
                      <p className="text-xs text-muted">Profile ID: {dentist.id}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(dentist.id)}
                      className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                      aria-label={`Remove ${dentist.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  {account ? (
                    <div className="rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-sm">
                      <p className="font-medium text-primary">Account active</p>
                      <p className="text-muted">{account.email}</p>
                    </div>
                  ) : invite ? (
                    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm">
                      <div>
                        <p className="font-medium text-amber-900">Invite pending</p>
                        <p className="text-amber-800">
                          {invite.email} · expires {formatInviteExpiry(invite.expiresAt)}
                        </p>
                        <p className="mt-1 text-xs text-amber-800/80">
                          Share the link right away — email delivery can take a few minutes.
                        </p>
                      </div>
                      <CopyInviteLinkButton token={invite.token} />
                      <button
                        type="button"
                        onClick={() => revokeInvite(invite.token)}
                        disabled={inviteLoading === invite.token}
                        className="inline-flex items-center gap-2 text-xs font-medium text-amber-900 hover:underline"
                      >
                        {inviteLoading === invite.token ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <XCircle className="size-3.5" />
                        )}
                        Revoke invite
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted">
                        No login yet. Send an invite so this dentist can create their own password.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <input
                          type="email"
                          value={inviteEmails[dentist.id] ?? ""}
                          onChange={(e) =>
                            setInviteEmails((current) => ({
                              ...current,
                              [dentist.id]: e.target.value,
                            }))
                          }
                          className="input-field flex-1"
                          placeholder="dentist@clinic.ph"
                          aria-label={`Invite email for ${dentist.name}`}
                        />
                        <button
                          type="button"
                          onClick={() => sendInvite(dentist)}
                          disabled={inviteLoading === dentist.id}
                          className="btn-cta shrink-0"
                        >
                          {inviteLoading === dentist.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Mail className="size-4" />
                          )}
                          Send invite
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
