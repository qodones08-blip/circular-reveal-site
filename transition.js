(() => {
  "use strict";

  const STORAGE_KEY = "serein:last-navigation";
  const root = document.documentElement;
  const params = new URLSearchParams(window.location.search);

  function readSavedNavigation() {
    try {
      const value = sessionStorage.getItem(STORAGE_KEY);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  function writeSavedNavigation(value) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } catch {
      // URL parameters still carry the origin when storage is unavailable.
    }
  }

  function finiteNumber(value) {
    if (typeof value !== "string" || value.trim() === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function centerOfLogo() {
    const logo = document.querySelector(".brand-mark");
    const rect = logo ? logo.getBoundingClientRect() : null;
    return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : { x: window.innerWidth / 2, y: 48 };
  }

  function pointFromParams() {
    const rawX = finiteNumber(params.get("rx"));
    const rawY = finiteNumber(params.get("ry"));
    const sourceWidth = finiteNumber(params.get("rw"));
    const sourceHeight = finiteNumber(params.get("rh"));

    if (rawX === null || rawY === null) return null;

    const x = sourceWidth > 0 ? (rawX / sourceWidth) * window.innerWidth : rawX;
    const y = sourceHeight > 0 ? (rawY / sourceHeight) * window.innerHeight : rawY;
    return { x, y };
  }

  function pointFromSavedNavigation(saved) {
    if (!saved || !Number.isFinite(saved.x) || !Number.isFinite(saved.y)) return null;
    const x = saved.width > 0 ? (saved.x / saved.width) * window.innerWidth : saved.x;
    const y = saved.height > 0 ? (saved.y / saved.height) * window.innerHeight : saved.y;
    return { x, y };
  }

  function setRevealPoint(point) {
    const x = Math.max(0, Math.min(window.innerWidth, point.x));
    const y = Math.max(0, Math.min(window.innerHeight, point.y));
    const farthestCorner = Math.max(
      Math.hypot(x, y),
      Math.hypot(window.innerWidth - x, y),
      Math.hypot(x, window.innerHeight - y),
      Math.hypot(window.innerWidth - x, window.innerHeight - y)
    );

    root.style.setProperty("--reveal-x", x + "px");
    root.style.setProperty("--reveal-y", y + "px");
    root.style.setProperty("--reveal-radius", (Math.ceil(farthestCorner) + 2) + "px");
  }

  function currentNavigationType() {
    try {
      return window.navigation && window.navigation.activation
        ? window.navigation.activation.navigationType
        : null;
    } catch {
      return null;
    }
  }

  function currentActivatedPath() {
    try {
      const entry = window.navigation && window.navigation.activation
        ? window.navigation.activation.entry
        : null;
      return entry && entry.url ? new URL(entry.url).pathname : window.location.pathname;
    } catch {
      return window.location.pathname;
    }
  }

  function applyNavigationState(event) {
    const savedNavigation = readSavedNavigation();
    const currentPath = currentActivatedPath();
    const isHistoryTraversal =
      currentNavigationType() === "traverse" ||
      performance.getEntriesByType("navigation")[0]?.type === "back_forward" ||
      Boolean(event && event.viewTransition);
    const savedRouteMatches = savedNavigation &&
      (currentPath === savedNavigation.fromPath || currentPath === savedNavigation.toPath);

    let direction = "none";
    if (isHistoryTraversal && savedRouteMatches) {
      if (currentPath === savedNavigation.fromPath) direction = "reverse";
      if (currentPath === savedNavigation.toPath) direction = "forward";
    } else if (params.has("rx") && params.has("ry")) {
      direction = "forward";
    }

    root.dataset.transitionDirection = direction;

    const incomingPoint = isHistoryTraversal && savedRouteMatches
      ? pointFromSavedNavigation(savedNavigation)
      : pointFromParams();
    setRevealPoint(incomingPoint || centerOfLogo());
  }

  window.addEventListener("pagereveal", applyNavigationState);

  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;

    navigationPending = false;
    delete root.dataset.navigating;
    applyNavigationState({ viewTransition: true });
  });

  let navigationPending = false;

  function bindNavigation() {
    const logo = document.querySelector(".brand-mark");

    document.querySelectorAll("a[data-nav]").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (navigationPending) {
          event.preventDefault();
          return;
        }

        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          link.hasAttribute("download") ||
          (link.target && link.target !== "_self")
        ) {
          return;
        }

        const destination = new URL(link.href, window.location.href);
        if (destination.origin !== window.location.origin) return;

        event.preventDefault();
        navigationPending = true;
        root.dataset.navigating = "true";

        const rect = logo ? logo.getBoundingClientRect() : null;
        const point = rect
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : centerOfLogo();

        writeSavedNavigation({
          x: point.x,
          y: point.y,
          width: window.innerWidth,
          height: window.innerHeight,
          fromPath: window.location.pathname,
          toPath: destination.pathname,
          timestamp: Date.now(),
        });

        destination.searchParams.set("rx", String(point.x));
        destination.searchParams.set("ry", String(point.y));
        destination.searchParams.set("rw", String(window.innerWidth));
        destination.searchParams.set("rh", String(window.innerHeight));
        window.location.assign(destination.href);
      });
    });
  }

  applyNavigationState();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindNavigation, { once: true });
  } else {
    bindNavigation();
  }
})();
