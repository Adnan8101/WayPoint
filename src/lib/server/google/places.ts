import "server-only";
import type { LatLng, NearbyCategory, PlaceDetails, PlacePhoto, PlaceReview, PlaceSuggestion, PlaceSummary, RouteResult, TravelMode } from "@/lib/places-types";
import { NEARBY_CATEGORIES } from "@/lib/places-types";
import { ApiError } from "../errors";
import { arr, get, num, obj, str } from "../pick";
import { googleFetch } from "./auth";

// Google Places API (New) and Routes API, called with the service account.
// Docs: https://developers.google.com/maps/documentation/places/web-service/op-overview

const PLACES = "https://places.googleapis.com/v1";
export const googleSource = "Google Maps";

const SUMMARY_FIELDS = [
  "id", "displayName", "formattedAddress", "location", "rating", "userRatingCount",
  "types", "primaryTypeDisplayName", "photos", "googleMapsUri", "priceLevel",
];
const DETAIL_FIELDS = [
  ...SUMMARY_FIELDS, "reviews", "websiteUri", "nationalPhoneNumber", "internationalPhoneNumber",
  "editorialSummary", "regularOpeningHours.weekdayDescriptions", "regularOpeningHours.openNow", "viewport",
];

const mask = (fields: string[], prefix = "") => fields.map((f) => prefix + f).join(",");

function latLng(v: unknown): LatLng | undefined {
  const lat = num(v, "latitude");
  const lng = num(v, "longitude");
  return lat !== undefined && lng !== undefined ? { lat, lng } : undefined;
}

function photoOf(p: unknown): PlacePhoto | undefined {
  const name = str(p, "name");
  if (!name) return undefined;
  return {
    name,
    width: num(p, "widthPx"),
    height: num(p, "heightPx"),
    attributions: arr(get(p, "authorAttributions")).map((a) => ({ name: str(a, "displayName") ?? "Google user", uri: str(a, "uri") })),
  };
}

function summaryOf(p: unknown): PlaceSummary {
  return {
    id: str(p, "id") ?? "",
    name: str(p, "displayName.text") ?? "Unnamed place",
    address: str(p, "formattedAddress"),
    location: latLng(get(p, "location")),
    rating: num(p, "rating"),
    ratingCount: num(p, "userRatingCount"),
    typeLabel: str(p, "primaryTypeDisplayName.text"),
    types: arr(get(p, "types")).map(String),
    photo: photoOf(arr(get(p, "photos"))[0]),
    mapsUri: str(p, "googleMapsUri"),
    priceLevel: str(p, "priceLevel"),
  };
}

// ---------- Search ----------

export async function searchText(query: string, opts: { includedType?: string; near?: LatLng; radius?: number; limit?: number } = {}): Promise<PlaceSummary[]> {
  const body: Record<string, unknown> = { textQuery: query, pageSize: opts.limit ?? 12, languageCode: "en" };
  if (opts.includedType) body.includedType = opts.includedType;
  if (opts.near) body.locationBias = { circle: { center: { latitude: opts.near.lat, longitude: opts.near.lng }, radius: opts.radius ?? 20_000 } };
  const raw = await googleFetch(`${PLACES}/places:searchText`, { method: "POST", body, fieldMask: mask(SUMMARY_FIELDS, "places.") });
  const list = arr(get(raw, "places")).map(summaryOf).filter((p) => p.id);
  if (!list.length) throw new ApiError("NO_RESULTS", `No places matched "${query}".`);
  return list;
}

export async function searchNearby(center: LatLng, category: NearbyCategory, radius = 5000): Promise<PlaceSummary[]> {
  const raw = await googleFetch(`${PLACES}/places:searchNearby`, {
    method: "POST",
    fieldMask: mask(SUMMARY_FIELDS, "places."),
    body: {
      includedTypes: [...NEARBY_CATEGORIES[category].types],
      maxResultCount: 12,
      rankPreference: "POPULARITY",
      languageCode: "en",
      locationRestriction: { circle: { center: { latitude: center.lat, longitude: center.lng }, radius } },
    },
  });
  return arr(get(raw, "places")).map(summaryOf).filter((p) => p.id);
}

