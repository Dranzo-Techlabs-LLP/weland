"use client";

// The gallery as justified rows: every photo is shown whole (each tile has the
// photo's own shape, so nothing is cropped), and every row, the last included,
// runs exactly edge to edge. Row heights come from CSS (container query width),
// so they're exact at any size; this component only decides which photos share
// a row, for the width it has, and re-decides when that changes.
import { useEffect, useRef, useState } from "react";
import Photo from "./Photo";
import ViewPhoto from "./lightbox/ViewPhoto";
import { gallery } from "@/lib/content";

const aspects = gallery.map((g) => g.image.w / g.image.h);

// Before the page knows its width (the static HTML), lay out for desktop.
const DEFAULT_WIDTH = 1296;

function sizing(width: number) {
  if (width < 600) return { target: 150, gap: 8 };
  if (width < 900) return { target: 200, gap: 12 };
  return { target: 250, gap: 16 };
}

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

function layout(width: number): number[][] {
  const { target, gap } = sizing(width);
  // The featured photo leads, bigger: on its own on phones, with one companion on wider screens.
  const lead = width < 600 ? [0] : [0, 1];
  return [lead, ...breakRows(lead.length, gallery.length, width, target, gap)];
}

export default function GalleryRows() {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setWidth(Math.round(el.clientWidth));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rows = layout(width);

  return (
    <div ref={box} className="gallery-rows">
      {rows.map((row) => {
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
  );
}
