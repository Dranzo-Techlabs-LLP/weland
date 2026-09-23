import Photo from "./Photo";
import Placeholder from "./Placeholder";
import { gallery } from "@/lib/content";

export default function Gallery() {
  return (
    <section id="gallery" className="wrap gallery" aria-labelledby="gallery-title">
      <div className="gallery-head">
        <h2 id="gallery-title" className="section-title">
          Around the grounds
        </h2>
        <p className="muted">From the sky deck to the campfire lawn.</p>
      </div>
      <ul className="gallery-grid">
        {gallery.map((item) => (
          <li
            key={item.caption}
            className={`gallery-item${item.wide ? " is-wide" : ""}${item.tall ? " is-tall" : ""}`}
          >
            {item.image ? (
              <Photo src={item.image.src} alt={item.image.alt} />
            ) : (
              <Placeholder caption={`Photo: ${item.caption}`} seed={`gallery-${item.caption}`} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
