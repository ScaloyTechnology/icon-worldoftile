export const SITE_LOADER_COMPLETE_EVENT = "icon:site-loader-complete";
export const MOTION_READY_EVENT = "icon:motion-ready";
export const CRITICAL_ASSET_READY_EVENT = "icon:critical-asset-ready";

export function resetMotionReady() {
  document.documentElement.removeAttribute("data-icon-motion-ready");
  document.documentElement.removeAttribute("data-icon-motion-path");
}

export function markMotionReady(pathname: string) {
  document.documentElement.setAttribute("data-icon-motion-ready", "true");
  document.documentElement.setAttribute("data-icon-motion-path", pathname);
  window.dispatchEvent(new CustomEvent(MOTION_READY_EVENT, { detail: { pathname } }));
}

export function waitForMotionReady(pathname: string) {
  if (document.documentElement.getAttribute("data-icon-motion-ready") === "true"
    && document.documentElement.getAttribute("data-icon-motion-path") === pathname) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const ready = (event: Event) => {
      const detail = (event as CustomEvent<{ pathname?: string }>).detail;
      if (detail?.pathname !== pathname) return;
      window.removeEventListener(MOTION_READY_EVENT, ready);
      resolve();
    };
    window.addEventListener(MOTION_READY_EVENT, ready);
  });
}

function criticalAttribute(id: string) {
  return `data-icon-ready-${id.replace(/[^a-z0-9-]/gi, "-").toLowerCase()}`;
}

export function resetCriticalAsset(id: string) {
  document.documentElement.removeAttribute(criticalAttribute(id));
}

export function markCriticalAssetReady(id: string) {
  document.documentElement.setAttribute(criticalAttribute(id), "true");
  window.dispatchEvent(new CustomEvent(CRITICAL_ASSET_READY_EVENT, { detail: { id } }));
}

export function waitForCriticalAsset(id: string) {
  if (document.documentElement.getAttribute(criticalAttribute(id)) === "true") return Promise.resolve();
  return new Promise<void>((resolve) => {
    const ready = (event: Event) => {
      if ((event as CustomEvent<{ id?: string }>).detail?.id !== id) return;
      window.removeEventListener(CRITICAL_ASSET_READY_EVENT, ready);
      resolve();
    };
    window.addEventListener(CRITICAL_ASSET_READY_EVENT, ready);
  });
}

export function waitForSiteLoader() {
  const loader = document.querySelector<HTMLElement>("[data-site-loader]");
  if (!loader || loader.dataset.state === "hidden") return Promise.resolve();
  return new Promise<void>((resolve) => {
    window.addEventListener(SITE_LOADER_COMPLETE_EVENT, () => resolve(), { once: true });
  });
}
