"use client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { getMaterialSettingsForFinish, getTileProportions } from "@/lib/products/material-settings";
import { heroTilePose, smooth, wallSlots } from "@/lib/animation/material-choreography";
import type { HomepageHeroProduct, HomepageWallTile } from "@/lib/products/homepage-types";

type Props = {
  progress: { current: number };
  hero: HomepageHeroProduct;
  wallTiles: HomepageWallTile[];
  active: boolean;
  onState: (state: "loading" | "ready" | "fallback") => void;
};
type Slab = { mesh: THREE.Mesh; proportions: ReturnType<typeof getTileProportions> };

function TileScene({ progress, hero, wallTiles, onState }: Props) {
  const root = useRef<THREE.Group>(null);
  const key = useRef<THREE.DirectionalLight>(null);
  const resources = useRef<{ hero: Slab; panels: Slab[] } | null>(null);
  const { gl } = useThree();
  useEffect(() => {
    let live = true;
    const group = root.current;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const edge = new THREE.MeshStandardMaterial({ color: "#aaa297", roughness: 0.84, metalness: 0 });
    const textures: THREE.Texture[] = [];
    const faces: THREE.Material[] = [];
    const cache = new Map<string, Promise<THREE.Texture>>();
    const load = (url: string) => {
      if (!cache.has(url)) cache.set(url, new THREE.TextureLoader().loadAsync(url).then(texture => {
        if (!live) { texture.dispose(); throw new Error("Scene disposed"); }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
        texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
        textures.push(texture);
        return texture;
      }));
      return cache.get(url)!;
    };
    async function makeSlab(product: HomepageWallTile | HomepageHeroProduct): Promise<Slab> {
      const texture = await load(product.texture.url);
      const aspect = (product.texture.width ?? 2) / (product.texture.height ?? 1);
      const proportions = getTileProportions(product.widthMm, product.heightMm, product.thicknessMm, aspect);
      // Central cover crop if a preview photo differs from physical dimensions; never stretch UVs.
      const map = texture.clone();
      map.needsUpdate = true;
      const targetAspect = proportions.width / proportions.height;
      const rotatePrint = (aspect >= 1) !== (targetAspect >= 1);
      const printAspect = rotatePrint ? 1 / aspect : aspect;
      const cropX = Math.min(1, targetAspect / printAspect);
      const cropY = Math.min(1, printAspect / targetAspect);
      map.center.set(0.5, 0.5);
      map.rotation = rotatePrint ? Math.PI / 2 : 0;
      // Three applies repeat in source-image axes, so swap axes for a quarter turn.
      map.repeat.set(rotatePrint ? cropY : cropX, rotatePrint ? cropX : cropY);
      textures.push(map);
      const face = new THREE.MeshPhysicalMaterial({ map, color: "#ffffff", ...getMaterialSettingsForFinish(product.finish), transparent: false, opacity: 1, depthWrite: true, metalness: 0 });
      faces.push(face);
      // Right/left/top/bottom/front/back. No alpha map, clipping, stencil or transparent depth faces.
      const mesh = new THREE.Mesh(geometry, [edge, edge, edge, edge, face, edge]);
      mesh.visible = false;
      return { mesh, proportions };
    }
    onState("loading");
    Promise.all([makeSlab(hero), Promise.all(wallTiles.slice(0, 6).map(makeSlab))]).then(([single, panels]) => {
      if (!live) return;
      resources.current = { hero: single, panels };
      group?.add(single.mesh, ...panels.map(panel => panel.mesh));
      onState("ready");
    }).catch(() => { if (live) onState("fallback"); });
    const lost = (event: Event) => { event.preventDefault(); onState("fallback"); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    return () => {
      live = false;
      gl.domElement.removeEventListener("webglcontextlost", lost);
      group?.clear(); resources.current = null;
      textures.forEach(texture => texture.dispose());
      faces.forEach(material => material.dispose());
      geometry.dispose(); edge.dispose();
    };
  }, [gl, hero, wallTiles, onState]);

  useFrame(({ viewport, size }) => {
    const data = resources.current;
    if (!data) return;
    const p = progress.current;
    const single = data.hero;
    const aspect = single.proportions.width / single.proportions.height;
    const pose = heroTilePose(p, size.width, size.height, aspect);
    const unit = viewport.width / size.width;
    const perspective = (8 - pose.z) / 8;
    const opening = smooth(p, 0.84, 0.995);
    const studyAssembly = smooth(p, 0.62, 0.79);
    const wallUnit = Math.min(viewport.width * 0.205, viewport.height * 0.255);
    const gap = wallUnit * 0.016;
    single.mesh.visible = p >= 0.47 && p < 0.73;
    single.mesh.position.set(pose.x * unit, -pose.y * unit, pose.z);
    single.mesh.rotation.set(pose.rotateX, pose.rotateY, 0);
    const scale = pose.width * unit * pose.scale * perspective / single.proportions.width;
    const retreat = 1 - smooth(p, 0.64, 0.73);
    single.mesh.scale.set(single.proportions.width * scale * retreat, single.proportions.height * scale * retreat, single.proportions.depth * scale * retreat);
    data.panels.forEach((panel, index) => {
      const slot = wallSlots[index];
      if (!slot) return;
      const enter = smooth(p, 0.65 + index * 0.008, 0.79 + index * 0.007);
      const studyEnter = index < 2 ? smooth(p, 0.485 + index * 0.025, 0.56 + index * 0.025) : enter;
      panel.mesh.visible = p >= (index < 2 ? 0.47 : 0.64) && p < 1;
      const rotate = (slot.h > slot.w) === (panel.proportions.width >= panel.proportions.height);
      const pw = rotate ? panel.proportions.height : panel.proportions.width;
      const ph = rotate ? panel.proportions.width : panel.proportions.height;
      const fit = Math.min((slot.w * wallUnit - gap) / pw, (slot.h * wallUnit - gap) / ph);
      const wallX = (slot.x + slot.w / 2 - 2) * wallUnit + slot.side * opening * viewport.width * 0.68;
      const wallY = (1.5 - slot.y - slot.h / 2) * wallUnit + (1 - enter) * 0.12;
      const wallZ = (1 - enter) * -0.65 + opening * (0.35 + index * 0.025);
      const studyX = (index === 0 ? -1 : 1) * Math.min(viewport.width * 0.31, 3.15);
      const studyY = index === 0 ? 0.18 : -0.12;
      const studyFit = Math.min(viewport.width * 0.17 / pw, viewport.height * 0.42 / ph);
      const transition = index < 2 ? studyAssembly : 1;
      const visibility = index < 2 ? studyEnter : enter;
      const panelFit = THREE.MathUtils.lerp(studyFit, fit, transition) * visibility;
      panel.mesh.position.set(
        THREE.MathUtils.lerp(studyX, wallX, transition),
        THREE.MathUtils.lerp(studyY, wallY, transition),
        THREE.MathUtils.lerp(-0.12 - index * 0.04, wallZ, transition),
      );
      panel.mesh.rotation.set(
        THREE.MathUtils.lerp(-0.035, 0, transition),
        THREE.MathUtils.lerp(index === 0 ? 0.12 : -0.12, slot.side * opening * 0.045, transition),
        THREE.MathUtils.lerp(index === 0 ? -0.025 : 0.025, rotate ? Math.PI / 2 : 0, transition),
      );
      panel.mesh.scale.set(panel.proportions.width * panelFit, panel.proportions.height * panelFit, panel.proportions.depth * panelFit);
    });
    if (key.current) key.current.position.set(-3 + smooth(p, 0.5, 0.68) * 7, 4, 5);
  });
  return <>
    <ambientLight intensity={0.65} />
    <hemisphereLight args={["#fffaf1", "#706b64", 1.0]} />
    <directionalLight ref={key} intensity={2.0} color="#fff5e4" position={[-3, 4, 5]} />
    <directionalLight intensity={0.7} color="#e4eaf0" position={[-4, 0, 2]} />
    <directionalLight intensity={1.1} color="#fff9ed" position={[3, 2, -2]} />
    <group ref={root} dispose={null} />
  </>;
}
export default function HeroTileStage(props: Props) {
  return <div className="hero-webgl-canvas" aria-hidden="true">
    <Canvas dpr={[1, 1.25]} frameloop={props.active ? "always" : "never"} camera={{ position: [0, 0, 8], fov: 30 }} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }} onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 0.95; }}>
      <TileScene {...props} />
    </Canvas>
  </div>;
}
