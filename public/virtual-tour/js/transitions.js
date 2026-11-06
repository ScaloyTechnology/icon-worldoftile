const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function shortestAngleDelta(from, to) {
  return ((to - from + 540) % 360) - 180;
}

function lerp(from, to, progress) {
  return from + (to - from) * progress;
}

export function animate(duration, onFrame) {
  if (prefersReducedMotion || duration <= 0) {
    onFrame(1);
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const start = performance.now();
    const frame = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      onFrame(easeInOutCubic(progress));
      if (progress < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}

export class RoomTransitionController {
  constructor({ viewer, controls, hotspots, veil, rooms, onRoomChange }) {
    this.viewer = viewer;
    this.controls = controls;
    this.hotspots = hotspots;
    this.veil = veil;
    this.rooms = rooms;
    this.onRoomChange = onRoomChange;
    this.inProgress = false;
  }

  async goTo(roomId, sourceHotspot) {
    if (this.inProgress || roomId === this.currentRoomId) return;
    const room = this.rooms[roomId];
    if (!room || room.pending || !room.panorama) return;

    // Returning to a hub faces the display used to enter the previous view.
    const previousCollectionId = this.rooms[this.currentRoomId]?.navId || this.currentRoomId;
    const returnPortal = room.hotspots.find((hotspot) =>
      hotspot.targetRoom === this.currentRoomId || hotspot.targetRoom === previousCollectionId);
    // Interior views open on their authored focal point, keeping the
    // scene-anchored collection return in the center on arrival.
    const arrivalYaw = room.navId ? room.initialYaw : (returnPortal?.yaw ?? room.initialYaw);

    this.inProgress = true;
    this.controls.setEnabled(false);
    this.hotspots.setVisible(false);

    const state = this.controls.getState();
    const sharesPanorama = room.panorama === this.currentPanorama;

    // Different authored views within one panorama can travel by panning the
    // camera along the shortest arc without reloading the same image.
    if (sharesPanorama) {
      const yawDelta = shortestAngleDelta(state.yaw, room.initialYaw);
      try {
        await animate(1050, (progress) => {
          // Pull away from the current view, then move into the next one.
          const travelZoom = prefersReducedMotion ? 0 : Math.sin(progress * Math.PI) * 13;
          this.controls.setInstant({
            yaw: state.yaw + yawDelta * progress,
            pitch: lerp(state.pitch, room.initialPitch, progress),
            fov: lerp(state.fov, room.initialFov, progress) + travelZoom,
          });
          this.veil.style.opacity = String(Math.sin(progress * Math.PI) * 0.12);
        });
        this.currentRoomId = room.id;
        this.onRoomChange(room);
      } finally {
        this.veil.style.opacity = "0";
        this.hotspots.setVisible(true);
        this.controls.setEnabled(true);
        this.inProgress = false;
      }
      return;
    }

    try {
      const departureYaw = sourceHotspot?.yaw ?? state.yaw;
      const departurePitch = sourceHotspot?.pitch ?? state.pitch;
      const yawDelta = shortestAngleDelta(state.yaw, departureYaw);
      const departureFov = Math.min(this.controls.maxFov, state.fov + 16);
      const arrivalFov = Math.min(this.controls.maxFov, room.initialFov + 16);

      // Attach the error handler immediately, including when a visitor picks
      // a new collection before its background preload has finished.
      const [loadedTexture] = await Promise.allSettled([
        this.viewer.loadRoomTexture(room),
        animate(560, (progress) => {
          if (prefersReducedMotion) return;
          this.controls.setInstant({
            yaw: state.yaw + yawDelta * progress,
            pitch: lerp(state.pitch, departurePitch, progress),
            fov: lerp(state.fov, departureFov, progress),
          });
          this.veil.style.opacity = String(progress * 0.58);
        }),
      ]);
      // Let the fade finish before restoring the veil on a failed download.
      if (loadedTexture.status === "rejected") throw loadedTexture.reason;
      const texture = loadedTexture.value;
      this.viewer.stageTexture(texture);
      this.controls.setInstant({
        yaw: arrivalYaw - (prefersReducedMotion ? 0 : 4),
        pitch: room.initialPitch,
        fov: prefersReducedMotion ? room.initialFov : arrivalFov,
      });

      await animate(920, (progress) => {
        this.viewer.setBlend(progress);
        this.controls.setInstant({
          yaw: arrivalYaw - (prefersReducedMotion ? 0 : 4 * (1 - progress)),
          pitch: room.initialPitch,
          fov: lerp(prefersReducedMotion ? room.initialFov : arrivalFov, room.initialFov, progress),
        });
        this.veil.style.opacity = String(0.58 * (1 - progress));
      });

      this.viewer.completeBlend();
      this.currentRoomId = room.id;
      this.currentPanorama = room.panorama;
      this.onRoomChange(room);
      this.controls.setTarget({
        yaw: arrivalYaw,
        pitch: room.initialPitch,
        fov: room.initialFov,
      });
    } catch (error) {
      console.error("Room transition failed", error);
      this.controls.setInstant(state);
      this.veil.style.opacity = "0";
    } finally {
      this.hotspots.setVisible(true);
      this.controls.setEnabled(true);
      this.inProgress = false;
    }
  }
}
