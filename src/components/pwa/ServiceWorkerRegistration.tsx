"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Registration can fail in dev or unsupported contexts.
    });
  }, []);

  return null;
}
