"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ComponentProps, type MouseEvent } from "react";
import { cx } from "@/lib/format";

/**
 * Reveals any element marked `data-reveal` as it scrolls into view.
 * Mounted once in the layout; a MutationObserver picks up client-rendered results too.
 * Stagger with `style={{ "--d": "120ms" }}`.
 */
export function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.setAttribute("data-shown", "");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll("[data-reveal]:not([data-shown])").forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Departure-board text: each character tumbles through glyphs before landing, left to right. */
export function SplitFlap({ text, length, className, tileClassName }: { text: string; length?: number; className?: string; tileClassName?: string }) {
  const target = (length ? text.toUpperCase().padEnd(length).slice(0, length) : text.toUpperCase()).split("");
  const [shown, setShown] = useState(target);
  const [flipping, setFlipping] = useState<boolean[]>([]);
  const key = target.join("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(key.split(""));
      return;
    }
    const goal = key.split("");
    // Each tile settles a little after the one to its left
    const settleAt = goal.map((_, i) => 3 + i * 1.4 + Math.random() * 3);
    let tick = 0;
    const id = setInterval(() => {
      tick++;
      let done = true;
      setShown(
        goal.map((ch, i) => {
          if (tick >= settleAt[i] || ch === " ") return ch;
          done = false;
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }),
      );
      setFlipping(goal.map((ch, i) => ch !== " " && tick < settleAt[i] + 1));
      if (done) {
        clearInterval(id);
        setFlipping([]);
      }
    }, 55);
    return () => clearInterval(id);
  }, [key]);

  return (
    <span className={cx("inline-flex gap-[2px]", className)}>
      <span className="sr-only">{key.trim()}</span>
      {shown.map((ch, i) => (
        <span key={i} aria-hidden data-flipping={flipping[i] || undefined} className={cx("flap rounded-[3px] font-mono", tileClassName)}>
          {ch === " " ? " " : ch}
        </span>
      ))}
    </span>
  );
}

/** Mouse handler that feeds --mx/--my to a `.spotlight` element. */
export function trackSpotlight(e: MouseEvent<HTMLElement>) {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/** A Link that carries the `.spotlight` cursor light; usable from server components. */
export function SpotlightLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link {...props} onMouseMove={trackSpotlight} className={cx("spotlight", className)} />;
}

/** True once the page has scrolled past `offset` px. */
export function useScrolled(offset = 8) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > offset);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, [offset]);
  return scrolled;
}

/** Slides a highlight under the active child of a segmented control. */
export function useIndicator<T extends HTMLElement>(activeKey: string) {
  const ref = useRef<T>(null);
  const [box, setBox] = useState<{ left: number; width: number } | null>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const measure = () => {
      const el = root.querySelector<HTMLElement>("[aria-selected='true']");
      if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [activeKey]);
  return { ref, box };
}
