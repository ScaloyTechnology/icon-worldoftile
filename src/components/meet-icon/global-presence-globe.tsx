"use client";

import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { Component, Suspense, useEffect, useMemo, useRef, type PointerEvent, type ReactNode, type RefObject } from "react";
import { CanvasTexture, DoubleSide, Group, Mesh, MeshBasicMaterial, Quaternion, SRGBColorSpace, TextureLoader, Vector3 } from "three";

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
  const texture = useLoader(TextureLoader, "/models/earth-texture.webp");
  const goldTexture = useMemo(() => {
    if (typeof document === "undefined") return texture;
    const source = texture.image as HTMLImageElement | undefined;
    if (!source?.naturalWidth || !source.naturalHeight) return texture;

    const canvas = document.createElement("canvas");
    const maximumWidth = window.innerWidth < 768 ? 768 : 1024;
    const scale = Math.min(1, maximumWidth / source.naturalWidth);
    canvas.width = Math.max(1, Math.round(source.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(source.naturalHeight * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return texture;

    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    const smoothstep = (low: number, high: number, value: number) => {
      const amount = Math.max(0, Math.min(1, (value - low) / (high - low)));
      return amount * amount * (3 - 2 * amount);
    };
    const mix = (from: number, to: number, amount: number) => Math.round(from + (to - from) * amount);

    for (let index = 0; index < pixels.length; index += 4) {
      const red = (pixels[index] ?? 0) / 255;
      const green = (pixels[index + 1] ?? 0) / 255;
      const blue = (pixels[index + 2] ?? 0) / 255;
      const tone = red * .299 + green * .587 + blue * .114;
      const saturation = Math.max(red, green, blue) - Math.min(red, green, blue);
      const blueDominance = blue - Math.max(red, green) * .8;
      const ocean = smoothstep(.018, .145, blueDominance) * smoothstep(.018, .13, saturation);
      const cloud = smoothstep(.69, .91, tone) * (1 - saturation * .72);
      const land = smoothstep(.18, .82, (1 - ocean) * (1 - cloud));

      const ivoryAmount = smoothstep(.04, .82, tone);
      const goldAmount = smoothstep(.08, .72, tone);
      const ivory = [mix(212, 250, ivoryAmount), mix(200, 241, ivoryAmount), mix(157, 199, ivoryAmount)];
      const gold = [mix(158, 232, goldAmount), mix(99, 169, goldAmount), mix(16, 43, goldAmount)];
      const cloudAmount = cloud * .76;

      pixels[index] = mix(mix(ivory[0]!, gold[0]!, land), 250, cloudAmount);
      pixels[index + 1] = mix(mix(ivory[1]!, gold[1]!, land), 241, cloudAmount);
      pixels[index + 2] = mix(mix(ivory[2]!, gold[2]!, land), 199, cloudAmount);
    }

    context.putImageData(image, 0, 0);
    const generated = new CanvasTexture(canvas);
    generated.flipY = false;
    generated.colorSpace = SRGBColorSpace;
    generated.needsUpdate = true;
    return generated;
  }, [texture]);
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
    if (goldTexture !== texture) goldTexture.dispose();
  }, [goldTexture, texture]);

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
      <ambientLight intensity={1.32} color="#fff0b8" />
      <directionalLight position={[3, 4, 5]} intensity={1.35} color="#fff1b8" />
      <directionalLight position={[-4, -1, 2]} intensity={.38} color="#d29a32" />
      <group ref={tiltGroup} rotation-x={initial.tilt}>
        <group ref={spinGroup} rotation-y={initial.spin}>
          <mesh>
            <sphereGeometry args={[1, 64, 48]} />
            <meshStandardMaterial map={goldTexture} roughness={.76} metalness={.025} side={DoubleSide} toneMapped={false} />
          </mesh>
          <group ref={marker} position={origin} quaternion={markerQuaternion}>
            <mesh
              onClick={(event) => { event.stopPropagation(); onMarkerSelect(); }}
              onPointerOver={(event) => { event.stopPropagation(); if (marker.current) marker.current.scale.setScalar(1.12); onMarkerHover(true); }}
              onPointerOut={() => { if (marker.current) marker.current.scale.setScalar(1); onMarkerHover(false); }}
            >
              <sphereGeometry args={[.027, 18, 18]} />
              <meshBasicMaterial color="#fff1ba" depthTest depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh ref={pulseRing} position-z={.002}>
              <ringGeometry args={[.047, .051, 48]} />
              <meshBasicMaterial color="#b77b19" side={DoubleSide} depthTest depthWrite={false} toneMapped={false} />
            </mesh>
            <mesh position-z={.002}>
              <ringGeometry args={[.06, .064, 48]} />
              <meshBasicMaterial ref={pulse} color="#b77b19" side={DoubleSide} transparent opacity={.24} depthTest depthWrite={false} toneMapped={false} />
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
          dpr={typeof window !== "undefined" && window.innerWidth < 768 ? [1, 1.1] : [1, 1.35]}
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
