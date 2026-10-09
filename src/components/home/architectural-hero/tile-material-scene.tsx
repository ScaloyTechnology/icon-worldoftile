"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getMaterialSettingsForFinish } from "@/lib/products/material-settings";
import type { HomepageHeroCategory } from "@/types/homepage-content";
import type { TileSceneMotion } from "./use-tile-category-motion";

type Props = {
  categories: readonly HomepageHeroCategory[];
  sceneRef: RefObject<HTMLDivElement | null>;
  motion: RefObject<TileSceneMotion>;
  onFallback: () => void;
};
type Slab = { group: THREE.Group; face: THREE.Mesh; body: THREE.Mesh; element: HTMLElement; ready: boolean; dispose: () => void };

// Presentation proportions only: the hero content does not contain measured thickness.
const thickness = .018;
const reliefDepth = .0075;

function cropPosition(value: string | undefined): [number, number] {
  const parts = (value ?? "50% 50%").trim().split(/\s+/);
  const fraction = (part: string | undefined) => {
    if (part === "left" || part === "top") return 0;
    if (part === "right" || part === "bottom") return 1;
    if (part?.endsWith("%")) return THREE.MathUtils.clamp(parseFloat(part) / 100, 0, 1);
    return .5;
  };
  return [fraction(parts[0]), fraction(parts[1])];
}

function surfaceMaps(colourCanvas: HTMLCanvasElement) {
  const resolution = Math.min(1024, colourCanvas.width);
  const detail = document.createElement("canvas");
  detail.width = detail.height = resolution;
  const ctx = detail.getContext("2d", { willReadFrequently: true });
  const broad = document.createElement("canvas");
  broad.width = broad.height = resolution;
  const broadContext = broad.getContext("2d", { willReadFrequently: true });
  if (!ctx || !broadContext) throw new Error("Tile detail processing unavailable");
  ctx.drawImage(colourCanvas, 0, 0, resolution, resolution);
  broadContext.filter = `blur(${Math.max(4, resolution / 64)}px)`;
  broadContext.drawImage(detail, 0, 0);
  const pixels = ctx.getImageData(0, 0, resolution, resolution);
  const blurred = broadContext.getImageData(0, 0, resolution, resolution);
  const heights = new Float32Array(resolution * resolution);
  const normals = ctx.createImageData(resolution, resolution);
  const roughnessPixels = ctx.createImageData(resolution, resolution);
  const luminance = (data: Uint8ClampedArray, offset: number) =>
    (data[offset]! * .2126 + data[offset + 1]! * .7152 + data[offset + 2]! * .0722) / 255;

  // Separate the photographed grain from broad colour/lighting changes. A dark
  // printed patch must not become a deep crater just because it is dark.
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const i = y * resolution + x;
    const offset = i * 4;
    const light = luminance(pixels.data, offset);
    const base = luminance(blurred.data, offset);
    const grain = light - base;
    const rim = THREE.MathUtils.smoothstep(Math.min(x, y, resolution - 1 - x, resolution - 1 - y), 0, resolution * .012);
    heights[i] = THREE.MathUtils.clamp(.38 + grain * 2.6 + (base - .5) * .16, .03, .94) * rim;
    const rough = Math.round(THREE.MathUtils.clamp(.86 + Math.abs(grain) * 1.8 - grain * .35, .65, 1) * 255);
    roughnessPixels.data[offset] = roughnessPixels.data[offset + 1] = roughnessPixels.data[offset + 2] = rough;
    roughnessPixels.data[offset + 3] = 255;
  }
  const sample = (x: number, y: number) => heights[
    THREE.MathUtils.clamp(y, 0, resolution - 1) * resolution + THREE.MathUtils.clamp(x, 0, resolution - 1)
  ] ?? 0;
  for (let y = 0; y < resolution; y++) for (let x = 0; x < resolution; x++) {
    const offset = (y * resolution + x) * 4;
    const nx = (sample(x - 1, y) - sample(x + 1, y)) * 3.8;
    // Image rows run downward; tangent-space texture V runs upward.
    const ny = (sample(x, y + 1) - sample(x, y - 1)) * 3.8;
    const length = Math.hypot(nx, ny, 1);
    normals.data[offset] = Math.round((nx / length * .5 + .5) * 255);
    normals.data[offset + 1] = Math.round((ny / length * .5 + .5) * 255);
    normals.data[offset + 2] = Math.round((1 / length * .5 + .5) * 255);
    normals.data[offset + 3] = 255;
  }
  ctx.putImageData(normals, 0, 0);
  broadContext.putImageData(roughnessPixels, 0, 0);
  const roughnessCanvas = document.createElement("canvas");
  roughnessCanvas.width = roughnessCanvas.height = Math.min(512, resolution);
  const roughnessContext = roughnessCanvas.getContext("2d", { willReadFrequently: true });
  if (!roughnessContext) throw new Error("Tile roughness processing unavailable");
  roughnessContext.drawImage(broad, 0, 0, roughnessCanvas.width, roughnessCanvas.height);
  // Pack cavity occlusion into R and retain roughness in G. Recessed grain and
  // layer boundaries receive less ambient light; flat printed colour stays clean.
  const packedSize = roughnessCanvas.width;
  const packed = roughnessContext.getImageData(0, 0, packedSize, packedSize);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [.707, .707], [-.707, .707], [.707, -.707], [-.707, -.707]] as const;
  const radii = [Math.max(2, Math.round(resolution * .003)), Math.max(4, Math.round(resolution * .012))];
  for (let y = 0; y < packedSize; y++) for (let x = 0; x < packedSize; x++) {
    const sx = Math.round(x / (packedSize - 1) * (resolution - 1));
    const sy = Math.round(y / (packedSize - 1) * (resolution - 1));
    const centre = sample(sx, sy);
    let cavity = 0;
    for (const [dx, dy] of directions) {
      let horizon = 0;
      for (const radius of radii) {
        const neighbour = sample(Math.round(sx + dx * radius), Math.round(sy + dy * radius));
        horizon = Math.max(horizon, (neighbour - centre - .015) / (1 + radius * .035));
      }
      cavity += horizon;
    }
    packed.data[(y * packedSize + x) * 4] = Math.round((1 - THREE.MathUtils.clamp(cavity / directions.length * 1.8, 0, .46)) * 255);
  }
  roughnessContext.putImageData(packed, 0, 0);
  return { normalCanvas: detail, roughnessCanvas, heights, resolution };
}

