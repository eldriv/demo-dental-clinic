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
  formatDisplayDate,
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
      text: `Dear ${booking.name},\n\nYour appointment has been confirmed.\n\n${formatBookingDetails(booking)}\n\nManage your appointment: ${manageUrl}\n\nThank you,\n${site.name}`,
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

export function isEmailConfigured(): boolean {
  return isSmtpConfigured();
}

/** @deprecated Use sendBookingRequestEmails or sendBookingApprovedEmail */
export async function sendBookingConfirmationEmails(
  booking: Booking,
  siteUrl?: string
) {
  return sendBookingRequestEmails(booking, siteUrl);
}
