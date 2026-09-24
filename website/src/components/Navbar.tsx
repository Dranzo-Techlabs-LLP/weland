"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { nav, site } from "@/lib/content";
import InstagramIcon from "./InstagramIcon";
import WhatsAppIcon from "./WhatsAppIcon";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`nav${scrolled ? " is-scrolled" : ""}`}>
      <div className="wrap nav-inner">
        <a href="#top" className="brand" aria-label={`${site.name}, back to top`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/emblem.png" alt="" className="brand-mark" width={92} height={92} />
          <span>
            {site.shortName}
            <small>{site.suffix}</small>
          </span>
        </a>

        {/* Inline links from 1200px; below that they're in the menu */}
        <nav className="nav-links" aria-label="Main">
          {nav.map((item) => (
            <a key={item.href} href={item.href} className="nav-link">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <a href="#enquire" className="btn btn-primary nav-cta">
            Reserve a stay
          </a>
          <button
            type="button"
            className="nav-toggle"
            aria-label="Open menu"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {open && (
        <div className="menu" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="menu-head">
            <a href="#top" className="brand" onClick={() => setOpen(false)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/emblem.png" alt="" className="brand-mark" width={92} height={92} />
              <span>
                {site.shortName}
                <small>{site.suffix}</small>
              </span>
            </a>
            <button type="button" className="nav-toggle" aria-label="Close menu" onClick={() => setOpen(false)}>
              <X size={26} />
            </button>
          </div>
          <nav className="menu-list" aria-label="Main">
            {nav.map((item) => (
              <a key={item.href} href={item.href} className="menu-link" onClick={() => setOpen(false)}>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="menu-foot">
            <a href="#enquire" className="btn btn-paper" onClick={() => setOpen(false)}>
              Reserve a stay
            </a>
            <a href={site.phoneHref}>Call {site.phone}</a>
            <a href={site.whatsappHref} className="menu-wa" target="_blank" rel="noreferrer">
              <WhatsAppIcon size={18} className="wa-green" />
              WhatsApp us
            </a>
            <a href={site.instagram.href} className="menu-wa" target="_blank" rel="noreferrer">
              <InstagramIcon size={18} />
              {site.instagram.handle} on Instagram
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
