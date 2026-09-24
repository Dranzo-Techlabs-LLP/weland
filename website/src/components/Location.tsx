import { routes, site } from "@/lib/content";

export default function Location() {
  return (
    <section id="location" className="location" aria-labelledby="location-title">
      <div className="wrap location-grid">
        <div className="location-body">
          <h2 id="location-title" className="section-title">
            Getting here
          </h2>
          <address className="address">
            {site.address.map((line) => (
              <span key={line} style={{ display: "block" }}>
                {line}
              </span>
            ))}
          </address>
          <table className="routes">
            <thead>
              <tr>
                <th scope="col">From</th>
                <th scope="col">How</th>
                <th scope="col">Time</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((r) => (
                <tr key={r.from}>
                  <td>{r.from}</td>
                  <td>{r.how}</td>
                  <td>{r.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">
            The last stretch up to Kakkadampoyil is a hill road. Send us your arrival time and we
            will arrange a pick-up from the airport or station.{" "}
            <a href={site.mapsHref} className="text-link" target="_blank" rel="noreferrer">
              Open in Google Maps
            </a>
          </p>
        </div>
        <div className="map">
          <iframe
            title="Map: We Land Resort, Foggy Mountain, Kakkadampoyil"
            src={site.mapEmbed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </section>
  );
}
