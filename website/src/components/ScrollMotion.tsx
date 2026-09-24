"use client";

// Page-wide scroll effects. Renders nothing; every effect works on markup the
// server already rendered, so the page reads the same without JavaScript.
//
//   hero      the photo drifts slower than the page (and leans from the cursor)
//   photos    big photos stand up from a slight tilt as they come into view
//   reveals   gallery tiles and room cards settle into place, once
//
// Reduced motion drops all of them: none of it carries information.
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, CustomEase, useGSAP);

type Cleanup = (() => void) | void;

function heroDepth(finePointer: boolean): Cleanup {
  const inner = document.querySelector<HTMLElement>("[data-hero-parallax]");
  const hero = document.querySelector<HTMLElement>(".hero");
  const frame = inner?.parentElement;
  if (!inner || !hero || !frame) return;

  // Moving slower than the page makes the photo read as further away.
  gsap.to(inner, {
    yPercent: 6.5,
    ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true },
  });

  if (!finePointer) return;
  const img = inner.querySelector("img");
  if (!img) return;
  gsap.set(img, { scale: 1.05 });
  const toX = gsap.quickTo(img, "x", { duration: 0.9, ease: "out" });
  const toY = gsap.quickTo(img, "y", { duration: 0.9, ease: "out" });
  const onMove = (e: PointerEvent) => {
    const r = frame.getBoundingClientRect();
    toX(-((e.clientX - r.left) / r.width - 0.5) * 18);
    toY(-((e.clientY - r.top) / r.height - 0.5) * 12);
  };
  const onLeave = () => {
    toX(0);
    toY(0);
  };
  frame.addEventListener("pointermove", onMove);
  frame.addEventListener("pointerleave", onLeave);
  return () => {
    frame.removeEventListener("pointermove", onMove);
    frame.removeEventListener("pointerleave", onLeave);
  };
}

function photosSettle(wide: boolean) {
  const frames = gsap.utils.toArray<HTMLElement>(".stay-main, .conference-main");
  for (const frame of frames) {
    gsap.fromTo(
      frame,
      { rotateX: wide ? 7 : 4, y: wide ? 56 : 32, scale: 0.95, transformPerspective: 1200, transformOrigin: "50% 100%" },
      {
        rotateX: 0,
        y: 0,
        scale: 1,
        ease: "none",
        scrollTrigger: { trigger: frame, start: "top bottom", end: "top 55%", scrub: 0.6 },
      },
    );
    // The photo inside eases out of a slight zoom over a longer stretch, so the
    // frame and the picture move at different depths.
    const img = frame.querySelector("img");
    if (img) {
      gsap.fromTo(
        img,
        { scale: 1.12 },
        { scale: 1, ease: "none", scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: true } },
      );
    }
  }
}

function revealOnce() {
  const items = gsap.utils.toArray<HTMLElement>(".gallery-tile, .unit");
  // Only what's still below the fold waits for its reveal; nothing on screen is hidden.
  const later = items.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.9);
  if (!later.length) return;
  gsap.set(later, { opacity: 0, y: 40, rotateX: 14, transformPerspective: 900, transformOrigin: "50% 100%" });
  ScrollTrigger.batch(later, {
    start: "top 90%",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, rotateX: 0, duration: 0.9, ease: "out", stagger: 0.07, overwrite: true }),
  });
}

export default function ScrollMotion() {
  useGSAP(() => {
    // Same curve as --ease in globals.css.
    CustomEase.create("out", "0.23, 1, 0.32, 1");

    const mm = gsap.matchMedia();
    mm.add(
      {
        motion: "(prefers-reduced-motion: no-preference)",
        wide: "(min-width: 900px)",
        fine: "(hover: hover) and (pointer: fine)",
      },
      (context) => {
        const { motion, wide, fine } = context.conditions as { motion: boolean; wide: boolean; fine: boolean };
        if (!motion) return;
        const undoHero = heroDepth(fine);
        photosSettle(wide);
        revealOnce();
        return () => undoHero?.();
      },
    );

    // Photos and fonts change the page's height as they load; measure again once they're in.
    const remeasure = () => ScrollTrigger.refresh();
    window.addEventListener("load", remeasure);
    document.fonts?.ready.then(remeasure);
    return () => window.removeEventListener("load", remeasure);
  });

  return null;
}
