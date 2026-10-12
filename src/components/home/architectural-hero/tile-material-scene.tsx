"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RectAreaLightUniformsLib } from "three/addons/lights/RectAreaLightUniformsLib.js";
import type { HomepageHeroCategory } from "@/types/homepage-content";
import { TILE_REST_POSE, type TileSceneMotion } from "./use-tile-category-motion";

type Props = {
  categories: readonly HomepageHeroCategory[];
  sceneRef: RefObject<HTMLDivElement | null>;
  motion: RefObject<TileSceneMotion>;
  onFallback: () => void;
};
type Surface = {
  map: THREE.Texture; normal: THREE.Texture; roughnessMap: THREE.Texture;
  edgeColour: THREE.Color;
  roughness: number; coat: number; coatRoughness: number; grain: number;
};
const thickness = .035;
const radians = THREE.MathUtils.degToRad;
const clamp = THREE.MathUtils.clamp;
let areaLightsInitialized = false;

// Keep the authored tile colours under neutral diffuse illumination while
// retaining the original coloured area-light specular and clearcoat lobes.
// Only the diffuse term is neutralized; lamp positions/intensities stay intact.
function neutralTileDiffuse(fragmentShader: string) {
  return fragmentShader.replace("#include <lights_physical_pars_fragment>",
    THREE.ShaderChunk.lights_physical_pars_fragment.replace(
      "reflectedLight.directDiffuse += lightColor * material.diffuseContribution",
      "reflectedLight.directDiffuse += vec3(dot(lightColor, vec3(0.2126, 0.7152, 0.0722))) * material.diffuseContribution",
    ));
}

function finishFor(title: string) {
  if (/textur|carv|structured|stone/i.test(title)) return { roughness: .8, coat: .08, coatRoughness: .3, grain: .85 };
  if (/honed|matt|natural/i.test(title)) return { roughness: .62, coat: .18, coatRoughness: .23, grain: .55 };
  return { roughness: .23, coat: .6, coatRoughness: .15, grain: .13 };
}

