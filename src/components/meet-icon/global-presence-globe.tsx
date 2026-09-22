"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, type PointerEvent, type ReactNode, type RefObject } from "react";
import { DoubleSide, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Quaternion, SRGBColorSpace, TextureLoader, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { facingAngles, geoToGlobePosition, type GlobalPresenceUnit } from "./global-presence-data";

type Controls = {
  spin: number;
  tilt: number;
  dragging: boolean;
  pauseUntil: number;
};

type GlobeProps = Readonly<{
  activeUnit: GlobalPresenceUnit;
  focusRequest: number;
  visible: boolean;
  reducedMotion: boolean;
  onMarkerSelect: () => void;
  onMarkerHover: (hovered: boolean) => void;
  onOriginVisibilityChange: (visible: boolean) => void;
  onReady: () => void;
  onFailure: () => void;
}>;

class GlobeBoundary extends Component<Readonly<{ children: ReactNode; onFailure: () => void }>, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch() { this.props.onFailure(); }

  render() { return this.state.failed ? null : this.props.children; }
}

function EarthScene({ controls, activeUnit, focusRequest, reducedMotion, onMarkerSelect, onMarkerHover, onOriginVisibilityChange, onReady }: GlobeProps & { controls: RefObject<Controls> }) {
  const gltf = useLoader(GLTFLoader, "/models/earth.glb");
  const texture = useLoader(TextureLoader, "/models/earth-texture.webp");
  const earth = useMemo(() => {
    texture.flipY = false;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    const model = gltf.scene.clone(true);
    model.traverse((child) => {
      if (child instanceof Mesh) {
        const material = new MeshStandardMaterial({ map: texture, roughness: .92, metalness: 0, side: DoubleSide });
        material.onBeforeCompile = (shader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            "#include <map_fragment>",
            `#include <map_fragment>
            float iconTone = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            vec3 iconCharcoal = vec3(0.145, 0.133, 0.129);
            vec3 iconTaupe = vec3(0.590, 0.518, 0.447);
            vec3 iconIvory = vec3(0.925, 0.902, 0.867);
            vec3 iconPalette = mix(iconCharcoal, iconTaupe, smoothstep(0.10, 0.58, iconTone));
            iconPalette = mix(iconPalette, iconIvory, smoothstep(0.58, 0.96, iconTone));
            diffuseColor.rgb = iconPalette;`,
          );
        };
        material.customProgramCacheKey = () => "icon-earth-palette-v1";
        child.material = material;
      }
    });
    return model;
  }, [gltf.scene, texture]);
  const origin = geoToGlobePosition(22.8350833, 70.8688517, 1.028);
  const originVector = useMemo(() => new Vector3(...origin), [origin[0], origin[1], origin[2]]);
  const markerQuaternion = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), originVector.clone().normalize()), [originVector]);
  const tiltGroup = useRef<Group>(null);
  const spinGroup = useRef<Group>(null);
  const marker = useRef<Group>(null);
  const pulseRing = useRef<Mesh>(null);
  const pulse = useRef<MeshBasicMaterial>(null);
  const markerWasVisible = useRef<boolean | null>(null);
  const markerWorld = useMemo(() => new Vector3(), []);
  const initial = useMemo(() => facingAngles(22.8350833, 70.8688517), []);

  useEffect(() => { onReady(); }, [onReady]);

  useEffect(() => () => {
    earth.traverse((child) => { if (child instanceof Mesh) (child.material as MeshStandardMaterial).dispose(); });
  }, [earth]);

  useEffect(() => {
    const [latitude, longitude] = activeUnit.coordinates;
    const facing = facingAngles(latitude, longitude);
    const current = controls.current.spin;
    controls.current.spin = facing.spin + Math.round((current - facing.spin) / (Math.PI * 2)) * Math.PI * 2;
    controls.current.tilt = facing.tilt;
    controls.current.pauseUntil = performance.now() + 2300;
  }, [activeUnit, controls, focusRequest]);

  useFrame(({ camera, clock }, delta) => {
    const control = controls.current;
    if (!reducedMotion && !control.dragging && performance.now() > control.pauseUntil) {
      control.spin -= Math.min(delta, .05) * .035;
    }
    const smoothing = reducedMotion ? 1 : 1 - Math.exp(-Math.min(delta, .05) * 3.7);
    if (spinGroup.current) spinGroup.current.rotation.y += (control.spin - spinGroup.current.rotation.y) * smoothing;
    if (tiltGroup.current) tiltGroup.current.rotation.x += (control.tilt - tiltGroup.current.rotation.x) * smoothing;
    if (marker.current) {
      marker.current.getWorldPosition(markerWorld);
      const isVisible = markerWorld.dot(camera.position) > .02;
      marker.current.visible = isVisible;
      if (markerWasVisible.current !== isVisible) {
        markerWasVisible.current = isVisible;
        onOriginVisibilityChange(isVisible);
      }
    }
    if (pulse.current) {
      const phase = (clock.elapsedTime % 3) / 3;
      pulse.current.opacity = reducedMotion ? .24 : Math.max(0, .28 * (1 - phase));
      if (pulseRing.current) pulseRing.current.scale.setScalar(reducedMotion ? 1 : 1 + phase * .5);
    }
  });

  return (
    <>
      <ambientLight intensity={1.35} color="#eee7dd" />
      <directionalLight position={[3, 4, 5]} intensity={1.35} color="#fff8ed" />
      <directionalLight position={[-4, -1, 2]} intensity={.32} color="#a95238" />
      <group ref={tiltGroup} rotation-x={initial.tilt}>
        <group ref={spinGroup} rotation-y={initial.spin}>
          <primitive object={earth} scale={.01} />
          <group ref={marker} position={origin} quaternion={markerQuaternion}>
            <mesh
              onClick={(event) => { event.stopPropagation(); onMarkerSelect(); }}
              onPointerOver={(event) => { event.stopPropagation(); if (marker.current) marker.current.scale.setScalar(1.12); onMarkerHover(true); }}
              onPointerOut={() => { if (marker.current) marker.current.scale.setScalar(1); onMarkerHover(false); }}
            >
              <sphereGeometry args={[.027, 18, 18]} />
              <meshBasicMaterial color="#f3eee6" depthTest depthWrite={false} />
            </mesh>
            <mesh ref={pulseRing} position-z={.002}>
              <ringGeometry args={[.047, .051, 48]} />
              <meshBasicMaterial color="#a95238" side={DoubleSide} depthTest depthWrite={false} />
            </mesh>
            <mesh position-z={.002}>
              <ringGeometry args={[.06, .064, 48]} />
              <meshBasicMaterial ref={pulse} color="#a95238" side={DoubleSide} transparent opacity={.24} depthTest depthWrite={false} />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
}

