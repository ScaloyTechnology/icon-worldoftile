"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { ProductIntroTile } from "@/types/products";

type Props = Readonly<{
  tiles: readonly ProductIntroTile[];
  progress: { current: number };
  active: boolean;
  onReady?: () => void;
}>;

function ease(value: number) { return 1 - Math.pow(1 - THREE.MathUtils.clamp(value, 0, 1), 3); }

function TileStudy({ tiles, progress, onReady }: Props) {
  const group = useRef<THREE.Group>(null);
  const meshes = useRef<THREE.Mesh[]>([]);
  const { gl, viewport } = useThree();
  useEffect(() => {
    let live = true;
    const root = group.current;
    const geometry = new THREE.BoxGeometry(2.25, 3.15, 0.095, 1, 1, 1);
    const edge = new THREE.MeshPhysicalMaterial({ color: "#b5afa5", roughness: 0.8 });
    const textures: THREE.Texture[] = [];
    const faces: THREE.MeshPhysicalMaterial[] = [];
    Promise.all(tiles.slice(0, 6).map(async (tile, index) => {
      if (!tile.media.src) return null;
      const texture = await new THREE.TextureLoader().loadAsync(tile.media.src);
      if (!live) { texture.dispose(); return null; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, gl.capabilities.getMaxAnisotropy());
      texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
      textures.push(texture);
      const face = new THREE.MeshPhysicalMaterial({ map: texture, roughness: 0.58, clearcoat: 0.08, clearcoatRoughness: 0.7 });
      faces.push(face);
      const mesh = new THREE.Mesh(geometry, [edge, edge, edge, edge, face, edge]);
      mesh.position.set((index - 2.5) * 0.035, (index - 2.5) * 0.025, -index * 0.035);
      mesh.rotation.set(-0.08, 0.18, -0.025 * (index - 2.5));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root?.add(mesh);
      return mesh;
    })).then((loaded) => {
      if (!live) return;
      meshes.current = loaded.filter(Boolean) as THREE.Mesh[];
      onReady?.();
    }).catch(() => onReady?.());
    return () => {
      live = false; meshes.current = []; root?.clear();
      textures.forEach((item) => item.dispose()); faces.forEach((item) => item.dispose());
      geometry.dispose(); edge.dispose();
    };
  }, [gl, onReady, tiles]);

  useFrame(() => {
    const p = ease(progress.current);
    const gap = Math.min(viewport.width / 5.9, 2.12);
    meshes.current.forEach((mesh, index) => {
      const column = index - 2.5;
      const targetX = column * gap;
      const wave = Math.sin((index / 5) * Math.PI) * 0.32;
      mesh.position.x = THREE.MathUtils.lerp(column * 0.045, targetX, p);
      mesh.position.y = THREE.MathUtils.lerp(column * 0.025, wave - 0.14, p);
      mesh.position.z = THREE.MathUtils.lerp(-index * 0.035, Math.abs(column) * -0.08, p);
      mesh.rotation.x = THREE.MathUtils.lerp(-0.08, -0.02 + Math.abs(column) * 0.012, p);
      mesh.rotation.y = THREE.MathUtils.lerp(0.18, column * -0.035, p);
      mesh.rotation.z = THREE.MathUtils.lerp(-column * 0.025, column * 0.016, p);
      const scale = THREE.MathUtils.lerp(0.74, 0.86, p);
      mesh.scale.setScalar(scale);
    });
  });

  return <>
    <ambientLight intensity={0.8} />
    <hemisphereLight args={["#fffaf0", "#736e66", 1.25]} />
    <directionalLight position={[-4, 6, 6]} intensity={2.2} castShadow />
    <directionalLight position={[5, 1, 2]} intensity={0.75} color="#dbe5ea" />
    <group ref={group} dispose={null} />
  </>;
}

export default function ProductsIntroStage(props: Props) {
  return <div className="products-intro__webgl" aria-hidden="true">
    <Canvas
      camera={{ position: [0, 0, 10], fov: 34 }}
      dpr={[1, 1.5]}
      frameloop={props.active ? "always" : "never"}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1; }}
    >
      <TileStudy {...props} />
    </Canvas>
  </div>;
}