async function prepareSurface(image: HTMLImageElement, category: HomepageHeroCategory, anisotropy: number, cancelled: () => boolean): Promise<Surface> {
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const size = Math.min(side, 2048);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context || !side) throw new Error("Tile image unavailable");
  const position = (category.productImage.position ?? "50% 50%").split(/\s+/);
  const fraction = (value?: string) => value === "left" || value === "top" ? 0
    : value === "right" || value === "bottom" ? 1
    : value?.endsWith("%") ? clamp(parseFloat(value) / 100, 0, 1) : .5;
  context.drawImage(image, (image.naturalWidth - side) * fraction(position[0]), (image.naturalHeight - side) * fraction(position[1]), side, side, 0, 0, size, size);

  // Image-derived relief is an approximation, not measured height. Separate
  // local grain from broad colour/lighting changes before estimating normals.
  // Keep the original colour map untouched; never add random surface noise.
  const normalCanvas = document.createElement("canvas");
  const resolution = Math.min(size, 1536);
  const pixelScale = resolution / 1024;
  normalCanvas.width = normalCanvas.height = resolution;
  const normalContext = normalCanvas.getContext("2d", { willReadFrequently: true });
  if (!normalContext) throw new Error("Tile grain unavailable");
  normalContext.filter = `blur(${Math.max(.4, .55 * pixelScale)}px)`;
  normalContext.drawImage(canvas, 0, 0, resolution, resolution);
  const source = normalContext.getImageData(0, 0, resolution, resolution);
  const output = normalContext.createImageData(resolution, resolution);
  const roughnessCanvas = document.createElement("canvas");
  roughnessCanvas.width = roughnessCanvas.height = resolution;
  const roughnessContext = roughnessCanvas.getContext("2d");
  if (!roughnessContext) throw new Error("Tile roughness unavailable");
  const roughnessPixels = roughnessContext.createImageData(resolution, resolution);
  // Work in bands at a consistent scale relative to the tile, rather than
  // sharpening each pixel (which turns compression and veins into scratches).
  const blurred = (radius: number) => {
    normalContext.clearRect(0, 0, resolution, resolution);
    normalContext.filter = `blur(${Math.max(.55, radius * pixelScale)}px)`;
    normalContext.drawImage(canvas, 0, 0, resolution, resolution);
    return normalContext.getImageData(0, 0, resolution, resolution).data;
  };
  const medium = blurred(2.5);
  const broad = blurred(12);
  const relief = new Float32Array(resolution * resolution);
  const detail = new Float32Array(resolution * resolution);
  const luma = (data: Uint8ClampedArray, i: number) =>
    (data[i]! * .2126 + data[i + 1]! * .7152 + data[i + 2]! * .0722) / 255;
  let red = 0, green = 0, blue = 0, samples = 0;
  for (let i = 0; i < source.data.length; i += 256) {
    red += source.data[i]!; green += source.data[i + 1]!; blue += source.data[i + 2]!; samples++;
  }
  const edgeColour = new THREE.Color().setRGB(red / samples / 255, green / samples / 255, blue / samples / 255, THREE.SRGBColorSpace).multiplyScalar(.55);
  for (let y = 0; y < resolution; y++) {
    if (y % 32 === 0) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (cancelled()) throw new Error("Tile preparation cancelled");
    }
    for (let x = 0; x < resolution; x++) {
      const p = y * resolution + x;
      const i = p * 4;
      const fine = luma(source.data, i) - luma(medium, i);
      const body = luma(medium, i) - luma(broad, i);
      // Soft limiting keeps dark printed veins from becoming deep trenches.
      // Fade only the outer pixels to avoid canvas blur creating a raised rim.
      const rim = THREE.MathUtils.smoothstep(Math.min(x, y, resolution - 1 - x, resolution - 1 - y), 0, Math.max(2, 12 * pixelScale));
      relief[p] = (.035 * Math.tanh(fine / .035) + .019 * Math.tanh(body / .06)) * rim;
      detail[p] = Math.min(1, Math.abs(fine) * 12 + Math.abs(body) * 3) * rim;
    }
  }
  const heightAt = (x: number, y: number) => relief[clamp(y, 0, resolution - 1) * resolution + clamp(x, 0, resolution - 1)]!;
  for (let y = 0; y < resolution; y++) {
    if (y % 32 === 0) {
      await new Promise<void>(resolve => setTimeout(resolve, 0));
      if (cancelled()) throw new Error("Tile preparation cancelled");
    }
    for (let x = 0; x < resolution; x++) {
      // Sobel slopes average neighbouring samples for continuous shading,
      // with the green channel following tangent-space Y (image Y is down).
      const dx = (heightAt(x - 1, y - 1) + 2 * heightAt(x - 1, y) + heightAt(x - 1, y + 1)
        - heightAt(x + 1, y - 1) - 2 * heightAt(x + 1, y) - heightAt(x + 1, y + 1)) / 4;
      const dy = (heightAt(x - 1, y + 1) + 2 * heightAt(x, y + 1) + heightAt(x + 1, y + 1)
        - heightAt(x - 1, y - 1) - 2 * heightAt(x, y - 1) - heightAt(x + 1, y - 1)) / 4;
      const nx = .3 * Math.tanh(dx * pixelScale * 5.5 / .3);
      const ny = .3 * Math.tanh(dy * pixelScale * 5.5 / .3);
      const length = Math.hypot(nx, ny, 1);
      const i = (y * resolution + x) * 4;
      output.data[i] = (nx / length * .5 + .5) * 255;
      output.data[i + 1] = (ny / length * .5 + .5) * 255;
      output.data[i + 2] = (1 / length * .5 + .5) * 255;
      output.data[i + 3] = 255;
      // The same grain scatters the highlight more than the smoother areas.
      // This modulates reflection only, without tinting the photograph.
      const roughness = Math.round((.88 + .12 * detail[y * resolution + x]!) * 255);
      roughnessPixels.data[i] = roughnessPixels.data[i + 1] = roughnessPixels.data[i + 2] = roughness;
      roughnessPixels.data[i + 3] = 255;
    }
  }
  normalContext.putImageData(output, 0, 0);
  roughnessContext.putImageData(roughnessPixels, 0, 0);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const normal = new THREE.CanvasTexture(normalCanvas);
  const roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  normal.colorSpace = roughnessMap.colorSpace = THREE.NoColorSpace;
  map.anisotropy = normal.anisotropy = roughnessMap.anisotropy = anisotropy;
  return { map, normal, roughnessMap, edgeColour, ...finishFor(category.title) };
}

