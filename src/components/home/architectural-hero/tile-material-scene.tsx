"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { getMaterialSettingsForFinish } from "@/lib/products/material-settings";
import type { HomepageHeroCategory } from "@/types/homepage-content";
import { TILE_REST_POSE, type TileSceneMotion } from "./use-tile-category-motion";

type Props = {
  categories: readonly HomepageHeroCategory[];
  sceneRef: RefObject<HTMLDivElement | null>;
  motion: RefObject<TileSceneMotion>;
  onFallback: () => void;
};
type Slab = { group: THREE.Group; face: THREE.Mesh; body: THREE.Mesh; element: HTMLElement; ready: boolean; dispose: () => void };

// Presentation proportions only: the hero content does not contain measured thickness.
const thickness = .018;
const reliefDepth = .006;

// Place the bulb on the resting slab's reflected camera ray. A light above the
// camera misses this steeply tilted face and only produces broad illumination.
const restOrientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(
  THREE.MathUtils.degToRad(-TILE_REST_POSE.rx),
  THREE.MathUtils.degToRad(TILE_REST_POSE.ry),
  THREE.MathUtils.degToRad(-TILE_REST_POSE.rz), "ZYX",
));
const restNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(restOrientation);
// A fixed, raking studio light reveals relief without following the live normal.
const reliefLightOffset = new THREE.Vector3(-.8, .5, .3)
  .normalize().applyQuaternion(restOrientation).multiplyScalar(1100);
const bulbDistanceRatio = .95;
const bulbOffset = new THREE.Vector3(.22, .23, thickness / 2)
  .applyQuaternion(restOrientation)
  .addScaledVector(new THREE.Vector3(0, 0, -1).reflect(restNormal), bulbDistanceRatio);

function configureTileReflections(material: THREE.MeshPhysicalMaterial) {
  // Keep the point light white for diffuse illumination. Warm only its glaze
  // reflection, so changing the highlight cannot tint the photographed pigment.
  material.onBeforeCompile = (shader) => {
    shader.uniforms.iconBulbReflectionColour = { value: new THREE.Color("#ffe1bb") };
    const directLighting = "RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );";
    // The first direct-light call in this chunk belongs to the point-light loop.
    // Directional lighting and the rough base-material response stay neutral.
    const lighting = THREE.ShaderChunk.lights_fragment_begin.replace(directLighting, `
      vec3 iconPreviousDiffuse = reflectedLight.directDiffuse;
      vec3 iconPreviousSpecular = reflectedLight.directSpecular;
      #ifdef USE_CLEARCOAT
        vec3 iconPreviousCoat = clearcoatSpecularDirect;
      #endif
      ${directLighting}
      // The bulb supplies a localized reflection, not a white wash over pigment.
      reflectedLight.directDiffuse = iconPreviousDiffuse;
      iconBulbSpecular += (reflectedLight.directSpecular - iconPreviousSpecular) * 0.25;
      reflectedLight.directSpecular = iconPreviousSpecular + iconBulbSpecular;
      #ifdef USE_CLEARCOAT
        iconBulbCoat += (clearcoatSpecularDirect - iconPreviousCoat) * iconBulbReflectionColour;
        clearcoatSpecularDirect = iconPreviousCoat + iconBulbCoat;
      #endif
    `);
    shader.fragmentShader = `uniform vec3 iconBulbReflectionColour;\n${shader.fragmentShader}`
      .replace("#include <lights_fragment_begin>", `
        vec3 iconBulbSpecular = vec3(0.0);
        vec3 iconBulbCoat = vec3(0.0);
        ${lighting}
      `)
      .replace("#include <lights_fragment_end>", `
        #include <lights_fragment_end>
        // Suppress the room panels and parallel-light glare independently of
        // the small bulb reflection. Diffuse texture illumination is unchanged.
        reflectedLight.directSpecular = iconBulbSpecular
          + max(reflectedLight.directSpecular - iconBulbSpecular, vec3(0.0)) * 0.12;
        reflectedLight.indirectSpecular *= 0.25;
        #ifdef USE_CLEARCOAT
          clearcoatSpecularDirect = iconBulbCoat
            + max(clearcoatSpecularDirect - iconBulbCoat, vec3(0.0)) * 0.12;
          clearcoatSpecularIndirect *= 0.15;
        #endif
      `)
      .replace("#include <opaque_fragment>", `
        // Soft-limit only reflected energy before tone mapping; never clamp or
        // recolour the image itself. Pale stone needs less added glare to keep
        // fine veins and grain visible as its normal aligns with a light.
        vec3 iconTextureLight = totalDiffuse + totalEmissiveRadiance;
        #ifdef USE_CLEARCOAT
          iconTextureLight *= 1.0 - material.clearcoat * Fcc;
        #endif
        vec3 iconReflection = max(outgoingLight - iconTextureLight, vec3(0.0));
        float iconPigmentLuminance = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
        float iconReflectionLimit = mix(0.34, 0.16, smoothstep(0.35, 0.85, iconPigmentLuminance));
        float iconReflectionPeak = max(iconReflection.r, max(iconReflection.g, iconReflection.b));
        iconReflection *= iconReflectionLimit / (iconReflectionLimit + iconReflectionPeak);
        outgoingLight = iconTextureLight + iconReflection;
        #include <opaque_fragment>
      `);
  };
  material.customProgramCacheKey = () => "icon-texture-preserving-reflections-v3";
}

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

