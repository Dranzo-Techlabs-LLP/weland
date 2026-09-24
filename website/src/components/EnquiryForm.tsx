"use client";

import { useEffect, useState } from "react";
import { GUEST_OPTIONS, PREFILL_EVENT, type Prefill } from "./BookingStrip";
import WhatsAppIcon from "./WhatsAppIcon";
import { enquiryOptions, site } from "@/lib/content";

// Sending opens WhatsApp with the enquiry written out, addressed to the
// resort's booking number; the guest presses send there. A copy also goes to
// the PHP API (server/api, at /api on the same domain), which emails it when
// the server has ENQUIRY_TO_EMAIL set and logs it otherwise, so nothing is lost
// if the guest never presses send. NEXT_PUBLIC_API_BASE is only for `npm run dev`.
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "/api").replace(/\/$/, "");

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

/** "2026-10-10" -> "Sat, 10 Oct 2026", read as a calendar date (no time zone shift) */
function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function nights(checkIn: string, checkOut: string) {
  const day = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((day(checkOut) - day(checkIn)) / 86_400_000);
}

/** The enquiry as a WhatsApp message (*...* is bold in WhatsApp). */
function enquiryMessage(v: Values) {
  const n = nights(v.checkIn, v.checkOut);
  return [
    `Hello ${site.name}! I'd like to enquire about a stay.`,
    "",
    `*Name:* ${v.name.trim()}`,
    `*Phone:* ${v.phone.trim()}`,
    `*Email:* ${v.email.trim()}`,
    `*Stay:* ${v.stay}`,
    `*Check-in:* ${longDate(v.checkIn)}`,
    `*Check-out:* ${longDate(v.checkOut)} (${n} ${n === 1 ? "night" : "nights"})`,
    `*Guests:* ${v.guests}`,
    ...(v.notes.trim() ? [`*Notes:* ${v.notes.trim()}`] : []),
  ].join("\n");
}

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
  // the WhatsApp link for the last enquiry sent, kept so it can be opened again
  const [sent, setSent] = useState<{ link: string; opened: boolean } | null>(null);
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    const link = `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(enquiryMessage(values))}`;
    // Open WhatsApp straight away, while this is still the click: browsers block
    // pop-ups opened later. Bots (the honeypot filled in) get nowhere.
    let opened = false;
    if (!trap) {
      const tab = window.open(link, "_blank");
      opened = Boolean(tab);
      if (tab) tab.opener = null;
    }
    setSent({ link, opened });

    // The copy for the resort's records. keepalive lets it finish even if the
    // guest's phone switches to the WhatsApp app right away.
    fetch(`${API_BASE}/enquiry`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, website: trap }),
      keepalive: true,
    }).catch(() => {});
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
            {GUEST_OPTIONS.map((n) => (
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
        <button type="submit" className="btn btn-paper btn-wa">
          <WhatsAppIcon size={18} className="wa-green" />
          Send enquiry
        </button>
        <p className="form-hint">Opens WhatsApp with your details filled in, ready to send to us.</p>
        <p className="form-status is-ok" role="status" aria-live="polite">
          {sent && (
            <>
              {sent.opened
                ? "WhatsApp has opened with your enquiry. Press send there and we will reply soon."
                : "Your enquiry is ready in WhatsApp."}{" "}
              <a href={sent.link} target="_blank" rel="noreferrer">
                {sent.opened ? "Open it again" : "Open WhatsApp to send it"}
              </a>
            </>
          )}
        </p>
      </div>
    </form>
  );
}
