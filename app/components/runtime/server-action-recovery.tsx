"use client";

import { useEffect } from "react";

const RECOVERY_FLAG = "__server_action_recovery_done__";
const ERROR_SNIPPET = "Failed to find Server Action";

function getErrorMessage(error: unknown): string {
  if (typeof error === "string") return error;

  if (error && typeof error === "object") {
    const maybeError = error as { message?: unknown };
    if (typeof maybeError.message === "string") {
      return maybeError.message;
    }
  }

  return "";
}

function shouldRecover(error: unknown): boolean {
  return getErrorMessage(error).includes(ERROR_SNIPPET);
}

function recoverFromServerActionMismatch() {
  if (typeof window === "undefined") return;

  const hasRecovered = sessionStorage.getItem(RECOVERY_FLAG) === "1";
  if (hasRecovered) return;

  sessionStorage.setItem(RECOVERY_FLAG, "1");
  window.location.reload();
}

export default function ServerActionRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (shouldRecover(event.error) || shouldRecover(event.message)) {
        recoverFromServerActionMismatch();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (shouldRecover(event.reason)) {
        recoverFromServerActionMismatch();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
