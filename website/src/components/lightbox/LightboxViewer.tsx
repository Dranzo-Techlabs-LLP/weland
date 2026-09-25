"use client";

// The full-screen viewer: swipe or arrow keys between photos, pinch or
// double-tap to zoom, a caption and "3 / 15" counter, Esc or tap outside to close.
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import type { Slide } from "@/lib/content";

export default function LightboxViewer({
  slides,
  index,
  onClose,
}: {
  slides: Slide[];
  index: number;
  onClose: () => void;
}) {
  return (
    <Lightbox
      open
      index={index}
      close={onClose}
      // the caption sits under the photo; the counter has the top corner
      slides={slides.map((s) => ({ src: s.src, alt: s.alt, description: s.caption, width: s.w, height: s.h }))}
      plugins={[Captions, Counter, Zoom]}
      carousel={{ finite: false, preload: 2 }}
      controller={{ closeOnBackdropClick: true, closeOnPullDown: true }}
      captions={{ descriptionTextAlign: "center", descriptionMaxLines: 5 }}
      zoom={{ maxZoomPixelRatio: 2 }}
      className="photo-viewer"
    />
  );
}
