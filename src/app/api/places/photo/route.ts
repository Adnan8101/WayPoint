import { NextResponse } from "next/server";
import { cached } from "@/lib/server/cache";
import { photoUri } from "@/lib/server/google/places";
import { clientKey, rateLimit } from "@/lib/server/rate-limit";

const NAME_RE = /^places\/[A-Za-z0-9_-]{10,300}\/photos\/[A-Za-z0-9_-]{10,1000}$/;
const WIDTHS = [160, 400, 800, 1600];

/**
 * Redirects to a Google Place Photo. Keeps credentials server-side; the photo
 * URL Google returns is short-lived, so it is cached briefly only.
 */
export async function GET(req: Request) {
  if (!rateLimit(`photo:${clientKey(req)}`, 200, 200)) return new NextResponse("Too many requests", { status: 429 });
  const url = new URL(req.url);
  const name = url.searchParams.get("name") ?? "";
  if (!NAME_RE.test(name)) return new NextResponse("Invalid photo", { status: 400 });
  const requested = Number(url.searchParams.get("w") ?? 800);
  const w = WIDTHS.find((x) => x >= requested) ?? 1600;
  try {
    const { value } = await cached(`photo:${name}:${w}`, 50 * 60_000, () => photoUri(name, w));
    return NextResponse.redirect(value, { status: 302, headers: { "Cache-Control": "private, max-age=1800" } });
  } catch {
    return new NextResponse("Photo unavailable", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
}
