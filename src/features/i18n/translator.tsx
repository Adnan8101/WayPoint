"use client";

import { useEffect } from "react";
import type { ApiResponse } from "@/lib/types";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";

/*
  Page-wide translation. Visible text nodes (and placeholders/labels) are sent in
  batches to /api/translate (Gemini) and swapped in place; a MutationObserver
  catches results that render later. Codes, numbers and times are left alone.
  Translations are cached in this browser per language.
*/

const LANG_KEY = "waypoint:lang";
const CACHE_PREFIX = "waypoint:tr:";
const BATCH = 60;
const PARALLEL = 3;
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "CODE", "KBD", "PRE", "svg", "SVG", "TEXT", "OPTION"]);
const ATTRS = ["placeholder", "aria-label", "title"] as const;

export function currentLanguage(): LanguageCode {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return (LANGUAGES.find((l) => l.code === v)?.code ?? "en") as LanguageCode;
  } catch {
    return "en";
  }
}

export function setLanguage(code: LanguageCode) {
  try {
    if (code === "en") localStorage.removeItem(LANG_KEY);
    else localStorage.setItem(LANG_KEY, code);
  } catch {
    /* storage unavailable */
  }
  // A clean reload restores English text exactly and re-translates from scratch
  window.location.reload();
}

/** Worth translating: has letters, isn't a code, number, time or single glyph */
function translatable(t: string): boolean {
  const s = t.trim();
  if (s.length < 2 || !/\p{L}/u.test(s)) return false;
  if (/^[A-Z0-9]{1,6}$/.test(s)) return false; // station/airport/class codes
  if (/^[\d\s:.,·%°+\-–—/→←()]+[a-zA-Z]{0,3}$/.test(s)) return false; // times, distances, temperatures
  return true;
}

function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName) || e.hasAttribute("data-no-translate") || e.getAttribute("translate") === "no") return true;
  }
  return false;
}

export function Translator() {
  useEffect(() => {
    const lang = currentLanguage();
    document.documentElement.lang = lang === "en" ? "en-IN" : lang;
    if (lang === "en") return;

    let cache: Record<string, string> = {};
    try {
      cache = JSON.parse(localStorage.getItem(CACHE_PREFIX + lang) ?? "{}");
    } catch {
      /* storage unavailable */
    }
    const saveCache = () => {
      try {
        const entries = Object.entries(cache);
        // Keep the newest few thousand phrases
        localStorage.setItem(CACHE_PREFIX + lang, JSON.stringify(Object.fromEntries(entries.slice(-4000))));
      } catch {
        /* quota exceeded: carry on without persisting */
      }
    };

    // What we wrote, so our own edits aren't treated as new text
    const written = new WeakMap<Node, string>();
    const writtenAttr = new WeakMap<Element, Record<string, string>>();
    const pendingText = new Set<Text>();
    const pendingAttr = new Set<Element>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const apply = () => {
      for (const node of pendingText) {
        const raw = node.nodeValue ?? "";
        const key = raw.trim();
        const tr = cache[key];
        if (tr && node.isConnected) {
          const next = raw.replace(key, tr);
          written.set(node, next);
          node.nodeValue = next;
          pendingText.delete(node);
        }
      }
      for (const el of pendingAttr) {
        const done = writtenAttr.get(el) ?? {};
        let all = true;
        for (const a of ATTRS) {
          const v = el.getAttribute(a);
          if (!v || done[a] === v || !translatable(v)) continue;
          const tr = cache[v.trim()];
          if (tr) {
            done[a] = tr;
            el.setAttribute(a, tr);
          } else all = false;
        }
        writtenAttr.set(el, done);
        if (all) pendingAttr.delete(el);
      }
    };

    const flush = async () => {
      const wanted = new Set<string>();
      for (const n of pendingText) {
        const k = (n.nodeValue ?? "").trim();
        if (!cache[k]) wanted.add(k);
      }
      for (const el of pendingAttr) for (const a of ATTRS) {
        const v = el.getAttribute(a)?.trim();
        if (v && translatable(v) && !cache[v] && writtenAttr.get(el)?.[a] !== v) wanted.add(v);
      }
      apply();
      const list = [...wanted].map((t) => t.slice(0, 400));
      const batches: string[][] = [];
      for (let i = 0; i < list.length; i += BATCH) batches.push(list.slice(i, i + BATCH));
      for (let i = 0; i < batches.length; i += PARALLEL) {
        await Promise.all(
          batches.slice(i, i + PARALLEL).map(async (texts) => {
            try {
              const res = await fetch("/api/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lang, texts }) });
              const r = (await res.json()) as ApiResponse<{ translations: string[] }>;
              if (r.ok) texts.forEach((t, j) => r.data.translations[j] && (cache[t] = r.data.translations[j]));
            } catch {
              /* leave this batch in English */
            }
          }),
        );
        apply();
      }
      saveCache();
    };
    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(flush, 120);
    };

    const scanText = (node: Text) => {
      const v = node.nodeValue ?? "";
      if (written.get(node) === v || !translatable(v) || skipped(node.parentElement)) return;
      pendingText.add(node);
    };
    const scanEl = (root: Element) => {
      if (skipped(root)) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) scanText(n as Text);
      for (const el of [root, ...root.querySelectorAll("[placeholder],[aria-label],[title]")]) {
        if (ATTRS.some((a) => el.hasAttribute(a)) && !skipped(el)) pendingAttr.add(el);
      }
    };

    scanEl(document.body);
    schedule();
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData" && r.target.nodeType === Node.TEXT_NODE) scanText(r.target as Text);
        else if (r.type === "attributes" && r.target instanceof Element) pendingAttr.add(r.target);
        else
          r.addedNodes.forEach((n) => {
            if (n.nodeType === Node.TEXT_NODE) scanText(n as Text);
            else if (n instanceof Element) scanEl(n);
          });
      }
      schedule();
    });
    mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
    return () => {
      mo.disconnect();
      clearTimeout(timer);
    };
  }, []);
  return null;
}
