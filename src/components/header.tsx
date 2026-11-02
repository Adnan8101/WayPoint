"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { NAV, SITE } from "@/lib/site";
import { cx } from "@/lib/format";
import { ArrowRightIcon, BanIcon, BerthIcon, BuildingIcon, ClockIcon, SeatIcon, CloseIcon, MapIcon, MenuIcon, PlaneIcon, RouteIcon, SearchIcon, TicketIcon, TrainIcon } from "./icons";
import { LocalClock } from "./local-clock";
import { useScrolled } from "./motion";
import { openAsk } from "@/features/assistant/ask-palette";
import { LanguagePicker } from "@/features/i18n/language-picker";

const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "/flight-status": PlaneIcon,
  "/flight-tracker": MapIcon,
  "/flight-search": SearchIcon,
  "/airports": BuildingIcon,
  "/pnr-status": TicketIcon,
  "/train-status": TrainIcon,
  "/trains-between-stations": SearchIcon,
  "/train-schedule": ClockIcon,
  "/train-route": RouteIcon,
  "/railway-stations": BuildingIcon,
  "/seat-availability": SeatIcon,
  "/chart-vacancy": BerthIcon,
  "/cancelled-trains": BanIcon,
};

const FEATURE: Record<string, { title: string; body: string; href: string; cta: string }> = {
  Flights: { title: "Gate changed?", body: "Flight status shows terminal, gate and belt the moment the airline reports them.", href: "/flight-status", cta: "Check a flight" },
  Trains: { title: "Chart prepared?", body: "PNR status tells you the moment your berth is confirmed, passenger by passenger.", href: "/pnr-status", cta: "Check a PNR" },
};