function makeSlab(image: HTMLImageElement, category: HomepageHeroCategory, anisotropy: number, segments: number) {
  // Reuse the decoded, optimized image and the existing admin crop.
  const side = Math.min(image.naturalWidth, image.naturalHeight);
  const resolution = Math.min(2048, side);
  const [px, py] = cropPosition(category.productImage.position);
  const colourCanvas = document.createElement("canvas");
  colourCanvas.width = colourCanvas.height = resolution;
  const colourContext = colourCanvas.getContext("2d");
  if (!colourContext) throw new Error("Tile image processing unavailable");
  colourContext.drawImage(image, (image.naturalWidth - side) * px, (image.naturalHeight - side) * py, side, side, 0, 0, resolution, resolution);

  // Image-derived relief is a visual approximation, not measured product geometry.
  const maps = surfaceMaps(colourCanvas);
  const finish = getMaterialSettingsForFinish(category.title);
  const glossy = finish.roughness <= .25;
  const colour = new THREE.CanvasTexture(colourCanvas);
  colour.colorSpace = THREE.SRGBColorSpace;
  colour.anisotropy = anisotropy;
  const normal = new THREE.CanvasTexture(maps.normalCanvas);
  const roughness = new THREE.CanvasTexture(maps.roughnessCanvas);
  normal.anisotropy = roughness.anisotropy = anisotropy;
  const faceGeometry = new THREE.PlaneGeometry(.994, .994, segments, segments);
  const vertices = faceGeometry.getAttribute("position");
  const uv = faceGeometry.getAttribute("uv");
  for (let i = 0; i < vertices.count; i++) {
    const x = Math.round(uv.getX(i) * (maps.resolution - 1));
    const y = Math.round((1 - uv.getY(i)) * (maps.resolution - 1));
    vertices.setZ(i, maps.heights[y * maps.resolution + x]! * (glossy ? reliefDepth * .25 : reliefDepth));
  }
  faceGeometry.computeVertexNormals();
  const faceMaterial = new THREE.MeshPhysicalMaterial({
    ...finish, map: colour, normalMap: normal, roughnessMap: roughness,
    aoMap: roughness, aoMapIntensity: glossy ? .7 : 1.15,
    normalScale: new THREE.Vector2(glossy ? .32 : .9, glossy ? .32 : .9),
    // Softer reflections preserve the photographed grain beneath the highlights.
    clearcoat: glossy ? .36 : .08,
    clearcoatRoughness: glossy ? .22 : .45,
    ior: 1.5, specularIntensity: .55, envMapIntensity: glossy ? .65 : .45,
    transparent: false, side: THREE.FrontSide,
  });
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  face.position.z = thickness / 2 + .0001;
  face.receiveShadow = true;

  // A tiny bevel catches the studio strips along the edge as the slab turns.
  // The solid, unglazed back remains visible throughout a complete revolution.
  const outline = new THREE.Shape();
  outline.moveTo(-.497, -.497);
  outline.lineTo(.497, -.497);
  outline.lineTo(.497, .497);
  outline.lineTo(-.497, .497);
  outline.closePath();
  const bodyGeometry = new THREE.ExtrudeGeometry(outline, {
    depth: thickness - .004, steps: 1, bevelEnabled: true,
    bevelThickness: .002, bevelSize: .003, bevelSegments: 3, curveSegments: 1,
  });
  bodyGeometry.translate(0, 0, -(thickness - .004) / 2);
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: "#a99d89", roughness: .82, metalness: 0, envMapIntensity: .35 });
  const body = new THREE.Mesh(bodyGeometry, edgeMaterial);
  body.receiveShadow = true;
  const group = new THREE.Group();
  group.visible = false;
  group.add(body, face);
  return {
    group, face, body,
    dispose: () => {
      group.clear(); faceGeometry.dispose(); bodyGeometry.dispose();
      faceMaterial.dispose(); edgeMaterial.dispose(); colour.dispose(); normal.dispose(); roughness.dispose();
    },
  };
}