function createTile(box: THREE.BoxGeometry, plane: THREE.PlaneGeometry, shadowTexture: THREE.Texture) {
  const face = new THREE.MeshPhysicalMaterial({ metalness: 0, roughness: .23, clearcoat: .6, clearcoatRoughness: .15, transparent: true });
  const blend = {
    nextMap: { value: null as THREE.Texture | null },
    nextNormal: { value: null as THREE.Texture | null },
    nextRoughness: { value: null as THREE.Texture | null },
    mixAmount: { value: 1 },
  };
  face.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, blend);
    shader.fragmentShader = neutralTileDiffuse(shader.fragmentShader);
    shader.fragmentShader = "uniform sampler2D nextMap;\nuniform sampler2D nextNormal;\nuniform sampler2D nextRoughness;\nuniform float mixAmount;\n" + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>",
      THREE.ShaderChunk.map_fragment.replace("texture2D( map, vMapUv )", "mix(texture2D(map, vMapUv), texture2D(nextMap, vMapUv), mixAmount)"));
    shader.fragmentShader = shader.fragmentShader.replace("#include <normal_fragment_maps>",
      THREE.ShaderChunk.normal_fragment_maps.replace("texture2D( normalMap, vNormalMapUv )", "mix(texture2D(normalMap, vNormalMapUv), texture2D(nextNormal, vNormalMapUv), mixAmount)"));
    shader.fragmentShader = shader.fragmentShader.replace("#include <clearcoat_normal_fragment_maps>",
      THREE.ShaderChunk.clearcoat_normal_fragment_maps.replace("texture2D( clearcoatNormalMap, vClearcoatNormalMapUv )", "mix(texture2D(clearcoatNormalMap, vClearcoatNormalMapUv), texture2D(nextNormal, vClearcoatNormalMapUv), mixAmount)"));
    shader.fragmentShader = shader.fragmentShader.replace("#include <roughnessmap_fragment>",
      THREE.ShaderChunk.roughnessmap_fragment.replace("texture2D( roughnessMap, vRoughnessMapUv )", "mix(texture2D(roughnessMap, vRoughnessMapUv), texture2D(nextRoughness, vRoughnessMapUv), mixAmount)"));
  };
  face.customProgramCacheKey = () => "icon-surface-neutral-diffuse-v3";
  const edge = new THREE.MeshStandardMaterial({ color: "#a79c8d", roughness: .72, metalness: 0, transparent: true });
  edge.onBeforeCompile = shader => { shader.fragmentShader = neutralTileDiffuse(shader.fragmentShader); };
  edge.customProgramCacheKey = () => "icon-edge-neutral-diffuse-v1";
  const mesh = new THREE.Mesh(box, [edge, edge, edge, edge, face, edge]);
  const group = new THREE.Group();
  group.visible = false;
  group.add(mesh);
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
  const whiteTube = useRef<THREE.RectAreaLight>(null);
  const warmTube = useRef<THREE.RectAreaLight>(null);
  const root = useRef<THREE.Group>(null);
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
    // Narrow area emitters produce actual elongated specular reflections.
    // Their positions stay fixed as the slab turns, and their dimensions scale
    // with the scene so the lighting is consistent across screen sizes.
    const centreY = size.height * .05;
    if (whiteTube.current) {
      whiteTube.current.position.set(width * .72, centreY + width * .16, width * 1.1);
      whiteTube.current.width = width * .065;
      whiteTube.current.height = width * 1.5;
      whiteTube.current.lookAt(0, centreY, 0);
    }
    if (warmTube.current) {
      warmTube.current.position.set(-width * .95, centreY + width * .1, width * .9);
      warmTube.current.width = width * .08;
      warmTube.current.height = width * 1.35;
      warmTube.current.lookAt(0, centreY, 0);
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
    const removers: Array<() => void> = [];
    const owned = new Set<Surface>();
    const box = new THREE.BoxGeometry(1, 1, thickness);
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
    runtime.tiles = categories.map(() => createTile(box, plane, shadowTexture));
    for (const tile of runtime.tiles) group?.add(tile.shadow, tile.group);
    runtime.assets = [];
    runtime.elements = Array.from(sceneRef.current?.querySelectorAll<HTMLElement>("[data-tile-sample]") ?? []);
    let queue = Promise.resolve();
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    categories.forEach((category, index) => {
      const image = runtime.elements[index]?.querySelector<HTMLImageElement>("img");
      if (!image) return;
      let queuedSource = "";
      const prepare = () => {
        if (cancelled || !image.naturalWidth || image.currentSrc === queuedSource) return;
        queuedSource = image.currentSrc;
        queue = queue.then(async () => {
          if (cancelled) return;
          try {
            const asset = await prepareSurface(image, category, anisotropy, () => cancelled);
            if (cancelled) { asset.map.dispose(); asset.normal.dispose(); asset.roughnessMap.dispose(); return; }
            owned.add(asset);
            runtime.assets[index] = asset;
            if (runtime.visible) invalidate();
          } catch { /* Keep the existing accessible image if texture preparation fails. */ }
        });
      };
      prepare();
      image.addEventListener("load", prepare);
      removers.push(() => image.removeEventListener("load", prepare));
    });
    const lost = (event: Event) => { event.preventDefault(); onFallback(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      cancelled = true;
      removers.forEach(remove => remove());
      gl.domElement.removeEventListener("webglcontextlost", lost);
      for (const element of runtime.elements) delete element.dataset.modelReady;
      for (const tile of runtime.tiles) { group?.remove(tile.group, tile.shadow); tile.dispose(); }
      for (const asset of owned) { asset.map.dispose(); asset.normal.dispose(); asset.roughnessMap.dispose(); }
      box.dispose(); plane.dispose(); shadowTexture.dispose();
      runtime.tiles = []; runtime.assets = [];
    };
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
        tile.face.clearcoatNormalMap = tile.from.normal;
        tile.face.needsUpdate = true;
        tile.blend.nextMap.value = asset.map;
        tile.blend.nextNormal.value = asset.normal;
        tile.blend.nextRoughness.value = asset.roughnessMap;
        tile.progress = tile.from === asset || r.reduced ? 1 : 0;
      }
      tile.progress = r.reduced ? 1 : Math.min(1, tile.progress + dt / .36);
      const t = tile.progress * tile.progress * (3 - 2 * tile.progress);
      tile.blend.mixAmount.value = t;
      if (tile.progress < 1 || tile.to !== asset) transitioning = true;
      const from = tile.from!;
      const to = tile.to!;
      tile.face.roughness = THREE.MathUtils.lerp(from.roughness, to.roughness, t);
      tile.face.clearcoat = THREE.MathUtils.lerp(from.coat, to.coat, t);
      tile.face.clearcoatRoughness = THREE.MathUtils.lerp(from.coatRoughness, to.coatRoughness, t);
      const grain = THREE.MathUtils.lerp(from.grain, to.grain, t);
      tile.face.normalScale.set(grain, grain);
      tile.face.clearcoatNormalScale.set(grain * .35, grain * .35);
      tile.edge.color.lerpColors(from.edgeColour, to.edgeColour, t);

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

      const tilt = Math.min(1, Math.abs(Math.sin(tile.rx)) + Math.abs(Math.sin(tile.ry)));
      tile.shadow.position.set(tile.group.position.x, y - scale * .58, pose.z - scale * .04);
      tile.shadow.scale.set(scale * (.88 - tilt * .12), scale * .12, 1);
      tile.shadowMaterial.opacity = opacity * (.34 - tilt * .07);

      // Lighting is evaluated by the physical material against the two area
      // sources, including the grain normals and finish-specific roughness.
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
      if (shown && element.dataset.modelReady !== "true") element.dataset.modelReady = "true";
      else if (!shown && element.dataset.modelReady) delete element.dataset.modelReady;
    }
    if (r.dot) {
      r.dot.style.opacity = dotVisible ? "1" : "0";
    }
    if (rotating || transitioning) invalidate();
  });

  return <>
    <hemisphereLight args={["#ffffff", "#b9b9b9", .65]} />
    <rectAreaLight ref={whiteTube} intensity={28} color="#ffffff" />
    <rectAreaLight ref={warmTube} intensity={16} color="#ffd18a" />
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
      // Three's LTC tables are shared renderer resources; initialize once,
      // before the first frame. R3F owns and disposes the two light objects.
      if (!areaLightsInitialized) {
        RectAreaLightUniformsLib.init();
        areaLightsInitialized = true;
      }
      gl.setClearColor(0x000000, 0);
      gl.toneMapping = THREE.ACESFilmicToneMapping;
      gl.toneMappingExposure = 1.05;
    }}
  ><MaterialScene {...props} /></Canvas>;
}
