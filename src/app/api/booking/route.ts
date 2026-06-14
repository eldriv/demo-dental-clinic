import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import type { Booking, CreateBookingInput } from "@/lib/bookings";
import { BOOKING_VALIDATION } from "@/lib/bookings";
import { saveBooking } from "@/lib/bookings-store";
import { sendBookingRequestEmails } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";
import { site } from "@/content";

function validateBookingInput(body: CreateBookingInput): string | null {
  const { name, email, phone, service, date, time } = body;

  if (!name?.trim() || name.trim().length < BOOKING_VALIDATION.name.min) {
    return "Please provide a valid name.";
  }
  if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Please provide a valid email address.";
  }
  if (!phone?.trim() || phone.trim().length < BOOKING_VALIDATION.phone.min) {
    return "Please provide a valid phone number.";
  }
  if (!service?.trim()) {
    return "Please select a service.";
  }
  if (!date?.trim()) {
    return "Please select a date.";
  }
  if (!time?.trim()) {
    return "Please select a time.";
  }

  const bookingDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) {
    return "Please select a future date.";
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateBookingInput;
    const validationError = validateBookingInput(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const now = new Date().toISOString();
    const token = uuidv4();

    const booking: Booking = {
      id: uuidv4(),
      token,
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      phone: body.phone.trim(),
      service: body.service.trim(),
      date: body.date,
      time: body.time,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await saveBooking(booking);

    const emailResult = await sendBookingRequestEmails(booking);
    const manageUrl = `${getSiteUrl()}/manage/${token}`;

    let message = "Your appointment request has been submitted!";
    if (!emailResult.sent) {
      message += ` We could not send a confirmation email. Please save your manage link or call us at ${site.contact.phones[0]}.`;
    } else {
      message += " Check your inbox — we'll email you once your visit is approved.";
    }

    return NextResponse.json({
      success: true,
      message,
      manageUrl,
      booking: {
        token: booking.token,
        date: booking.date,
        time: booking.time,
        service: booking.service,
      },
    });
  } catch (err) {
    console.error("Booking error:", err);
    return NextResponse.json(
      {
        error: `Unable to process your booking. Please call us at ${site.contact.phones[0]}.`,
      },
      { status: 500 }
    );
  }
}
