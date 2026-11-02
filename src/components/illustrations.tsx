"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { cx } from "@/lib/format";

/*
  Hand-built animated scenes, one per part of the product.
  Colours come from the .scene-dark / .scene-light roles in globals.css,
  so the same drawing sits on a carbon masthead or a white card.
  Motion is SMIL (works on every SVG element) plus a few CSS floats.
*/

export type SceneKind = "pnr" | "train" | "flight" | "tracker" | "search" | "airport" | "station" | "schedule" | "route" | "between" | "travel" | "seats" | "cancelled";

const PLANE = "M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z";
const MONO = { fontFamily: "var(--font-code), monospace" };

export function Scene({ kind, theme = "dark", className }: { kind: SceneKind; theme?: "dark" | "light"; className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const uid = useId().replace(/:/g, "");
  useEffect(() => {
    // SMIL ignores prefers-reduced-motion, so pause it by hand
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) ref.current?.pauseAnimations();
  }, []);
  const Art = SCENES[kind];
  return (
    <svg ref={ref} viewBox="0 0 400 300" fill="none" aria-hidden className={cx(theme === "dark" ? "scene-dark" : "scene-light", "overflow-visible", className)}>
      <Art uid={uid} />
    </svg>
  );
}

/* ───────── Shared bits ───────── */

