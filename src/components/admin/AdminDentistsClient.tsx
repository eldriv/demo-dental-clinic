"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  Mail,
  Stethoscope,
  Trash2,
  UserPlus,
  XCircle,
} from "lucide-react";
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

type DentistStatus = "needs-invite" | "pending" | "active";

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

function getInitials(name: string): string {
  return name
    .replace(/^dr\.?\s+/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_PALETTES = [
  "from-teal-600 to-emerald-700",
  "from-violet-600 to-indigo-700",
  "from-sky-600 to-blue-700",
  "from-rose-600 to-pink-700",
  "from-amber-600 to-orange-700",
] as const;

function getAvatarPalette(id: string): (typeof AVATAR_PALETTES)[number] {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % AVATAR_PALETTES.length;
  }
  return AVATAR_PALETTES[hash] ?? AVATAR_PALETTES[0];
}

function getDentistStatus(
  dentistId: string,
  accountByDentistId: Record<string, DentistAccountSummary>,
  inviteByDentistId: Record<string, DentistInvite>
): DentistStatus {
  if (accountByDentistId[dentistId]) return "active";
  if (inviteByDentistId[dentistId]) return "pending";
  return "needs-invite";
}

function StatusBadge({ status }: { status: DentistStatus }) {
  if (status === "active") {
    return (
      <span className="admin-dentist-badge admin-dentist-badge-active">
        <CheckCircle2 className="size-3.5" />
        Active
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="admin-dentist-badge admin-dentist-badge-pending">
        <Clock3 className="size-3.5" />
        Invite sent
      </span>
    );
  }
  return null;
}

function CopyInviteLinkButton({ token, fullWidth = false }: { token: string; fullWidth?: boolean }) {
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
      className={`admin-dentist-copy-btn ${fullWidth ? "admin-dentist-copy-btn-full" : ""} ${copied ? "admin-dentist-copy-btn-done" : ""}`}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Link copied" : "Copy invite link"}
    </button>
  );
}

