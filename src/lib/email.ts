import nodemailer from "nodemailer";
import { site } from "@/content";
import type { Booking } from "./bookings";
import { getSiteUrl } from "./site-url";

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
  return `
Name: ${booking.name}
Email: ${booking.email}
Phone: ${booking.phone}
Service: ${booking.service}
Date: ${booking.date}
Time: ${booking.time}
Status: ${booking.status}
  `.trim();
}

export async function sendBookingConfirmationEmails(
  booking: Booking
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const transporter = createTransporter();
  const manageUrl = `${getSiteUrl()}/manage/${booking.token}`;
  const clinicEmail = process.env.CLINIC_EMAIL!;

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Appointment Confirmed — ${site.name}`,
      text: `Dear ${booking.name},\n\nYour appointment has been confirmed.\n\n${formatBookingDetails(booking)}\n\nManage your appointment: ${manageUrl}\n\nThank you,\n${site.name}`,
      html: `
        <h2>Appointment Confirmed</h2>
        <p>Dear ${booking.name},</p>
        <p>Your appointment at ${site.name} has been confirmed.</p>
        <ul>
          <li><strong>Service:</strong> ${booking.service}</li>
          <li><strong>Date:</strong> ${booking.date}</li>
          <li><strong>Time:</strong> ${booking.time}</li>
        </ul>
        <p><a href="${manageUrl}">Manage your appointment</a></p>
        <p>Thank you,<br/>${site.name}</p>
      `,
    });

    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: clinicEmail,
      subject: `New Booking — ${booking.name}`,
      text: `New appointment booked:\n\n${formatBookingDetails(booking)}\n\nManage: ${manageUrl}`,
      html: `
        <h2>New Appointment Booking</h2>
        <pre>${formatBookingDetails(booking)}</pre>
        <p><a href="${manageUrl}">View booking</a></p>
      `,
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

export async function sendCancellationEmails(
  booking: Booking
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
      text: `Dear ${booking.name},\n\nYour appointment on ${booking.date} at ${booking.time} has been cancelled.\n\nTo rebook, call us at ${site.contact.phones[0]}.\n\n${site.name}`,
    });

    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: clinicEmail,
      subject: `Booking Cancelled — ${booking.name}`,
      text: `Appointment cancelled:\n\n${formatBookingDetails(booking)}`,
    });

    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    return { sent: false, error: message };
  }
}

export async function sendRescheduleEmails(
  booking: Booking
): Promise<{ sent: boolean; error?: string }> {
  if (!isSmtpConfigured()) {
    return { sent: false, error: "SMTP not configured" };
  }

  const transporter = createTransporter();
  const manageUrl = `${getSiteUrl()}/manage/${booking.token}`;
  const clinicEmail = process.env.CLINIC_EMAIL!;

  try {
    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: booking.email,
      subject: `Appointment Rescheduled — ${site.name}`,
      text: `Dear ${booking.name},\n\nYour appointment has been rescheduled to ${booking.date} at ${booking.time}.\n\nManage: ${manageUrl}`,
    });

    await transporter.sendMail({
      from: `"${site.name}" <${process.env.SMTP_USER}>`,
      to: clinicEmail,
      subject: `Booking Rescheduled — ${booking.name}`,
      text: `Appointment rescheduled:\n\n${formatBookingDetails(booking)}`,
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
