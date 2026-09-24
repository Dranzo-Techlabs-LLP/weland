import { Mail, Phone } from "lucide-react";
import EnquiryForm from "./EnquiryForm";
import WhatsAppIcon from "./WhatsAppIcon";
import { site } from "@/lib/content";

export default function Enquire() {
  return (
    <section id="enquire" className="enquire" aria-labelledby="enquire-title">
      <div className="wrap enquire-grid">
        <div className="enquire-intro">
          <h2 id="enquire-title" className="section-title">
            Tell us your dates. <em>We reply within a day.</em>
          </h2>
          <p className="lede">
            There is no instant booking here on purpose. Send the form and someone who knows the
            place will come back to you with availability, a rate, and honest advice on which stay
            suits your group.
          </p>
          <ul className="contact-list">
            <li>
              <a className="contact-link" href={site.phoneHref}>
                <Phone size={18} aria-hidden="true" />
                <span>
                  {site.phone}
                  <small>Bookings and enquiries</small>
                </span>
              </a>
            </li>
            <li>
              <a className="contact-link" href={site.whatsappHref} target="_blank" rel="noreferrer">
                <WhatsAppIcon size={20} className="wa-green" />
                <span>
                  Message us on WhatsApp
                  <small>{site.phone}</small>
                </span>
              </a>
            </li>
            <li>
              <a className="contact-link" href={`mailto:${site.email}`}>
                <Mail size={18} aria-hidden="true" />
                <span>{site.email}</span>
              </a>
            </li>
          </ul>
        </div>
        <EnquiryForm />
      </div>
    </section>
  );
}
