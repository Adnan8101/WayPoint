import type { SeatCheck } from "./types";

/** Identifies one seat check, so batched answers can be matched back to their trains */
export const seatKey = (c: SeatCheck) => `${c.train}|${c.from}|${c.to}|${c.date}|${c.class}`;