function MaterialScene({ categories, sceneRef, motion, onFallback }: Props) {
  const root = useRef<THREE.Group>(null);
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const slabs = useRef<Array<Slab | undefined>>([]);
  const { gl, scene, invalidate } = useThree();

  useEffect(() => {
    // Local studio geometry supplies real softbox reflections without an HDR download.
    const studio = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(gl);
    const previousEnvironment = scene.environment;
    const reflections = generator.fromScene(studio, .04);
    scene.environment = reflections.texture;
    studio.dispose(); generator.dispose();
    invalidate();
    return () => {
      if (scene.environment === reflections.texture) scene.environment = previousEnvironment;
      reflections.dispose();
    };
  }, [gl, scene, invalidate]);

  useEffect(() => {
    let disposed = false;
    const group = root.current;
    const listeners: Array<() => void> = [];
    const frames = new Set<number>();
    motion.current.invalidate = invalidate;
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const segments = (sceneRef.current?.clientWidth ?? 0) < 761 ? 128 : 192;
    categories.forEach((category, index) => {
      const element = sceneRef.current?.querySelector<HTMLElement>(`[data-sample-index="${index}"]`);
      const image = element?.querySelector<HTMLImageElement>("img");
      if (!element || !image || !category.productImage.src) return;
      let queued = false;
      const prepare = () => {
        if (disposed || queued || !image.naturalWidth) return;
        queued = true;
        // Prepare at most one slab per animation callback, leaving the DOM face
        // visible until its own GPU material is ready. Failed images stay in DOM.
        const frame = requestAnimationFrame(() => {
          frames.delete(frame);
          if (disposed) return;
          try {
            const slab = makeSlab(image, category, anisotropy, segments);
            slabs.current[index] = { ...slab, element, ready: false };
            group?.add(slab.group);
            invalidate();
          } catch {
            delete element.dataset.modelReady;
          }
        });
        frames.add(frame);
      };
      if (image.complete) prepare();
      image.addEventListener("load", prepare);
      listeners.push(() => image.removeEventListener("load", prepare));
    });
    const lost = (event: Event) => { event.preventDefault(); onFallback(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      disposed = true;
      listeners.forEach(remove => remove());
      frames.forEach(cancelAnimationFrame);
      gl.domElement.removeEventListener("webglcontextlost", lost);
      if (motion.current.invalidate === invalidate) delete motion.current.invalidate;
      slabs.current.forEach(slab => { if (slab) { delete slab.element.dataset.modelReady; slab.dispose(); } });
      slabs.current = [];
      group?.clear();
    };
  }, [categories, sceneRef, motion, gl, invalidate, onFallback]);

  useFrame(({ size }) => {
    const perspective = size.width < 761 ? 800 : 1100;
    const activeIndex = motion.current.activeIndex ?? 0;
    slabs.current.forEach((slab, index) => {
      if (!slab) return;
      const pose = motion.current.poses[index];
      slab.group.visible = Boolean(pose?.visible);
      if (!pose) return;
      // The reference projects each tile face as a flat sample, then applies
      // perspective to its carousel position. Do not apply perspective twice
      // to the face: that made the starting slab look taller and more upright.
      const depthScale = perspective / (perspective - pose.z);
      slab.group.position.set(pose.x * depthScale, size.height * .05 - pose.y * depthScale, pose.z);
      slab.group.scale.setScalar(pose.width * pose.scale * depthScale);
      slab.group.rotation.set(
        THREE.MathUtils.degToRad(-pose.rx),
        THREE.MathUtils.degToRad(pose.ry),
        THREE.MathUtils.degToRad(-pose.rz), "ZYX",
      );
      // Concentrate the shadow map on the active slab's millimetre-scale relief.
      slab.face.castShadow = index === activeIndex;
      slab.body.castShadow = index === activeIndex;
      if (!slab.ready && pose.visible) {
        slab.ready = true;
        slab.element.dataset.modelReady = "true";
      }
    });
    const activeSlab = slabs.current[activeIndex];
    const activePose = motion.current.poses[activeIndex];
    if (keyLight.current && activeSlab && activePose) {
      const light = keyLight.current;
      const centre = activeSlab.group.position;
      light.position.set(
        centre.x - 650 + Math.sin(THREE.MathUtils.degToRad(activePose.ry)) * 160,
        centre.y + 700,
        centre.z + 650,
      );
      light.target.position.copy(centre);
      light.target.updateMatrixWorld();
      const extent = Math.max(220, activePose.width * activePose.scale * .82);
      const camera = light.shadow.camera;
      if (camera.right !== extent) {
        camera.left = camera.bottom = -extent;
        camera.right = camera.top = extent;
        camera.updateProjectionMatrix();
      }
    }
  });

  return <>
    <ambientLight intensity={.25} />
    <hemisphereLight args={["#fffaf2", "#8c8171", .5]} />
    <directionalLight
      ref={keyLight} position={[-650, 700, 650]} intensity={1.9} color="#fff6e7"
      castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-near={10} shadow-camera-far={2400}
      shadow-bias={-.000015} shadow-normalBias={.06}
    />
    <directionalLight position={[700, 100, 700]} intensity={.55} color="#e6eeff" />
    <directionalLight position={[-500, 100, -400]} intensity={1.1} color="#fff8ed" />
    <group ref={root} dispose={null} />
  </>;
}

export default function TileMaterialScene(props: Props) {
  return <Canvas
    aria-hidden="true"
    dpr={[1, 1.5]}
    frameloop="demand"
    orthographic
    shadows="soft"
    camera={{ position: [0, 0, 1100], near: 1, far: 5000, zoom: 1 }}
    gl={{ alpha: true, antialias: true, powerPreference: "default" }}
    onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1; }}
  ><MaterialScene {...props} /></Canvas>;
}
