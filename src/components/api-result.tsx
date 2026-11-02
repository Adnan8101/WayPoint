"use client";

import type { ReactNode } from "react";
import type { ApiMeta } from "@/lib/types";
import type { ApiState } from "@/lib/client/use-api";
import { ErrorState, ResultSkeleton } from "./result-states";

/** Renders the right UI for each request state; keeps showing previous data while refreshing. */
export function ApiResult<T>({
  state, onRetry, idle, skeleton, children,
}: {
  state: ApiState<T>;
  onRetry: () => void;
  idle?: ReactNode;
  skeleton?: ReactNode;
  children: (data: T, meta: ApiMeta, refreshing: boolean) => ReactNode;
}) {
  switch (state.status) {
    case "idle":
      return <>{idle}</>;
    case "loading":
      return state.previous ? <>{children(state.previous.data, state.previous.meta, true)}</> : <>{skeleton ?? <ResultSkeleton />}</>;
    case "error":
      return <ErrorState code={state.code} message={state.message} onRetry={onRetry} />;
    case "success":
      return <>{children(state.data, state.meta, false)}</>;
  }
}
