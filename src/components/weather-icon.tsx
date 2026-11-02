"use client";

import { cx } from "@/lib/format";

/*
  Animated condition icons keyed by WMO weather code. Clouds use currentColor,
  so the caller sets their tone (white on dark bands, slate on cards).
*/

type Kind = "clear" | "partly" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm" | "unknown";

function kindOf(code: number): Kind {
  if (code === 0) return "clear";
  if (code === 1 || code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "unknown";
}

const CLOUD = "M18 46h28a11 11 0 0 0 1.5-21.9A15 15 0 0 0 19 21a12.5 12.5 0 0 0-1 25z";

function Sun({ x = 32, y = 32, r = 11 }: { x?: number; y?: number; r?: number }) {
  return (
    <g>
      <g>
        {Array.from({ length: 8 }, (_, i) => (
          <line key={i} x1={x} y1={y - r - 4} x2={x} y2={y - r - 9} stroke="#ffc21a" strokeWidth="3" strokeLinecap="round" transform={`rotate(${i * 45} ${x} ${y})`} />
        ))}
        <animateTransform attributeName="transform" type="rotate" from={`0 ${x} ${y}`} to={`360 ${x} ${y}`} dur="14s" repeatCount="indefinite" />
      </g>
      <circle cx={x} cy={y} r={r} fill="#ffc21a" />
    </g>
  );
}

function Moon({ x = 32, y = 30 }: { x?: number; y?: number }) {
  return (
    <g>
      <path d={`M${x + 6} ${y - 13}a14 14 0 1 0 8 22a11 11 0 1 1-8-22z`} fill="#ffe08a" />
      <path d={`M${x - 14} ${y - 12}l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z`} fill="#ffe08a">
        <animate attributeName="opacity" values="1;.2;1" dur="2.4s" repeatCount="indefinite" />
      </path>
    </g>
  );
}

function Cloud({ dx = 0, dy = 0, opacity = 1, drift = 3 }: { dx?: number; dy?: number; opacity?: number; drift?: number }) {
  return (
    <g transform={`translate(${dx} ${dy})`}>
      <g opacity={opacity}>
        <path d={CLOUD} fill="currentColor" />
        <animateTransform attributeName="transform" type="translate" values={`0 0; ${drift} 0; 0 0`} dur="6s" repeatCount="indefinite" />
      </g>
    </g>
  );
}

function Fall({ kind }: { kind: "drop" | "flake" }) {
  return (
    <g>
      {[22, 32, 42].map((x, i) => (
        <g key={x} opacity="0">
          {kind === "drop" ? (
            <line x1={x} y1="48" x2={x - 2} y2="54" stroke="#38bdf8" strokeWidth="2.6" strokeLinecap="round" />
          ) : (
            <circle cx={x} cy="51" r="2.2" fill="#e0f2fe" stroke="#7dd3fc" strokeWidth="0.8" />
          )}
          <animateTransform attributeName="transform" type="translate" values="0 -4; -2 8" dur={kind === "drop" ? "0.9s" : "2.2s"} begin={`${i * 0.3}s`} repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;0" dur={kind === "drop" ? "0.9s" : "2.2s"} begin={`${i * 0.3}s`} repeatCount="indefinite" />
        </g>
      ))}
    </g>
  );
}

export function WeatherIcon({ code, isDay = true, size = 48, className, label }: { code: number; isDay?: boolean; size?: number; className?: string; label?: string }) {
  const kind = kindOf(code);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={cx("shrink-0 overflow-visible", className)} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {kind === "clear" && (isDay ? <Sun /> : <Moon />)}
      {kind === "partly" && (
        <>
          {isDay ? <Sun x={24} y={24} r={9} /> : <Moon x={22} y={24} />}
          <Cloud dx={6} dy={8} />
        </>
      )}
      {kind === "cloudy" && (
        <>
          <Cloud dx={-6} dy={-6} opacity={0.45} drift={-3} />
          <Cloud dx={2} dy={4} />
        </>
      )}
      {kind === "fog" && (
        <>
          <Cloud dy={-6} opacity={0.6} />
          {[44, 51, 58].map((y, i) => (
            <line key={y} x1="12" y1={y} x2="52" y2={y} stroke="currentColor" strokeOpacity=".7" strokeWidth="3" strokeLinecap="round" strokeDasharray="14 6">
              <animate attributeName="stroke-dashoffset" values="0;40" dur={`${3 + i}s`} repeatCount="indefinite" />
            </line>
          ))}
        </>
      )}
      {(kind === "drizzle" || kind === "rain") && (
        <>
          {kind === "drizzle" && isDay && <Sun x={22} y={20} r={8} />}
          <Cloud dy={-6} />
          <Fall kind="drop" />
        </>
      )}
      {kind === "snow" && (
        <>
          <Cloud dy={-6} />
          <Fall kind="flake" />
        </>
      )}
      {kind === "storm" && (
        <>
          <Cloud dy={-8} />
          <path d="M34 38l-8 12h7l-4 10 11-14h-7l4-8z" fill="#ffc21a">
            <animate attributeName="opacity" values="1;1;.15;1;.3;1" keyTimes="0;.6;.65;.7;.75;1" dur="2.6s" repeatCount="indefinite" />
          </path>
        </>
      )}
      {kind === "unknown" && <Cloud opacity={0.5} />}
    </svg>
  );
}