/** Plane glyph centred on (x, y); rot 0 points it right */
function Plane({ x = 0, y = 0, s = 1, rot = 0, className = "f-acc s-bg" }: { x?: number; y?: number; s?: number; rot?: number; className?: string }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot + 45}) scale(${s}) translate(-12 -12)`}>
      <path d={PLANE} className={className} strokeWidth={1.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

function Cloud({ x, y, s = 1, className = "f-dim" }: { x: number; y: number; s?: number; className?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} className={className}>
      <circle cx="0" cy="0" r="13" />
      <circle cx="17" cy="-7" r="17" />
      <circle cx="35" cy="1" r="12" />
      <rect x="-13" y="0" width="60" height="13" rx="6.5" />
    </g>
  );
}

/** Repeating drift: translate back and forth along x */
function Drift({ by, dur, children }: { by: number; dur: string; children: ReactNode }) {
  return (
    <g>
      {children}
      <animateTransform attributeName="transform" type="translate" values={`0 0; ${by} 0; 0 0`} dur={dur} repeatCount="indefinite" />
    </g>
  );
}

function Blink({ dur = "1.6s", begin = "0s", values = "1;.15;1", children }: { dur?: string; begin?: string; values?: string; children: ReactNode }) {
  return (
    <g>
      {children}
      <animate attributeName="opacity" values={values} dur={dur} begin={begin} repeatCount="indefinite" />
    </g>
  );
}

function Pulse({ cx, cy, r = 4, dur = "2.2s", begin = "0s", className = "s-acc" }: { cx: number; cy: number; r?: number; dur?: string; begin?: string; className?: string }) {
  return (
    <circle cx={cx} cy={cy} r={r} className={className} strokeWidth="1.5">
      <animate attributeName="r" values={`${r};${r * 4}`} dur={dur} begin={begin} repeatCount="indefinite" />
      <animate attributeName="opacity" values=".9;0" dur={dur} begin={begin} repeatCount="indefinite" />
    </circle>
  );
}

function Rider({ path, dur, begin = "0s", children }: { path: string; dur: string; begin?: string; children: ReactNode }) {
  return (
    <g opacity="0">
      {children}
      <animateMotion path={path} dur={dur} begin={begin} repeatCount="indefinite" rotate="auto" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines=".45 0 .55 1" />
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;.08;.92;1" dur={dur} begin={begin} repeatCount="indefinite" />
    </g>
  );
}

function Hands({ cx, cy, r, minDur = "6s", hourDur = "72s" }: { cx: number; cy: number; r: number; minDur?: string; hourDur?: string }) {
  return (
    <>
      <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.5} className="s-ln" strokeWidth="3" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur={hourDur} repeatCount="indefinite" />
      </line>
      <line x1={cx} y1={cy} x2={cx} y2={cy - r * 0.78} className="s-acc" strokeWidth="2" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from={`90 ${cx} ${cy}`} to={`450 ${cx} ${cy}`} dur={minDur} repeatCount="indefinite" />
      </line>
      <circle cx={cx} cy={cy} r="3" className="f-acc" />
    </>
  );
}

function Ticks({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        const r1 = i % 3 ? r - 4 : r - 7;
        return <line key={i} x1={cx + Math.sin(a) * r1} y1={cy - Math.cos(a) * r1} x2={cx + Math.sin(a) * (r - 1.5)} y2={cy - Math.cos(a) * (r - 1.5)} className={i % 3 ? "s-dim" : "s-ln"} strokeWidth="1.5" strokeLinecap="round" />;
      })}
    </>
  );
}

/* ───────── Scenes ───────── */

function PnrScene() {
  return (
    <g className="sc-float">
      <g transform="translate(62 78) rotate(-9)">
        <rect width="236" height="146" rx="16" className="f-fill s-dim" strokeWidth="1.5" />
        <rect x="16" y="20" width="60" height="8" rx="4" className="f-dim" />
      </g>
      <g transform="translate(92 74) rotate(4)">
        <rect width="246" height="152" rx="16" className="f-fill s-ln" strokeWidth="1.5" />
        <path d="M16 0h214a16 16 0 0 1 16 16v20H0V16A16 16 0 0 1 16 0z" className="f-acc" />
        <text x="16" y="24" className="f-bg" fontSize="12" fontWeight="700" letterSpacing="2" style={MONO}>PNR · E-TICKET</text>
        {Array.from({ length: 10 }, (_, i) => (
          <rect key={i} x={16 + i * 14} y="52" width="10" height="16" rx="2.5" className={i < 3 ? "f-acc" : "f-ln"} opacity="0">
            <animate attributeName="opacity" values="0;0;1;1;0" keyTimes={`0;${(i * 0.05).toFixed(2)};${(i * 0.05 + 0.02).toFixed(2)};.9;1`} dur="5s" repeatCount="indefinite" />
          </rect>
        ))}
        <rect x="16" y="86" width="118" height="7" rx="3.5" className="f-dim" />
        <rect x="16" y="102" width="86" height="7" rx="3.5" className="f-dim" />
        <rect x="16" y="118" width="104" height="7" rx="3.5" className="f-dim" />
        <line x1="170" y1="44" x2="170" y2="144" className="s-dim" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" />
        <circle cx="170" cy="152" r="9" className="f-bg" />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <rect key={`${r}${c}`} x={188 + c * 11} y={52 + r * 11} width="8" height="8" rx="1.5" className={(r * 3 + c) % 4 ? "f-ln" : "f-dim"}>
              {(r + c) % 3 === 0 && <animate attributeName="opacity" values="1;.2;1" dur={`${1.2 + r * 0.3}s`} repeatCount="indefinite" />}
            </rect>
          )),
        )}
      </g>
      <g transform="translate(300 196)">
        <g className="sc-pop">
          <circle r="30" className="f-bg s-acc" strokeWidth="2.5" />
          <circle r="24" className="s-acc" strokeWidth="1" strokeDasharray="2 4" />
          <path d="M-10 0l7 7 13-14" fill="none" className="s-acc" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </g>
      <Pulse cx={70} cy={60} r={3} />
      <circle cx="70" cy="60" r="3" className="f-acc" />
    </g>
  );
}

function TrainScene({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <linearGradient id={`beam${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#ffc21a" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffc21a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* overhead line and masts */}
      <path d="M0 96 Q100 108 200 96 T400 96" className="s-dim" strokeWidth="1.5" />
      {[30, 230].map((x) => <line key={x} x1={x} y1="80" x2={x} y2="236" className="s-dim" strokeWidth="2" />)}
      {/* signal */}
      <rect x="352" y="70" width="22" height="44" rx="11" className="f-fill s-ln" strokeWidth="1.5" />
      <line x1="363" y1="114" x2="363" y2="236" className="s-ln" strokeWidth="2" />
      <circle cx="363" cy="83" r="6" className="f-acc"><animate attributeName="opacity" values="1;.15;1" dur="2.4s" repeatCount="indefinite" /></circle>
      <circle cx="363" cy="101" r="6" className="f-ok"><animate attributeName="opacity" values=".15;1;.15" dur="2.4s" repeatCount="indefinite" /></circle>
      {/* sleepers scroll to suggest motion */}
      <g>
        {Array.from({ length: 23 }, (_, i) => <rect key={i} x={-20 + i * 20} y="238" width="10" height="10" rx="2" className="f-dim" />)}
        <animateTransform attributeName="transform" type="translate" values="0 0; -20 0" dur=".35s" repeatCount="indefinite" />
      </g>
      <line x1="0" y1="238" x2="400" y2="238" className="s-ln" strokeWidth="2" />
      {/* speed lines */}
      {[150, 172, 196].map((y, i) => (
        <line key={y} x1="0" y1={y} x2="26" y2={y} className="s-acc" strokeWidth="2" strokeLinecap="round">
          <animate attributeName="x1" values="40;-30" dur={`${0.7 + i * 0.15}s`} repeatCount="indefinite" />
          <animate attributeName="x2" values="70;-10" dur={`${0.7 + i * 0.15}s`} repeatCount="indefinite" />
        </line>
      ))}
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -1.5; 0 0" dur=".45s" repeatCount="indefinite" />
        {[40, 150].map((x, ci) => (
          <g key={x}>
            <rect x={x} y="150" width="104" height="72" rx="10" className="f-fill s-ln" strokeWidth="1.5" />
            <rect x={x} y="200" width="104" height="5" className="f-acc" />
            {[0, 1, 2, 3].map((w) => (
              <rect key={w} x={x + 10 + w * 23} y="164" width="16" height="20" rx="3" className={(w + ci) % 3 ? "f-dim" : "f-acc"}>
                {(w + ci) % 3 === 0 && <animate attributeName="opacity" values="1;.4;1" dur="3s" begin={`${w * 0.4}s`} repeatCount="indefinite" />}
              </rect>
            ))}
          </g>
        ))}
        <path d="M260 150h56q50 0 60 50v22H260z" className="f-fill s-ln" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M322 160q32 2 42 32h-42z" className="f-acc" />
        <rect x="260" y="200" width="116" height="5" className="f-acc" />
        <path d="M376 208 L470 190 L470 240 Z" fill={`url(#beam${uid})`}><animate attributeName="opacity" values=".6;1;.6" dur="1.5s" repeatCount="indefinite" /></path>
        <circle cx="372" cy="212" r="4" className="f-acc" />
        {[62, 124, 172, 234, 284, 350].map((x) => (
          <g key={x}>
            <circle cx={x} cy="228" r="9" className="f-bg s-ln" strokeWidth="1.5" />
            <line x1={x - 6} y1="228" x2={x + 6} y2="228" className="s-ln" strokeWidth="1.5">
              <animateTransform attributeName="transform" type="rotate" from={`0 ${x} 228`} to={`360 ${x} 228`} dur=".5s" repeatCount="indefinite" />
            </line>
          </g>
        ))}
      </g>
    </g>
  );
}

