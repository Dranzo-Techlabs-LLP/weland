import Photo from "./Photo";
import Placeholder from "./Placeholder";
import { conference } from "@/lib/content";

export default function Conference() {
  return (
    <section id="conference" className="conference" aria-labelledby="conference-title">
      <div className="wrap conference-grid">
        <div className="conference-body">
          <h2 id="conference-title" className="section-title">
            {conference.title}
          </h2>
          <p className="conference-text">{conference.text}</p>
          <dl className="conference-facts">
            {conference.facts.map(([label, value]) => (
              <div key={label} className="conference-fact">
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <a href="#enquire" className="btn btn-ghost">
            Enquire about the hall
          </a>
        </div>
        <div className="conference-media">
          <div className="conference-main">
            {conference.image ? (
              <Photo src={conference.image.src} alt={conference.image.alt} />
            ) : (
              <Placeholder caption={conference.placeholderCaption} seed="conference-hall" />
            )}
          </div>
          {conference.extras.length > 0 && (
            <ul className="conference-extras">
              {conference.extras.map((x) => (
                <li key={x.src}>
                  <figure>
                    <div className="conference-extra">
                      <Photo src={x.src} alt={x.alt} />
                    </div>
                    <figcaption>{x.caption}</figcaption>
                  </figure>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
