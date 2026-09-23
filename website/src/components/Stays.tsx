import Photo from "./Photo";
import Placeholder from "./Placeholder";
import { stays } from "@/lib/content";

function sentence(items: string[]) {
  const lower = items.map((s, i) => (i === 0 ? s : s.charAt(0).toLowerCase() + s.slice(1)));
  if (lower.length <= 1) return lower.join("");
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}.`;
}

export default function Stays() {
  return (
    <section id="stays" className="stays" aria-labelledby="stays-title">
      <div className="wrap">
        <div className="stays-head">
          <h2 id="stays-title" className="section-title">
            Six rooms and <em>a dormitory.</em>
          </h2>
          <p className="lede">
            The rooms share the main building, the rooftop and the pool. The dormitory is a
            separate block below, with bunk beds and its own deck for groups. Both come with the
            run of the grounds: the sky deck, the play area, the campfire lawn.
          </p>
        </div>

        <div>
          {stays.map((stay) => (
            <article key={stay.slug} className="stay" id={stay.slug}>
              <div className="stay-media">
                <div className="stay-main">
                  {stay.image ? (
                    <Photo src={stay.image.src} alt={stay.image.alt} />
                  ) : (
                    <Placeholder caption={stay.placeholderCaption} seed={stay.slug} />
                  )}
                </div>
                {stay.extras.length > 0 && (
                  <ul className="stay-extras">
                    {stay.extras.map((x) => (
                      <li key={x.src}>
                        <figure>
                          <div className="stay-extra">
                            <Photo src={x.src} alt={x.alt} />
                          </div>
                          <figcaption>{x.caption}</figcaption>
                        </figure>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="stay-body">
                <h3 className="stay-name">{stay.name}</h3>
                <p className="stay-summary">{stay.summary}</p>
                <p className="stay-desc">{stay.description}</p>
                <dl className="stay-specs">
                  <dt>Count</dt>
                  <dd>{stay.count}</dd>
                  <dt>Sleeps</dt>
                  <dd>{stay.sleeps}</dd>
                  <dt>Bathroom</dt>
                  <dd>{stay.bathroom}</dd>
                  <dt>View</dt>
                  <dd>{stay.view}</dd>
                  <dt>Includes</dt>
                  <dd>{sentence(stay.highlights)}</dd>
                </dl>
                <div className="stay-foot">
                  <p className="stay-price">
                    <strong>{stay.fromPrice}</strong> {stay.priceUnit}
                  </p>
                  <a href="#enquire" className="text-link">
                    Enquire about {stay.name.toLowerCase()}
                  </a>
                </div>
              </div>

              {stay.units && (
                <div className="units">
                  <h4 className="units-title">Room by room</h4>
                  <p className="units-hint">Swipe to see all {stay.units.length} rooms.</p>
                  {/* focusable so the row can be scrolled from the keyboard when it becomes a carousel */}
                  <ul className="units-grid" tabIndex={0} aria-label="The rooms, one by one">
                    {stay.units.map((u) => (
                      <li key={u.id} className="unit">
                        <div className="unit-media">
                          <Photo src={u.image.src} alt={u.image.alt} />
                        </div>
                        <h5 className="unit-name">{u.name}</h5>
                        <p className="unit-note">{u.note}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
