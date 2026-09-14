"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { getMaterialSettingsForFinish, getTileProportions } from "@/lib/products/material-settings";

export type ProductLightMode = "neutral" | "warm" | "cool";
export type ProductView = "angle" | "front" | "edge";

type Props = Readonly<{
  src: string;
  alt: string;
  widthMm: number | null;
  heightMm: number | null;
  thicknessMm: number | null;
  imageAspect: number;
  finish: string | null;
  lightMode: ProductLightMode;
  view: ProductView;
  active: boolean;
  onState: (state: "loading" | "ready" | "fallback") => void;
}>;

const viewPose: Record<ProductView, [number, number]> = {
  angle: [-0.07, 0.2],
  front: [0, 0],
  edge: [-0.035, 0.48],
};

function cropTexture(texture: THREE.Texture, sourceAspect: number, targetAspect: number) {
  const safeSourceAspect = sourceAspect > 0 ? sourceAspect : targetAspect;
  const rotate = (safeSourceAspect >= 1) !== (targetAspect >= 1);
  const orientedAspect = rotate ? 1 / safeSourceAspect : safeSourceAspect;
  const cropX = Math.min(1, targetAspect / orientedAspect);
  const cropY = Math.min(1, orientedAspect / targetAspect);
  texture.center.set(0.5, 0.5);
  texture.rotation = rotate ? Math.PI / 2 : 0;
  texture.repeat.set(rotate ? cropY : cropX, rotate ? cropX : cropY);
  texture.needsUpdate = true;
}

