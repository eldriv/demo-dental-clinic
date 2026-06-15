import { site } from "@/content";
import { placeholders } from "@/content/placeholders";
import type { Booking } from "./bookings";
import { buildConfirmUrl, buildManageUrl, getSiteUrl } from "./site-url";

const brand = site.brand;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface EmailLayoutOptions {
  preheader?: string;
  heading: string;
  intro: string;
  rows: Array<{ label: string; value: string }>;
  cta?: { label: string; href: string; color?: "primary" | "accent" };
  tipNote?: string;
  footerNote?: string;
}

export const CHECK_IN_EMAIL_TIP =
  "Already at the clinic? Open Manage Appointment and tap \"I've arrived — check in\" so the front desk knows you're here.";

export function buildBrandedEmail(options: EmailLayoutOptions): string {
  const siteUrl = getSiteUrl();
  const logoUrl = placeholders.logo.src.startsWith("http")
    ? placeholders.logo.src
    : `${siteUrl}${placeholders.logo.src}`;

  const rowsHtml = options.rows
    .map(
      (row) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #e8e4de;color:${brand.primary};font-size:13px;font-weight:600;width:38%;vertical-align:top;">
            ${escapeHtml(row.label)}
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #e8e4de;color:#1f2937;font-size:14px;vertical-align:top;">
            ${escapeHtml(row.value)}
          </td>
        </tr>`
    )
    .join("");

  const ctaColor = options.cta?.color === "accent" ? brand.accent : brand.primary;
  const ctaHtml = options.cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px auto 8px;">
        <tr>
          <td style="border-radius:999px;background:${ctaColor};">
            <a href="${options.cta.href}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.02em;">
              ${escapeHtml(options.cta.label)}
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:12px 0 0;font-size:12px;color:#6b7280;text-align:center;word-break:break-all;">
        ${escapeHtml(options.cta.href)}
      </p>`
    : "";

  const tipHtml = options.tipNote
    ? `<p style="margin:20px 0 0;padding:14px 16px;background:#ecfdf5;border-radius:12px;border:1px solid #a7f3d0;font-size:14px;line-height:1.65;color:#065f46;">${escapeHtml(options.tipNote)}</p>`
    : "";

  const footerNote = options.footerNote
    ? `<p style="margin:0 0 16px;font-size:13px;color:#cbd5e1;line-height:1.6;">${escapeHtml(options.footerNote)}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(options.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${brand.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${options.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.cream};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(26,60,52,0.08);">
          <tr>
            <td style="padding:28px 28px 20px;text-align:center;border-bottom:1px solid #f0ebe4;">
              <img src="${logoUrl}" alt="${escapeHtml(site.name)}" width="56" height="56" style="display:block;margin:0 auto 12px;border-radius:12px;object-fit:cover;" />
              <p style="margin:0;font-size:18px;font-weight:700;color:${brand.dark};">${escapeHtml(site.name)}</p>
              <p style="margin:4px 0 0;font-size:12px;color:${brand.primary};letter-spacing:0.08em;text-transform:uppercase;">${escapeHtml(site.location.city)}, ${escapeHtml(site.location.province)}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:${brand.dark};">${escapeHtml(options.heading)}</h1>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#4b5563;">${escapeHtml(options.intro)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.surface};border-radius:12px;padding:4px 18px;">
                ${rowsHtml}
              </table>
              ${ctaHtml}
              ${tipHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;background:${brand.dark};color:#ffffff;">
              ${footerNote}
              <p style="margin:0 0 8px;font-size:14px;font-weight:700;">${escapeHtml(site.name)}</p>
              <p style="margin:0 0 8px;font-size:13px;color:#cbd5e1;line-height:1.6;">${escapeHtml(site.location.full)}</p>
              <p style="margin:0 0 8px;font-size:13px;color:#cbd5e1;">${escapeHtml(site.hours.summary)}</p>
              <p style="margin:0;font-size:13px;color:#cbd5e1;">
                ${escapeHtml(site.contact.phones[0])} · ${escapeHtml(site.contact.email)}
              </p>
              <p style="margin:16px 0 0;font-size:12px;color:${brand.accent};font-style:italic;">${escapeHtml(site.tagline)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function bookingDetailRows(booking: Booking): Array<{ label: string; value: string }> {
  const dentistName =
    booking.assignedDentistName ??
    booking.preferredDentistName ??
    (booking.preferredDentistId ? undefined : "Any doctor");
  const rows = [
    { label: "Patient", value: booking.name },
    { label: "Email", value: booking.email },
    { label: "Phone", value: booking.phone },
    { label: "Service", value: booking.service },
    { label: "Date", value: formatDisplayDate(booking.date) },
    { label: "Time", value: booking.time },
  ];
  if (dentistName) {
    rows.push({ label: "Dentist", value: dentistName });
  }
  return rows;
}

export function buildPatientRequestEmail(booking: Booking, siteUrl?: string): string {
  const manageUrl = buildManageUrl(booking.token, siteUrl);

  return buildBrandedEmail({
    preheader: `We received your appointment request for ${booking.service}.`,
    heading: `Thank you, ${booking.name}!`,
    intro:
      "We received your appointment request and will get back to you shortly to confirm your visit. You can review or update your booking anytime using the link below.",
    rows: bookingDetailRows(booking),
    cta: { label: "Manage Appointment", href: manageUrl, color: "primary" },
    footerNote: "If you did not request this appointment, please contact us right away.",
  });
}

export function buildClinicNewBookingEmail(booking: Booking, siteUrl?: string): string {
  const confirmUrl = buildConfirmUrl(booking.token, siteUrl);
  const manageUrl = buildManageUrl(booking.token, siteUrl);

  return buildBrandedEmail({
    preheader: `New booking request from ${booking.name} for ${booking.service}.`,
    heading: "New Appointment Request",
    intro:
      "A patient submitted a new appointment request. Review the details below and confirm the booking to send the patient an approval email.",
    rows: [...bookingDetailRows(booking), { label: "Status", value: "Pending approval" }],
    cta: { label: "Confirm Appointment", href: confirmUrl, color: "accent" },
    footerNote: `View full booking details: ${manageUrl}`,
  });
}

export function buildPatientApprovedEmail(booking: Booking, siteUrl?: string): string {
  const manageUrl = buildManageUrl(booking.token, siteUrl);

  return buildBrandedEmail({
    preheader: `Your appointment at ${site.name} has been confirmed.`,
    heading: "Your Appointment Is Confirmed",
    intro: `Great news, ${booking.name}! Your appointment at ${site.name} has been approved. We look forward to seeing you.`,
    rows: bookingDetailRows(booking),
    cta: { label: "Manage Appointment", href: manageUrl, color: "primary" },
    tipNote: CHECK_IN_EMAIL_TIP,
    footerNote: "Need to reschedule or cancel? Use the button above anytime before your visit.",
  });
}

export function buildPatientDeclinedEmail(
  booking: Booking,
  siteUrl?: string,
  note?: string
): string {
  const manageUrl = buildManageUrl(booking.token, siteUrl);
  const reason = note?.trim()
    ? note.trim()
    : "The requested time is no longer available. Please choose a new date and time.";

  return buildBrandedEmail({
    preheader: `Please reschedule your appointment at ${site.name}.`,
    heading: "Please Reschedule Your Appointment",
    intro: `Hi ${booking.name}, ${reason}`,
    rows: bookingDetailRows(booking),
    cta: { label: "Choose a New Time", href: manageUrl, color: "accent" },
    footerNote: "Use the link above to pick a new appointment time that works for you.",
  });
}

export function buildDentistInviteEmail(
  invite: { name: string; email: string; expiresAt: string },
  acceptUrl: string
): string {
  const expires = new Date(invite.expiresAt).toLocaleDateString("en-PH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return buildBrandedEmail({
    preheader: `Set up your ${site.name} dentist account.`,
    heading: "You're invited to join the clinic dashboard",
    intro: `Hi ${invite.name}, the clinic owner invited you to create your dentist login for ${site.name}. Use the button below to choose your password and access My Day, visit notes, and your schedule.`,
    rows: [
      { label: "Email", value: invite.email },
      { label: "Role", value: "Dentist" },
      { label: "Invite expires", value: expires },
    ],
    cta: { label: "Set up my account", href: acceptUrl, color: "primary" },
    footerNote: "If you were not expecting this invite, you can ignore this email.",
  });
}

export function buildConfirmSuccessPage(
  booking: Booking,
  alreadyConfirmed = false,
  siteUrl?: string
): string {
  const manageUrl = buildManageUrl(booking.token, siteUrl);
  const homeUrl = siteUrl ?? getSiteUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${alreadyConfirmed ? "Already Confirmed" : "Appointment Confirmed"} — ${escapeHtml(site.name)}</title>
</head>
<body style="margin:0;padding:40px 16px;background:${brand.cream};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 8px 30px rgba(26,60,52,0.08);text-align:center;">
    <div style="width:64px;height:64px;margin:0 auto 16px;border-radius:50%;background:${alreadyConfirmed ? brand.surface : "#dcfce7"};display:flex;align-items:center;justify-content:center;font-size:28px;">
      ${alreadyConfirmed ? "✓" : "✓"}
    </div>
    <h1 style="margin:0 0 12px;font-size:26px;color:${brand.dark};">
      ${alreadyConfirmed ? "Already Confirmed" : "Appointment Confirmed"}
    </h1>
    <p style="margin:0 0 24px;color:#4b5563;line-height:1.6;">
      ${alreadyConfirmed
        ? `The appointment for <strong>${escapeHtml(booking.name)}</strong> was already confirmed.`
        : `You confirmed the appointment for <strong>${escapeHtml(booking.name)}</strong>. The patient has been notified by email.`}
    </p>
    <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">
      ${escapeHtml(booking.service)} · ${escapeHtml(formatDisplayDate(booking.date))} · ${escapeHtml(booking.time)}
    </p>
    <a href="${manageUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:${brand.primary};color:#fff;text-decoration:none;border-radius:999px;font-weight:700;">View Booking</a>
    <p style="margin:24px 0 0;"><a href="${homeUrl}" style="color:${brand.primary};text-decoration:none;font-size:14px;">← Back to website</a></p>
  </div>
</body>
</html>`;
}
