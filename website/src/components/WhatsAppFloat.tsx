import WhatsAppIcon from "./WhatsAppIcon";
import { site } from "@/lib/content";

export default function WhatsAppFloat() {
  return (
    <a
      href={site.whatsappHref}
      target="_blank"
      rel="noreferrer"
      className="wa"
      aria-label={`Message ${site.name} on WhatsApp`}
    >
      <span className="wa-icon">
        <WhatsAppIcon size={20} />
      </span>
      <span className="wa-label">WhatsApp</span>
    </a>
  );
}
