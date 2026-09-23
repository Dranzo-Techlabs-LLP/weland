import { MessageCircle } from "lucide-react";
import { site } from "@/lib/content";

export default function WhatsAppFloat() {
  return (
    <a
      href={`https://wa.me/${site.whatsapp}`}
      target="_blank"
      rel="noreferrer"
      className="wa"
      aria-label={`Message ${site.name} on WhatsApp`}
    >
      <MessageCircle size={20} aria-hidden="true" />
      WhatsApp
    </a>
  );
}