async function surfaceMaps(colourCanvas: HTMLCanvasElement, depth: number, cancelled: () => boolean) {
  const yieldWork = async () => {
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    if (cancelled()) throw new Error("Tile preparation cancelled");
  };
  const resolution = Math.min(1024, colourCanvas.width);
  const detail = document.createElement("canvas");
  detail.width = detail.height = resolution;
  const ctx = detail.getContext("2d", { willReadFrequently: true });
  const broad = document.createElement("canvas");
  broad.width = broad.height = resolution;
  const broadContext = broad.getContext("2d", { willReadFrequently: true });
  const shape = document.createElement("canvas");
  shape.width = shape.height = resolution;
  const shapeContext = shape.getContext("2d", { willReadFrequently: true });
  if (!ctx || !broadContext || !shapeContext) throw new Error("Tile detail processing unavailable");
  // Filter only the derived maps; retain the untouched photograph for colour.
  // Single-pixel photo/compression noise must not become sharp ceramic bumps.
  ctx.filter = "blur(0.65px)";
  ctx.drawImage(colourCanvas, 0, 0, resolution, resolution);
  ctx.filter = "none";
  shapeContext.filter = `blur(${Math.max(2, resolution / 192)}px)`;
  shapeContext.drawImage(detail, 0, 0);
  broadContext.filter = `blur(${Math.max(4, resolution / 64)}px)`;
  broadContext.drawImage(detail, 0, 0);
  const pixels = ctx.getImageData(0, 0, resolution, resolution);
  const blurred = broadContext.getImageData(0, 0, resolution, resolution);
  const softened = shapeContext.getImageData(0, 0, resolution, resolution);
  const heights = new Float32Array(resolution * resolution);
  const reliefHeights = new Float32Array(resolution * resolution);
  const normals = ctx.createImageData(resolution, resolution);
  const roughnessPixels = ctx.createImageData(resolution, resolution);
  const luminance = (data: Uint8ClampedArray, offset: number) =>
    (data[offset]! * .2126 + data[offset + 1]! * .7152 + data[offset + 2]! * .0722) / 255;

  // Separate the photographed grain from broad colour/lighting changes. A dark
  // printed patch must not become a deep crater just because it is dark.
  for (let y = 0; y < resolution; y++) {
    if (y % 32 === 0) await yieldWork();
    for (let x = 0; x < resolution; x++) {
    const i = y * resolution + x;
    const offset = i * 4;
    const light = luminance(pixels.data, offset);
    const base = luminance(blurred.data, offset);
    const grain = THREE.MathUtils.clamp(light - base, -.12, .12);
    const rim = THREE.MathUtils.smoothstep(Math.min(x, y, resolution - 1 - x, resolution - 1 - y), 0, resolution * .012);
    // Fine grain affects normals gently; only smoothed, shallow layer detail
    // displaces the mesh. Do not emboss broad printed colours or shadows.
    heights[i] = .5 + grain * 1.4;
    const layer = luminance(softened.data, offset) - base;
    reliefHeights[i] = THREE.MathUtils.clamp(.5 + layer * 2.4, .22, .78) * rim;
    const rough = Math.round(THREE.MathUtils.clamp(.96 + Math.abs(grain) * .3, .94, 1) * 255);
    roughnessPixels.data[offset] = roughnessPixels.data[offset + 1] = roughnessPixels.data[offset + 2] = rough;
    roughnessPixels.data[offset + 3] = 255;
    }
  }
  const sample = (x: number, y: number) => heights[
    THREE.MathUtils.clamp(y, 0, resolution - 1) * resolution + THREE.MathUtils.clamp(x, 0, resolution - 1)
  ] ?? 0;
  const sampleRelief = (x: number, y: number) => reliefHeights[
    THREE.MathUtils.clamp(y, 0, resolution - 1) * resolution + THREE.MathUtils.clamp(x, 0, resolution - 1)
  ] ?? 0;
  for (let y = 0; y < resolution; y++) {
    if (y % 32 === 0) await yieldWork();
    for (let x = 0; x < resolution; x++) {
    const offset = (y * resolution + x) * 4;
    const nx = (sample(x - 1, y) - sample(x + 1, y)) * 2;
    // Image rows run downward; tangent-space texture V runs upward.
    const ny = (sample(x, y + 1) - sample(x, y - 1)) * 2;
    const length = Math.hypot(nx, ny, 1);
    normals.data[offset] = Math.round((nx / length * .5 + .5) * 255);
    normals.data[offset + 1] = Math.round((ny / length * .5 + .5) * 255);
    normals.data[offset + 2] = Math.round((1 / length * .5 + .5) * 255);
    normals.data[offset + 3] = 255;
    }
  }
  ctx.putImageData(normals, 0, 0);
  broadContext.putImageData(roughnessPixels, 0, 0);
  const roughnessCanvas = document.createElement("canvas");
  roughnessCanvas.width = roughnessCanvas.height = Math.min(512, resolution);
  const roughnessContext = roughnessCanvas.getContext("2d", { willReadFrequently: true });
  if (!roughnessContext) throw new Error("Tile roughness processing unavailable");
  roughnessContext.drawImage(broad, 0, 0, roughnessCanvas.width, roughnessCanvas.height);
  // Pack cavity occlusion into R and roughness into G. Measure horizons from
  // the same smooth relief and physical depth used by the mesh, not photo grain.
  const packedSize = roughnessCanvas.width;
  const packed = roughnessContext.getImageData(0, 0, packedSize, packedSize);
  const directions = [[1, 0], [-1, 0], [0, 1], [0, -1], [.707, .707], [-.707, .707], [.707, -.707], [-.707, -.707]] as const;
  const radii = [Math.max(3, Math.round(resolution * .006)), Math.max(6, Math.round(resolution * .018))];
  for (let y = 0; y < packedSize; y++) {
    if (y % 16 === 0) await yieldWork();
    for (let x = 0; x < packedSize; x++) {
    const sx = Math.round(x / (packedSize - 1) * (resolution - 1));
    const sy = Math.round(y / (packedSize - 1) * (resolution - 1));
    const centre = sampleRelief(sx, sy);
    let cavity = 0;
    for (const [dx, dy] of directions) {
      let horizon = 0;
      for (const radius of radii) {
        const neighbour = sampleRelief(Math.round(sx + dx * radius), Math.round(sy + dy * radius));
        const rise = Math.max(0, (neighbour - centre) * depth - .00002);
        const run = radius / (resolution - 1);
        horizon = Math.max(horizon, rise / run);
      }
      cavity += horizon / Math.sqrt(1 + horizon * horizon);
    }
    packed.data[(y * packedSize + x) * 4] = Math.round((1 - THREE.MathUtils.clamp(cavity / directions.length * 1.4, 0, .32)) * 255);
    }
  }
  roughnessContext.putImageData(packed, 0, 0);
  return { normalCanvas: detail, roughnessCanvas, heights: reliefHeights, resolution };
}

