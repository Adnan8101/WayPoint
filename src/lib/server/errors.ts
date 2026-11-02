import type { ErrorCode } from "@/lib/types";

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status = statusFor(code),
  ) {
    super(message);
  }
}

function statusFor(code: ErrorCode): number {
  switch (code) {
    case "INVALID_FLIGHT":
    case "INVALID_TRAIN":
    case "INVALID_PNR":
    case "INVALID_STATION":
    case "INVALID_AIRPORT":
    case "INVALID_INPUT":
      return 400;
    case "NO_RESULTS":
      return 404;
    case "RATE_LIMITED":
      return 429;
    case "TIMEOUT":
      return 504;
    case "NOT_CONFIGURED":
    case "UNAVAILABLE":
      return 503;
    case "SERVICE_FAILURE":
      return 502;
  }
}
