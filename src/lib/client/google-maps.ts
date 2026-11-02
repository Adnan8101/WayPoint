"use client";

// Loads the Google Maps JavaScript API once, on demand. The key is a browser key
// (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) and should be restricted to the site's domain.

/* The Maps API ships no npm types here; keep its surface loosely typed */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type GoogleNS = any;

let loading: Promise<GoogleNS> | null = null;

export function loadGoogleMaps(): Promise<GoogleNS> {
  const w = window as unknown as { google?: GoogleNS; __waypointMapsReady?: () => void };
  if (w.google?.maps?.importLibrary) return Promise.resolve(w.google);
  if (loading) return loading;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("Google Maps key not configured"));

  loading = new Promise<GoogleNS>((resolve, reject) => {
    w.__waypointMapsReady = () => resolve(w.google);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=__waypointMapsReady`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/** Decodes a Google encoded polyline into [lat, lng] pairs */
export function decodePolyline(encoded: string): [number, number][] {
  const out: [number, number][] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  while (i < encoded.length) {
    for (const axis of [0, 1]) {
      let shift = 0;
      let result = 0;
      let b: number;
      do {
        b = encoded.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20 && i < encoded.length);
      const delta = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += delta;
      else lng += delta;
    }
    out.push([lat / 1e5, lng / 1e5]);
  }
  return out;
}

/** Map styling in the WayPoint palette: warm paper land, quiet labels, signal-yellow roads */
export const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#f2efe8" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#5d564b" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#faf8f4" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#cfc7b8" }] },
  { featureType: "poi", elementType: "labels.icon", stylers: [{ saturation: -100 }, { lightness: 20 }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e3e8d6" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#ffe08a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#e6b84a" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#a59c8c" }] },
  { featureType: "transit.station.rail", elementType: "labels.icon", stylers: [{ saturation: -40 }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9dbe0" }] },
];