function FlightScene() {
  const trail = "M-10 250 C 80 240, 170 200, 262 128";
  return (
    <g>
      <Drift by={-40} dur="16s"><Cloud x={40} y={70} s={1.1} /><Cloud x={300} y={220} s={0.8} /></Drift>
      <Drift by={30} dur="12s"><Cloud x={210} y={46} s={0.7} /></Drift>
      <line x1="0" y1="268" x2="400" y2="268" className="s-dim" strokeWidth="1.5" strokeDasharray="2 8" strokeLinecap="round" />
      <path d={trail} className="s-dim" strokeWidth="8" strokeLinecap="round" />
      <path d={trail} className="s-acc draw" strokeWidth="2" strokeLinecap="round" style={{ ["--len" as string]: 330 }} />
      <circle cx="20" cy="248" r="5" className="f-acc" />
      <Pulse cx={20} cy={248} />
      <g className="sc-float">
        <Plane x={278} y={118} s={4.4} rot={-28} />
      </g>
      {/* altimeter */}
      {Array.from({ length: 11 }, (_, i) => <line key={i} x1={i % 5 ? 382 : 376} y1={60 + i * 17} x2="390" y2={60 + i * 17} className={i % 5 ? "s-dim" : "s-ln"} strokeWidth="1.5" />)}
      <path d="M368 0l-8-5v10z" className="f-acc">
        <animateTransform attributeName="transform" type="translate" values="0 200; 0 90; 0 120; 0 90; 0 200" dur="8s" repeatCount="indefinite" />
      </path>
    </g>
  );
}

