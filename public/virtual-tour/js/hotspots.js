import * as THREE from "three";

const DEG = Math.PI / 180;

/** Convert room-authored spherical coordinates into a point on the panorama. */
function sphericalPosition(yaw, pitch, radius = 82) {
  const yawRad = yaw * DEG;
  const pitchRad = pitch * DEG;
  const cosPitch = Math.cos(pitchRad);
  return new THREE.Vector3(
    Math.sin(yawRad) * cosPitch * radius,
    Math.sin(pitchRad) * radius,
    -Math.cos(yawRad) * cosPitch * radius,
  );
}

export class HotspotManager {
  constructor(container, camera, { onRoom, onProduct, onInfo, onHover }) {
    this.container = container;
    this.camera = camera;
    this.handlers = { onRoom, onProduct, onInfo, onHover };
    this.items = [];
    this.visible = true;
  }

  setRoom(room) {
    this.container.replaceChildren();
    this.items = room.hotspots.map((config) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `hotspot hotspot--${config.type}`;
      button.setAttribute("aria-label", `${this.typeLabel(config.type)}: ${config.label}`);
      const marker = config.type === "room"
        ? '<span class="hotspot__arrow" aria-hidden="true">→</span>'
        : '<span class="hotspot__dot" aria-hidden="true"></span>';
      button.innerHTML = `
        <span class="hotspot__ring" aria-hidden="true">${marker}</span>
        <span class="hotspot__copy">
          <span class="hotspot__type">${this.typeLabel(config.type)}</span>
          <span class="hotspot__label">${config.label}</span>
        </span>
      `;

      button.addEventListener("click", () => this.activate(config, button));
      button.addEventListener("pointerenter", () => this.handlers.onHover?.(config.type));
      button.addEventListener("pointerleave", () => this.handlers.onHover?.(null));
      this.container.appendChild(button);

      return { config, button, position: sphericalPosition(config.yaw, config.pitch) };
    });
  }

  typeLabel(type) {
    return { room: "Enter", product: "Explore", info: "Discover" }[type] || "View";
  }

  activate(config, button) {
    if (config.type === "room") this.handlers.onRoom?.(config.targetRoom, config);
    if (config.type === "product") this.handlers.onProduct?.(config.productId, button);
    if (config.type === "info") this.handlers.onInfo?.(config, button);
  }

  setVisible(visible) {
    this.visible = visible;
    this.container.style.opacity = visible ? "1" : "0";
    // The layer itself stays click-through so panorama dragging still works;
    // each hotspot button opts back into pointer events through CSS.
    this.container.style.visibility = visible ? "visible" : "hidden";
  }

  update() {
    if (!this.visible) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);

    for (const item of this.items) {
      const direction = item.position.clone().normalize();
      const inFront = direction.dot(cameraDirection) > 0.08;
      const projected = item.position.clone().project(this.camera);
      const insideFrustum = projected.z > -1 && projected.z < 1 && Math.abs(projected.x) < 1.12 && Math.abs(projected.y) < 1.12;
      const isVisible = inFront && insideFrustum;

      item.button.hidden = !isVisible;
      if (isVisible) {
        item.button.style.left = `${(projected.x * 0.5 + 0.5) * width}px`;
        item.button.style.top = `${(-projected.y * 0.5 + 0.5) * height}px`;
      }
    }
  }
}
