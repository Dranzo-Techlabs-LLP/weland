"use client";

import { useEffect, useState } from "react";
import { PREFILL_EVENT, type Prefill } from "./BookingStrip";
import { enquiryOptions } from "@/lib/content";

type Status = "idle" | "sending" | "sent" | "error";

// The PHP API (server/api in the repo) lives at /api on the same domain.
// NEXT_PUBLIC_API_BASE only needs setting for `npm run dev`; see .env.local.example.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "/api").replace(/\/$/, "");
const SEND_FAILED = "The enquiry could not be sent. Please call or WhatsApp us.";

interface Values {
  name: string;
  phone: string;
  email: string;
  stay: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  notes: string;
}

const empty: Values = {
  name: "",
  phone: "",
  email: "",
  stay: "",
  checkIn: "",
  checkOut: "",
  guests: "2",
  notes: "",
};

function validate(v: Values) {
  const errors: Partial<Record<keyof Values, string>> = {};
  if (v.name.trim().length < 2) errors.name = "Enter your name.";
  if (v.phone.replace(/\D/g, "").length < 10) errors.phone = "Enter a phone number with at least 10 digits.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) errors.email = "Enter a valid email address.";
  if (!v.stay) errors.stay = "Choose a stay, or pick 'Not sure yet'.";
  if (!v.checkIn) errors.checkIn = "Choose a check-in date.";
  if (!v.checkOut) errors.checkOut = "Choose a check-out date.";
  if (v.checkIn && v.checkOut && v.checkOut <= v.checkIn) errors.checkOut = "Check-out must be after check-in.";
  return errors;
}

export default function EnquiryForm() {
  const [values, setValues] = useState<Values>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  // Honeypot: hidden from people, filled in by form-spamming bots.
  const [trap, setTrap] = useState("");

  useEffect(() => {
    const onPrefill = (e: Event) => {
      const detail = (e as CustomEvent<Prefill>).detail;
      setValues((v) => ({
        ...v,
        checkIn: detail.checkIn || v.checkIn,
        checkOut: detail.checkOut || v.checkOut,
        guests: detail.guests || v.guests,
      }));
    };
    window.addEventListener(PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(PREFILL_EVENT, onPrefill);
  }, []);

  const set = (key: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setStatus("sending");
    setMessage("");
    try {
      const res = await fetch(`${API_BASE}/enquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website: trap }),
      });
      // Parse defensively: a proxy or host error page is HTML, not JSON.
      const text = await res.text();
      let json: { ok?: boolean; error?: string } = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = {};
      }
      if (!res.ok || !json.ok) throw new Error(json.error || SEND_FAILED);
      setStatus("sent");
      setMessage("Enquiry sent. We will reply within a day.");
      setValues(empty);
    } catch (err) {
      setStatus("error");
      // fetch() itself rejects with a TypeError when the network is down.
      setMessage(err instanceof Error && !(err instanceof TypeError) ? err.message : SEND_FAILED);
    }
  };

  return (
    <form className="form" onSubmit={onSubmit} noValidate data-testid="enquiry-form">
      <div className="form-row">
        <div className="field">
          <label htmlFor="enq-name">Name</label>
          <input id="enq-name" name="name" autoComplete="name" value={values.name} onChange={set("name")} />
          {errors.name && <span className="field-error">{errors.name}</span>}
        </div>
        <div className="field">
          <label htmlFor="enq-phone">Phone</label>
          <input id="enq-phone" name="phone" type="tel" autoComplete="tel" value={values.phone} onChange={set("phone")} />
          {errors.phone && <span className="field-error">{errors.phone}</span>}
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="enq-email">Email</label>
          <input id="enq-email" name="email" type="email" autoComplete="email" value={values.email} onChange={set("email")} />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </div>
        <div className="field">
          <label htmlFor="enq-stay">Which stay</label>
          <select id="enq-stay" name="stay" value={values.stay} onChange={set("stay")}>
            <option value="">Choose one</option>
            {enquiryOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {errors.stay && <span className="field-error">{errors.stay}</span>}
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="enq-in">Check-in</label>
          <input id="enq-in" name="checkIn" type="date" value={values.checkIn} onChange={set("checkIn")} />
          {errors.checkIn && <span className="field-error">{errors.checkIn}</span>}
        </div>
        <div className="field">
          <label htmlFor="enq-out">Check-out</label>
          <input id="enq-out" name="checkOut" type="date" value={values.checkOut} onChange={set("checkOut")} />
          {errors.checkOut && <span className="field-error">{errors.checkOut}</span>}
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="enq-guests">Guests</label>
          <select id="enq-guests" name="guests" value={values.guests} onChange={set("guests")}>
            {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={String(n)}>
                {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="enq-notes">Anything we should know</label>
        <textarea
          id="enq-notes"
          name="notes"
          rows={4}
          placeholder="Allergies, a birthday, an early arrival, a preference for quiet"
          value={values.notes}
          onChange={set("notes")}
        />
      </div>
      <div className="hp" aria-hidden="true">
        <label htmlFor="enq-website">Leave this field empty</label>
        <input
          id="enq-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={trap}
          onChange={(e) => setTrap(e.target.value)}
        />
      </div>
      <div className="form-foot">
        <button type="submit" className="btn btn-paper" disabled={status === "sending"}>
          {status === "sending" ? "Sending" : "Send enquiry"}
        </button>
        {message && (
          <p className={`form-status ${status === "sent" ? "is-ok" : "is-error"}`} role="status" aria-live="polite">
            {message}
          </p>
        )}
      </div>
    </form>
  );
}
