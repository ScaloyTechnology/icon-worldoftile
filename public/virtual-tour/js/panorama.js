import * as THREE from "three";

export class PanoramaViewer {
  constructor(container) {
    this.container = container;
    this.textureCache = new Map();
    this.activeIndex = 0;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.1, 220);
    this.camera.position.set(0, 0, 0.01);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x11110f, 1);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.container.appendChild(this.renderer.domElement);

    // One shared, inward-facing sphere is duplicated only for transition blends.
    this.geometry = new THREE.SphereGeometry(100, 64, 40);
    this.geometry.scale(-1, 1, 1);
    this.materials = [0, 1].map(() => new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    }));
    this.meshes = this.materials.map((material) => new THREE.Mesh(this.geometry, material));
    this.meshes[0].renderOrder = 0;
    this.meshes[1].renderOrder = 1;
    this.scene.add(...this.meshes);

    this.resize = this.resize.bind(this);
    window.addEventListener("resize", this.resize, { passive: true });
    this.resize();
  }

  loadTexture(url, onProgress) {
    if (this.textureCache.has(url)) return this.textureCache.get(url);

    const promise = new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          // Longitude is continuous: filter across the left/right texture join.
          // Latitude stays clamped so the ceiling never wraps into the floor.
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
          texture.generateMipmaps = true;
          texture.needsUpdate = true;
          onProgress?.(1);
          resolve(texture);
        },
        (event) => {
          if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
        },
        (error) => {
          this.textureCache.delete(url);
          reject(error);
        },
      );
    });

    this.textureCache.set(url, promise);
    return promise;
  }

  async preload(url) {
    try {
      await this.loadTexture(url);
    } catch (error) {
      console.warn(`Unable to preload panorama: ${url}`, error);
    }
  }

  releaseUnusedTextures(keepUrls) {
    for (const [url, promise] of this.textureCache) {
      if (keepUrls.has(url)) continue;
      this.textureCache.delete(url);
      promise.then((texture) => {
        if (!this.materials.some((material) => material.map === texture)) {
          texture.dispose();
        }
      }).catch(() => {});
    }
  }

  setInitialTexture(texture) {
    const material = this.materials[this.activeIndex];
    material.map = texture;
    material.opacity = 1;
    material.needsUpdate = true;
  }

  stageTexture(texture) {
    const nextIndex = 1 - this.activeIndex;
    const nextMaterial = this.materials[nextIndex];
    nextMaterial.map = texture;
    nextMaterial.opacity = 0;
    nextMaterial.needsUpdate = true;
    this.meshes[nextIndex].renderOrder = 2;
    this.meshes[this.activeIndex].renderOrder = 1;
  }

  setBlend(progress) {
    const nextIndex = 1 - this.activeIndex;
    this.materials[nextIndex].opacity = progress;
    this.materials[this.activeIndex].opacity = 1 - progress * 0.72;
  }

  completeBlend() {
    const previousIndex = this.activeIndex;
    this.activeIndex = 1 - this.activeIndex;
    this.materials[this.activeIndex].opacity = 1;
    this.materials[previousIndex].opacity = 0;
    this.materials[previousIndex].map = null;
  }

  resize() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
