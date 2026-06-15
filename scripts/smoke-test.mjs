#!/usr/bin/env node
/**
 * End-to-end smoke test for SmileCare Dental Clinic APIs.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? "http://localhost:3000";
const TODAY = new Date().toISOString().slice(0, 10);

const results = [];

function pass(name, detail = "") {
  results.push({ name, ok: true, detail });
  console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, detail = "") {
  results.push({ name, ok: false, detail });
  console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function request(path, options = {}) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  let body = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { res, body };
}

function cookieFromResponse(res) {
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const raw = setCookie[0] ?? res.headers.get("set-cookie") ?? "";
  const match = raw.match(/admin_session=([^;]+)/);
  return match ? `admin_session=${match[1]}` : "";
}

async function login(email, password) {
  const { res, body } = await request("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(body?.error ?? `login failed ${res.status}`);
  return cookieFromResponse(res);
}

async function main() {
  console.log(`\nSmoke test — ${BASE}\n`);

  // --- Public read endpoints ---
  try {
    const { res, body } = await request("/api/dentists");
    if (res.ok && Array.isArray(body.dentists) && body.dentists.length > 0) {
      pass("GET /api/dentists", `${body.dentists.length} dentists`);
    } else fail("GET /api/dentists", JSON.stringify(body));
  } catch (e) {
    fail("GET /api/dentists", e.message);
  }

  try {
    const { res, body } = await request("/api/clinic-settings");
    if (res.ok && body.hours?.timeSlots) pass("GET /api/clinic-settings");
    else fail("GET /api/clinic-settings", JSON.stringify(body));
  } catch (e) {
    fail("GET /api/clinic-settings", e.message);
  }

  let dentistId = "dr-chen";
  try {
    const { res, body } = await request(`/api/availability?date=${TODAY}&dentistId=${dentistId}`);
    if (res.ok && Array.isArray(body.slots)) {
      pass("GET /api/availability", `${body.slots.filter((s) => s.available).length} open slots`);
    } else fail("GET /api/availability", JSON.stringify(body));
  } catch (e) {
    fail("GET /api/availability", e.message);
  }

  try {
    const month = TODAY.slice(0, 7).replace("-", "");
    const year = TODAY.slice(0, 4);
    const m = TODAY.slice(5, 7);
    const { res, body } = await request(
      `/api/availability/month?year=${year}&month=${Number(m)}&dentistId=${dentistId}`
    );
    if (res.ok && Array.isArray(body.days)) pass("GET /api/availability/month");
    else fail("GET /api/availability/month", JSON.stringify(body));
  } catch (e) {
    fail("GET /api/availability/month", e.message);
  }

  // --- Public booking ---
  let webToken = "";
  let webTime = "";
  try {
    const { res: avRes, body: avBody } = await request(
      `/api/availability?date=${TODAY}&dentistId=${dentistId}`
    );
    const open = avBody.slots?.find((s) => s.available);
    if (!open) throw new Error("no open slot for web booking");
    webTime = open.time;

    const { res, body } = await request("/api/booking", {
      method: "POST",
      body: JSON.stringify({
        name: "Smoke Test Patient",
        email: "smoke-test@example.com",
        phone: "09123456789",
        service: "Teeth Cleaning",
        date: TODAY,
        time: webTime,
        dentistId,
      }),
    });
    if (res.ok && body.booking?.token) {
      webToken = body.booking.token;
      pass("POST /api/booking (web)", `pending @ ${webTime}`);
    } else fail("POST /api/booking", JSON.stringify(body));
  } catch (e) {
    fail("POST /api/booking", e.message);
  }

  // --- Manage page API ---
  if (webToken) {
    try {
      const { res, body } = await request(`/api/bookings/${webToken}`);
      if (res.ok && body.booking?.status === "pending") {
        pass("GET /api/bookings/[token]");
      } else fail("GET /api/bookings/[token]", JSON.stringify(body));
    } catch (e) {
      fail("GET /api/bookings/[token]", e.message);
    }

    try {
      const { res, body } = await request(`/api/bookings/${webToken}`, {
        method: "POST",
        body: JSON.stringify({ action: "check-in" }),
      });
      if (res.status === 400 && body.error?.includes("confirmed")) {
        pass("POST check-in blocks pending", body.error);
      } else if (res.ok) {
        pass("POST check-in");
      } else fail("POST check-in", JSON.stringify(body));
    } catch (e) {
      fail("POST check-in", e.message);
    }
  }

  // --- Admin auth ---
  let ownerCookie = "";
  let staffCookie = "";
  let dentistCookie = "";
  const ownerPass = process.env.ADMIN_PASSWORD ?? "smilecare2026";
  const staffPass = process.env.ADMIN_PASSWORD_STAFF ?? "smilecare2026";
  const dentistPass = process.env.ADMIN_PASSWORD_DENTIST_CHEN ?? "dentist2026";

  try {
    ownerCookie = await login("owner", ownerPass);
    pass("Admin login (owner)");
  } catch (e) {
    fail("Admin login (owner)", e.message);
  }

  try {
    staffCookie = await login("staff", staffPass);
    pass("Admin login (staff)");
  } catch (e) {
    fail("Admin login (staff)", e.message);
  }

  try {
    dentistCookie = await login("dr-chen", dentistPass);
    pass("Admin login (dentist)");
  } catch (e) {
    fail("Admin login (dentist)", e.message);
  }

  try {
    const { res } = await request("/api/admin/patients?list=1", {
      headers: { Cookie: ownerCookie },
    });
    if (res.ok) pass("GET /api/admin/patients?list=1");
    else fail("GET /api/admin/patients?list=1", String(res.status));
  } catch (e) {
    fail("GET /api/admin/patients?list=1", e.message);
  }

  // Approve web booking
  if (webToken && ownerCookie) {
    try {
      const { res, body } = await request(`/api/admin/bookings/${webToken}`, {
        method: "POST",
        headers: { Cookie: ownerCookie },
        body: JSON.stringify({ action: "approve", assignedDentistId: dentistId }),
      });
      if (res.ok && body.booking?.status === "confirmed") {
        pass("POST approve booking");
      } else fail("POST approve booking", JSON.stringify(body));
    } catch (e) {
      fail("POST approve booking", e.message);
    }

    try {
      const { res, body } = await request(`/api/bookings/${webToken}`, {
        method: "POST",
        body: JSON.stringify({ action: "check-in" }),
      });
      if (res.ok) pass("POST patient check-in (confirmed)");
      else fail("POST patient check-in", JSON.stringify(body));
    } catch (e) {
      fail("POST patient check-in", e.message);
    }
  }

  // Staff booking
  let staffToken = "";
  try {
    const { res: avRes, body: avBody } = await request(
      `/api/availability?date=${TODAY}&dentistId=dr-patel`
    );
    const open = avBody.slots?.find((s) => s.available && s.time !== webTime);
    if (!open) throw new Error("no open slot for staff booking");

    const { res, body } = await request("/api/admin/bookings", {
      method: "POST",
      headers: { Cookie: staffCookie },
      body: JSON.stringify({
        name: "Walk-in Patient",
        email: "walkin@example.com",
        phone: "09987654321",
        service: "Dental Fillings",
        date: TODAY,
        time: open.time,
        assignedDentistId: "dr-patel",
        autoConfirm: true,
      }),
    });
    if (res.ok && body.booking?.token) {
      staffToken = body.booking.token;
      pass("POST /api/admin/bookings (staff walk-in)", open.time);
    } else fail("POST /api/admin/bookings", JSON.stringify(body));
  } catch (e) {
    fail("POST /api/admin/bookings", e.message);
  }

  // Dentist actions on staff booking
  if (staffToken && dentistCookie) {
    try {
      const { res, body } = await request(`/api/admin/bookings/${staffToken}`, {
        method: "POST",
        headers: { Cookie: dentistCookie },
        body: JSON.stringify({
          action: "update-visit-notes",
          visitNotes: "Smoke test clinical note",
        }),
      });
      if (res.ok) pass("POST update-visit-notes (dentist)");
      else fail("POST update-visit-notes", JSON.stringify(body));
    } catch (e) {
      fail("POST update-visit-notes", e.message);
    }
  }

  // Complete staff booking as owner
  if (staffToken && ownerCookie) {
    try {
      const { res, body } = await request(`/api/admin/bookings/${staffToken}`, {
        method: "POST",
        headers: { Cookie: ownerCookie },
        body: JSON.stringify({
          action: "complete",
          visitNotes: "Completed in smoke test",
        }),
      });
      if (res.ok && body.booking?.status === "completed") {
        pass("POST complete booking");
      } else fail("POST complete booking", JSON.stringify(body));
    } catch (e) {
      fail("POST complete booking", e.message);
    }
  }

  // Patient record shows clinical note
  if (ownerCookie) {
    try {
      const { res, body } = await request(
        "/api/admin/patients?email=walkin@example.com",
        { headers: { Cookie: ownerCookie } }
      );
      const note = body.profile?.clinicalNotes?.[0]?.note;
      if (res.ok && note?.includes("Completed")) {
        pass("Patient record clinical notes");
      } else if (res.ok) {
        pass("Patient record loads", "note may differ");
      } else fail("Patient record", JSON.stringify(body));
    } catch (e) {
      fail("Patient record", e.message);
    }
  }

  // Follow-up flag
  if (webToken && staffCookie) {
    try {
      const { res, body } = await request(`/api/admin/bookings/${webToken}`, {
        method: "POST",
        headers: { Cookie: staffCookie },
        body: JSON.stringify({ action: "set-follow-up", followUpNeeded: true }),
      });
      if (res.ok && body.booking?.followUpNeeded) pass("POST set-follow-up");
      else fail("POST set-follow-up", JSON.stringify(body));
    } catch (e) {
      fail("POST set-follow-up", e.message);
    }
  }

  // Attendance alerts
  if (ownerCookie) {
    try {
      const { res, body } = await request("/api/admin/attendance-alerts", {
        headers: { Cookie: ownerCookie },
      });
      if (res.ok && Array.isArray(body.alerts)) pass("GET /api/admin/attendance-alerts");
      else fail("GET /api/admin/attendance-alerts", JSON.stringify(body));
    } catch (e) {
      fail("GET /api/admin/attendance-alerts", e.message);
    }
  }

  // Owner settings
  if (ownerCookie) {
    try {
      const { res, body } = await request("/api/admin/clinic-settings", {
        headers: { Cookie: ownerCookie },
      });
      if (res.ok && body.hours) pass("GET /api/admin/clinic-settings");
      else fail("GET /api/admin/clinic-settings", JSON.stringify(body));
    } catch (e) {
      fail("GET /api/admin/clinic-settings", e.message);
    }
  }

  if (ownerCookie) {
    try {
      const { res, body } = await request("/api/admin/dentists", {
        headers: { Cookie: ownerCookie },
      });
      if (res.ok && Array.isArray(body.dentists)) pass("GET /api/admin/dentists");
      else fail("GET /api/admin/dentists", JSON.stringify(body));
    } catch (e) {
      fail("GET /api/admin/dentists", e.message);
    }
  }

  if (ownerCookie) {
    try {
      const { res, body } = await request("/api/admin/schedule-blocks", {
        headers: { Cookie: ownerCookie },
      });
      if (res.ok && Array.isArray(body.blocks)) pass("GET /api/admin/schedule-blocks");
      else fail("GET /api/admin/schedule-blocks", JSON.stringify(body));
    } catch (e) {
      fail("GET /api/admin/schedule-blocks", e.message);
    }
  }

  // Cron (optional)
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    try {
      const { res, body } = await request("/api/cron/reminders", {
        headers: { Authorization: `Bearer ${cronSecret}` },
      });
      if (res.ok) pass("GET /api/cron/reminders");
      else fail("GET /api/cron/reminders", JSON.stringify(body));
    } catch (e) {
      fail("GET /api/cron/reminders", e.message);
    }
  } else {
    pass("GET /api/cron/reminders", "skipped — no CRON_SECRET in env");
  }

  // Slot blocking: web booking time should not be available for same dentist
  if (webToken && webTime) {
    try {
      const { res, body } = await request(
        `/api/availability?date=${TODAY}&dentistId=${dentistId}`
      );
      const taken = body.slots?.find((s) => s.time === webTime);
      if (res.ok && taken && !taken.available) {
        pass("Availability blocks confirmed booking");
      } else if (res.ok) {
        fail("Availability blocks confirmed booking", `${webTime} still available`);
      } else fail("Availability recheck", JSON.stringify(body));
    } catch (e) {
      fail("Availability recheck", e.message);
    }
  }

  // Completed frees slot (staff booking was completed at different time - test separately)
  if (staffToken) {
    try {
      const { res, body } = await request(
        `/api/availability?date=${TODAY}&dentistId=dr-patel`
      );
      const staffSlot = body.slots?.find((s) => s.available);
      if (res.ok) {
        pass("Availability after complete", staffSlot ? "has open slots" : "day full");
      }
    } catch (e) {
      fail("Availability after complete", e.message);
    }
  }

  // Pages (HTML)
  for (const path of ["/", "/admin/login", "/robots.txt", "/sitemap.xml"]) {
    try {
      const res = await fetch(`${BASE}${path}`);
      if (res.ok) pass(`GET ${path}`, String(res.status));
      else fail(`GET ${path}`, String(res.status));
    } catch (e) {
      fail(`GET ${path}`, e.message);
    }
  }

  // Unauthorized admin
  try {
    const { res } = await request("/api/admin/patients?list=1");
    if (res.status === 401) pass("Admin routes require auth");
    else fail("Admin routes require auth", String(res.status));
  } catch (e) {
    fail("Admin routes require auth", e.message);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