function TrackerScene() {
  const path = "M60 230 C 120 120, 260 210, 330 80";
  return (
    <g>
      {[44, 88, 132].map((r) => <circle key={r} cx="200" cy="150" r={r} className="s-dim" strokeWidth="1.5" />)}
      <line x1="56" y1="150" x2="344" y2="150" className="s-dim" strokeWidth="1" />
      <line x1="200" y1="6" x2="200" y2="294" className="s-dim" strokeWidth="1" />
      <g>
        <path d="M200 150 L200 18 A132 132 0 0 1 293 57 Z" className="f-acc" opacity=".16" />
        <line x1="200" y1="150" x2="200" y2="18" className="s-acc" strokeWidth="2" />
        <animateTransform attributeName="transform" type="rotate" from="0 200 150" to="360 200 150" dur="5s" repeatCount="indefinite" />
      </g>
      {[[262, 104, "0s"], [130, 196, "1.6s"], [238, 232, "3.1s"], [150, 82, "4.2s"]].map(([x, y, b]) => (
        <g key={`${x}`}>
          <circle cx={x as number} cy={y as number} r="3.5" className="f-acc"><animate attributeName="opacity" values="1;.2;1" dur="5s" begin={b as string} repeatCount="indefinite" /></circle>
          <Pulse cx={x as number} cy={y as number} r={3} dur="5s" begin={b as string} />
        </g>
      ))}
      <path d={path} className="s-ln" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round" />
      <Rider path={path} dur="7s"><Plane s={1.3} /></Rider>
      <circle cx="200" cy="150" r="5" className="f-acc" />
    </g>
  );
}

function SearchScene() {
  const arcs = ["M70 220 C 140 120, 260 110, 330 200", "M70 220 C 130 60, 270 50, 330 200", "M70 220 C 150 170, 250 170, 330 200"];
  return (
    <g>
      <line x1="10" y1="246" x2="390" y2="246" className="s-dim" strokeWidth="1.5" strokeDasharray="2 8" strokeLinecap="round" />
      {arcs.map((d, i) => (
        <g key={d}>
          <path d={d} className="s-dim" strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round" />
          <path d={d} className="s-acc draw" strokeWidth="2" strokeLinecap="round" style={{ ["--len" as string]: 420, ["--delay" as string]: `${0.3 + i * 0.35}s` }} />
          <Rider path={d} dur={`${5 + i * 1.3}s`} begin={`${i * 1.1}s`}><Plane s={1.25} /></Rider>
        </g>
      ))}
      {[[70, 220], [330, 200]].map(([x, y]) => (
        <g key={x} className="sc-float">
          <path d={`M${x} ${y + 2} c-14-16-20-24-20-34a20 20 0 0 1 40 0c0 10-6 18-20 34z`} className="f-acc s-bg" strokeWidth="2" />
          <circle cx={x} cy={y - 32} r="7" className="f-bg" />
          <rect x={x - 18} y={y + 16} width="36" height="6" rx="3" className="f-dim" />
        </g>
      ))}
      <Pulse cx={70} cy={222} />
      <Pulse cx={330} cy={202} begin="1s" />
    </g>
  );
}

function AirportScene() {
  const takeoff = "M190 210 C 170 160, 120 110, 30 60";
  return (
    <g>
      <path d="M150 300 L188 168 L212 168 L250 300 Z" className="f-fill s-dim" strokeWidth="1.5" />
      <line x1="200" y1="296" x2="200" y2="172" className="s-acc" strokeWidth="2.5" strokeDasharray="10 12">
        <animate attributeName="stroke-dashoffset" values="0;-44" dur="1s" repeatCount="indefinite" />
      </line>
      {Array.from({ length: 6 }, (_, i) => {
        const t = i / 5;
        return [150 + t * 38, 250 - t * 38].map((x, side) => (
          <circle key={`${i}${side}`} cx={x} cy={300 - t * 132} r={3 - t * 1.4} className="f-acc">
            <animate attributeName="opacity" values=".15;1;.15" dur="1.2s" begin={`${(5 - i) * 0.2}s`} repeatCount="indefinite" />
          </circle>
        ));
      })}
      {/* tower */}
      <rect x="318" y="120" width="22" height="150" className="f-fill s-ln" strokeWidth="1.5" />
      <path d="M298 92 h62 l-8 30 h-46 z" className="f-fill s-ln" strokeWidth="1.5" strokeLinejoin="round" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={308 + i * 15} y="100" width="11" height="13" rx="2" className="f-acc"><animate attributeName="opacity" values="1;.5;1" dur="2.6s" begin={`${i * 0.5}s`} repeatCount="indefinite" /></rect>
      ))}
      <rect x="318" y="78" width="22" height="14" className="f-fill s-ln" strokeWidth="1.5" />
      <g>
        <path d="M329 70 L420 52 L420 88 Z" className="f-acc" opacity=".22" />
        <animateTransform attributeName="transform" type="rotate" values="-30 329 70; 210 329 70; -30 329 70" dur="6s" repeatCount="indefinite" />
      </g>
      <circle cx="329" cy="70" r="5" className="f-acc"><animate attributeName="opacity" values="1;.2;1" dur="1s" repeatCount="indefinite" /></circle>
      {/* windsock */}
      <line x1="66" y1="270" x2="66" y2="196" className="s-ln" strokeWidth="2" />
      <path d="M66 198 l40 6 v10 l-40 6 z" className="f-acc s-bg" strokeWidth="1">
        <animateTransform attributeName="transform" type="skewY" values="0;5;-3;0" dur="2.2s" repeatCount="indefinite" />
      </path>
      <Rider path={takeoff} dur="6s"><Plane s={1.6} /></Rider>
    </g>
  );
}

