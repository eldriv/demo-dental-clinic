import nodemailer from "nodemailer";
import { site } from "@/content";
import type { Booking } from "./bookings";
import { buildConfirmUrl, buildManageUrl, getSiteUrl } from "./site-url";
import {
  bookingDetailRows,
  buildBrandedEmail,
  buildClinicNewBookingEmail,
  buildPatientApprovedEmail,
  buildPatientDeclinedEmail,
  buildPatientRequestEmail,
  buildDentistInviteEmail,
  formatDisplayDate,
  CHECK_IN_EMAIL_TIP,
} from "./email-templates";

function isSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.CLINIC_EMAIL
  );
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function formatBookingDetails(booking: Booking): string {
  return bookingDetailRows(booking)
    .map((row) => `${row.label}: ${row.value}`)
    .concat(`Status: ${booking.status}`)
    .join("\n");
}

export async function sendBookingRequestEmails(
  booking: Booking,
  siteUrl?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const baseUrl = siteUrl ?? getSiteUrl();
  const transporter = createTransporter();
  const manageUrl = buildManageUrl(booking.token, baseUrl);
  const confirmUrl = buildConfirmUrl(booking.token, baseUrl);
  const clinicEmail = process.env.CLINIC_EMAIL!;

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Appointment request received — ${booking.service}`,
      text: `Dear ${booking.name},\n\nWe received your appointment request and will confirm it shortly.\n\n${formatBookingDetails(booking)}\n\nManage your appointment: ${manageUrl}\n\nThank you,\n${site.name}`,
      html: buildPatientRequestEmail(booking, baseUrl),
    });

    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: clinicEmail,
      subject: `New Booking Request — ${booking.name}`,
      text: `New appointment request:\n\n${formatBookingDetails(booking)}\n\nConfirm: ${confirmUrl}`,
      html: buildClinicNewBookingEmail(booking, baseUrl),
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

export async function sendBookingApprovedEmail(
  booking: Booking,
  siteUrl?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const baseUrl = siteUrl ?? getSiteUrl();
  const transporter = createTransporter();
  const manageUrl = buildManageUrl(booking.token, baseUrl);

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Appointment Confirmed — ${site.name}`,
      text: `Dear ${booking.name},\n\nYour appointment has been confirmed.\n\n${formatBookingDetails(booking)}\n\nManage your appointment: ${manageUrl}\n\n${CHECK_IN_EMAIL_TIP}\n\nThank you,\n${site.name}`,
      html: buildPatientApprovedEmail(booking, baseUrl),
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

export async function sendBookingDeclinedEmail(
  booking: Booking,
  siteUrl?: string,
  note?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const baseUrl = siteUrl ?? getSiteUrl();
  const transporter = createTransporter();
  const manageUrl = buildManageUrl(booking.token, baseUrl);

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Please reschedule — ${site.name}`,
      text: `Dear ${booking.name},\n\nYour requested appointment time is not available. Please reschedule using this link: ${manageUrl}\n\n${note ?? ""}\n\nThank you,\n${site.name}`,
      html: buildPatientDeclinedEmail(booking, baseUrl, note),
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

export async function sendCancellationEmails(
  booking: Booking,
  siteUrl?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const transporter = createTransporter();
  const clinicEmail = process.env.CLINIC_EMAIL!;

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Appointment Cancelled — ${site.name}`,
      text: `Dear ${booking.name},\n\nYour appointment on ${formatDisplayDate(booking.date)} at ${booking.time} has been cancelled.\n\nTo rebook, contact us at ${site.contact.phones[0]}.\n\n${site.name}`,
      html: buildBrandedEmail({
        heading: "Appointment Cancelled",
        intro: `Dear ${booking.name}, your appointment on ${formatDisplayDate(booking.date)} at ${booking.time} has been cancelled.`,
        rows: bookingDetailRows(booking),
        footerNote: `To rebook, contact us at ${site.contact.phones[0]}.`,
      }),
    });

    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: clinicEmail,
      subject: `Booking Cancelled — ${booking.name}`,
      text: `Appointment cancelled:\n\n${formatBookingDetails(booking)}`,
      html: buildBrandedEmail({
        heading: "Booking Cancelled",
        intro: `The appointment for ${booking.name} has been cancelled.`,
        rows: bookingDetailRows(booking),
      }),
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

