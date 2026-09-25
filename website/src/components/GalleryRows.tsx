// The gallery as justified rows: every photo is shown whole (each tile has the
// photo's own shape, so nothing is cropped), and every row, the last included,
// runs exactly edge to edge.
//
// Which photos share a row depends on the width, so the rows are worked out
// here, at build time, for three widths (phone, tablet, desktop) and all three
// are sent; CSS container queries show the one that fits. Row heights come from
// the container's width (cqw), so each set stays exact anywhere in its range.
// Nothing is measured in the browser: no reflow once the page loads, and the
// tiles stay put (so the scroll reveal and keyboard focus survive a resize).
// Photos in the hidden sets are never downloaded (lazy images that aren't shown).
import Photo from "./Photo";
import ViewPhoto from "./lightbox/ViewPhoto";
import { gallery } from "@/lib/content";

const aspects = gallery.map((g) => g.image.w / g.image.h);

// One layout per container-width band, worked out for a typical width in it.
// The bands match the @container rules for .gallery-band in globals.css.
const BANDS = [
  { name: "s", width: 360, target: 150, gap: 8 }, // under 600px
  { name: "m", width: 720, target: 200, gap: 12 }, // 600-899px
  { name: "l", width: 1296, target: 250, gap: 16 }, // 900px and up
] as const;

/**
 * Splits photos [from, to) into rows whose heights come out as close as
 * possible to the target (dynamic programming over where each row breaks).
 */
function breakRows(from: number, to: number, width: number, target: number, gap: number): number[][] {
  const n = to - from;
  const best = new Array<number>(n + 1).fill(Infinity);
  const start = new Array<number>(n + 1).fill(0);
  best[0] = 0;
  for (let j = 1; j <= n; j++) {
    let sum = 0;
    for (let i = j - 1; i >= 0 && j - i <= 6; i--) {
      sum += aspects[from + i];
      const height = (width - gap * (j - i - 1)) / sum;
      // one tall photo alone on a row would be huge: avoid it
      const cost = best[i] + ((height - target) / target) ** 2 + (height > target * 1.8 ? 50 : 0);
      if (cost < best[j]) {
        best[j] = cost;
        start[j] = i;
      }
    }
  }
  const rows: number[][] = [];
  for (let j = n; j > 0; j = start[j]) {
    rows.unshift(Array.from({ length: j - start[j] }, (_, k) => from + start[j] + k));
  }
  return rows;
}

/** The featured photo leads, bigger: on its own on phones, with one companion on wider screens. */
function layout(band: (typeof BANDS)[number]): number[][] {
  const lead = band.name === "s" ? [0] : [0, 1];
  return [lead, ...breakRows(lead.length, gallery.length, band.width, band.target, band.gap)];
}

export default function GalleryRows() {
  return (
    <div className="gallery-rows">
      {BANDS.map((band) => (
        <div key={band.name} className={`gallery-band gallery-band-${band.name}`}>
          {layout(band).map((row) => {
            const sum = row.reduce((s, i) => s + aspects[i], 0);
            return (
              <div
                key={row.join("-")}
                className="gallery-row"
                // (row width - the gaps) / (sum of the photos' aspect ratios) = the height at which they fill it exactly
                style={{ height: `calc((100cqw - var(--gallery-gap) * ${row.length - 1}) / ${sum.toFixed(4)})` }}
              >
                {row.map((i) => {
                  const item = gallery[i];
                  return (
                    <ViewPhoto
                      key={item.image.src}
                      group="gallery"
                      index={i}
                      label={item.caption}
                      className={`gallery-tile${item.feature ? " is-feature" : ""}`}
                      style={{ flex: `${aspects[i].toFixed(4)} 1 0` }}
                    >
                      <Photo src={item.image.src} alt={item.image.alt} />
                      {item.feature && <span className="gallery-caption">{item.caption}</span>}
                    </ViewPhoto>
                  );
                })}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
