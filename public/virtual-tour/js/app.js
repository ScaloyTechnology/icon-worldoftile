import { PanoramaViewer } from "./panorama.js";
import { PanoramaControls } from "./controls.js";
import { HotspotManager } from "./hotspots.js";
import { ProductPanel } from "./products.js";
import { rooms, roomOrder, initialRoomId, getAdjacentRoomIds } from "./rooms.js";
import { RoomTransitionController } from "./transitions.js";
import { collectionStories } from "./collection-stories.js";

const dom = {
  root: document.querySelector("#virtual-tour"),
  viewer: document.querySelector("#viewer"),
  hotspots: document.querySelector("#hotspots"),
  veil: document.querySelector("#transition-veil"),
  roomList: document.querySelector("#room-list"),
  roomIndex: document.querySelector("#room-index"),
  roomTitle: document.querySelector("#room-title"),
  roomContext: document.querySelector("#room-context"),
  lobbyReturn: document.querySelector("#back-to-lobby"),
  exitTour: document.querySelector("#exit-tour"),
  lobbyHome: document.querySelector("#lobby-home"),
  collectionNotes: document.querySelector("#collection-notes"),
  collectionNotesToggle: document.querySelector("#collection-notes-toggle"),
  collectionNotesClose: document.querySelector("#collection-notes-close"),
  collectionNotesTitle: document.querySelector("#collection-notes-title"),
  collectionNotesDescription: document.querySelector("#collection-notes-description"),
  collectionNotesSpecs: document.querySelector("#collection-notes-specs"),
  loader: document.querySelector("#loader"),
  loaderStatus: document.querySelector("#loader-status"),
  loaderPercent: document.querySelector("#loader-percent"),
  loaderProgress: document.querySelector("#loader-progress"),
  exploreHint: document.querySelector("#explore-hint"),
  fullscreen: document.querySelector("#fullscreen-button"),
  fallback: document.querySelector("#fallback"),
  cursor: document.querySelector("#custom-cursor"),
  cursorLabel: document.querySelector("#cursor-label"),
};

const requestedRoom = new URLSearchParams(window.location.search).get("room");
const initialRoom = rooms[requestedRoom]?.panorama && !rooms[requestedRoom].pending
  ? rooms[requestedRoom]
  : rooms[initialRoomId];
dom.exitTour.hidden = window.parent === window;
let viewer;
let controls;
let hotspots;
let transitionController;
let currentRoomId = initialRoom.id;
let hintTimer;

function setCollectionNotesOpen(open) {
  dom.collectionNotes.hidden = !open;
  dom.collectionNotesToggle.setAttribute("aria-expanded", String(open));
  dom.collectionNotesToggle.textContent = open ? "Hide details" : "Collection details";
}

function setLoadingProgress(value) {
  const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
  dom.loaderPercent.textContent = `${percent}%`;
  dom.loaderProgress.style.width = `${percent}%`;
}

