import { site } from "@/lib/content";

export default function About() {
  return (
    <section className="wrap about" aria-labelledby="about-title">
      <div className="about-grid">
        <dl className="about-facts">
          <dt>Where</dt>
          <dd>{site.location}</dd>
          <dt>Stays</dt>
          <dd>6 rooms and a dormitory</dd>
          <dt>Events</dt>
          <dd>Conference hall</dd>
          <dt>Pool</dt>
          <dd>Infinity pool over the valley</dd>
          <dt>Check-in</dt>
          <dd>{site.checkIn}</dd>
          <dt>Check-out</dt>
          <dd>{site.checkOut}</dd>
        </dl>
        <div className="about-body">
          <h2 id="about-title" className="about-claim">
            Built on a ridge in Kakkadampoyil, where the clouds come up to meet you.
          </h2>
          <p className="about-text">{site.description}</p>
          <p className="about-text">
            Kakkadampoyil sits at the edge of the Western Ghats, forty-five minutes above Kozhikode,
            and is known for exactly what you see from the deck: mist filling the valley at dawn,
            waterfalls a short drive away, and sunsets over ridge after ridge. The resort is small
            enough that the kitchen knows how you take your coffee by the second morning.
          </p>
        </div>
      </div>
    </section>
  );
}
