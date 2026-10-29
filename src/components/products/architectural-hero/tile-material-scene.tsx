"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { HomepageHeroCategory } from "@/types/homepage-content";
import { TILE_REST_POSE, type TileSceneMotion } from "./use-tile-category-motion";
import { loadTileImage, MATT_REFERENCE_URL, MATT_BUMP_URL, tileColorSource, tileCover } from "./tile-surface-assets";
import { buildRelief } from "./build-relief";

type Props = {
  categories: readonly HomepageHeroCategory[];
  sceneRef: RefObject<HTMLDivElement | null>;
  motion: RefObject<TileSceneMotion>;
  onFallback: () => void;
};
type Surface = {
  map: THREE.Texture; normal: THREE.Texture; roughnessMap: THREE.Texture;
  edgeNormal: THREE.Texture;
  edgeColour: THREE.Color;
  roughness: number; coat: number; coatRoughness: number; grain: number;
  stoneSheen: number;
};
const thickness = .035;
const radians = THREE.MathUtils.degToRad;
const clamp = THREE.MathUtils.clamp;

function finishFor(title: string) {
  if (/\bmatt\b/i.test(title)) return { roughness: .8, coat: 0, coatRoughness: .3, grain: 1.1 };
  if (/carv/i.test(title)) return { roughness: .55, coat: 0, coatRoughness: .3, grain: 1.4 };
  if (/matt|textur|structured/i.test(title)) return { roughness: .8, coat: 0, coatRoughness: .3, grain: .9 };
  if (/pgvt|high[\s-]*gloss/i.test(title)) return { roughness: .12, coat: 1, coatRoughness: .08, grain: .1 };
  if (/\bgvt\b/i.test(title)) return { roughness: .17, coat: .8, coatRoughness: .08, grain: .15 };
  if (/double[\s-]*digital/i.test(title)) return { roughness: .3, coat: .4, coatRoughness: .15, grain: .35 };
  if (/full[\s-]*body/i.test(title)) return { roughness: .5, coat: 0, coatRoughness: .25, grain: .5 };
  if (/honed|natural/i.test(title)) return { roughness: .5, coat: 0, coatRoughness: .25, grain: .3 };
  return { roughness: .2, coat: .6, coatRoughness: .15, grain: .15 };
}

async function prepareSurface(image: HTMLImageElement, category: HomepageHeroCategory, anisotropy: number, cancelled: () => boolean, heightImage?: HTMLImageElement): Promise<Surface> {
  const finish = finishFor(`${category.id} ${category.title}`);
  const matt = /\bmatt\b/i.test(`${category.id} ${category.title}`);
  const relief = await buildRelief(image, {
    heightImage,
    ridgeStrength: matt ? .55 : .4,
    fineStrength: matt ? .45 : .25,
    // The supplied bump contains its own joints, clefts and pores. Never add
    // synthetic grid cuts over it (or guess them if the bump fails to load).
    grooveGrid: null,
    normalScale: finish.grain,
    baseRoughness: finish.roughness,
    anisotropy, cancelled,
  });
  let map: THREE.Texture;
  try {
    map = new THREE.Texture(tileColorSource(image));
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    map.center.set(0, 0); map.rotation = 0;
    map.generateMipmaps = true;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    map.magFilter = THREE.LinearFilter;
    map.anisotropy = anisotropy;
    const fit = tileCover(image);
    map.repeat.set(fit.repeatX, fit.repeatY);
    map.offset.set(fit.offsetX, fit.offsetY);
    map.updateMatrix(); map.needsUpdate = true;
  } catch (error) {
    relief.normalMap.dispose(); relief.roughnessMap.dispose(); relief.edgeNormalMap.dispose();
    throw error;
  }
  return {
    map, normal: relief.normalMap, roughnessMap: relief.roughnessMap,
    edgeNormal: relief.edgeNormalMap, edgeColour: relief.edgeColour,
    ...finish, stoneSheen: matt ? .15 : 0,
  };
}

function disposeSurface(surface: Surface) {
  surface.map.dispose(); surface.normal.dispose(); surface.roughnessMap.dispose(); surface.edgeNormal.dispose();
}

