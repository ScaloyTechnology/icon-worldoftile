import { heroTilePose, smooth } from "./material-choreography";
type GsapApi = typeof import("gsap")["gsap"];

export type HeroStage = "intro" | "approach" | "isolation" | "tile" | "assembly" | "collections";

function stageForProgress(progress: number): HeroStage {
  if (progress < 0.055) return "intro";
  if (progress < 0.27) return "approach";
  if (progress < 0.43) return "isolation";
  if (progress < 0.65) return "tile";
  if (progress < 0.83) return "assembly";
  return "collections";
}

export function buildHomepageHeroTimeline({
  gsap, root, mobile, onProgress,
}: {
  gsap: GsapApi;
  root: HTMLElement;
  mobile: boolean;
  onProgress: (progress: number, stage: HeroStage) => void;
}) {
  const viewport = root.querySelector<HTMLElement>("[data-journey-viewport]");
  const room = root.querySelector<HTMLElement>("[data-hero-room]");
  const roomImage = root.querySelector<HTMLElement>("[data-hero-room-image]");
  const heroCopy = root.querySelector<HTMLElement>("[data-hero-copy]");
  const heroBottom = root.querySelector<HTMLElement>("[data-hero-bottom]");
  const shade = root.querySelector<HTMLElement>("[data-hero-shade]");
  const discover = root.querySelector<HTMLElement>("[data-journey-discover]");
  const isolate = root.querySelector<HTMLElement>("[data-tile-isolate]");
  const tile = root.querySelector<HTMLElement>("[data-tile-proxy]");
  const wall = root.querySelector<HTMLElement>("[data-tile-wall]");
  const pieces = Array.from(root.querySelectorAll<HTMLElement>("[data-tile-piece]"));
  const webgl = root.querySelector<HTMLElement>("[data-webgl-stage]");
  const collections = root.querySelector<HTMLElement>("[data-journey-collections]");
  const collectionHeading = root.querySelector<HTMLElement>("[data-collections-heading]");
  const collectionCards = Array.from(root.querySelectorAll<HTMLElement>("[data-collection-card]"));
  if (!viewport || !room || !roomImage || !heroCopy || !heroBottom || !shade || !discover || !isolate || !tile || !wall || !collections || !collectionHeading) return null;

  gsap.set(discover, { autoAlpha: 0, yPercent: 6 });
  gsap.set(isolate, { autoAlpha: 0, x: mobile ? "6vw" : "19vw", y: mobile ? "-7vh" : "-12vh", scale: mobile ? 0.54 : 0.32, rotateZ: -1.2 });
  gsap.set(tile, { rotateX: 0, rotateY: 0, transformPerspective: 1200 });
  gsap.set(wall, { autoAlpha: 0 });
  gsap.set(pieces, { autoAlpha: 0, scale: 0.54, x: 0, y: 0, rotateY: 0 });
  gsap.set(webgl, { autoAlpha: 0 });
  gsap.set(collections, { autoAlpha: 0, scale: 0.94, yPercent: 5, pointerEvents: "none" });
  gsap.set(collectionHeading, { yPercent: 30, opacity: 0 });
  gsap.set(collectionCards, { yPercent: 12, opacity: 0 });

  const header = document.querySelector<HTMLElement>(".site-header");
  // The mobile grid is row-major 2x2; desktop uses mixed-span slots.
  const pieceSide = (piece: HTMLElement) => mobile ? (pieces.indexOf(piece) % 2 === 0 ? -1 : 1) : Number(piece.dataset.side);
  let width = window.innerWidth;
  let height = window.innerHeight;
  const aspect = Number(root.dataset.tileAspect) || 2;
  const update = (progress: number) => {
    root.style.setProperty("--hero-progress", progress.toFixed(4));
    root.dataset.stage = stageForProgress(progress);
    root.dataset.collectionsActive = progress > 0.925 ? "true" : "false";
    const pose = heroTilePose(progress, width, height, aspect);
    const ready = root.dataset.webgl === "ready";
    const visible = progress >= 0.29 && progress < (ready ? 0.47 : 0.69);
    gsap.set(isolate, { width: pose.width, height: pose.height, xPercent: -50, yPercent: -50, x: pose.x, y: pose.y, scale: pose.scale, rotateZ: 0, autoAlpha: visible ? smooth(progress, 0.29, 0.33) : 0 });
    gsap.set(tile, { rotateX: -pose.rotateX * 180 / Math.PI, rotateY: pose.rotateY * 180 / Math.PI, scale: 1 });
    gsap.set(webgl, { autoAlpha: ready && progress >= 0.47 && progress < 1 ? 1 : 0 });
    if (header) {
      const opacity = 1 - 0.94 * smooth(progress, 0.18, 0.50) + 0.94 * smooth(progress, 0.84, 0.99);
      header.style.setProperty("--journey-header-opacity", String(opacity));
      header.style.setProperty("--journey-header-pointer", opacity < 0.25 ? "none" : "auto");
    }
    onProgress(progress, stageForProgress(progress));
  };
  const timeline = gsap.timeline({
    defaults: { ease: "none" },
    onUpdate: function () { update(this.progress()); },
    scrollTrigger: {
      trigger: root,
      start: "top top",
      end: () => `+=${Math.round(window.innerHeight * (mobile ? 2.15 : 3.25))}`,
      pin: viewport,
      pinSpacing: true,
      scrub: mobile ? 0.28 : 0.42,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onRefresh: () => { width = window.innerWidth; height = window.innerHeight; },
      onLeave: () => { header?.style.setProperty("--journey-header-opacity", "1"); header?.style.setProperty("--journey-header-pointer", "auto"); },
    },
  });

  timeline
    .to(roomImage, { scale: mobile ? 1.34 : 1.68, xPercent: mobile ? 6 : 13, yPercent: 7, duration: 0.31, ease: "power1.inOut" }, 0.045)
    .to(heroCopy, { autoAlpha: 0, yPercent: -12, duration: 0.16 }, 0.06)
    .to(heroBottom, { autoAlpha: 0, duration: 0.11 }, 0.075)
    .to(discover, { autoAlpha: 1, yPercent: 0, duration: 0.1 }, 0.09)
    .to(discover, { autoAlpha: 0, yPercent: -6, duration: 0.1 }, 0.245)
    .to(shade, { backgroundColor: "rgba(22,24,21,.8)", duration: 0.22 }, 0.27)
    .to(isolate, { filter: "drop-shadow(0 24px 30px rgba(0,0,0,.3))", duration: 0.16 }, 0.43)
    .to(room, { autoAlpha: 0, duration: 0.12 }, 0.69)
    .to(wall, { autoAlpha: 1, duration: 0.02 }, 0.67)
    .to(pieces, { autoAlpha: 1, scale: 1, duration: 0.13, stagger: { each: 0.006, from: "center" } }, 0.68)
    .to(collections, { autoAlpha: 1, scale: 1, yPercent: 0, duration: 0.15 }, 0.82)
    .to(collectionHeading, { opacity: 1, yPercent: 0, duration: 0.11 }, 0.85)
    .to(collectionCards, { opacity: 1, yPercent: 0, duration: 0.09, stagger: { amount: 0.03 } }, 0.875)
    .to(pieces.filter(piece => pieceSide(piece) === -1), { x: mobile ? "-75vw" : "-65vw", z: 70, rotateY: -2.5, duration: 0.155, ease: "power1.inOut" }, 0.84)
    .to(pieces.filter(piece => pieceSide(piece) === 1), { x: mobile ? "75vw" : "65vw", z: 70, rotateY: 2.5, duration: 0.155, ease: "power1.inOut" }, 0.84)
    .set(collections, { pointerEvents: "auto" }, 0.93)
    .to(wall, { autoAlpha: 0, duration: 0.04 }, 0.96);

  return {
    kill: () => { timeline.scrollTrigger?.kill(); timeline.kill(); header?.style.removeProperty("--journey-header-opacity"); header?.style.removeProperty("--journey-header-pointer"); },
    // Loading an absolute canvas changes no layout. A ScrollTrigger refresh here
    // can restore a stale scroll position while the visitor is already scrolling.
    refresh: () => { update(timeline.progress()); },
  };
}