function StationScene() {
  return (
    <g>
      <line x1="0" y1="262" x2="400" y2="262" className="s-ln" strokeWidth="2" />
      <line x1="0" y1="272" x2="400" y2="272" className="s-dim" strokeWidth="6" strokeDasharray="2 14" />
      <path d="M58 262 V140 Q200 40 342 140 V262" className="f-fill s-ln" strokeWidth="1.5" />
      <path d="M58 140 Q200 40 342 140" className="s-acc" strokeWidth="3" />
      {[98, 170, 230, 302].map((x) => <line key={x} x1={x} y1="150" x2={x} y2="262" className="s-dim" strokeWidth="1.5" />)}
      {[134, 200, 266].map((x) => (
        <path key={x} d={`M${x - 20} 262 V214 a20 20 0 0 1 40 0 V262`} className="f-dim" />
      ))}
      <circle cx="200" cy="124" r="30" className="f-bg s-ln" strokeWidth="2" />
      <Ticks cx={200} cy={124} r={30} />
      <Hands cx={200} cy={124} r={30} />
      {/* hanging board */}
      <line x1="14" y1="120" x2="14" y2="150" className="s-dim" strokeWidth="1.5" />
      <rect x="-4" y="150" width="56" height="40" rx="5" className="f-bg s-ln" strokeWidth="1.5" />
      {[0, 1, 2].map((i) => (
        <Blink key={i} dur="2.4s" begin={`${i * 0.8}s`}><rect x="3" y={157 + i * 10} width={i === 1 ? 30 : 40} height="5" rx="2" className={i === 0 ? "f-acc" : "f-ln"} /></Blink>
      ))}
      {/* birds */}
      {[0, 1].map((i) => (
        <Rider key={i} path={`M-20 ${70 + i * 18} C 100 ${40 + i * 10}, 260 ${90 - i * 10}, 420 ${50 + i * 14}`} dur={`${9 + i * 2}s`} begin={`${i * 1.5}s`}>
          <path d="M-8 0 q4 -5 8 0 q4 -5 8 0" className="s-ln" strokeWidth="1.6" strokeLinecap="round" transform="rotate(0)" />
        </Rider>
      ))}
      <Pulse cx={200} cy={124} r={30} dur="4s" className="s-dim" />
    </g>
  );
}

function ScheduleScene() {
  return (
    <g>
      <g className="sc-float-slow">
        <rect x="70" y="58" width="236" height="198" rx="16" className="f-fill s-ln" strokeWidth="1.5" />
        <path d="M86 58h204a16 16 0 0 1 16 16v14H70V74a16 16 0 0 1 16-16z" className="f-acc" />
        <text x="86" y="80" className="f-bg" fontSize="11" fontWeight="700" letterSpacing="2" style={MONO}>TIMETABLE</text>
        <rect x="76" y="98" width="224" height="22" rx="6" className="f-acc" opacity=".2">
          <animateTransform attributeName="transform" type="translate" values="0 0; 0 26; 0 52; 0 78; 0 104; 0 104; 0 0" keyTimes="0;.18;.36;.54;.72;.9;1" dur="7s" repeatCount="indefinite" />
        </rect>
        {Array.from({ length: 5 }, (_, i) => (
          <g key={i}>
            <circle cx="96" cy={109 + i * 26} r="4" className={i === 0 ? "f-acc" : "s-ln"} strokeWidth="1.5" />
            {i < 4 && <line x1="96" y1={113 + i * 26} x2="96" y2={131 + i * 26} className="s-dim" strokeWidth="1.5" />}
            <rect x="110" y={106 + i * 26} width={[96, 70, 110, 84, 64][i]} height="6" rx="3" className="f-ln" opacity=".75" />
            <rect x="252" y={106 + i * 26} width="38" height="7" rx="3.5" className="f-ln" opacity=".35" />
          </g>
        ))}
        <g transform="translate(86 236)">
          {"MTWTFSS".split("").map((d, i) => (
            <g key={i}>
              <rect x={i * 30} y="-10" width="24" height="16" rx="4" className={i === 2 || i === 6 ? "f-dim" : "f-acc"} />
              <text x={i * 30 + 12} y="2" textAnchor="middle" className="f-bg" fontSize="9" fontWeight="700" style={MONO}>{d}</text>
            </g>
          ))}
        </g>
      </g>
      <g className="sc-float">
        <circle cx="318" cy="70" r="40" className="f-bg s-ln" strokeWidth="2" />
        <circle cx="318" cy="70" r="34" className="s-dim" strokeWidth="1" />
        <Ticks cx={318} cy={70} r={40} />
        <Hands cx={318} cy={70} r={40} minDur="4s" hourDur="48s" />
      </g>
    </g>
  );
}

