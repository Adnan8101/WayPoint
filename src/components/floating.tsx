"use client";

import { useLayoutEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/**
 * Renders into <body> so popovers escape parent stacking contexts (animated
 * cards create them) and overflow clipping (dark bands use overflow-hidden).
 */
export function Portal({ children }: { children: ReactNode }) {
  // Only ever rendered after a user opens something, so document exists and there's nothing to hydrate
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}

const GAP = 10;
const EDGE = 16;

/**
 * Fixed-position style that pins a floating element to its anchor, flipping
 * above when there is no room below and staying inside the viewport.
 */
export function useAnchoredStyle(
  open: boolean,
  anchor: RefObject<HTMLElement | null>,
  floating: RefObject<HTMLElement | null>,
  opts: { matchWidth?: boolean; minWidth?: number } = {},
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({ position: "fixed", top: -9999, left: -9999 });

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const f = floating.current;
      if (!a || !f) return;
      const width = opts.matchWidth ? Math.max(a.width, opts.minWidth ?? 0) : f.offsetWidth;
      const height = f.offsetHeight;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const below = vh - a.bottom - GAP;
      const above = a.top - GAP;
      const up = below < height && above > below;
      let left = a.left;
      if (left + width > vw - EDGE) left = Math.max(EDGE, a.right - width);
      setStyle({
        position: "fixed",
        left,
        width: opts.matchWidth ? width : undefined,
        maxHeight: Math.max(160, (up ? above : below) - EDGE),
        ...(up ? { bottom: vh - a.top + GAP } : { top: a.bottom + GAP }),
        transformOrigin: up ? "bottom left" : "top left",
      });
    };
    place();
    // Follow scroll, resize, and the floating element's own size changes (e.g. month switch)
    const ro = new ResizeObserver(place);
    if (floating.current) ro.observe(floating.current);
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchor, floating, opts.matchWidth, opts.minWidth]);

  return style;
}
