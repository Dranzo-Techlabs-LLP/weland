import { Mail, MessageCircle, Phone } from "lucide-react";
import EnquiryForm from "./EnquiryForm";
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
                <span>{site.phone}</span>
              </a>
            </li>
            <li>
              <a className="contact-link" href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noreferrer">
                <MessageCircle size={18} aria-hidden="true" />
                <span>Message us on WhatsApp</span>
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