function ProductSlab(props: Props) {
  const mesh = useRef<THREE.Mesh>(null);
  const face = useRef<THREE.MeshPhysicalMaterial>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const target = useRef({ x: viewPose[props.view][0], y: viewPose[props.view][1] });
  const drag = useRef({ active: false, x: 0, y: 0 });
  const resources = useRef<{ texture: THREE.Texture; geometry: THREE.BufferGeometry; edge: THREE.Material } | null>(null);
  const { gl } = useThree();
  const { imageAspect, onState, src } = props;
  const proportions = useMemo(
    () => getTileProportions(props.widthMm, props.heightMm, props.thicknessMm, props.imageAspect),
    [props.heightMm, props.imageAspect, props.thicknessMm, props.widthMm],
  );
  const aspect = useRef({ source: imageAspect, target: proportions.width / proportions.height });
  const response = getMaterialSettingsForFinish(props.finish);

  useEffect(() => {
    target.current = { x: viewPose[props.view][0], y: viewPose[props.view][1] };
  }, [props.view]);

  useEffect(() => {
    let live = true;
    onState("loading");
    const geometry = new RoundedBoxGeometry(1, 1, 1, 3, 0.035);
    const edge = new THREE.MeshPhysicalMaterial({ color: "#aea69a", roughness: 0.82, metalness: 0 });
    new THREE.TextureLoader().loadAsync(src).then((texture) => {
      if (!live) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(6, gl.capabilities.getMaxAnisotropy());
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      cropTexture(texture, aspect.current.source, aspect.current.target);
      resources.current = { texture, geometry, edge };
      if (mesh.current && face.current) {
        face.current.map = texture;
        face.current.needsUpdate = true;
        mesh.current.geometry = geometry;
        mesh.current.material = [edge, edge, edge, edge, face.current, edge];
        mesh.current.visible = true;
      }
      onState("ready");
    }).catch(() => onState("fallback"));
    const lost = (event: Event) => { event.preventDefault(); onState("fallback"); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      live = false;
      gl.domElement.removeEventListener("webglcontextlost", lost);
      resources.current?.texture.dispose();
      geometry.dispose();
      edge.dispose();
      resources.current = null;
    };
  }, [gl, onState, src]);

  useEffect(() => {
    aspect.current = { source: imageAspect, target: proportions.width / proportions.height };
    if (!resources.current) return;
    cropTexture(resources.current.texture, imageAspect, proportions.width / proportions.height);
  }, [imageAspect, proportions.height, proportions.width]);

  useFrame((_, delta) => {
    const slab = mesh.current;
    if (!slab) return;
    if (!drag.current.active) {
      const rest = viewPose[props.view];
      target.current.x = THREE.MathUtils.damp(target.current.x, rest[0], 1.8, delta);
      target.current.y = THREE.MathUtils.damp(target.current.y, rest[1], 1.8, delta);
    }
    slab.rotation.x = THREE.MathUtils.damp(slab.rotation.x, target.current.x, 8, delta);
    slab.rotation.y = THREE.MathUtils.damp(slab.rotation.y, target.current.y, 8, delta);
    const fit = Math.min(4.45 / proportions.width, 3.15 / proportions.height);
    slab.scale.x = THREE.MathUtils.damp(slab.scale.x, proportions.width * fit, 7, delta);
    slab.scale.y = THREE.MathUtils.damp(slab.scale.y, proportions.height * fit, 7, delta);
    slab.scale.z = THREE.MathUtils.damp(slab.scale.z, Math.max(proportions.depth * fit, 0.045), 7, delta);
    if (face.current) {
      face.current.roughness = THREE.MathUtils.damp(face.current.roughness, response.roughness, 6, delta);
      face.current.clearcoat = THREE.MathUtils.damp(face.current.clearcoat, response.clearcoat, 6, delta);
      face.current.clearcoatRoughness = THREE.MathUtils.damp(face.current.clearcoatRoughness, response.clearcoatRoughness, 6, delta);
    }
    if (key.current) {
      const targetX = props.lightMode === "warm" ? -3.8 : props.lightMode === "cool" ? 3.8 : -2.4;
      key.current.position.x = THREE.MathUtils.damp(key.current.position.x, targetX, 4, delta);
    }
  });

  const beginDrag = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    drag.current = { active: true, x: event.clientX, y: event.clientY };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event: ThreeEvent<PointerEvent>) => {
    if (!drag.current.active) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    drag.current.x = event.clientX;
    drag.current.y = event.clientY;
    target.current.y = THREE.MathUtils.clamp(target.current.y + dx * 0.005, -0.5, 0.5);
    target.current.x = THREE.MathUtils.clamp(target.current.x + dy * 0.004, -0.22, 0.22);
  };
  const endDrag = (event: ThreeEvent<PointerEvent>) => {
    drag.current.active = false;
    (event.target as HTMLElement).releasePointerCapture?.(event.pointerId);
  };

  const light = props.lightMode === "warm" ? "#ffe4bd" : props.lightMode === "cool" ? "#dcecff" : "#fff8eb";
  return <>
    <ambientLight intensity={0.58} />
    <hemisphereLight args={["#fffaf1", "#777168", 1.05]} />
    <directionalLight ref={key} castShadow color={light} intensity={2.25} position={[-2.4, 4.5, 5]} shadow-mapSize={[512, 512]} />
    <directionalLight color={props.lightMode === "cool" ? "#c9ddff" : "#eef2f0"} intensity={0.75} position={[4, 0.5, 2]} />
    <directionalLight color="#fff" intensity={0.85} position={[-3, 2, -3]} />
    <mesh
      ref={mesh}
      visible={false}
      castShadow
      onPointerDown={beginDrag}
      onPointerMove={moveDrag}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onPointerLeave={(event) => { if (drag.current.active) endDrag(event); }}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshPhysicalMaterial
        ref={face}
        color="#ffffff"
        roughness={response.roughness}
        metalness={response.metalness}
        clearcoat={response.clearcoat}
        clearcoatRoughness={response.clearcoatRoughness}
      />
    </mesh>
    <mesh position={[0, -1.77, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[6.2, 4.8]} />
      <shadowMaterial transparent opacity={0.16} />
    </mesh>
  </>;
}

export default function ProductDetailStage(props: Props) {
  return <div aria-label={props.alt} role="img" style={{ position: "absolute", inset: 0 }}>
    <Canvas
      camera={{ position: [0, 0, 8], fov: 30 }}
      dpr={[1, 1.3]}
      frameloop={props.active ? "always" : "never"}
      shadows
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.98;
      }}
    >
      <ProductSlab {...props} />
    </Canvas>
  </div>;
}
