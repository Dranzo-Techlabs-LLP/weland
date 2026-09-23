"use client";

// "Above the mist": scrolling through this section starts inside a morning
// cloud, then sinks it into the valley; the resort's hilltop comes up through
// the fog until We Land stands clear above it, in a real aerial photograph.
//
// - The clouds are volumetric (CloudCanvas, WebGL2) and start building when the
//   section is about a screen and a half away (but never before the page has
//   finished loading); they draw only while on screen.
// - Until they're ready, and on devices without WebGL2, a soft CSS mist does
//   the same job over the same photo.
// - Reduced motion: no flight and no clouds; the photo, still, with all three lines.
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import CloudCanvas, { type MistView } from "./CloudCanvas";
import { mist } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Where the photo is anchored when cropped, and where the main building's roof
// sits in it, both as fractions of the photo.
const PHOTO_POSITION = { x: 0.64, y: 0.45 };
const RESORT_IN_PHOTO = { x: 0.642, y: 0.33 };
// The photo scales up by this much over the section: the camera closing in.
const ZOOM = 0.14;

type Mode = "pending" | "clouds" | "simple";

function hasWebGL2(): boolean {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/** Runs `fn` once the page has finished loading and the browser has a moment spare. */
function afterLoad(fn: () => void): () => void {
  let cancelled = false;
  let idle = 0;
  let timer = 0;
  const go = () => {
    if (!cancelled) fn();
  };
  const schedule = () => {
    // (Safari has no requestIdleCallback)
    if (typeof requestIdleCallback === "function") idle = requestIdleCallback(go, { timeout: 1000 });
    else timer = window.setTimeout(go, 200);
  };
  if (document.readyState === "complete") schedule();
  else window.addEventListener("load", schedule, { once: true });
  return () => {
    cancelled = true;
    window.removeEventListener("load", schedule);
    if (idle) cancelIdleCallback(idle);
    clearTimeout(timer);
  };
}

/** "*…*" in the copy marks the words set in italics. */
function withEmphasis(text: string) {
  return text.split("*").map((part, i) => (i % 2 ? <em key={i}>{part}</em> : part));
}

export default function MistSection() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const photo = useRef<HTMLImageElement>(null);
  const label = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const view = useRef<MistView>({ focus: { x: 0, y: 0 }, photo: { x: 0, y: 0, w: 1, h: 1 } });
  const [mode, setMode] = useState<Mode>("pending");
  const [reduced, setReduced] = useState(false);
  const [near, setNear] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(motion.matches);
    sync();
    motion.addEventListener("change", sync);
    setMode(hasWebGL2() ? "clouds" : "simple");

    const el = section.current;
    if (!el) return;
    let stopWaiting = () => {};
    const approach = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          approach.disconnect();
          // The section sits close to the top, so this can fire while the page
          // is still loading: build the fog after that, never alongside it.
          stopWaiting = afterLoad(() => setNear(true));
        }
      },
      { rootMargin: "150% 0px" },
    );
    const visible = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting));
    approach.observe(el);
    visible.observe(el);
    return () => {
      motion.removeEventListener("change", sync);
      approach.disconnect();
      visible.disconnect();
      stopWaiting();
    };
  }, []);

  // Pin the label (and the zoom's centre, and the clouds' opening) to the
  // resort, wherever the cropped photo puts it on this screen.
  useEffect(() => {
    const place = () => {
      const img = photo.current;
      const box = stage.current;
      if (!img || !box) return;
      const W = box.clientWidth;
      const H = box.clientHeight;
      const iw = img.naturalWidth || 2000;
      const ih = img.naturalHeight || 1500;
      const s = Math.max(W / iw, H / ih);
      const left = (W - iw * s) * PHOTO_POSITION.x;
      const top = (H - ih * s) * PHOTO_POSITION.y;
      const x = left + RESORT_IN_PHOTO.x * iw * s;
      const y = top + RESORT_IN_PHOTO.y * ih * s;
      view.current = { focus: { x, y }, photo: { x: left, y: top, w: iw * s, h: ih * s } };
      img.style.transformOrigin = `${x}px ${y}px`;
      if (label.current) label.current.style.transform = `translate(${x}px, ${y}px)`;
    };
    place();
    const img = photo.current;
    img?.addEventListener("load", place);
    const observer = new ResizeObserver(place);
    if (stage.current) observer.observe(stage.current);
    return () => {
      img?.removeEventListener("load", place);
      observer.disconnect();
    };
  }, []);

  // The flight. Positions are fractions of the section's scroll length.
  useGSAP(
    () => {
      if (reduced) {
        progress.current = 1;
        return;
      }
      const el = section.current;
      if (!el) return;
      const beats = gsap.utils.toArray<HTMLElement>(".mist-beat", el);
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.6 },
        // the fog follows the timeline (not the raw scroll), so it moves with the photo
        onUpdate(this: gsap.core.Timeline) {
          progress.current = this.progress();
        },
      });
      // The camera closes in: the resort draws a little nearer the whole way.
      tl.fromTo(photo.current, { scale: 1 }, { scale: 1 + ZOOM, duration: 1 }, 0)
        // the simple mist, for when the volumetric clouds aren't (yet) there
        .fromTo(".mist-veil", { opacity: 1 }, { opacity: 0, duration: 0.7 }, 0.18)
        .to(beats[0], { opacity: 0, y: -18, duration: 0.07 }, 0.26)
        .fromTo(beats[1], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.07 }, 0.33)
        .to(beats[1], { opacity: 0, y: -18, duration: 0.07 }, 0.58)
        .fromTo(beats[2], { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.08 }, 0.66)
        .fromTo(label.current, { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.82)
        .set({}, {}, 1);
    },
    { scope: section, dependencies: [reduced], revertOnUpdate: true },
  );

  const clouds = mode === "clouds" && near && !reduced;

  return (
    <section ref={section} id="above-the-mist" className="mist" aria-labelledby="mist-title">
      <div ref={stage} className={`mist-stage${ready ? " is-clouded" : ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={photo}
          className="mist-photo"
          src="/images/aerial-resort.jpg"
          alt="We Land Resort from the air: the main building and the pool on the hilltop, forest falling away below and mist along the ridge"
          loading="lazy"
          decoding="async"
        />
        <div className="mist-veil" aria-hidden="true" />
        {clouds && (
          <CloudCanvas
            progress={progress}
            view={view}
            zoom={ZOOM}
            active={onScreen}
            onReady={() => setReady(true)}
            onFail={() => setMode("simple")}
          />
        )}
        <div className="mist-scrim" />
        <div className="wrap mist-copy">
          <p className="mist-beat">{withEmphasis(mist.beats[0])}</p>
          <p className="mist-beat">{withEmphasis(mist.beats[1])}</p>
          <h2 id="mist-title" className="mist-beat">
            {withEmphasis(mist.beats[2])}
          </h2>
        </div>
        <div ref={label} className="mist-label" aria-hidden="true">
          <span>{mist.label}</span>
        </div>
      </div>
    </section>
  );
}
