"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const INTERACTIVE =
  "a, button, [role='button'], summary, .fc-daygrid-day, .fc-list-event, .fc-event";

type Arm = {
  el: HTMLElement;
  fetches: number;
  navigate: boolean;
  watchdog: number;
};

type TapState = { arm: Arm | null };

function tapState(): TapState {
  const win = window as Window & { __gpwTap?: TapState };
  if (!win.__gpwTap) win.__gpwTap = { arm: null };
  return win.__gpwTap;
}

function interactiveTarget(event: Event): HTMLElement | null {
  const node = event.target;
  if (!(node instanceof Element)) return null;
  const el = node.closest(INTERACTIVE);
  if (!(el instanceof HTMLElement)) return null;
  if (el.closest("[data-tap-ignore]")) return null;
  if (el instanceof HTMLButtonElement && el.disabled) return null;
  if (el.getAttribute("aria-disabled") === "true") return null;
  return el;
}

function clearElement(el: HTMLElement) {
  el.removeAttribute("data-pressed");
  el.removeAttribute("data-pending");
  el.removeAttribute("aria-busy");
}

function clearArm(target: Arm | null = tapState().arm) {
  if (!target) return;
  window.clearTimeout(target.watchdog);
  clearElement(target.el);
  const state = tapState();
  if (state.arm === target) state.arm = null;
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isIgnoredRequest(input: RequestInfo | URL): boolean {
  const url = requestUrl(input);
  return url.includes("/_next/") || url.includes("webpack-hmr") || url.includes("turbopack");
}

function linkKind(el: HTMLElement, event: MouseEvent): "navigate" | "instant" | "action" {
  if (!(el instanceof HTMLAnchorElement)) return "action";
  if (
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    event.button !== 0 ||
    el.hasAttribute("download")
  ) {
    return "instant";
  }
  if (el.target && el.target !== "_self") return "instant";

  const href = el.getAttribute("href") ?? "";
  if (!href || href.startsWith("#")) return "instant";
  if (/^(tel:|sms:|mailto:|maps:)/i.test(href)) return "instant";

  let url: URL;
  try {
    url = new URL(el.href, window.location.href);
  } catch {
    return "instant";
  }

  if (url.origin !== window.location.origin) return "instant";
  if (url.pathname === window.location.pathname && url.search === window.location.search) {
    return "instant";
  }
  return "navigate";
}

function holdPressed(el: HTMLElement) {
  window.setTimeout(() => {
    if (!el.hasAttribute("data-pending")) el.removeAttribute("data-pressed");
  }, 160);
}

function installFetchTracker() {
  const current = window.fetch as typeof window.fetch & { __gpw?: boolean };
  if (current.__gpw) return;
  const original = current.bind(window);

  const wrapped = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const currentArm = tapState().arm;
    const tracked = currentArm && !currentArm.navigate && !isIgnoredRequest(input) ? currentArm : null;
    if (tracked) {
      tracked.fetches += 1;
      tracked.el.setAttribute("data-pending", "busy");
      tracked.el.setAttribute("aria-busy", "true");
      tracked.el.removeAttribute("data-pressed");
    }

    try {
      return await original(input, init);
    } finally {
      if (!tracked) return;
      tracked.fetches = Math.max(0, tracked.fetches - 1);
      if (tracked.fetches === 0 && tapState().arm === tracked) {
        window.setTimeout(() => {
          if (tapState().arm === tracked && tracked.fetches === 0) clearArm(tracked);
        }, 120);
      }
    }
  }) as typeof window.fetch & { __gpw?: boolean };

  wrapped.__gpw = true;
  window.fetch = wrapped;
}

export default function TapFeedback() {
  const pathname = usePathname();

  useEffect(() => {
    const current = tapState().arm;
    if (current?.navigate) clearArm(current);
  }, [pathname]);

  useEffect(() => {
    installFetchTracker();

    const markTouch = () => {
      document.documentElement.dataset.touch = "";
    };
    if (window.matchMedia("(hover: none), (pointer: coarse)").matches) markTouch();

    function onPointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (event.pointerType && event.pointerType !== "mouse") markTouch();
      const el = interactiveTarget(event);
      if (!el) return;
      el.setAttribute("data-pressed", "");
    }

    function onPointerUp() {
      document.querySelectorAll<HTMLElement>("[data-pressed]").forEach(holdPressed);
    }

    function onPointerCancel() {
      document.querySelectorAll<HTMLElement>("[data-pressed]").forEach((el) => {
        if (!el.hasAttribute("data-pending")) el.removeAttribute("data-pressed");
      });
    }

    function onClick(event: MouseEvent) {
      const el = interactiveTarget(event);
      if (!el) return;

      const kind = linkKind(el, event);
      if (kind === "instant") return;

      const state = tapState();
      if (state.arm && state.arm.el !== el) clearArm(state.arm);

      const next: Arm = {
        el,
        fetches: 0,
        navigate: kind === "navigate",
        watchdog: 0,
      };
      next.watchdog = window.setTimeout(() => {
        if (tapState().arm === next) clearArm(next);
      }, 12000);
      state.arm = next;
      el.setAttribute("data-pending", "");
      el.removeAttribute("data-pressed");

      if (kind === "action") {
        window.setTimeout(() => {
          if (tapState().arm === next && next.fetches === 0) clearArm(next);
        }, 280);
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("pointercancel", onPointerCancel, true);
    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("pointercancel", onPointerCancel, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
