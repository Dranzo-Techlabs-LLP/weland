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
              <Phone size={18} aria-hidden="true" />
              <a href={site.phoneHref}>{site.phone}</a>
            </li>
            <li>
              <MessageCircle size={18} aria-hidden="true" />
              <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noreferrer">
                Message us on WhatsApp
              </a>
            </li>
            <li>
              <Mail size={18} aria-hidden="true" />
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </li>
          </ul>
        </div>
        <EnquiryForm />
      </div>
    </section>
  );
}
