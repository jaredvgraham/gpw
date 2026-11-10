"use client";

import { useEffect, useState } from "react";

export type LayoutMode = "phone" | "wide" | "desktop";

/** Phone, or a short touch screen such as an unfolded Duo held sideways. */
const PHONE_LAYOUT = "(width < 768px), (height <= 800px) and (pointer: coarse)";
const WIDE_SCREEN = "(width >= 768px)";
const HINGE = "(horizontal-viewport-segments: 2)";

function readMode(): LayoutMode {
  const phone = window.matchMedia(PHONE_LAYOUT).matches;
  if (!phone) return "desktop";
  return window.matchMedia(WIDE_SCREEN).matches ? "wide" : "phone";
}

export function useLayoutMode(): { mode: LayoutMode; hinge: boolean; ready: boolean } {
  const [state, setState] = useState<{ mode: LayoutMode; hinge: boolean; ready: boolean }>({
    mode: "desktop",
    hinge: false,
    ready: false,
  });

  useEffect(() => {
    const phone = window.matchMedia(PHONE_LAYOUT);
    const wide = window.matchMedia(WIDE_SCREEN);
    const hinge = window.matchMedia(HINGE);

    function update() {
      setState({ mode: readMode(), hinge: hinge.matches, ready: true });
    }

    update();
    phone.addEventListener("change", update);
    wide.addEventListener("change", update);
    hinge.addEventListener("change", update);
    return () => {
      phone.removeEventListener("change", update);
      wide.removeEventListener("change", update);
      hinge.removeEventListener("change", update);
    };
  }, []);

  return state;
}
