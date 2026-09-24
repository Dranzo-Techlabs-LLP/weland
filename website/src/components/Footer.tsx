import InstagramIcon from "./InstagramIcon";
import { nav, site } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <a href="#top" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/emblem.png" alt="" className="brand-mark" width={92} height={92} />
          <span>
            {site.shortName}
            <small>{site.suffix}</small>
          </span>
        </a>
        <nav className="footer-nav" aria-label="Footer">
          {nav.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
          <a href="#enquire">Enquire</a>
          <a href={site.instagram.href} className="footer-insta" target="_blank" rel="noreferrer">
            <InstagramIcon size={16} />
            Instagram
          </a>
        </nav>
        <p className="footer-small">
          © {new Date().getFullYear()} {site.name}. {site.location}. Check-in {site.checkIn}, check-out {site.checkOut}.
        </p>
      </div>
    </footer>
  );
}