function RouteScene() {
  const path = "M50 236 C 90 160, 150 250, 186 170 S 260 80, 340 70";
  const pins: [number, number][] = [[50, 236], [186, 170], [262, 104], [340, 70]];
  return (
    <g>
      <path d="M20 60 L140 40 L140 270 L20 290 Z" className="f-fill s-ln" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M140 40 L260 60 L260 290 L140 270 Z" className="f-dim s-ln" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M260 60 L380 40 L380 270 L260 290 Z" className="f-fill s-ln" strokeWidth="1.5" strokeLinejoin="round" />
      {[[40, 120, 60], [160, 220, 70], [280, 200, 80], [290, 130, 50]].map(([x, y, w]) => (
        <path key={`${x}${y}`} d={`M${x} ${y} q${w / 2} -12 ${w} 0`} className="s-dim" strokeWidth="1.5" />
      ))}
      <path d={path} className="s-dim" strokeWidth="7" strokeLinecap="round" />
      <path d={path} className="s-acc draw" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="6 7" style={{ ["--len" as string]: 520 }} />
      {pins.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="0" className={i === 0 || i === 3 ? "f-acc s-bg" : "f-bg s-acc"} strokeWidth="2.5">
            <animate attributeName="r" values="0;9;7" keyTimes="0;.7;1" dur=".6s" begin={`${0.4 + i * 0.45}s`} fill="freeze" />
          </circle>
          <Pulse cx={x} cy={y} r={5} begin={`${i * 0.6}s`} dur="3s" />
        </g>
      ))}
      <Rider path={path} dur="7s"><circle r="5" className="f-ln" /></Rider>
      <g transform="translate(350 236)">
        <circle r="22" className="f-bg s-ln" strokeWidth="1.5" />
        <g>
          <path d="M0 -16 L5 0 L0 16 L-5 0 Z" className="f-acc" />
          <path d="M0 16 L5 0 L-5 0 Z" className="f-ln" opacity=".5" />
          <animateTransform attributeName="transform" type="rotate" values="-14;12;-6;0;-14" dur="5s" repeatCount="indefinite" />
        </g>
        <text y="-26" textAnchor="middle" className="f-ln" fontSize="10" fontWeight="700" style={MONO}>N</text>
      </g>
    </g>
  );
}

