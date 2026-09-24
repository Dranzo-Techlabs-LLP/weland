"use client";

import { useState } from "react";

export interface Prefill {
  checkIn: string;
  checkOut: string;
  guests: string;
}

export const PREFILL_EVENT = "weland:prefill";

/** Guest counts to choose from: enough for the whole dormitory (16) and more. */
export const GUEST_OPTIONS = Array.from({ length: 30 }, (_, i) => i + 1);

function addDays(iso: string, days: number) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function BookingStrip() {
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const detail: Prefill = { checkIn, checkOut, guests };
    window.dispatchEvent(new CustomEvent(PREFILL_EVENT, { detail }));
    const target = document.getElementById("enquire");
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      document.getElementById("enq-name")?.focus({ preventScroll: true });
    }, 700);
  };

  return (
    <section className="strip" aria-label="Check availability">
      <form className="wrap strip-form" onSubmit={onSubmit} data-testid="booking-strip">
        <div className="strip-field">
          <label htmlFor="strip-in">Check-in</label>
          <input
            id="strip-in"
            type="date"
            value={checkIn}
            onChange={(e) => {
              setCheckIn(e.target.value);
              if (checkOut && checkOut <= e.target.value) setCheckOut(addDays(e.target.value, 1));
            }}
          />
        </div>
        <div className="strip-field">
          <label htmlFor="strip-out">Check-out</label>
          <input
            id="strip-out"
            type="date"
            min={checkIn ? addDays(checkIn, 1) : undefined}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>
        <div className="strip-field">
          <label htmlFor="strip-guests">Guests</label>
          <select id="strip-guests" value={guests} onChange={(e) => setGuests(e.target.value)}>
            {GUEST_OPTIONS.map((n) => (
              <option key={n} value={String(n)}>
                {n} {n === 1 ? "guest" : "guests"}
              </option>
            ))}
          </select>
        </div>
        <div className="strip-submit">
          <button type="submit" className="btn btn-primary" data-testid="check-availability">
            Check availability
          </button>
        </div>
      </form>
    </section>
  );
}
