import Photo from "./Photo";
import { images, site } from "@/lib/content";

export default function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-panel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo-512.png"
          alt={`${site.name}, ${site.locationShort}`}
          className="hero-logo"
          width={512}
          height={512}
          fetchPriority="high"
        />
        <h1 id="hero-title" className="hero-display">
          A hilltop in Kakkadampoyil, <em>above the mist.</em>
        </h1>
        <p className="hero-note">
          An infinity pool facing the mountains, a sky deck that walks out over the valley, six
          rooms and a dormitory for groups, and evenings around a fire.
        </p>
        <div className="hero-actions">
          <a href="#enquire" className="btn btn-primary">
            Reserve a stay
          </a>
          <a href="#stays" className="btn btn-ghost">
            See the stays
          </a>
        </div>
      </div>
      <div className="hero-media">
        {/* Taller than the frame; ScrollMotion drifts it for depth as the page scrolls */}
        <div className="hero-media-inner" data-hero-parallax>
          <Photo src={images.hero.src} alt={images.hero.alt} priority />
        </div>
      </div>
    </section>
  );
}