export default function GlobalPresenceGlobe(props: GlobeProps) {
  const initial = facingAngles(22.8350833, 70.8688517);
  const controls = useRef<Controls>({ spin: initial.spin, tilt: initial.tilt, dragging: false, pauseUntil: 0 });
  const pointer = useRef({ id: -1, x: 0, y: 0, touchDirection: "" as "" | "horizontal" | "vertical" });

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (pointer.current.id !== event.pointerId) return;
    controls.current.dragging = false;
    controls.current.pauseUntil = performance.now() + 1700;
    pointer.current.id = -1;
    pointer.current.touchDirection = "";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div
      className="meet-global__canvas"
      onPointerDown={(event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        pointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY, touchDirection: "" };
      }}
      onPointerMove={(event) => {
        if (pointer.current.id !== event.pointerId) return;
        const dx = event.clientX - pointer.current.x;
        const dy = event.clientY - pointer.current.y;
        if (event.pointerType === "touch" && !pointer.current.touchDirection && Math.hypot(dx, dy) > 7) {
          pointer.current.touchDirection = Math.abs(dx) > Math.abs(dy) * 1.3 ? "horizontal" : "vertical";
        }
        if (pointer.current.touchDirection === "vertical" || (event.pointerType === "touch" && !pointer.current.touchDirection)) return;
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.setPointerCapture(event.pointerId);
        controls.current.dragging = true;
        controls.current.spin += dx * .005;
        controls.current.tilt = Math.max(-.65, Math.min(.65, controls.current.tilt + dy * .003));
        pointer.current.x = event.clientX;
        pointer.current.y = event.clientY;
      }}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      aria-label="Interactive Earth. Drag horizontally to rotate; use the location buttons for keyboard access."
    >
      <GlobeBoundary onFailure={props.onFailure}>
        <Canvas
          dpr={typeof window !== "undefined" && window.innerWidth < 768 ? [1, 1.25] : [1, 1.5]}
          frameloop={props.visible ? "always" : "demand"}
          camera={{ position: [0, 0, 4.8], fov: 35, near: .1, far: 10 }}
          gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
          onCreated={({ gl }) => gl.domElement.addEventListener("webglcontextlost", (event) => { event.preventDefault(); props.onFailure(); }, { once: true })}
        >
          <Suspense fallback={null}>
            <EarthScene {...props} controls={controls} />
          </Suspense>
        </Canvas>
      </GlobeBoundary>
    </div>
  );
}
