import Photo from "./Photo";
import { dining, images } from "@/lib/content";

export default function Dining() {
  return (
    <section id="dining" className="dining" aria-labelledby="dining-title">
      <div className="wrap dining-grid">
        <div className="dining-media">
          <Photo src={images.dining.src} alt={images.dining.alt} />
        </div>
        <div className="dining-body">
          <h2 id="dining-title" className="section-title">
            {dining.title}
          </h2>
          <p className="dining-text">{dining.text}</p>
          <ul className="dining-notes">
            {dining.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