export async function sendRescheduleEmails(
  booking: Booking,
  siteUrl?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const baseUrl = siteUrl ?? getSiteUrl();
  const transporter = createTransporter();
  const manageUrl = buildManageUrl(booking.token, baseUrl);
  const clinicEmail = process.env.CLINIC_EMAIL!;

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Appointment Rescheduled — ${site.name}`,
      text: `Dear ${booking.name},\n\nYour appointment has been rescheduled to ${formatDisplayDate(booking.date)} at ${booking.time}.\n\nManage: ${manageUrl}`,
      html: buildBrandedEmail({
        heading: "Appointment Rescheduled",
        intro: `Dear ${booking.name}, your appointment has been updated to the new date and time below.`,
        rows: bookingDetailRows(booking),
        cta: { label: "Manage Appointment", href: manageUrl, color: "primary" },
      }),
    });

    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: clinicEmail,
      subject: `Booking Rescheduled — ${booking.name}`,
      text: `Appointment rescheduled:\n\n${formatBookingDetails(booking)}`,
      html: buildBrandedEmail({
        heading: "Booking Rescheduled",
        intro: `${booking.name} rescheduled their appointment.`,
        rows: bookingDetailRows(booking),
        cta: { label: "View Booking", href: manageUrl, color: "primary" },
      }),
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

export async function sendLateNoticeEmails(
  booking: Booking,
  siteUrl?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const baseUrl = siteUrl ?? getSiteUrl();
  const transporter = createTransporter();
  const manageUrl = buildManageUrl(booking.token, baseUrl);
  const clinicEmail = process.env.CLINIC_EMAIL!;
  const lateDetail =
    typeof booking.lateNoticeMinutes === "number" && booking.lateNoticeMinutes > 0
      ? `about ${booking.lateNoticeMinutes} minutes`
      : "a bit";
  const note = booking.lateNoticeNote?.trim();

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Late arrival notice received — ${site.name}`,
      text: `Dear ${booking.name},\n\nWe received your late arrival notice for ${formatDisplayDate(booking.date)} at ${booking.time}.\n\nManage: ${manageUrl}`,
      html: buildBrandedEmail({
        heading: "Late Arrival Notice Received",
        intro: `Hi ${booking.name}, we've notified the front desk that you'll be ${lateDetail} late for your appointment today.`,
        rows: [
          ...bookingDetailRows(booking),
          ...(note ? [{ label: "Your note", value: note }] : []),
        ],
        cta: { label: "Manage Appointment", href: manageUrl, color: "primary" },
      }),
    });

    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: clinicEmail,
      subject: `Late arrival — ${booking.name} at ${booking.time}`,
      text: `${booking.name} reported they will be late.\n\n${formatBookingDetails(booking)}${note ? `\nNote: ${note}` : ""}`,
      html: buildBrandedEmail({
        heading: "Patient Running Late",
        intro: `${booking.name} submitted a late arrival notice for today's ${booking.time} appointment.`,
        rows: [
          ...bookingDetailRows(booking),
          {
            label: "Estimated delay",
            value:
              typeof booking.lateNoticeMinutes === "number" && booking.lateNoticeMinutes > 0
                ? `${booking.lateNoticeMinutes} minutes`
                : "Not specified",
          },
          ...(note ? [{ label: "Patient note", value: note }] : []),
        ],
        cta: { label: "Open Dashboard", href: `${baseUrl}/admin`, color: "accent" },
      }),
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

export function isEmailConfigured(): boolean {
  return isSmtpConfigured();
}

export async function sendAppointmentReminderEmail(
  booking: Booking,
  kind: "24h" | "2h",
  siteUrl?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const baseUrl = siteUrl ?? getSiteUrl();
  const transporter = createTransporter();
  const manageUrl = buildManageUrl(booking.token, baseUrl);
  const when =
    kind === "24h"
      ? "tomorrow"
      : "in about 2 hours";

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject:
        kind === "24h"
          ? `Reminder: appointment tomorrow — ${site.name}`
          : `Reminder: appointment today — ${site.name}`,
      text: `Dear ${booking.name},\n\nThis is a reminder that your appointment is ${when}.\n\n${formatBookingDetails(booking)}\n\nManage: ${manageUrl}\n\n${kind === "2h" ? `${CHECK_IN_EMAIL_TIP}\n\n` : ""}Thank you,\n${site.name}`,
      html: buildBrandedEmail({
        heading: kind === "24h" ? "Appointment Tomorrow" : "Appointment Today",
        intro: `Hi ${booking.name}, your ${booking.service} appointment is ${when}.`,
        rows: bookingDetailRows(booking),
        cta: { label: "Manage or check in", href: manageUrl, color: "primary" },
        tipNote: kind === "2h" ? CHECK_IN_EMAIL_TIP : undefined,
        footerNote: "Running late? Use the manage link to notify the front desk.",
      }),
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

export async function sendDentistInviteEmail(
  invite: { token: string; name: string; email: string; expiresAt: string },
  siteUrl?: string
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const baseUrl = siteUrl ?? getSiteUrl();
  const transporter = createTransporter();
  const acceptUrl = `${baseUrl}/admin/accept-invite?token=${encodeURIComponent(invite.token)}`;

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: invite.email,
      subject: `Set up your dentist account — ${site.name}`,
      text: `Hi ${invite.name},\n\nYou've been invited to join the ${site.name} staff dashboard.\n\nCreate your account: ${acceptUrl}\n\nThis link expires on ${invite.expiresAt}.\n\n${site.name}`,
      html: buildDentistInviteEmail(invite, acceptUrl),
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

/** @deprecated Use sendBookingRequestEmails or sendBookingApprovedEmail */
export async function sendBookingConfirmationEmails(
  booking: Booking,
  siteUrl?: string
) {
  return sendBookingRequestEmails(booking, siteUrl);
}
