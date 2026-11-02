// Date helpers shared by client and server.

/** Today's date (YYYY-MM-DD) in a given IANA time zone. */
export function todayIn(timeZone: string, offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export const IST = "Asia/Kolkata";

export function todayIST(offsetDays = 0): string {
  return todayIn(IST, offsetDays);
}

/** Local date of the browser */
export function todayLocal(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