export async function autocomplete(input: string, sessionToken: string, primaryTypes?: string[]): Promise<PlaceSuggestion[]> {
  const body: Record<string, unknown> = { input, sessionToken, languageCode: "en" };
  if (primaryTypes?.length) body.includedPrimaryTypes = primaryTypes.slice(0, 5);
  const raw = await googleFetch(`${PLACES}/places:autocomplete`, { method: "POST", body });
  return arr(get(raw, "suggestions"))
    .map((s) => obj(get(s, "placePrediction")))
    .filter(Boolean)
    .map((p) => ({
      placeId: str(p, "placeId") ?? "",
      main: str(p, "structuredFormat.mainText.text", "text.text") ?? "",
      secondary: str(p, "structuredFormat.secondaryText.text"),
      types: arr(get(p, "types")).map(String),
    }))
    .filter((s) => s.placeId && s.main);
}

// ---------- Details & photos ----------

export async function placeDetails(id: string, sessionToken?: string): Promise<PlaceDetails> {
  const qs = new URLSearchParams({ languageCode: "en" });
  if (sessionToken) qs.set("sessionToken", sessionToken);
  const raw = await googleFetch(`${PLACES}/places/${encodeURIComponent(id)}?${qs}`, { fieldMask: mask(DETAIL_FIELDS) });
  const s = summaryOf(raw);
  if (!s.id) throw new ApiError("NO_RESULTS", "Google couldn't find that place.");
  const reviews: PlaceReview[] = arr(get(raw, "reviews")).map((r) => ({
    author: str(r, "authorAttribution.displayName") ?? "Google user",
    authorUri: str(r, "authorAttribution.uri"),
    authorPhoto: str(r, "authorAttribution.photoUri"),
    rating: num(r, "rating"),
    text: str(r, "text.text", "originalText.text"),
    relativeTime: str(r, "relativePublishTimeDescription"),
  }));
  const vp = get(raw, "viewport");
  return {
    ...s,
    photos: arr(get(raw, "photos")).map(photoOf).filter((p): p is PlacePhoto => Boolean(p)).slice(0, 10),
    reviews,
    website: str(raw, "websiteUri"),
    phone: str(raw, "internationalPhoneNumber", "nationalPhoneNumber"),
    summary: str(raw, "editorialSummary.text"),
    openingHours: arr(get(raw, "regularOpeningHours.weekdayDescriptions")).map(String),
    openNow: get(raw, "regularOpeningHours.openNow") as boolean | undefined,
    viewport: latLng(get(vp, "low")) && latLng(get(vp, "high")) ? { low: latLng(get(vp, "low"))!, high: latLng(get(vp, "high"))! } : undefined,
  };
}

/** Resolve a photo resource to a short-lived image URL (Place Photos New). */
export async function photoUri(name: string, maxWidth: number): Promise<string> {
  const raw = await googleFetch(`${PLACES}/${name}/media?maxWidthPx=${maxWidth}&skipHttpRedirect=true`);
  const uri = str(raw, "photoUri");
  if (!uri) throw new ApiError("NO_RESULTS", "Photo not available.");
  return uri;
}

// ---------- Routes ----------

type Waypoint = { latLng: LatLng } | { placeId: string };

const waypoint = (w: Waypoint) =>
  "placeId" in w ? { placeId: w.placeId } : { location: { latLng: { latitude: w.latLng.lat, longitude: w.latLng.lng } } };

export async function computeRoute(origin: Waypoint, destination: Waypoint, mode: TravelMode): Promise<RouteResult> {
  const body: Record<string, unknown> = {
    origin: waypoint(origin),
    destination: waypoint(destination),
    travelMode: mode,
    languageCode: "en",
    units: "METRIC",
  };
  if (mode === "DRIVE") body.routingPreference = "TRAFFIC_AWARE";
  const raw = await googleFetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    body,
    fieldMask: "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.localizedValues",
  });
  const r = arr(get(raw, "routes"))[0];
  const polyline = str(r, "polyline.encodedPolyline");
  if (!r || !polyline) {
    throw new ApiError("NO_RESULTS", mode === "TRANSIT" ? "No public transport route was found between these places." : "No route was found between these places.");
  }
  return {
    mode,
    distanceMeters: num(r, "distanceMeters") ?? 0,
    durationSeconds: Number((str(r, "duration") ?? "0s").replace("s", "")) || 0,
    distanceText: str(r, "localizedValues.distance.text"),
    durationText: str(r, "localizedValues.duration.text"),
    polyline,
  };
}
