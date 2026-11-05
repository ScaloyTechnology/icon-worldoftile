import * as THREE from "three";

const DEG = Math.PI / 180;
const clamp = THREE.MathUtils.clamp;

export class PanoramaControls extends EventTarget {
  constructor(camera, element, initial = {}) {
    super();
    this.camera = camera;
    this.element = element;
    this.enabled = true;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    this.currentYaw = (initial.yaw ?? 0) * DEG;
    this.targetYaw = this.currentYaw;
    this.currentPitch = (initial.pitch ?? 0) * DEG;
    this.targetPitch = this.currentPitch;
    this.currentFov = initial.fov ?? 68;
    this.targetFov = this.currentFov;

    this.minFov = 32;
    this.maxFov = 88;
    this.minPitch = -82 * DEG;
    this.maxPitch = 82 * DEG;
    this.pointers = new Map();
    this.lastPointer = null;
    this.lastPinchDistance = 0;
    this.dragging = false;
    this.wheelEndTimer = 0;

    this.bindEvents();
    this.applyCamera();
  }

  bindEvents() {
    this.element.addEventListener("pointerdown", (event) => this.onPointerDown(event));
    this.element.addEventListener("pointermove", (event) => this.onPointerMove(event));
    this.element.addEventListener("pointerup", (event) => this.onPointerUp(event));
    this.element.addEventListener("pointercancel", (event) => this.onPointerUp(event));
    this.element.addEventListener("wheel", (event) => this.onWheel(event), { passive: false });
    this.element.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  onPointerDown(event) {
    if (!this.enabled || (event.pointerType === "mouse" && event.button !== 0)) return;
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    this.element.setPointerCapture?.(event.pointerId);
    this.lastPointer = { x: event.clientX, y: event.clientY };
    this.dragging = true;
    this.element.parentElement.classList.add("is-dragging");
    this.dispatchEvent(new CustomEvent("interactionstart"));

    if (this.pointers.size === 2) this.lastPinchDistance = this.getPinchDistance();
  }

  onPointerMove(event) {
    if (!this.enabled || !this.pointers.has(event.pointerId)) return;
    const previous = this.pointers.get(event.pointerId);
    this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (this.pointers.size === 1) {
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      const scale = event.pointerType === "touch" ? 0.0042 : 0.00325;
      this.targetYaw -= dx * scale;
      this.targetPitch = clamp(this.targetPitch + dy * scale, this.minPitch, this.maxPitch);
    } else if (this.pointers.size === 2) {
      const distance = this.getPinchDistance();
      if (this.lastPinchDistance > 0) {
        this.targetFov = clamp(
          this.targetFov - (distance - this.lastPinchDistance) * 0.075,
          this.minFov,
          this.maxFov,
        );
      }
      this.lastPinchDistance = distance;
    }
  }

  onPointerUp(event) {
    if (!this.pointers.has(event.pointerId)) return;
    this.pointers.delete(event.pointerId);
    if (this.pointers.size < 2) this.lastPinchDistance = 0;
    if (this.pointers.size === 0) {
      this.dragging = false;
      this.lastPointer = null;
      this.element.parentElement.classList.remove("is-dragging");
      this.dispatchEvent(new CustomEvent("interactionend"));
    }
  }

  onWheel(event) {
    if (!this.enabled) return;
    event.preventDefault();
    const normalizedDelta = Math.sign(event.deltaY) * Math.min(Math.abs(event.deltaY), 100);
    this.targetFov = clamp(this.targetFov + normalizedDelta * 0.045, this.minFov, this.maxFov);
    this.dispatchEvent(new CustomEvent("interactionstart"));
    window.clearTimeout(this.wheelEndTimer);
    this.wheelEndTimer = window.setTimeout(() => {
      this.dispatchEvent(new CustomEvent("interactionend"));
    }, 140);
  }

  getPinchDistance() {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.pointers.clear();
      this.dragging = false;
      this.element.parentElement.classList.remove("is-dragging");
    }
  }

  setTarget({ yaw, pitch, fov }) {
    if (typeof yaw === "number") this.targetYaw = yaw * DEG;
    if (typeof pitch === "number") this.targetPitch = clamp(pitch * DEG, this.minPitch, this.maxPitch);
    if (typeof fov === "number") this.targetFov = clamp(fov, this.minFov, this.maxFov);
  }

  setInstant({ yaw, pitch, fov }) {
    this.setTarget({ yaw, pitch, fov });
    this.currentYaw = this.targetYaw;
    this.currentPitch = this.targetPitch;
    this.currentFov = this.targetFov;
    this.applyCamera();
  }

  getState() {
    return {
      yaw: this.targetYaw / DEG,
      pitch: this.targetPitch / DEG,
      fov: this.targetFov,
    };
  }

  update() {
    const rotationDamping = this.reducedMotion ? 1 : 0.085;
    const zoomDamping = this.reducedMotion ? 1 : 0.095;
    this.currentYaw += (this.targetYaw - this.currentYaw) * rotationDamping;
    this.currentPitch += (this.targetPitch - this.currentPitch) * rotationDamping;
    this.currentFov += (this.targetFov - this.currentFov) * zoomDamping;
    this.applyCamera();
  }

  applyCamera() {
    const cosPitch = Math.cos(this.currentPitch);
    const direction = new THREE.Vector3(
      Math.sin(this.currentYaw) * cosPitch,
      Math.sin(this.currentPitch),
      -Math.cos(this.currentYaw) * cosPitch,
    );
    this.camera.lookAt(direction);
    if (Math.abs(this.camera.fov - this.currentFov) > 0.005) {
      this.camera.fov = this.currentFov;
      this.camera.updateProjectionMatrix();
    }
  }
}