function createTile(box: THREE.BoxGeometry, plane: THREE.PlaneGeometry, shadowTexture: THREE.Texture) {
  const face = new THREE.MeshPhysicalMaterial({
    color: "#ffffff", metalness: 0, roughness: 1, clearcoat: .6, clearcoatRoughness: .15,
    sheen: .15, sheenColor: "#e8d8bd", sheenRoughness: .85, transparent: true,
    // The print and the flat slab cap are nearly coplanar. A depth bias keeps
    // their fragments from alternating in comb-shaped bands at grazing angles.
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2,
  });
  const blend = {
    nextMap: { value: null as THREE.Texture | null },
    nextNormal: { value: null as THREE.Texture | null },
    nextRoughness: { value: null as THREE.Texture | null },
    nextMapUv: { value: new THREE.Vector4(1, 1, 0, 0) },
    mixAmount: { value: 1 },
    reflectionWeight: { value: 1 },
    finishRoughness: { value: .8 },
    stoneSheen: { value: 0 },
    stoneSheenColor: { value: new THREE.Color("#e8d8bd") },
  };
  face.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, blend);
    const reflectionVaryings = "varying vec2 tileFaceUv;\nvarying vec3 tileTangent;\nvarying vec3 tileBitangent;\n";
    shader.vertexShader = reflectionVaryings + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>", `
      #include <begin_vertex>
      tileFaceUv = uv;
      tileTangent = normalize(mat3(modelViewMatrix) * vec3(1.0, 0.0, 0.0));
      tileBitangent = normalize(mat3(modelViewMatrix) * vec3(0.0, 1.0, 0.0));
    `);
    shader.fragmentShader = reflectionVaryings + "uniform sampler2D nextMap;\nuniform sampler2D nextNormal;\nuniform sampler2D nextRoughness;\nuniform vec4 nextMapUv;\nuniform float mixAmount;\nuniform float reflectionWeight;\nuniform float finishRoughness;\nuniform float stoneSheen;\nuniform vec3 stoneSheenColor;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>",
      THREE.ShaderChunk.map_fragment.replace("texture2D( map, vMapUv )", "mix(texture2D(map, vMapUv), texture2D(nextMap, vMapUv * nextMapUv.xy + nextMapUv.zw), mixAmount)"));
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>",
      THREE.ShaderChunk.normal_fragment_maps.replace("texture2D( normalMap, vNormalMapUv )", "mix(texture2D(normalMap, vNormalMapUv), texture2D(nextNormal, vNormalMapUv), mixAmount)"));
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>",
      THREE.ShaderChunk.roughnessmap_fragment.replace("texture2D( roughnessMap, vRoughnessMapUv )", "mix(texture2D(roughnessMap, vRoughnessMapUv), texture2D(nextRoughness, vRoughnessMapUv), mixAmount)"));
    // Compress illumination before it flattens the relief. A single scalar
    // preserves the original print's colour ratios, and a soft shoulder keeps
    // neighbouring bump normals distinct instead of clipping them to one tone.
    shader.fragmentShader = shader.fragmentShader.replace(
      "vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;",
      `vec3 tileRawDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
      vec3 tileLuminanceWeights = vec3(0.2126, 0.7152, 0.0722);
      float tilePrintLuminance = max(dot(diffuseColor.rgb, tileLuminanceWeights), 0.0001);
      float tileIllumination = max(dot(tileRawDiffuse, tileLuminanceWeights) / tilePrintLuminance, 0.0);
      float tileSoftIllumination = tileIllumination;
      if (tileIllumination > 0.7) {
        tileSoftIllumination = 0.7 + 0.28 * (1.0 - exp(-(tileIllumination - 0.7) / 0.6));
      }
      vec3 totalDiffuse = tileRawDiffuse * (tileSoftIllumination / max(tileIllumination, 0.0001));`,
    );
    shader.fragmentShader = shader.fragmentShader.replace("#include <opaque_fragment>", `
      vec3 tileBase = totalDiffuse;
      #ifdef USE_CLEARCOAT
        tileBase *= (1.0 - material.clearcoat * Fcc);
      #endif
      float tileSheen = 0.0;
      vec3 tileStoneRim = vec3(0.0);
      #if NUM_POINT_LIGHTS > 0
        vec3 tileN = normalize(nonPerturbedNormal);
        vec3 tileV = normalize(vViewPosition);
        vec3 tileL = normalize(pointLights[0].position + vViewPosition);
        vec3 tileHalfDirection = tileL + tileV;
        vec3 tileH = tileHalfDirection / max(length(tileHalfDirection), 0.0001);
        vec3 tileT = normalize(tileTangent);
        vec3 tileB = normalize(tileBitangent);
        // Use the uniform finish, not the image-derived roughness pixels, so
        // high-frequency detail cannot carve teeth into the highlight outline.
        float tileMatte = smoothstep(0.12, 0.8, finishRoughness);
        vec2 tileRadius = mix(vec2(0.065, 0.095), vec2(0.38, 0.50), tileMatte);
        vec2 tileAngle = vec2(dot(tileH, tileT), dot(tileH, tileB)) / tileRadius;
        float tileGlow = exp(-2.0 * dot(tileAngle, tileAngle));
        float tileFacing = smoothstep(0.0, 0.22, dot(tileN, tileL))
          * smoothstep(0.0, 0.18, dot(tileN, tileV))
          * smoothstep(0.0, 0.2, dot(tileN, tileH));
        float tileBorder = min(min(tileFaceUv.x, 1.0 - tileFaceUv.x), min(tileFaceUv.y, 1.0 - tileFaceUv.y));
        float tileEdgeFade = smoothstep(0.0, max(0.035, fwidth(tileBorder) * 2.0), tileBorder);
        float tileFresnel = pow(1.0 - clamp(dot(tileN, tileV), 0.0, 1.0), 3.0);
        vec2 tileEdgeDirection = (tileFaceUv - 0.5) / max(length(tileFaceUv - 0.5), 0.001);
        float tileLitEdge = max(0.0, dot(tileEdgeDirection, vec2(dot(tileL, tileT), dot(tileL, tileB))));
        float tileRim = (1.0 - smoothstep(0.0, 0.12, tileBorder)) * tileLitEdge * tileFresnel * 0.035;
        float tilePeak = mix(0.38, 0.10, tileMatte);
        tileSheen = min(tilePeak, tileGlow * tilePeak + tileRim)
          * tileFacing * tileEdgeFade * reflectionWeight;
        tileStoneRim = stoneSheenColor * stoneSheen * tileRim
          * tileFacing * tileEdgeFade * reflectionWeight;
      #endif
      // Limit the white lift relative to the shaded stone underneath. Dark
      // veins and recesses get less lift, retaining their contrast inside the
      // highlight. Smooth compression avoids a hard boundary in the glow.
      float tileReflectionAllowance = mix(0.65, 0.22, smoothstep(0.12, 0.8, finishRoughness));
      vec3 tileReflectionBudget = max(tileBase * tileReflectionAllowance, vec3(0.0001));
      vec3 tileReflectionLift = max(vec3(0.0), vec3(0.995) - tileBase) * (vec3(tileSheen) + tileStoneRim);
      vec3 tileReflection = tileReflectionLift / (vec3(1.0) + tileReflectionLift / tileReflectionBudget);
      outgoingLight = tileBase + tileReflection;
      #include <opaque_fragment>
    `);
  };
  face.customProgramCacheKey = () => "icon-slate-relief-analytic-reflection-v7";
  const edge = new THREE.MeshStandardMaterial({ color: "#a79c8d", roughness: .72, metalness: 0, transparent: true });
  // A plain rounded slab supplies the physical chamfer and back. The print
  // sits on a flat +Z plane with undistorted 0..1 UVs, never across the bevel.
  const mesh = new THREE.Mesh(box, edge);
  const front = new THREE.Mesh(plane, face);
  front.position.z = thickness / 2 + .0001;
  front.scale.set(.994, .994, 1);
  const group = new THREE.Group();
  group.visible = false;
  group.add(mesh, front);
  const shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x000000, alphaMap: shadowTexture, transparent: true, depthWrite: false, toneMapped: false });
  const shadow = new THREE.Mesh(plane, shadowMaterial);
  shadow.visible = false;
  return {
    group, face, edge, shadow, shadowMaterial, blend,
    from: null as Surface | null, to: null as Surface | null, progress: 1,
    rx: -.14, ry: .18,
    dispose() { face.dispose(); edge.dispose(); shadowMaterial.dispose(); group.clear(); },
  };
}
type Tile = ReturnType<typeof createTile>;

function MaterialScene({ categories, sceneRef, motion, onFallback }: Props) {
  const { camera, gl, size, invalidate, setFrameloop } = useThree();
  const keyLight = useRef<THREE.PointLight>(null);
  const root = useRef<THREE.Group>(null);
  const loadSurfaces = useRef<((items: readonly HomepageHeroCategory[]) => void) | null>(null);
  const categoryCount = categories.length;
  const state = useRef({
    visible: true, reduced: false, coarse: false, inside: false,
    pointerX: 0, pointerY: 0, dotX: 0, dotY: 0, cameraDistance: 1100,
    tiles: [] as Tile[], assets: [] as Array<Surface | undefined>, elements: [] as HTMLElement[],
    dot: null as HTMLElement | null,
    normal: new THREE.Vector3(), centre: new THREE.Vector3(),
    hit: new THREE.Vector3(), local: new THREE.Vector3(),
    scratch: new THREE.Vector3(), ndc: new THREE.Vector2(),
    raycaster: new THREE.Raycaster(), slabPlane: new THREE.Plane(),
  });

  useEffect(() => {
    const perspective = camera as THREE.PerspectiveCamera;
    perspective.fov = 34;
    perspective.aspect = size.width / Math.max(size.height, 1);
    const distance = size.height / (2 * Math.tan(radians(17)));
    perspective.position.set(0, 0, distance);
    perspective.near = 1;
    perspective.far = Math.max(5000, distance * 5);
    perspective.updateProjectionMatrix();
    state.current.cameraDistance = distance;
    const sample = sceneRef.current?.querySelector<HTMLElement>("[data-tile-sample]");
    const width = (sample?.clientWidth ?? 360) * 1.12;
    // One fixed neutral key. Inverse-square intensity scales with scene units,
    // keeping the same light response across desktop and mobile layouts.
    const centreY = size.height * .05;
    if (keyLight.current) {
      // About 30 degrees above the unrotated face, from the upper right.
      // This reveals cleft slopes and joint bevels without painting shadows
      // or changing the colours in the original photo.
      keyLight.current.position.set(width * 1.5, centreY + width * 1.1, width * 1.05);
      keyLight.current.intensity = width * width * 12;
    }
    invalidate();
  }, [camera, size.width, size.height, sceneRef, invalidate]);

  useEffect(() => {
    const container = sceneRef.current;
    const hero = container?.closest<HTMLElement>("[data-home-hero]") ?? container;
    if (!container || !hero) return;
    const runtime = state.current;
    runtime.dot = container.querySelector<HTMLElement>("[data-tile-pointer]");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const coarse = matchMedia("(pointer: coarse)");
    let heroBounds = hero.getBoundingClientRect();
    let sceneBounds = container.getBoundingClientRect();
    let intersecting = true;
    let drag: { id: number; x: number; y: number; px: number; py: number; moved: boolean } | null = null;
    let suppressClickUntil = 0;
    const measure = () => { heroBounds = hero.getBoundingClientRect(); sceneBounds = container.getBoundingClientRect(); };
    const finishDrag = () => {
      const interaction = drag;
      drag = null;
      runtime.pointerX = runtime.pointerY = 0;
      delete container.dataset.dragging;
      if (interaction) {
        // Equivalent angles preserve the displayed pose, then return by the
        // nearest turn instead of unwinding every revolution from the drag.
        const tile = runtime.tiles[motion.current.activeIndex ?? 0];
        if (tile) {
          tile.rx = -.14 + THREE.MathUtils.euclideanModulo(tile.rx + .14 + Math.PI, Math.PI * 2) - Math.PI;
          tile.ry = .18 + THREE.MathUtils.euclideanModulo(tile.ry - .18 + Math.PI, Math.PI * 2) - Math.PI;
        }
        if (interaction.moved) suppressClickUntil = performance.now() + 350;
        if (container.hasPointerCapture(interaction.id)) container.releasePointerCapture(interaction.id);
      }
      if (runtime.visible) invalidate();
    };
    const wake = () => {
      runtime.reduced = reduced.matches;
      runtime.coarse = coarse.matches;
      runtime.visible = intersecting && !document.hidden;
      if (!runtime.visible || runtime.reduced) finishDrag();
      if (!runtime.visible) {
        runtime.inside = false;
        runtime.pointerX = runtime.pointerY = 0;
        if (runtime.dot) runtime.dot.style.opacity = "0";
      }
      setFrameloop(runtime.visible ? "demand" : "never");
      if (runtime.visible) invalidate();
    };
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0 || drag || runtime.reduced || !runtime.visible || container.dataset.transitioning === "true") return;
      const tile = runtime.tiles[motion.current.activeIndex ?? 0];
      if (!tile?.group.visible) return;
      measure();
      // Start from the displayed pose, even when catching a returning tile.
      drag = {
        id: event.pointerId, x: event.clientX, y: event.clientY,
        px: tile.ry - .18,
        py: tile.rx + .14, moved: false,
      };
      runtime.pointerX = drag.px;
      runtime.pointerY = drag.py;
      container.dataset.dragging = "true";
      invalidate();
    };
    const move = (event: PointerEvent) => {
      if (!event.isPrimary) return;
      runtime.inside = event.pointerType !== "touch";
      runtime.dotX = event.clientX - sceneBounds.left;
      runtime.dotY = event.clientY - sceneBounds.top;
      if (runtime.dot) runtime.dot.style.transform = "translate3d(" + runtime.dotX + "px," + runtime.dotY + "px,0) translate(-50%,-50%)";
      runtime.ndc.set(runtime.dotX / Math.max(sceneBounds.width, 1) * 2 - 1, 1 - runtime.dotY / Math.max(sceneBounds.height, 1) * 2);
      if (drag?.id === event.pointerId) {
        if ((event.buttons & 1) === 0 || event.clientX < heroBounds.left || event.clientX > heroBounds.right
          || event.clientY < heroBounds.top || event.clientY > heroBounds.bottom) {
          finishDrag();
        } else {
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (!drag.moved && event.pointerType === "touch" && Math.abs(dy) > Math.abs(dx) + 6) {
            finishDrag(); // Leave vertical touch gestures available for page scrolling.
          } else if (drag.moved || Math.hypot(dx, dy) >= 4) {
            if (!drag.moved) {
              drag.moved = true;
              container.setPointerCapture(event.pointerId);
              container.focus({ preventScroll: true });
            }
            const width = Math.max(240, runtime.tiles[motion.current.activeIndex ?? 0]?.group.scale.x ?? 360);
            const sensitivity = Math.PI * 2 / Math.max(320, width * .85);
            // Unbounded angular offsets allow full turns on either axis.
            runtime.pointerX = drag.px + dx * sensitivity;
            runtime.pointerY = drag.py + dy * sensitivity;
          }
        }
      }
      if (runtime.visible) invalidate();
    };
    const up = (event: PointerEvent) => { if (event.pointerId === drag?.id) finishDrag(); };
    const mouseUp = (event: MouseEvent) => { if (event.button === 0) finishDrag(); };
    const click = (event: MouseEvent) => {
      if (event.detail > 0 && performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    const leave = () => {
      finishDrag();
      runtime.inside = false;
      runtime.pointerX = runtime.pointerY = 0;
      if (runtime.dot) runtime.dot.style.opacity = "0";
      if (runtime.visible) invalidate();
    };
    const resize = new ResizeObserver(measure);
    resize.observe(hero);
    resize.observe(container);
    const observer = new IntersectionObserver(([entry]) => { intersecting = Boolean(entry?.isIntersecting); wake(); });
    observer.observe(hero);
    const requestFrame = () => { if (runtime.visible) invalidate(); };
    motion.current.invalidate = requestFrame;
    container.dataset.modelInteractive = "true";
    container.addEventListener("pointerdown", down);
    container.addEventListener("lostpointercapture", up);
    hero.addEventListener("click", click, true);
    hero.addEventListener("pointermove", move);
    hero.addEventListener("pointerleave", leave);
    hero.addEventListener("pointercancel", leave);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("mouseup", mouseUp);
    window.addEventListener("blur", leave);
    window.addEventListener("scroll", measure, { passive: true });
    document.addEventListener("visibilitychange", wake);
    reduced.addEventListener("change", wake);
    coarse.addEventListener("change", wake);
    wake();
    return () => {
      finishDrag();
      resize.disconnect(); observer.disconnect();
      container.removeEventListener("pointerdown", down);
      container.removeEventListener("lostpointercapture", up);
      hero.removeEventListener("click", click, true);
      hero.removeEventListener("pointermove", move);
      hero.removeEventListener("pointerleave", leave);
      hero.removeEventListener("pointercancel", leave);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("blur", leave);
      window.removeEventListener("scroll", measure);
      document.removeEventListener("visibilitychange", wake);
      reduced.removeEventListener("change", wake);
      coarse.removeEventListener("change", wake);
      delete container.dataset.modelInteractive;
      if (motion.current.invalidate === requestFrame) delete motion.current.invalidate;
      runtime.dot = null;
    };
  }, [sceneRef, motion, invalidate, setFrameloop]);

  useEffect(() => {
    const runtime = state.current;
    const group = root.current;
    let cancelled = false;
    let generation = 0;
    const controller = new AbortController();
    const cache = new Map<string, Promise<Surface>>();
    const imageCache = new Map<string, Promise<HTMLImageElement>>();
    const owned = new Set<Surface>();
    const box = new RoundedBoxGeometry(1, 1, thickness, 2, .003);
    const plane = new THREE.PlaneGeometry(1, 1);
    const shadowCanvas = document.createElement("canvas");
    shadowCanvas.width = shadowCanvas.height = 128;
    const context = shadowCanvas.getContext("2d");
    if (context) {
      const gradient = context.createRadialGradient(64, 64, 2, 64, 64, 64);
      gradient.addColorStop(0, "#ffffff");
      gradient.addColorStop(.35, "#999999");
      gradient.addColorStop(1, "#000000");
      context.fillStyle = gradient;
      context.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    // Each category keeps its own slab, surface and rotation throughout the
    // scroll. No texture replacement or slot reassignment at the midpoint.
    // Only visible slabs are drawn; all slabs share the same geometry.
    runtime.tiles = Array.from({ length: categoryCount }, () => createTile(box, plane, shadowTexture));
    for (const tile of runtime.tiles) group?.add(tile.shadow, tile.group);
    runtime.assets = [];
    runtime.elements = Array.from(sceneRef.current?.querySelectorAll<HTMLElement>("[data-tile-sample]") ?? []);
    let queue = Promise.resolve();
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const prepare = (image: HTMLImageElement, category: HomepageHeroCategory, heightImage?: HTMLImageElement) => {
      const job = queue.then(async () => {
        if (cancelled) throw new Error("Tile preparation cancelled");
        const asset = await prepareSurface(image, category, anisotropy, () => cancelled, heightImage);
        if (cancelled) {
          disposeSurface(asset);
          throw new Error("Tile preparation cancelled");
        }
        owned.add(asset);
        return asset;
      });
      // Network requests run together; expensive canvas work yields and runs
      // one surface at a time, without one failed asset blocking the others.
      queue = job.then(() => undefined, () => undefined);
      return job;
    };
    const requestImage = (url: string) => {
      let request = imageCache.get(url);
      if (!request) {
        request = loadTileImage(url, controller.signal);
        imageCache.set(url, request);
      }
      return request;
    };
    const load = (category: HomepageHeroCategory) => {
      const bumpUrl = category.productImage.src === MATT_REFERENCE_URL ? MATT_BUMP_URL : null;
      const key = JSON.stringify([category.id, category.title, category.productImage.src, category.productImage.alt, bumpUrl]);
      const cached = cache.get(key);
      if (cached) return cached;
      const pending = (async () => {
        const url = category.productImage.src;
        if (!url) throw new Error("No original tile image configured");
        if (cancelled) throw new Error("Tile load cancelled");
        // Prepare the colour and authored relief together so the first 3D
        // frame has the complete surface. Both requests share the scene cache.
        const [image, heightImage] = await Promise.all([
          requestImage(url),
          bumpUrl ? requestImage(bumpUrl).catch(error => {
            if (cancelled) throw error;
            console.warn(`[ICON tile: ${category.id}] Bump map unavailable; using photo-derived relief.`, error);
            return undefined;
          }) : Promise.resolve(undefined),
        ]);
        return prepare(image, category, heightImage);
      })();
      cache.set(key, pending);
      return pending;
    };
    loadSurfaces.current = items => {
      const currentGeneration = ++generation;
      runtime.elements = Array.from(sceneRef.current?.querySelectorAll<HTMLElement>("[data-tile-sample]") ?? []);
      const loadOne = async (index: number) => {
        if (cancelled || currentGeneration !== generation) return;
        const category = items[index];
        if (!category) return;
        const element = runtime.elements[index];
        if (element && !runtime.assets[index]) element.dataset.texturePending = "true";
        await load(category).then(asset => {
          if (cancelled || currentGeneration !== generation) return;
          runtime.assets[index] = asset;
          if (element) element.dataset.textureSource = "asset";
          if (runtime.visible) invalidate();
        }).catch(error => {
          if (cancelled || currentGeneration !== generation) return;
          console.error(`[ICON tile: ${category.id}] Could not prepare a surface texture.`, error);
          // Keep this category's original DOM image as its fallback. Never
          // substitute another material, regenerate its print, or disable the
          // working 3D surfaces merely because one image failed to load.
          runtime.assets[index] = undefined;
          if (element) {
            delete element.dataset.texturePending;
            delete element.dataset.modelReady;
            delete element.dataset.textureSource;
          }
          if (runtime.visible) invalidate();
        });
      };
      // Give the opening tile exclusive access to network/CPU preparation.
      // Afterwards warm two neighbours at a time, following the current
      // selection so a user who scrolls ahead does not wait behind distant tiles.
      void (async () => {
        const pending = new Set(items.map((_, index) => index));
        const first = clamp(motion.current.activeIndex ?? 0, 0, Math.max(0, items.length - 1));
        pending.delete(first);
        await loadOne(first);
        while (pending.size && !cancelled && currentGeneration === generation) {
          const active = motion.current.activeIndex ?? 0;
          const next = [...pending].sort((a, b) => Math.abs(a - active) - Math.abs(b - active)).slice(0, 2);
          next.forEach(index => pending.delete(index));
          await Promise.all(next.map(loadOne));
        }
      })();
    };
    const lost = (event: Event) => { event.preventDefault(); onFallback(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      cancelled = true;
      controller.abort();
      loadSurfaces.current = null;
      gl.domElement.removeEventListener("webglcontextlost", lost);
      for (const element of runtime.elements) {
        delete element.dataset.modelReady;
        delete element.dataset.texturePending;
        delete element.dataset.textureSource;
      }
      for (const tile of runtime.tiles) { group?.remove(tile.group, tile.shadow); tile.dispose(); }
      for (const asset of owned) disposeSurface(asset);
      cache.clear(); imageCache.clear(); owned.clear();
      box.dispose(); plane.dispose(); shadowTexture.dispose();
      runtime.tiles = []; runtime.assets = [];
    };
  }, [categoryCount, sceneRef, motion, gl, invalidate, onFallback]);

  useEffect(() => {
    // Data/material updates swap maps on the existing material objects. They
    // do not tear down the renderer, geometry, drag state or lighting rig.
    loadSurfaces.current?.(categories);
  }, [categories, sceneRef, gl, invalidate, onFallback]);

  useFrame((_frame, delta) => {
    const r = state.current;
    if (!r.visible) return;
    const dt = Math.min(delta, .05);
    const easing = r.reduced ? 1 : 1 - Math.exp(-4.35 * dt);
    const active = motion.current.activeIndex ?? 0;
    const perspective = size.width < 761 ? 800 : 1100;
    let transitioning = false;
    let rotating = false;
    let dotVisible = false;
    for (let index = 0; index < r.tiles.length; index++) {
      const tile = r.tiles[index]!;
      const pose = motion.current.poses[index];
      const asset = r.assets[index];
      const visible = Boolean(asset && pose?.visible);
      tile.group.visible = tile.shadow.visible = visible;
      if (!asset || !pose || !visible) continue;
      if (tile.to !== asset && tile.progress >= 1) {
        tile.from = tile.to ?? asset;
        tile.to = asset;
        tile.face.map = tile.from.map;
        tile.face.normalMap = tile.from.normal;
        tile.face.roughnessMap = tile.from.roughnessMap;
        tile.face.clearcoatNormalMap = null;
        tile.edge.normalMap = asset.edgeNormal;
        tile.edge.normalScale.set(.25, .25);
        tile.edge.needsUpdate = true;
        tile.face.needsUpdate = true;
        tile.blend.nextMap.value = asset.map;
        tile.blend.nextNormal.value = asset.normal;
        tile.blend.nextRoughness.value = asset.roughnessMap;
        const previousMap = tile.from.map;
        const scaleX = asset.map.repeat.x / previousMap.repeat.x;
        const scaleY = asset.map.repeat.y / previousMap.repeat.y;
        // Crossfade each albedo with its own cover fit, even when two sources
        // have different aspect ratios. Derived maps already use square UVs.
        tile.blend.nextMapUv.value.set(scaleX, scaleY,
          asset.map.offset.x - previousMap.offset.x * scaleX,
          asset.map.offset.y - previousMap.offset.y * scaleY);
        tile.progress = tile.from === asset || r.reduced ? 1 : 0;
      }
      tile.progress = r.reduced ? 1 : Math.min(1, tile.progress + dt / .35);
      const t = tile.progress * tile.progress * (3 - 2 * tile.progress);
      tile.blend.mixAmount.value = t;
      if (tile.progress < 1 || tile.to !== asset) transitioning = true;
      const from = tile.from!;
      const to = tile.to!;
      // The generated G channel contains absolute finish roughness; keep the
      // material multiplier at 1. The analytic highlight uses a separate,
      // smooth finish value so fine relief cannot stripe the reflection.
      tile.face.roughness = 1;
      tile.blend.finishRoughness.value = THREE.MathUtils.lerp(from.roughness, to.roughness, t);
      tile.face.sheen = tile.blend.stoneSheen.value = THREE.MathUtils.lerp(from.stoneSheen, to.stoneSheen, t);
      tile.face.clearcoat = THREE.MathUtils.lerp(from.coat, to.coat, t);
      tile.face.clearcoatRoughness = THREE.MathUtils.lerp(from.coatRoughness, to.coatRoughness, t);
      const grain = THREE.MathUtils.lerp(from.grain, to.grain, t);
      tile.face.normalScale.set(grain, grain);
      tile.edge.color.lerpColors(from.edgeColour, to.edgeColour, t);
      if (tile.progress === 1 && tile.from !== tile.to) {
        // Commit the new maps after the fade. No stale previous-map binding
        // survives; cached textures stay reusable until scene teardown.
        tile.face.map = to.map;
        tile.face.normalMap = to.normal;
        tile.face.clearcoatNormalMap = null;
        tile.face.roughnessMap = to.roughnessMap;
        tile.blend.nextMapUv.value.set(1, 1, 0, 0);
        tile.face.needsUpdate = true;
        tile.from = to;
      }

      const selected = index === active;
      const keyboardX = radians(pose.rx - TILE_REST_POSE.rx);
      const keyboardY = radians(pose.ry - TILE_REST_POSE.ry);
      const targetX = -.14 + (r.reduced ? 0 : selected ? r.pointerY - keyboardX : 0);
      const targetY = .18 + (r.reduced ? 0 : selected ? r.pointerX + keyboardY : keyboardY);
      tile.rx += (targetX - tile.rx) * easing;
      tile.ry += (targetY - tile.ry) * easing;
      if (Math.abs(targetX - tile.rx) < .0001) tile.rx = targetX;
      if (Math.abs(targetY - tile.ry) < .0001) tile.ry = targetY;
      if (tile.rx !== targetX || tile.ry !== targetY) rotating = true;
      // Retain CSS carousel centres/sizing; let the perspective camera project
      // the slab itself, including its edge depth and the tilted square face.
      const projection = perspective / (perspective - pose.z);
      const correction = (r.cameraDistance - pose.z) / r.cameraDistance;
      const scale = pose.width * pose.scale * projection * correction;
      const y = (size.height * .05 - pose.y * projection) * correction;
      tile.group.position.set(pose.x * projection * correction, y, pose.z);
      tile.group.scale.setScalar(scale);
      tile.group.rotation.set(tile.rx, tile.ry, radians(-pose.rz), "ZYX");
      tile.group.updateMatrixWorld(true);
      const opacity = clamp(1 - Math.abs(index - (motion.current.position ?? active)) * .28, 0, 1);
      tile.face.opacity = tile.edge.opacity = opacity;
      tile.blend.reflectionWeight.value = opacity;

      const tilt = Math.min(1, Math.abs(Math.sin(tile.rx)) + Math.abs(Math.sin(tile.ry)));
      tile.shadow.position.set(tile.group.position.x, y - scale * .58, pose.z - scale * .04);
      tile.shadow.scale.set(scale * (.88 - tilt * .12), scale * .12, 1);
      tile.shadowMaterial.opacity = opacity * (.34 - tilt * .07);

      // Lighting is evaluated by the physical material against the fixed key,
      // including the grain normals and finish-specific roughness.
      // The face plane below is used only to place the pointer indicator.
      r.normal.set(0, 0, 1).applyQuaternion(tile.group.quaternion);
      r.centre.set(0, 0, thickness / 2).applyMatrix4(tile.group.matrixWorld);
      r.scratch.copy(camera.position).sub(r.centre);
      const viewSide = r.scratch.dot(r.normal);
      if (selected && r.inside && !r.coarse) {
        r.slabPlane.setFromNormalAndCoplanarPoint(r.normal, r.centre);
        r.raycaster.setFromCamera(r.ndc, camera);
        if (r.raycaster.ray.intersectPlane(r.slabPlane, r.hit)) {
          r.local.copy(r.hit);
          tile.group.worldToLocal(r.local);
          dotVisible = viewSide > 0 && Math.abs(r.local.x) <= .5 && Math.abs(r.local.y) <= .5;
        }
      }
    }
    for (let index = 0; index < r.elements.length; index++) {
      const element = r.elements[index]!;
      const shown = Boolean(r.assets[index] && motion.current.poses[index]?.visible);
      if (r.assets[index]) delete element.dataset.texturePending;
      if (shown && element.dataset.modelReady !== "true") element.dataset.modelReady = "true";
      else if (!shown && element.dataset.modelReady) delete element.dataset.modelReady;
      if (shown && index === active && sceneRef.current && sceneRef.current.dataset.renderReady !== "true") {
        sceneRef.current.dataset.renderReady = "true";
      }
    }
    if (r.dot) {
      r.dot.style.opacity = dotVisible ? "1" : "0";
    }
    if (rotating || transitioning) invalidate();
  });

  return <>
    <hemisphereLight args={["#ffffff", "#b9b9b9", .4]} />
    <pointLight ref={keyLight} intensity={0} color="#ffffff" decay={2} />
    <group ref={root} dispose={null} />
  </>;
}

export default function TileMaterialScene(props: Props) {
  return <Canvas
    aria-hidden="true"
    dpr={[1, 2]}
    frameloop="demand"
    camera={{ position: [0, 0, 1100], fov: 34, near: 1, far: 5000 }}
    gl={{ alpha: true, antialias: true, powerPreference: "default" }}
    onCreated={({ gl }) => {
      gl.setClearColor(0x000000, 0);
      gl.outputColorSpace = THREE.SRGBColorSpace;
      gl.toneMapping = THREE.NoToneMapping;
      gl.toneMappingExposure = 1;
    }}
  ><MaterialScene {...props} /></Canvas>;
}