export function Logo({ light = true }: { light?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label={`${SITE.name} home`}>
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[11px] bg-signal shadow-[inset_0_-2px_0_rgb(0_0_0/0.15)] transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-rotate-6" aria-hidden>
        {/* Waypoint pin at the end of a dashed trail */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M3 20.5c2.5-.2 4.2-1 5.6-2.4" stroke="#0b0d10" strokeWidth="2.2" strokeLinecap="round" strokeDasharray="0.1 3.6" />
          <g className="transition-transform duration-500 ease-[var(--ease-spring)] group-hover:-translate-y-0.5">
            <path d="M15 21s6-5.6 6-10.4A6 6 0 0 0 9 10.6C9 15.4 15 21 15 21z" fill="#0b0d10" />
            <circle cx="15" cy="10.5" r="2.3" fill="#ffc21a" />
          </g>
        </svg>
      </span>
      <span className={cx("font-display text-[20px] font-bold tracking-[-0.03em]", light ? "text-white" : "text-ink")}>
        Way<span className={light ? "text-signal" : "text-ink/60"}>Point</span>
      </span>
    </Link>
  );
}

export function Header() {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={cx(
        "sticky top-0 z-40 text-white transition-[background-color,box-shadow] duration-500",
        scrolled ? "bg-ink/88 shadow-[0_1px_0_rgb(255_255_255/0.06),0_12px_30px_-12px_rgb(0_0_0/0.6)] backdrop-blur-xl backdrop-saturate-150" : "bg-ink",
      )}
    >
      <div className={cx("mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 transition-[height] duration-500 sm:px-6", scrolled ? "h-[60px]" : "h-[72px]")}>
        <Logo />
        <nav aria-label="Main" className="hidden flex-1 justify-center md:flex">
          <ul className="flex items-center gap-0.5 rounded-full border border-white/[0.07] bg-white/[0.03] p-1">
            {NAV.map((n) =>
              "items" in n ? (
                <li key={n.label} className="relative" onMouseLeave={() => setMenu(null)}>
                  <button
                    type="button"
                    aria-expanded={menu === n.label}
                    onClick={() => setMenu(menu === n.label ? null : n.label)}
                    onMouseEnter={() => setMenu(n.label)}
                    className={cx(
                      "flex items-center gap-1.5 rounded-full px-4 py-2 text-[14px] font-medium transition-colors",
                      menu === n.label || n.items.some((i) => isActive(i.href)) ? "bg-white/10 text-white" : "text-white/65 hover:text-white",
                    )}
                  >
                    {n.label}
                    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden className={cx("transition-transform duration-300", menu === n.label && "rotate-180")}>
                      <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                  {menu === n.label && <MegaMenu label={n.label} items={n.items} isActive={isActive} />}
                </li>
              ) : (
                <li key={n.href}>
                  <Link
                    href={n.href}
                    className={cx("block rounded-full px-4 py-2 text-[14px] font-medium transition-colors", isActive(n.href) ? "bg-white/10 text-white" : "text-white/65 hover:text-white")}
                  >
                    {n.label}
                  </Link>
                </li>
              ),
            )}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-full px-3 py-1.5 font-mono text-[12px] text-white/55 lg:flex">
            <span className="relative flex size-1.5" aria-hidden>
              <span className="absolute inset-0 animate-ping rounded-full bg-brand-400 opacity-70" />
              <span className="relative size-1.5 rounded-full bg-brand-400" />
            </span>
            <span className="font-medium text-white"><LocalClock withZone /></span>
          </div>
          <LanguagePicker className="hidden sm:flex" />
          <button
            type="button"
            onClick={openAsk}
            aria-label="Ask in your own words (Ctrl or Command + K)"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-3 pr-1.5 text-[13px] font-medium text-white/70 transition-colors hover:border-white/25 hover:text-white md:flex"
          >
            Ask
            <kbd className="rounded-md bg-white/10 px-1.5 py-0.5 font-mono text-[10.5px] text-white/60">⌘K</kbd>
          </button>
          <Link
            href="/pnr-status"
            className="group hidden items-center gap-1.5 rounded-full bg-signal py-2 pl-4 pr-3 text-[14px] font-semibold text-ink shadow-[inset_0_-2px_0_rgb(0_0_0/0.14)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[inset_0_-2px_0_rgb(0_0_0/0.14),0_8px_20px_-6px_rgb(255_194_26/0.5)] md:flex"
          >
            Check PNR
            <ArrowRightIcon width={15} height={15} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-white hover:bg-white/10 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {open && (
        <nav aria-label="Mobile" className={cx("fixed inset-x-0 bottom-0 overflow-y-auto bg-ink px-4 pb-10 md:hidden", scrolled ? "top-[60px]" : "top-[72px]")}>
          <div className="flex items-center justify-between gap-3 pt-5 sm:hidden">
            <span className="label !text-white/40">Language</span>
            <LanguagePicker />
          </div>
          {NAV.map((n, gi) =>
            "items" in n ? (
              <div key={n.label} className="animate-fade-up pt-6" style={{ animationDelay: `${gi * 60}ms` }}>
                <p className="label px-2 pb-2 !text-white/40">{n.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {n.items.map((i) => {
                    const Icon = ICONS[i.href] ?? SearchIcon;
                    return (
                      <Link
                        key={i.href}
                        href={i.href}
                        className={cx("flex flex-col gap-3 rounded-2xl border p-3.5", isActive(i.href) ? "border-signal/40 bg-signal/10" : "border-white/[0.07] bg-white/[0.03]")}
                      >
                        <Icon width={18} height={18} className={isActive(i.href) ? "text-signal" : "text-white/60"} />
                        <span className="text-[14px] font-medium leading-tight text-white">{i.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ) : (
              <Link
                key={n.href}
                href={n.href}
                className="animate-fade-up mt-2 flex items-center justify-between border-b border-white/[0.07] px-2 py-4 font-display text-[22px] font-semibold text-white"
                style={{ animationDelay: `${gi * 60}ms` }}
              >
                {n.label} <ArrowRightIcon width={18} height={18} className="text-white/40" />
              </Link>
            ),
          )}
        </nav>
      )}
    </header>
  );
}

function MegaMenu({ label, items, isActive }: { label: string; items: { label: string; href: string; desc: string }[]; isActive: (h: string) => boolean }) {
  const f = FEATURE[label];
  return (
    <div className="absolute left-1/2 top-full -translate-x-1/2 pt-3">
      <div className="animate-pop-in flex w-[640px] overflow-hidden rounded-[22px] bg-white p-2 text-ink shadow-[0_30px_80px_-20px_rgb(0_0_0/0.55),0_0_0_1px_rgb(0_0_0/0.05)]">
        <ul className="grid flex-1 grid-cols-2 content-start gap-0.5 p-1">
          {items.map((i, idx) => {
            const Icon = ICONS[i.href] ?? SearchIcon;
            const active = isActive(i.href);
            return (
              <li key={i.href} className="animate-fade-up" style={{ animationDelay: `${idx * 35}ms` }}>
                <Link href={i.href} className={cx("group flex gap-3 rounded-2xl p-3 transition-colors", active ? "bg-signal-soft" : "hover:bg-slate-100")}>
                  <span
                    className={cx(
                      "grid size-10 shrink-0 place-items-center rounded-xl transition-all duration-300",
                      active ? "bg-ink text-signal" : "bg-slate-100 text-slate-700 group-hover:bg-ink group-hover:text-signal",
                    )}
                  >
                    <Icon width={18} height={18} />
                  </span>
                  <span className="pt-0.5">
                    <span className="block text-[14px] font-semibold">{i.label}</span>
                    <span className="block text-[12.5px] leading-snug text-slate-500">{i.desc}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {f && (
          <Link href={f.href} className="group relative flex w-[210px] shrink-0 flex-col justify-between overflow-hidden rounded-2xl bg-ink p-5 text-white">
            <div className="grid-lines absolute inset-0 opacity-60" aria-hidden />
            <div className="relative">
              <p className="label !text-signal">Your time · <LocalClock /></p>
              <p className="font-display mt-3 text-[24px] font-semibold">{f.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/60">{f.body}</p>
            </div>
            <span className="relative mt-6 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-signal">
              {f.cta} <ArrowRightIcon width={14} height={14} className="transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
