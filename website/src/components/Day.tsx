import { day, site } from "@/lib/content";

export default function Day() {
  return (
    <section id="day" className="wrap day" aria-labelledby="day-title">
      <div className="day-intro">
        <h2 id="day-title" className="section-title">
          A day at {site.shortName}, <em>if you want one.</em>
        </h2>
        <p className="lede">
          This is roughly how a full day runs. Skip any of it. The only fixed times are the ones
          the kitchen needs.
        </p>
      </div>
      <ol className="day-list">
        {day.map((item) => (
          <li key={item.time} className="day-item">
            <time className="day-time">{item.time}</time>
            <div>
              <h3 className="day-title">{item.title}</h3>
              <p className="day-text">{item.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
