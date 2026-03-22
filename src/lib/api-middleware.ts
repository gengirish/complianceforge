import { NextResponse } from "next/server";
import { apiRateLimiter } from "./rate-limit";

const X_RATE_LIMIT_LIMIT = "100";

export type RateLimitMiddlewareResult =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      headers: {
        "X-RateLimit-Limit": string;
        "X-RateLimit-Remaining": string;
        "X-RateLimit-Reset": string;
      };
    };

export function withRateLimit(request: Request, identifier: string): RateLimitMiddlewareResult {
  void request;
  const result = apiRateLimiter.check(identifier);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Rate limit exceeded. Try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(result.reset),
            "X-RateLimit-Limit": X_RATE_LIMIT_LIMIT,
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(result.reset),
          },
        }
      ),
    };
  }
  return {
    ok: true,
    headers: {
      "X-RateLimit-Limit": X_RATE_LIMIT_LIMIT,
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.reset),
    },
  };
}
