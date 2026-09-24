import GalleryRows from "./GalleryRows";

export default function Gallery() {
  return (
    <section id="gallery" className="wrap gallery" aria-labelledby="gallery-title">
      <div className="gallery-head">
        <h2 id="gallery-title" className="section-title">
          Around the grounds
        </h2>
        <p className="muted">From the sky deck to the campfire lawn. Tap any photo to see it full size.</p>
      </div>
      <GalleryRows />
    </section>
  );
}