async function makeSlab(image: HTMLImageElement, category: HomepageHeroCategory, anisotropy: number, segments: number, cancelled: () => boolean) {
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
  const finish = getMaterialSettingsForFinish(category.title);
  const glossy = finish.roughness <= .25;
  const carved = /carv|textur|structured|stone/i.test(category.title);
  const depth = glossy ? 0 : reliefDepth * (carved ? 1 : .7);
  const maps = await surfaceMaps(colourCanvas, depth, cancelled);
  const colour = new THREE.CanvasTexture(colourCanvas);
  colour.colorSpace = THREE.SRGBColorSpace;
  colour.anisotropy = anisotropy;
  const normal = new THREE.CanvasTexture(maps.normalCanvas);
  const roughness = new THREE.CanvasTexture(maps.roughnessCanvas);
  normal.anisotropy = roughness.anisotropy = anisotropy;
  const faceGeometry = new THREE.PlaneGeometry(.994, .994, segments, segments);
  const vertices = faceGeometry.getAttribute("position");
  const uv = faceGeometry.getAttribute("uv");
  const heightAt = (x: number, y: number) => maps.heights[y * maps.resolution + x] ?? 0;
  for (let i = 0; i < vertices.count; i++) {
    const x = uv.getX(i) * (maps.resolution - 1);
    const y = (1 - uv.getY(i)) * (maps.resolution - 1);
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const x1 = Math.min(x0 + 1, maps.resolution - 1), y1 = Math.min(y0 + 1, maps.resolution - 1);
    // Bilinear sampling avoids steps in the geometry and its moving shadow.
    const height = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(heightAt(x0, y0), heightAt(x1, y0), x - x0),
      THREE.MathUtils.lerp(heightAt(x0, y1), heightAt(x1, y1), x - x0), y - y0,
    );
    // Polished glaze stays flat: photographed veins are colour, not carved ridges.
    vertices.setZ(i, height * depth);
  }
  faceGeometry.computeVertexNormals();
  const faceMaterial = new THREE.MeshPhysicalMaterial({
    ...finish, map: colour, normalMap: normal, roughnessMap: roughness,
    aoMap: roughness, aoMapIntensity: glossy ? 0 : carved ? .9 : .7,
    normalScale: new THREE.Vector2(glossy ? .12 : .5, glossy ? .12 : .5),
    // A localized ceramic-glaze reflection over the original rough surface.
    // Matte finishes retain a wider, softer bulb highlight than polished tiles.
    clearcoat: glossy ? .36 : .1,
    clearcoatRoughness: glossy ? .2 : .3,
    clearcoatRoughnessMap: roughness,
    clearcoatNormalMap: normal,
    clearcoatNormalScale: new THREE.Vector2(glossy ? .025 : .06, glossy ? .025 : .06),
    ior: 1.5, specularIntensity: .48, envMapIntensity: glossy ? .3 : .2,
    transparent: false, side: THREE.FrontSide,
  });
  configureTileReflections(faceMaterial);
  const face = new THREE.Mesh(faceGeometry, faceMaterial);
  face.castShadow = true;
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
  body.castShadow = true;
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
  const bulb = useRef<THREE.PointLight>(null);
  const slabs = useRef<Array<Slab | undefined>>([]);
  const lightCentre = useMemo(() => new THREE.Vector3(), []);
  const { gl, scene, invalidate } = useThree();

  useEffect(() => {
    // Local studio geometry supplies real softbox reflections without an HDR download.
    const studio = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(gl);
    const previousEnvironment = scene.environment;
    const reflections = generator.fromScene(studio, .07);
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
    const preparationQueue: Array<() => Promise<void>> = [];
    let preparing = false;
    const drainQueue = async () => {
      if (preparing) return;
      preparing = true;
      while (!disposed && preparationQueue.length) {
        const prepare = preparationQueue.shift();
        await prepare?.();
      }
      preparing = false;
    };
    motion.current.invalidate = invalidate;
    const anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    const segments = (sceneRef.current?.clientWidth ?? 0) < 761 ? 96 : 128;
    categories.forEach((category, index) => {
      const element = sceneRef.current?.querySelector<HTMLElement>(`[data-sample-index="${index}"]`);
      const image = element?.querySelector<HTMLImageElement>("img");
      if (!element || !image || !category.productImage.src) return;
      let queued = false;
      const prepare = () => {
        if (disposed || queued || !image.naturalWidth) return;
        queued = true;
        // Serialize preparation and yield between pixel batches so image loading
        // cannot monopolize an animation frame during a wheel/drag gesture.
        preparationQueue.push(async () => {
          if (disposed) return;
          try {
            const slab = await makeSlab(image, category, anisotropy, segments, () => disposed);
            if (disposed) { slab.dispose(); return; }
            slabs.current[index] = { ...slab, element, ready: false };
            group?.add(slab.group);
            invalidate();
          } catch {
            delete element.dataset.modelReady;
          }
        });
        void drainQueue();
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
      preparationQueue.length = 0;
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
      if (!slab.ready && pose.visible) {
        slab.ready = true;
        slab.element.dataset.modelReady = "true";
      }
    });
    const activeSlab = slabs.current[activeIndex];
    const activePose = motion.current.poses[activeIndex];
    // Follow the continuous carousel playhead. Switching directly to the nearest
    // category teleports the light and its shadow halfway through every scroll.
    const playhead = motion.current.position ?? activeIndex;
    const lower = Math.floor(playhead);
    const upper = Math.min(lower + 1, categories.length - 1);
    const blend = playhead - lower;
    const lowerPose = motion.current.poses[lower];
    const upperPose = motion.current.poses[upper];
    let lightSize = activeSlab?.group.scale.x ?? 440;
    if (lowerPose && upperPose) {
      const a = perspective / (perspective - lowerPose.z);
      const b = perspective / (perspective - upperPose.z);
      lightCentre.set(
        THREE.MathUtils.lerp(lowerPose.x * a, upperPose.x * b, blend),
        size.height * .05 - THREE.MathUtils.lerp(lowerPose.y * a, upperPose.y * b, blend),
        THREE.MathUtils.lerp(lowerPose.z, upperPose.z, blend),
      );
      lightSize = THREE.MathUtils.lerp(lowerPose.width * lowerPose.scale * a, upperPose.width * upperPose.scale * b, blend);
    } else if (activeSlab) lightCentre.copy(activeSlab.group.position);
    if (keyLight.current && activeSlab && activePose) {
      const light = keyLight.current;
      const centre = lightCentre;
      light.position.copy(centre).add(reliefLightOffset);
      light.target.position.copy(centre);
      light.target.updateMatrixWorld();
      const extent = Math.max(220, lightSize * .82);
      const camera = light.shadow.camera;
      if (camera.right !== extent) {
        camera.left = camera.bottom = -extent;
        camera.right = camera.top = extent;
        camera.updateProjectionMatrix();
      }
    }
    if (bulb.current && activeSlab && activePose) {
      // Anchor to the resting orientation, never the live rotation: turning the
      // tile moves the round specular highlight and can carry it off the edge.
      // Scaling position and candela together keeps inverse-square illumination
      // consistent across desktop/mobile without increasing global exposure.
      const light = bulb.current;
      const centre = lightCentre;
      const size = lightSize;
      light.position.copy(centre).addScaledVector(bulbOffset, size);
      light.intensity = Math.pow(size * bulbDistanceRatio, 2) * 1.1;
    }
  });

  return <>
    <ambientLight intensity={.18} />
    <hemisphereLight args={["#ffffff", "#818181", .4]} />
    <directionalLight
      ref={keyLight} position={[-650, 700, 650]} intensity={1.1} color="#ffffff"
      castShadow shadow-mapSize={[2048, 2048]}
      shadow-camera-near={400} shadow-camera-far={1800}
      shadow-bias={-.00001} shadow-normalBias={.035}
    />
    <pointLight ref={bulb} intensity={0} decay={2} distance={0} color="#ffffff" />
    <directionalLight position={[700, 100, 700]} intensity={.3} color="#ffffff" />
    <directionalLight position={[-500, 100, -400]} intensity={1.1} color="#ffffff" />
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