function AlertBanner({
  tone,
  message,
}: {
  tone: "error" | "success" | "info";
  message: string;
}) {
  const toneClass =
    tone === "error"
      ? "admin-dentist-alert-error"
      : tone === "success"
        ? "admin-dentist-alert-success"
        : "admin-dentist-alert-info";

  return (
    <div className={`admin-dentist-alert ${toneClass}`} role="status">
      {tone === "error" ? (
        <AlertCircle className="size-4 shrink-0" />
      ) : (
        <CheckCircle2 className="size-4 shrink-0" />
      )}
      <p>{message}</p>
    </div>
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
  const [formError, setFormError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [inviteMessages, setInviteMessages] = useState<Record<string, string>>({});

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

  const stats = useMemo(() => {
    let active = 0;
    let pending = 0;
    for (const dentist of dentists) {
      const status = getDentistStatus(dentist.id, accountByDentistId, inviteByDentistId);
      if (status === "active") active += 1;
      else if (status === "pending") pending += 1;
    }
    return { total: dentists.length, active, pending };
  }, [dentists, accountByDentistId, inviteByDentistId]);

  async function refreshDentists() {
    const res = await fetch("/api/admin/dentists");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.dentists)) {
      setDentists(data.dentists);
    }
  }

  async function refreshInviteState() {
    const res = await fetch("/api/admin/invites");
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.invites)) {
      setInvites(data.invites);
    }
    if (Array.isArray(data.dentistAccounts)) {
      setAccounts(data.dentistAccounts);
    }
  }

  useEffect(() => {
    void refreshInviteState();

    function onFocus() {
      void refreshInviteState();
    }

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setFormError("");
    setFormMessage("");

    try {
      const res = await fetch("/api/admin/dentists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Failed to add dentist.");
        return;
      }

      await refreshDentists();
      setName("");
      setFormMessage(`${data.dentist.name} added. Send an invite below so they can create their login.`);
    } catch {
      setFormError("Failed to add dentist.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(dentist: ClinicDentist) {
    const confirmed = window.confirm(
      `Remove ${dentist.name} from the clinic?\n\nThis deletes their profile and revokes dashboard access. They will not be able to sign in.`
    );
    if (!confirmed) return;

    setFormError("");
    setFormMessage("");
    setInviteErrors((current) => {
      const next = { ...current };
      delete next[dentist.id];
      return next;
    });

    const res = await fetch(`/api/admin/dentists?id=${dentist.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setInviteErrors((current) => ({
        ...current,
        [dentist.id]: data.error ?? "Failed to remove dentist.",
      }));
      return;
    }

    setDentists((current) => current.filter((entry) => entry.id !== dentist.id));
    setInvites((current) => current.filter((invite) => invite.linkedDentistId !== dentist.id));
    setAccounts((current) => current.filter((account) => account.linkedDentistId !== dentist.id));
    setFormMessage(`${dentist.name} removed and dashboard access revoked.`);
  }

  async function revokeAccess(dentist: ClinicDentist) {
    const account = accountByDentistId[dentist.id];
    const confirmed = window.confirm(
      `Revoke dashboard access for ${dentist.name}${account?.email ? ` (${account.email})` : ""}?\n\nThey will be signed out and unable to log in until you send a new invite.`
    );
    if (!confirmed) return;

    setInviteLoading(dentist.id);
    setInviteErrors((current) => ({ ...current, [dentist.id]: "" }));
    setInviteMessages((current) => ({ ...current, [dentist.id]: "" }));

    try {
      const res = await fetch(`/api/admin/dentists/access?id=${encodeURIComponent(dentist.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteErrors((current) => ({
          ...current,
          [dentist.id]: data.error ?? "Failed to revoke access.",
        }));
        return;
      }

      setAccounts((current) => current.filter((entry) => entry.linkedDentistId !== dentist.id));
      setInvites((current) => current.filter((invite) => invite.linkedDentistId !== dentist.id));
      setInviteMessages((current) => ({
        ...current,
        [dentist.id]: `Dashboard access revoked for ${dentist.name}. Send a new invite when they should return.`,
      }));
    } catch {
      setInviteErrors((current) => ({
        ...current,
        [dentist.id]: "Failed to revoke access.",
      }));
    } finally {
      setInviteLoading(null);
    }
  }

  async function sendInvite(dentist: ClinicDentist, retry = false) {
    const email = inviteEmails[dentist.id]?.trim();
    if (!email) {
      setInviteErrors((current) => ({
        ...current,
        [dentist.id]: `Enter an email address for ${dentist.name}.`,
      }));
      return;
    }

    setInviteLoading(dentist.id);
    setInviteErrors((current) => ({ ...current, [dentist.id]: "" }));
    setInviteMessages((current) => ({ ...current, [dentist.id]: "" }));

    try {
      if (!retry) {
        await refreshDentists();
      }

      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedDentistId: dentist.id, email }),
      });
      const data = await res.json();

      if (
        !res.ok &&
        !data.invite &&
        !retry &&
        `${data.error ?? data.warning ?? ""}`.toLowerCase().includes("not found")
      ) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        return sendInvite(dentist, true);
      }

      if (!res.ok && !data.invite) {
        setInviteErrors((current) => ({
          ...current,
          [dentist.id]: data.error ?? data.warning ?? "Failed to send invite.",
        }));
        return;
      }

      if (data.invite) {
        setInvites((current) => [
          ...current.filter((invite) => invite.linkedDentistId !== dentist.id),
          data.invite,
        ]);
      }

      setInviteMessages((current) => ({
        ...current,
        [dentist.id]: data.warning
          ? `${data.warning} Copy the link below and send it directly.`
          : `Invite ready for ${email}. Email sent if configured — you can also copy the link below.`,
      }));
    } catch {
      setInviteErrors((current) => ({
        ...current,
        [dentist.id]: "Failed to send invite.",
      }));
    } finally {
      setInviteLoading(null);
    }
  }

  async function revokeInvite(
    token: string,
    dentistId: string,
    email: string,
    dentistName: string
  ) {
    const confirmed = window.confirm(
      `Revoke the invite for ${email}?\n\nThe invite link will stop working. You can send a new invite to ${dentistName} later.`
    );
    if (!confirmed) return;

    setInviteLoading(token);
    setInviteErrors((current) => ({ ...current, [dentistId]: "" }));
    setInviteMessages((current) => ({ ...current, [dentistId]: "" }));

    try {
      const res = await fetch(`/api/admin/invites?token=${encodeURIComponent(token)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteErrors((current) => ({
          ...current,
          [dentistId]: data.error ?? "Failed to revoke invite.",
        }));
        return;
      }

      setInvites((current) => current.filter((invite) => invite.token !== token));
      setInviteMessages((current) => ({
        ...current,
        [dentistId]: "Invite revoked. You can send a new one anytime.",
      }));
    } catch {
      setInviteErrors((current) => ({
        ...current,
        [dentistId]: "Failed to revoke invite.",
      }));
    } finally {
      setInviteLoading(null);
    }
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <AdminPageHeader
        title="Dentists"
        description="Add clinic dentists, then invite each one to create their own dashboard login."
      />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: stats.total },
          { label: "Active", value: stats.active },
          { label: "Pending", value: stats.pending },
        ].map((item) => (
          <div key={item.label} className="admin-dentist-stat">
            <p className="admin-dentist-stat-value">{item.value}</p>
            <p className="admin-dentist-stat-label">{item.label}</p>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="admin-card admin-dentist-add-card">
        <div className="flex items-start gap-3">
          <div className="admin-dentist-icon-wrap">
            <UserPlus className="size-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <div>
              <h2 className="font-semibold text-dark">Add dentist profile</h2>
              <p className="mt-1 text-sm text-muted">
                Adds them to online booking and scheduling. Then send an invite so they can set their
                password.
              </p>
            </div>

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

            {formError && <AlertBanner tone="error" message={formError} />}
            {formMessage && <AlertBanner tone="success" message={formMessage} />}

            <button type="submit" disabled={loading} className="btn-cta w-full sm:w-auto">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Add dentist
            </button>
          </div>
        </div>
      </form>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="admin-section-title">Clinic dentists</h2>
          <span className="text-sm text-muted">{stats.total} total</span>
        </div>

        {dentists.length === 0 ? (
          <AdminEmptyState message="No dentists yet. Add your clinic dentists above." />
        ) : (
          <div className="admin-dentist-grid">
            {dentists.map((dentist) => {
              const account = accountByDentistId[dentist.id];
              const invite = inviteByDentistId[dentist.id];
              const status = getDentistStatus(dentist.id, accountByDentistId, inviteByDentistId);
              const cardError = inviteErrors[dentist.id];
              const cardMessage = inviteMessages[dentist.id];

              return (
                <article key={dentist.id} className="admin-dentist-card group">
                  <div className="admin-dentist-card-head">
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`admin-dentist-avatar bg-linear-to-br ${getAvatarPalette(dentist.id)}`}
                      >
                        {getInitials(dentist.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-base font-semibold tracking-tight text-dark">
                          {dentist.name}
                        </p>
                        <StatusBadge status={status} />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(dentist)}
                      className="admin-dentist-delete"
                      aria-label={`Remove ${dentist.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  {account ? (
                    <div className="admin-dentist-panel admin-dentist-panel-active">
                      <div className="admin-dentist-panel-icon admin-dentist-panel-icon-active">
                        <Stethoscope className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-dark">Dashboard access active</p>
                        <p className="mt-0.5 truncate text-sm text-muted">{account.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => revokeAccess(dentist)}
                        disabled={inviteLoading === dentist.id}
                        className="admin-dentist-revoke-access"
                      >
                        {inviteLoading === dentist.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <XCircle className="size-3.5" />
                        )}
                        Revoke access
                      </button>
                    </div>
                  ) : invite ? (
                    <div className="admin-dentist-panel admin-dentist-panel-pending">
                      <div className="admin-dentist-pending-head">
                        <div className="admin-dentist-panel-icon admin-dentist-panel-icon-pending">
                          <Clock3 className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-dark">Waiting for setup</p>
                          <p className="mt-0.5 text-sm text-muted">
                            Expires {formatInviteExpiry(invite.expiresAt)}
                          </p>
                        </div>
                      </div>

                      <div className="admin-dentist-email-chip">
                        <Mail className="size-3.5 shrink-0 text-primary/70" />
                        <span className="truncate">{invite.email}</span>
                      </div>

                      <p className="admin-dentist-hint">
                        Share the link now — email delivery can take a few minutes.
                      </p>

                      <div className="admin-dentist-actions">
                        <CopyInviteLinkButton token={invite.token} fullWidth />
                        <button
                          type="button"
                          onClick={() =>
                            revokeInvite(invite.token, dentist.id, invite.email, dentist.name)
                          }
                          disabled={inviteLoading === invite.token}
                          className="admin-dentist-revoke-link"
                        >
                          {inviteLoading === invite.token ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <XCircle className="size-3.5" />
                          )}
                          Revoke invite
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="admin-dentist-panel admin-dentist-panel-idle">
                      <div className="admin-dentist-idle-head">
                        <div className="admin-dentist-panel-icon admin-dentist-panel-icon-idle">
                          <UserPlus className="size-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-dark">Invite to dashboard</p>
                          <p className="mt-0.5 text-xs text-muted">
                            They&apos;ll choose a password and unlock My Day, Patients &amp; Calendar.
                          </p>
                        </div>
                      </div>

                      <div className="admin-dentist-invite-compose">
                        <label className="sr-only" htmlFor={`invite-email-${dentist.id}`}>
                          Email for {dentist.name}
                        </label>
                        <Mail className="admin-dentist-invite-icon" aria-hidden />
                        <input
                          id={`invite-email-${dentist.id}`}
                          type="email"
                          value={inviteEmails[dentist.id] ?? ""}
                          onChange={(e) =>
                            setInviteEmails((current) => ({
                              ...current,
                              [dentist.id]: e.target.value,
                            }))
                          }
                          className="admin-dentist-invite-input"
                          placeholder="name@email.com"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              sendInvite(dentist);
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => sendInvite(dentist)}
                          disabled={inviteLoading === dentist.id}
                          className="admin-dentist-invite-send"
                        >
                          {inviteLoading === dentist.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <>
                              Send
                              <Mail className="size-3.5 opacity-80" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {cardError && <AlertBanner tone="error" message={cardError} />}
                  {cardMessage && (
                    <AlertBanner
                      tone={cardMessage.includes("revoked") ? "info" : "success"}
                      message={cardMessage}
                    />
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