function BetweenScene() {
  const Train = ({ dir }: { dir: 1 | -1 }) => (
    <g>
      {[0, 46, 92].map((x, i) => (
        <g key={x}>
          <rect x={x} y="-22" width="42" height="24" rx="6" className="f-fill s-ln" strokeWidth="1.5" />
          <rect x={x + 6} y="-17" width="30" height="7" rx="2" className={i === (dir === 1 ? 2 : 0) ? "f-acc" : "f-dim"} />
        </g>
      ))}
    </g>
  );
  return (
    <g>
      {[0, 1].map((side) => {
        const x = side ? 330 : 70;
        return (
          <g key={side}>
            <line x1={x - 20} y1="150" x2={x - 20} y2="250" className="s-ln" strokeWidth="2" />
            <line x1={x + 20} y1="150" x2={x + 20} y2="250" className="s-ln" strokeWidth="2" />
            <g className={side ? "sc-float-slow" : "sc-float"}>
              <rect x={x - 46} y="96" width="92" height="44" rx="8" className="f-acc s-bg" strokeWidth="2" />
              <rect x={x - 30} y="110" width="60" height="7" rx="3.5" className="f-bg" />
              <rect x={x - 30} y="122" width={side ? 34 : 44} height="5" rx="2.5" className="f-bg" opacity=".5" />
            </g>
          </g>
        );
      })}
      {[204, 250].map((y) => (
        <g key={y}>
          <line x1="0" y1={y} x2="400" y2={y} className="s-ln" strokeWidth="1.5" />
          <line x1="0" y1={y + 6} x2="400" y2={y + 6} className="s-dim" strokeWidth="6" strokeDasharray="2 12" />
        </g>
      ))}
      <g>
        <Train dir={1} />
        <animateTransform attributeName="transform" type="translate" values="-150 202; 420 202" dur="6s" repeatCount="indefinite" />
      </g>
      <g>
        <Train dir={-1} />
        <animateTransform attributeName="transform" type="translate" values="420 248; -150 248" dur="7.5s" begin="1s" repeatCount="indefinite" />
      </g>
      <path d="M118 60 H282" className="s-dim" strokeWidth="1.5" strokeDasharray="3 6" />
      <path d="M272 54 l10 6 -10 6" className="s-acc" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <text x="200" y="50" textAnchor="middle" className="f-ln" fontSize="11" opacity=".55" letterSpacing="2" style={MONO}>ALL TRAINS</text>
    </g>
  );
}