function buildRoomNavigation() {
  const fragment = document.createDocumentFragment();
  for (const roomId of roomOrder) {
    const room = rooms[roomId];
    const unavailable = Boolean(room.pending || !room.panorama);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "room-button";
    button.dataset.roomId = room.id;
    button.disabled = unavailable;
    button.setAttribute("aria-label", unavailable ? `${room.name} (coming soon)` : `Go to ${room.name}`);
    button.innerHTML = `
      <span class="room-button__index">${room.index}</span>
      <span class="room-button__name">${room.shortName || room.name}</span>
    `;
    button.addEventListener("click", () => {
      if (room.id !== currentRoomId) transitionController.goTo(room.id);
    });
    if (!unavailable) {
      button.addEventListener("pointerenter", () => setCursorHotspot("room"));
      button.addEventListener("pointerleave", () => setCursorHotspot(null));
    }
    fragment.appendChild(button);
  }
  dom.roomList.appendChild(fragment);
  const navigation = dom.roomList.parentElement;
  navigation.addEventListener("wheel", (event) => {
    if (navigation.scrollWidth <= navigation.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    navigation.scrollLeft += event.deltaY;
    event.preventDefault();
  }, { passive: false });
}

function updateRoomUI(room) {
  currentRoomId = room.id;
  if (window.parent !== window) {
    window.parent.postMessage({ type: "icon-360:room-change", roomId: room.id }, window.location.origin);
  }
  dom.roomIndex.textContent = room.index;
  dom.roomTitle.textContent = room.name;
  const isLobby = room.id === "lobby";
  dom.root.classList.toggle("is-lobby", isLobby);
  dom.roomContext.textContent = isLobby ? "Explore the collections" : "Current space";
  dom.lobbyReturn.hidden = isLobby;
  const collectionId = room.navId || room.id;
  const story = collectionStories[collectionId];
  dom.collectionNotesToggle.hidden = !story;
  if (story) {
    dom.collectionNotesTitle.textContent = rooms[collectionId].name;
    dom.collectionNotesDescription.textContent = story.description;
    dom.collectionNotesSpecs.textContent = `${story.dimensions}  ·  ${story.finish}`;
  }
  setCollectionNotesOpen(Boolean(story));
  hotspots.setRoom(room);

  const activeNavId = room.navId || room.id;
  let activeButton = null;
  for (const button of dom.roomList.querySelectorAll(".room-button")) {
    const active = button.dataset.roomId === activeNavId;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-current", active ? "page" : "false");
    if (active) activeButton = button;
  }
  const navigation = dom.roomList.parentElement;
  if (activeButton && navigation.scrollWidth > navigation.clientWidth) {
    const buttonLeft = activeButton.getBoundingClientRect().left
      - navigation.getBoundingClientRect().left + navigation.scrollLeft;
    navigation.scrollTo({
      left: buttonLeft + activeButton.offsetWidth / 2 - navigation.clientWidth / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }

  // Keep the current scene, the return route, and one next view warm. Large
  // desktop textures stay sharp without retaining every camera in GPU memory.
  const preloadIds = getAdjacentRoomIds(room.id)
    .filter((id) => id !== "lobby")
    .slice(0, 1);
  viewer.releaseUnusedTextures(new Set([
    room.panorama,
    rooms.lobby.panorama,
    ...preloadIds.map((id) => rooms[id].panorama),
  ]));
  for (const adjacentId of preloadIds) {
    viewer.preload(rooms[adjacentId].panorama);
  }
}

function showInfo(config, trigger) {
  let notice = document.querySelector("#info-notice");
  if (!notice) {
    notice = document.createElement("div");
    notice.id = "info-notice";
    notice.className = "info-notice";
    notice.setAttribute("role", "status");
    dom.root.appendChild(notice);
  }
  notice.textContent = config.message;
  notice.classList.add("is-visible");
  window.setTimeout(() => notice.classList.remove("is-visible"), 3200);
  trigger?.blur();
}

function setupCursor() {
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  if (!finePointer.matches) return;

  window.addEventListener("pointermove", (event) => {
    dom.cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px) translate(-50%, -50%)`;
    dom.cursor.classList.add("is-visible");
  }, { passive: true });
  document.documentElement.addEventListener("mouseleave", () => dom.cursor.classList.remove("is-visible"));

  controls.addEventListener("interactionstart", () => {
    dom.cursor.classList.add("is-active");
    dom.cursorLabel.textContent = "Move";
    dismissHint();
  });
  controls.addEventListener("interactionend", () => {
    dom.cursor.classList.remove("is-active");
    dom.cursorLabel.textContent = "Drag";
  });
}

function setCursorHotspot(type) {
  const labels = { room: "Enter", product: "Explore", info: "View" };
  dom.cursor.classList.toggle("is-hotspot", Boolean(type));
  dom.cursorLabel.textContent = type ? labels[type] : "Drag";
}

function dismissHint() {
  window.clearTimeout(hintTimer);
  dom.exploreHint.classList.add("is-dismissed");
}

function setupFullscreen() {
  const updateState = () => {
    const active = Boolean(document.fullscreenElement);
    dom.fullscreen.setAttribute("aria-label", active ? "Exit fullscreen" : "Enter fullscreen");
  };
  dom.fullscreen.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await dom.root.requestFullscreen();
    } catch (error) {
      console.warn("Fullscreen request was not available", error);
    }
  });
  document.addEventListener("fullscreenchange", updateState);
}

async function initialize() {
  try {
    viewer = new PanoramaViewer(dom.viewer);
  } catch (error) {
    console.error("WebGL could not be initialized", error);
    dom.loader.hidden = true;
    dom.fallback.hidden = false;
    return;
  }

  // A 4K-wide equirectangular image has too few pixels for readable wall text
  // on a desktop viewport. Use the 8K copies only where the GPU can hold them.
  const deviceMemory = navigator.deviceMemory;
  const useHighRes = window.innerWidth >= 1200
    && viewer.renderer.capabilities.maxTextureSize >= 8192
    && (deviceMemory === undefined || deviceMemory >= 4);
  if (useHighRes) {
    for (const room of Object.values(rooms)) {
      if (room.panorama && room.panoramaHighRes) room.panorama = room.panoramaHighRes;
    }
  }

  controls = new PanoramaControls(viewer.camera, viewer.renderer.domElement, {
    yaw: initialRoom.initialYaw - 5,
    pitch: initialRoom.initialPitch,
    fov: initialRoom.initialFov + 3,
  });

  const productPanel = new ProductPanel({
    panel: document.querySelector("#product-panel"),
    onOpen: () => {
      setCollectionNotesOpen(false);
      controls.setEnabled(false);
      controls.setTarget({ fov: Math.max(42, controls.getState().fov - 5) });
      hotspots.setVisible(false);
      dom.veil.style.opacity = "0.22";
      dismissHint();
    },
    onClose: () => {
      controls.setEnabled(true);
      hotspots.setVisible(true);
      dom.veil.style.opacity = "0";
    },
  });

  hotspots = new HotspotManager(dom.hotspots, viewer.camera, {
    onRoom: (targetRoom, config) => transitionController.goTo(targetRoom, config),
    onProduct: (productId, trigger) => productPanel.open(productId, trigger),
    onInfo: showInfo,
    onHover: setCursorHotspot,
  });

  transitionController = new RoomTransitionController({
    viewer,
    controls,
    hotspots,
    veil: dom.veil,
    rooms,
    onRoomChange: updateRoomUI,
  });
  transitionController.currentRoomId = initialRoom.id;
  transitionController.currentPanorama = initialRoom.panorama;

  // Browser Back/Forward in the host page navigates the existing viewer rather
  // than reloading the WebGL canvas and interrupting the approved transition.
  const navigateFromHost = (roomId) => {
    if (!rooms[roomId]?.panorama || rooms[roomId].pending || roomId === currentRoomId) return;
    if (transitionController.inProgress) {
      window.setTimeout(() => navigateFromHost(roomId), 100);
      return;
    }
    productPanel.close();
    dismissHint();
    transitionController.goTo(roomId);
  };
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data?.type === "icon-360:navigate") navigateFromHost(event.data.roomId);
  });

  const returnToLobby = (event) => {
    event.preventDefault();
    if (currentRoomId === "lobby" || transitionController.inProgress) return;
    productPanel.close();
    dismissHint();
    transitionController.goTo("lobby");
  };
  dom.lobbyReturn.addEventListener("click", returnToLobby);
  dom.lobbyHome.addEventListener("click", returnToLobby);
  dom.collectionNotesToggle.addEventListener("click", () => {
    setCollectionNotesOpen(dom.collectionNotes.hidden);
  });
  dom.collectionNotesClose.addEventListener("click", () => {
    setCollectionNotesOpen(false);
    dom.collectionNotesToggle.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dom.collectionNotes.hidden) setCollectionNotesOpen(false);
  });

  buildRoomNavigation();
  setupFullscreen();
  setupCursor();

  const render = () => {
    controls.update();
    hotspots.update();
    viewer.render();
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);

  setLoadingProgress(0.04);
  try {
    const texture = await viewer.loadTexture(initialRoom.panorama, (progress) => {
      setLoadingProgress(Math.max(0.04, progress));
    });
    viewer.setInitialTexture(texture);
    updateRoomUI(initialRoom);
    setLoadingProgress(1);
    dom.loaderStatus.firstChild.textContent = "Ready ";

    window.setTimeout(() => {
      dom.loader.classList.add("is-complete");
      dom.viewer.classList.add("is-ready");
      dom.root.classList.add("is-ui-ready");
      controls.setTarget({
        yaw: initialRoom.initialYaw,
        pitch: initialRoom.initialPitch,
        fov: initialRoom.initialFov,
      });
      hintTimer = window.setTimeout(dismissHint, 4200);
    }, 360);
  } catch (error) {
    console.error("The initial panorama failed to load", error);
    dom.loaderStatus.textContent = "Unable to load the panorama";
    dom.loaderProgress.style.width = "100%";
  }
}

initialize();