function TravelScene() {
  const orbit = "M50 170 A130 46 0 1 1 310 170 A130 46 0 1 1 50 170";
  return (
    <g>
      <g transform="translate(316 70)">
        <g>
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="0" y1="-30" x2="0" y2="-42" className="s-acc" strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 30})`} />
          ))}
          <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="24s" repeatCount="indefinite" />
        </g>
        <circle r="22" className="f-acc" />
      </g>
      <Drift by={-30} dur="10s"><Cloud x={282} y={98} s={0.9} className="f-fill s-ln" /></Drift>
      <circle cx="180" cy="170" r="84" className="f-fill s-ln" strokeWidth="1.5" />
      {[-50, 0, 50].map((dy) => (
        <ellipse key={dy} cx="180" cy={170 + dy} rx={Math.sqrt(84 * 84 - dy * dy)} ry="10" className="s-dim" strokeWidth="1.5" />
      ))}
      {[0, 1, 2].map((i) => (
        <ellipse key={i} cx="180" cy="170" rx="84" ry="84" className={i === 1 ? "s-acc" : "s-dim"} strokeWidth="1.5">
          <animate attributeName="rx" values="84;0;84" dur="8s" begin={`${-i * 2.66}s`} repeatCount="indefinite" />
        </ellipse>
      ))}
      <path d={orbit} className="s-dim" strokeWidth="1.5" strokeDasharray="3 6" />
      <g>
        <Plane s={1.5} />
        <animateMotion path={orbit} dur="10s" repeatCount="indefinite" rotate="auto" />
      </g>
      <g transform="translate(40 50)">
        <g className="sc-float">
          <rect width="74" height="32" rx="16" className="f-bg s-ln" strokeWidth="1.5" />
          <circle cx="16" cy="16" r="6" className="s-acc" strokeWidth="2" />
          <line x1="16" y1="16" x2="16" y2="12" className="s-acc" strokeWidth="2" strokeLinecap="round" />
          <rect x="30" y="13" width="32" height="6" rx="3" className="f-ln" opacity=".7" />
        </g>
      </g>
    </g>
  );
}

/** Top-down coach plan: bays of berths, the free ones lighting up in turn */
function SeatsScene() {
  const lit = new Set(["0-1", "1-4", "2-0", "2-5", "3-2"]);
  return (
    <g>
      <g className="sc-float-slow">
        <rect x="24" y="64" width="352" height="172" rx="28" className="f-fill s-ln" strokeWidth="1.5" />
        {Array.from({ length: 9 }, (_, i) => (
          <g key={i}>
            <rect x={48 + i * 37} y="57" width="18" height="7" rx="3" className="f-acc" opacity=".55" />
            <rect x={48 + i * 37} y="236" width="18" height="7" rx="3" className="f-acc" opacity=".55" />
          </g>
        ))}
        <line x1="40" y1="190" x2="360" y2="190" className="s-dim" strokeWidth="1.5" strokeDasharray="4 6" />
        {[0, 1, 2, 3].map((bay) => {
          const x = 44 + bay * 80;
          const berths = [[x, 82], [x + 34, 82], [x, 120], [x + 34, 120], [x, 202], [x + 34, 202]];
          return (
            <g key={bay}>
              {bay > 0 && <line x1={x - 8} y1="76" x2={x - 8} y2="180" className="s-dim" strokeWidth="1.5" />}
              {berths.map(([bx, by], i) => {
                const on = lit.has(`${bay}-${i}`);
                return (
                  <rect key={i} x={bx} y={by} width="30" height={i > 3 ? 20 : 30} rx="6" className={on ? "f-acc" : "f-dim"}>
                    {on && <animate attributeName="opacity" values=".25;1;1;.25" keyTimes="0;.15;.85;1" dur="4s" begin={`${bay * 0.6 + i * 0.15}s`} repeatCount="indefinite" />}
                  </rect>
                );
              })}
            </g>
          );
        })}
      </g>
      <g transform="translate(268 36)">
        <g className="sc-float">
          <rect width="104" height="38" rx="19" className="f-bg s-acc" strokeWidth="2" />
          <circle cx="20" cy="19" r="7" className="f-acc" />
          <rect x="34" y="13" width="28" height="6" rx="3" className="f-ln" />
          <rect x="34" y="23" width="52" height="4" rx="2" className="f-ln" opacity=".4" />
        </g>
      </g>
      <Pulse cx={127} cy={97} r={6} />
    </g>
  );
}

/** A departure board with one service struck off */
function CancelledScene({ uid }: { uid: string }) {
  return (
    <g>
      <defs>
        <clipPath id={`hz${uid}`}><rect x="40" y="242" width="320" height="18" rx="9" /></clipPath>
      </defs>
      <g className="sc-float-slow">
        <rect x="50" y="48" width="300" height="176" rx="16" className="f-fill s-ln" strokeWidth="1.5" />
        <path d="M66 48h268a16 16 0 0 1 16 16v14H50V64a16 16 0 0 1 16-16z" className="f-acc" />
        <text x="68" y="69" className="f-bg" fontSize="11" fontWeight="700" letterSpacing="2" style={MONO}>DEPARTURES</text>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="68" y={96 + i * 30} width="44" height="12" rx="3" className={i === 1 ? "f-ln" : "f-dim"} opacity={i === 1 ? 0.5 : 1} />
            <rect x="124" y={96 + i * 30} width={[120, 96, 136, 104][i]} height="12" rx="3" className="f-dim" />
            <rect x="290" y={96 + i * 30} width="40" height="12" rx="3" className={i === 1 ? "f-dim" : "f-acc"} opacity={i === 1 ? 1 : 0.8}>
              {i !== 1 && <animate attributeName="opacity" values=".8;.3;.8" dur="2s" begin={`${i * 0.4}s`} repeatCount="indefinite" />}
            </rect>
          </g>
        ))}
        <line x1="60" y1="132" x2="340" y2="132" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" className="draw" style={{ ["--len" as string]: 290, ["--delay" as string]: ".6s" }} />
      </g>
      <g transform="translate(286 180)">
        <g className="sc-pop">
          <rect x="-64" y="-18" width="128" height="36" rx="8" fill="none" stroke="#ef4444" strokeWidth="3" />
          <text textAnchor="middle" y="7" fill="#ef4444" fontSize="16" fontWeight="800" letterSpacing="2" style={MONO}>CANCELLED</text>
        </g>
      </g>
      <g clipPath={`url(#hz${uid})`}>
        <g>
          {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M${20 + i * 18} 260 l14 -18 h9 l-14 18 z`} className="f-acc" />)}
          <animateTransform attributeName="transform" type="translate" values="0 0; -18 0" dur=".8s" repeatCount="indefinite" />
        </g>
      </g>
      <rect x="40" y="242" width="320" height="18" rx="9" className="s-ln" strokeWidth="1.5" />
    </g>
  );
}

const SCENES: Record<SceneKind, (p: { uid: string }) => ReactNode> = {
  seats: SeatsScene,
  cancelled: CancelledScene,
  pnr: PnrScene,
  train: TrainScene,
  flight: FlightScene,
  tracker: TrackerScene,
  search: SearchScene,
  airport: AirportScene,
  station: StationScene,
  schedule: ScheduleScene,
  route: RouteScene,
  between: BetweenScene,
  travel: TravelScene,
};
