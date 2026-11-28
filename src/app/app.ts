import { createStarterAgents } from "../core/agents";
import { stepWorld } from "../core/simulation";
import { FixedStepClock } from "./fixed-step-clock";
import { CanvasWorldRenderer, resizeCanvas } from "../render/canvas-renderer";
import { AgentMotionAnimator } from "../render/motion";
import { drawMiniMap, miniMapToWorld } from "../render/minimap";
import {
  createCamera,
  setCameraCenter,
  zoomCamera
} from "../render/camera";
import { getTileCenter, screenToWorld } from "../render/geometry";
import { attachMapInput, findAgentAtWorldPoint } from "../ui/map-input";
import type { MapDragRect } from "../ui/map-input";
import { createAppShell } from "../ui/app-shell";
import { updateHud } from "../ui/hud";
import { renderAgentInspector } from "../ui/agent-inspector";
import { renderEventLog } from "../ui/event-log";
import { renderAgentActivity } from "../ui/agent-activity";
import { selectAgentsInWorldRect } from "../ui/selection";
import type { WorldSelectionRect } from "../ui/selection";
import { createRandomWorldSeed, createWorldSetup } from "../ui/world-setup";
import type { GridPoint, WorldState } from "../core/types";
import { createWorldSave, parseWorldSave, serializeWorldSave } from "../persistence/world-save";
import type { WorldSave } from "../persistence/world-save";
import { loadAutosave, saveAutosave } from "../persistence/indexeddb";

const WORLD_SEED = createRandomWorldSeed(0);
const SIMULATION_STEP_MS = 250;
const SPEEDS = [1, 2, 4] as const;
const OVERLAY_PREFERENCE_KEY = "gloomd-observation-overlays-v1";
const LAYER_PREFERENCE_KEY = "gloomd-map-layers-v1";

type OverlayPreferences = { routes: boolean; trails: boolean; vision: boolean; targets: boolean };

type MapLayerPreferences = {
  terrain: boolean;
  resources: boolean;
  agents: boolean;
  buildings: boolean;
  stockpile: boolean;
  resourceDensity: boolean;
  activities: boolean;
};

function loadMapLayerPreferences(): MapLayerPreferences {
  const defaults: MapLayerPreferences = {
    terrain: true,
    resources: true,
    agents: true,
    buildings: true,
    stockpile: true,
    resourceDensity: false,
    activities: false
  };
  try {
    const stored = window.localStorage.getItem(LAYER_PREFERENCE_KEY);
    if (!stored) return defaults;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return defaults;
    const value = parsed as Record<string, unknown>;
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as Array<keyof MapLayerPreferences>) {
      if (typeof value[key] === "boolean") result[key] = value[key];
    }
    return result;
  } catch {
    return defaults;
  }
}

function saveMapLayerPreferences(layers: MapLayerPreferences): void {
  try {
    window.localStorage.setItem(LAYER_PREFERENCE_KEY, JSON.stringify(layers));
  } catch {
    // Map display preferences are optional and must never block simulation.
  }
}

function loadOverlayPreferences(): OverlayPreferences {
  const defaults: OverlayPreferences = { routes: false, trails: false, vision: false, targets: false };
  try {
    const stored = window.localStorage.getItem(OVERLAY_PREFERENCE_KEY);
    if (!stored) return defaults;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object") return defaults;
    const value = parsed as Record<string, unknown>;
    return {
      routes: typeof value.routes === "boolean" ? value.routes : defaults.routes,
      trails: typeof value.trails === "boolean" ? value.trails : defaults.trails,
      vision: typeof value.vision === "boolean" ? value.vision : defaults.vision,
      targets: typeof value.targets === "boolean" ? value.targets : defaults.targets
    };
  } catch {
    return defaults;
  }
}

function saveOverlayPreferences(preferences: OverlayPreferences): void {
  try {
    window.localStorage.setItem(OVERLAY_PREFERENCE_KEY, JSON.stringify(preferences));
  } catch {
    // Overlay choices are convenience settings; storage restrictions must not stop play.
  }
}

function startWorld(
  root: HTMLElement,
  world: WorldState,
  startingPoint: GridPoint,
  onNewWorld: () => void,
  onLoadSavedWorld: (save: WorldSave) => void
): () => void {
  const shell = createAppShell(root);
  const worldApp = shell.canvas.closest<HTMLElement>(".world-app");

  const getViewport = () => ({
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight)
  });
  // A wider opening view shows more of the surrounding landscape at once.
  const initialZoom = 14;
  const camera = createCamera(world.width, world.height, initialZoom);
  setCameraCenter(camera, getTileCenter(startingPoint));
  const renderer = new CanvasWorldRenderer();
  const motion = new AgentMotionAnimator(SIMULATION_STEP_MS, 18);
  const context = shell.canvas.getContext("2d", { alpha: false });
  const minimapContext = shell.minimapCanvas.getContext("2d");

  if (!context) {
    throw new Error("GLOOMD could not create a Canvas 2D rendering context.");
  }

  let playing = true;
  let speed = 1;
  let selectedAgentId: string | null = null;
  let selectedAgentIds = new Set<string>();
  let followingAgentId: string | null = null;
  let selectionMode = false;
  let selectionRect: WorldSelectionRect | null = null;
  let uiHidden = false;
  let running = true;
  let previousFrameTime: number | null = null;
  let lastHudTick = -1;
  let lastInspectorTick = -1;
  let lastActivityTick = -1;
  let lastEventId = "";
  let lastMinimapSignature = "";
  let frameHandle = 0;
  const clock = new FixedStepClock(SIMULATION_STEP_MS, 5);
  const layers = loadMapLayerPreferences();
  for (const button of shell.layerButtons) {
    const name = button.dataset.layer as keyof MapLayerPreferences | undefined;
    if (!name || !(name in layers)) continue;
    button.classList.toggle("is-active", layers[name]);
    button.setAttribute("aria-pressed", String(layers[name]));
  }
  const overlays = loadOverlayPreferences();
  for (const input of shell.overlayButtons) {
    const name = input.dataset.overlay as keyof OverlayPreferences | undefined;
    if (name && name in overlays) input.checked = overlays[name];
  }
  let saveQueue: Promise<void> = Promise.resolve();
  let lastAutosaveAt = 0;

  const showSaveStatus = (message: string): void => {
    shell.saveStatus.textContent = message;
  };

  const saveCurrentWorld = (announce = false): Promise<void> => {
    let snapshot: WorldSave;
    try {
      // createWorldSave clones the complete state synchronously, so later ticks
      // cannot alter the snapshot while IndexedDB is writing it.
      snapshot = createWorldSave(world, startingPoint);
    } catch (error) {
      showSaveStatus("SAVE FAILED");
      return Promise.reject(error);
    }

    saveQueue = saveQueue
      .catch(() => undefined)
      .then(() => saveAutosave(snapshot))
      .then(() => {
        showSaveStatus(announce ? "WORLD SAVED" : "AUTOSAVED");
      })
      .catch((error: unknown) => {
        showSaveStatus("SAVE FAILED");
        throw error instanceof Error ? error : new Error("The world could not be saved.");
      });
    return saveQueue;
  };

  const loadLastSavedWorld = async (): Promise<void> => {
    try {
      await saveQueue.catch(() => undefined);
      const saved = await loadAutosave();
      if (!saved) {
        showSaveStatus("NO SAVED WORLD YET");
        return;
      }
      showSaveStatus("LOADING WORLD");
      onLoadSavedWorld(saved);
    } catch (error) {
      showSaveStatus(error instanceof Error ? error.message : "LOAD FAILED");
    }
  };

  const selectedAgent = () =>
    world.agents.find((agent) => agent.id === selectedAgentId && agent.alive) ?? null;

  const updateMinimap = (): void => {
    if (!minimapContext) return;
    const signature = [
      Math.floor(world.tick / 4),
      camera.centerX.toFixed(2),
      camera.centerY.toFixed(2),
      camera.zoom.toFixed(2)
    ].join(":");
    if (signature === lastMinimapSignature) return;
    drawMiniMap(minimapContext, world, camera);
    lastMinimapSignature = signature;
  };

  const draw = (): void => {
    renderer.render(world, camera, context, getViewport(), {
      ...layers,
      selectedAgentId,
      selectedAgentIds: [...selectedAgentIds],
      motion,
      showRoutes: overlays.routes,
      showTrails: overlays.trails,
      showVision: overlays.vision,
      showTargets: overlays.targets,
      selectionRect
    });
    updateMinimap();
  };

  const updateSelectionReadout = (): void => {
    shell.selectionCount.textContent = selectedAgentIds.size + " SELECTED";
    shell.selectionModeButton.classList.toggle("is-active", selectionMode);
    shell.selectionModeButton.setAttribute("aria-pressed", String(selectionMode));
    shell.selectionModeButton.textContent = selectionMode ? "DONE SELECTING" : "SELECT PEOPLE";
  };

  const updateReadouts = (): void => {
    updateHud(shell, world, playing, speed, camera.zoom);
    shell.followAgentButton.textContent = followingAgentId ? "STOP FOLLOWING" : "FOLLOW";
    updateSelectionReadout();
  };

  const setSelectedAgents = (agentIds: readonly string[]): void => {
    selectedAgentIds = new Set(
      agentIds.filter((id) => world.agents.some((agent) => agent.id === id && agent.alive))
    );
    selectedAgentId = selectedAgentIds.size === 1 ? [...selectedAgentIds][0] ?? null : null;
    followingAgentId = null;

    if (selectedAgentId) {
      const target = selectedAgent();
      renderAgentInspector(shell, target);
      shell.activityPanel.hidden = true;
    } else {
      renderAgentInspector(shell, null);
      shell.activityPanel.hidden = false;
    }
    updateReadouts();
    draw();
  };

  const selectAgent = (agentId: string | null): void => {
    setSelectedAgents(agentId ? [agentId] : []);
  };

  const screenRectToWorld = (rect: MapDragRect): WorldSelectionRect => {
    const viewport = getViewport();
    const first = screenToWorld(camera, { x: rect.left, y: rect.top }, viewport);
    const second = screenToWorld(camera, { x: rect.right, y: rect.bottom }, viewport);
    return {
      left: Math.min(first.x, second.x),
      top: Math.min(first.y, second.y),
      right: Math.max(first.x, second.x),
      bottom: Math.max(first.y, second.y)
    };
  };

  const toggleAgentInGroup = (agentId: string | null): void => {
    if (!agentId) return;
    const next = new Set(selectedAgentIds);
    if (next.has(agentId)) next.delete(agentId);
    else next.add(agentId);
    setSelectedAgents([...next]);
  };

  const setSelectionMode = (enabled: boolean): void => {
    selectionMode = enabled;
    selectionRect = null;
    shell.canvas.classList.toggle("is-selection-mode", enabled);
    updateSelectionReadout();
    draw();
  };

  const setUiHidden = (hidden: boolean): void => {
    uiHidden = hidden;
    worldApp?.classList.toggle("ui-hidden", hidden);
    shell.restoreUiButton.hidden = !hidden;
    if (hidden) {
      setSelectionMode(false);
      shell.overlayPanel.hidden = true;
      shell.overlayToggleButton.setAttribute("aria-expanded", "false");
      shell.mapLegendPanel.hidden = true;
      shell.mapKeyToggleButton.setAttribute("aria-expanded", "false");
      shell.storagePanel.hidden = true;
      shell.storageToggleButton.setAttribute("aria-expanded", "false");
    }
  };

  const setMapLegendOpen = (open: boolean): void => {
    shell.mapLegendPanel.hidden = !open;
    shell.mapKeyToggleButton.setAttribute("aria-expanded", String(open));
    if (!open) return;
    shell.overlayPanel.hidden = true;
    shell.overlayToggleButton.setAttribute("aria-expanded", "false");
    shell.storagePanel.hidden = true;
    shell.storageToggleButton.setAttribute("aria-expanded", "false");
  };

  const detachMapInput = attachMapInput(
    shell.canvas,
    camera,
    getViewport,
    {
      isSelectionMode: () => selectionMode,
      onSelect(screenPoint) {
        const worldPoint = screenToWorld(camera, screenPoint, getViewport());
        const agent = findAgentAtWorldPoint(
          world.agents,
          worldPoint,
          Math.max(0.6, 10 / camera.zoom),
          (candidate) => motion.getPosition(candidate.id, candidate)
        );
        if (selectionMode) {
          toggleAgentInGroup(agent?.id ?? null);
        } else {
          selectAgent(agent?.id ?? null);
        }
      },
      onSelectionPreview(rect) {
        selectionRect = rect ? screenRectToWorld(rect) : null;
        draw();
      },
      onAreaSelect(rect) {
        const worldRect = screenRectToWorld(rect);
        const ids = selectAgentsInWorldRect(
          world.agents,
          worldRect,
          (candidate) => motion.getPosition(candidate.id, candidate)
        );
        selectionRect = null;
        setSelectedAgents(ids);
      },
      onChange() {
        shell.zoomLevel.textContent = camera.zoom.toFixed(1) + "×";
        draw();
      }
    }
  );

  const onResize = (): void => {
    resizeCanvas(shell.canvas, getViewport(), window.devicePixelRatio || 1);
    draw();
  };

  const onActivitySelect = (event: Event): void => {
    const target = event.target as HTMLElement | null;
    const button = target?.closest<HTMLButtonElement>("[data-agent-id]");
    const agentId = button?.dataset.agentId;
    if (!agentId) return;
    const agent = world.agents.find((candidate) => candidate.id === agentId && candidate.alive);
    if (!agent) return;
    const position = motion.getPosition(agent.id, agent);
    setCameraCenter(camera, { x: position.x + 0.5, y: position.y + 0.5 });
    selectAgent(agent.id);
  };

  const onMinimapPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const rect = shell.minimapCanvas.getBoundingClientRect();
    const point = {
      x: (event.clientX - rect.left) * shell.minimapCanvas.width / rect.width,
      y: (event.clientY - rect.top) * shell.minimapCanvas.height / rect.height
    };
    const target = miniMapToWorld(
      point,
      world,
      { width: shell.minimapCanvas.width, height: shell.minimapCanvas.height }
    );
    setCameraCenter(camera, target);
    followingAgentId = null;
    draw();
    updateReadouts();
  };

  const onEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    if (uiHidden) {
      setUiHidden(false);
      return;
    }
    if (selectionMode) {
      setSelectionMode(false);
      return;
    }
    if (!shell.mapLegendPanel.hidden) {
      setMapLegendOpen(false);
      return;
    }
    if (!shell.storagePanel.hidden) {
      shell.storagePanel.hidden = true;
      shell.storageToggleButton.setAttribute("aria-expanded", "false");
      return;
    }
    if (!shell.overlayPanel.hidden) {
      shell.overlayPanel.hidden = true;
      shell.overlayToggleButton.setAttribute("aria-expanded", "false");
      shell.storagePanel.hidden = true;
      shell.storageToggleButton.setAttribute("aria-expanded", "false");
    }
  };

  onResize();
  const handleNewWorld = (): void => {
    // Finish the old world's checkpoint before a new session begins writing autosaves.
    void saveCurrentWorld(true).then(
      () => onNewWorld(),
      () => onNewWorld()
    );
  };
  shell.newWorldButton.addEventListener("click", handleNewWorld);
  shell.activityList.addEventListener("click", onActivitySelect);
  shell.minimapCanvas.addEventListener("pointerdown", onMinimapPointerDown);
  document.addEventListener("keydown", onEscape);

  shell.playButton.addEventListener("click", () => {
    playing = !playing;
    clock.reset();
    previousFrameTime = null;
    updateReadouts();
    if (!playing) void saveCurrentWorld(true).catch(() => undefined);
  });

  for (const button of shell.speedButtons) {
    button.addEventListener("click", () => {
      const requestedSpeed = Number(button.dataset.speed);
      if (!SPEEDS.some((value) => value === requestedSpeed)) return;
      speed = requestedSpeed;
      clock.reset();
      updateReadouts();
    });
  }

  shell.zoomInButton.addEventListener("click", () => {
    zoomCamera(camera, 1.2, getViewport());
    draw();
    updateReadouts();
  });
  shell.zoomOutButton.addEventListener("click", () => {
    zoomCamera(camera, 1 / 1.2, getViewport());
    draw();
    updateReadouts();
  });
  shell.resetViewButton.addEventListener("click", () => {
    setCameraCenter(camera, getTileCenter(startingPoint));
    camera.zoom = initialZoom;
    followingAgentId = null;
    draw();
    updateReadouts();
  });
  shell.fitWorldButton.addEventListener("click", () => {
    const viewport = getViewport();
    const fit = Math.min(viewport.width / world.width, viewport.height / world.height) * 0.92;
    camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, fit));
    setCameraCenter(camera, { x: world.width / 2, y: world.height / 2 });
    followingAgentId = null;
    draw();
    updateReadouts();
  });

  shell.selectionModeButton.addEventListener("click", () => setSelectionMode(!selectionMode));
  shell.overlayToggleButton.addEventListener("click", () => {
    shell.overlayPanel.hidden = !shell.overlayPanel.hidden;
    shell.overlayToggleButton.setAttribute("aria-expanded", String(!shell.overlayPanel.hidden));
    if (!shell.overlayPanel.hidden) setMapLegendOpen(false);
  });
  const toggleMapLegend = (): void => setMapLegendOpen(shell.mapLegendPanel.hidden);
  const closeMapLegend = (): void => setMapLegendOpen(false);
  shell.mapKeyToggleButton.addEventListener("click", toggleMapLegend);
  shell.closeMapLegendButton.addEventListener("click", closeMapLegend);
  for (const input of shell.overlayButtons) {
    input.addEventListener("change", () => {
      const name = input.dataset.overlay as keyof typeof overlays | undefined;
      if (!name || !(name in overlays)) return;
      overlays[name] = input.checked;
      saveOverlayPreferences(overlays);
      draw();
    });
  }

  shell.hideUiButton.addEventListener("click", () => setUiHidden(true));
  shell.restoreUiButton.addEventListener("click", () => setUiHidden(false));
  shell.storageToggleButton.addEventListener("click", () => {
    shell.storagePanel.hidden = !shell.storagePanel.hidden;
    shell.storageToggleButton.setAttribute("aria-expanded", String(!shell.storagePanel.hidden));
    if (!shell.storagePanel.hidden) setMapLegendOpen(false);
  });
  shell.saveNowButton.addEventListener("click", () => {
    void saveCurrentWorld(true).catch(() => undefined);
  });
  shell.loadWorldButton.addEventListener("click", () => {
    void loadLastSavedWorld();
  });
  shell.exportWorldButton.addEventListener("click", () => {
    try {
      const save = createWorldSave(world, startingPoint);
      const blob = new Blob([serializeWorldSave(save)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gloomd-world-${world.seed}-day-${Math.floor(world.tick / 1440) + 1}.json`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showSaveStatus("EXPORT READY");
    } catch (error) {
      showSaveStatus(error instanceof Error ? error.message : "EXPORT FAILED");
    }
  });
  shell.importWorldButton.addEventListener("click", () => shell.importFileInput.click());
  const onImportFile = async (): Promise<void> => {
    const file = shell.importFileInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > 50 * 1024 * 1024) {
        throw new Error("This save file is too large to import (50 MB limit).");
      }
      const saved = parseWorldSave(await file.text());
      await saveQueue.catch(() => undefined);
      await saveAutosave(saved);
      showSaveStatus("WORLD IMPORTED");
      onLoadSavedWorld(saved);
    } catch (error) {
      showSaveStatus(error instanceof Error ? error.message : "IMPORT FAILED");
    } finally {
      shell.importFileInput.value = "";
    }
  };
  const importFileChange = (): void => { void onImportFile(); };
  shell.importFileInput.addEventListener("change", importFileChange);
  shell.closeInspectorButton.addEventListener("click", () => selectAgent(null));
  shell.followAgentButton.addEventListener("click", () => {
    const agent = selectedAgent();
    if (!agent) return;
    followingAgentId = followingAgentId === agent.id ? null : agent.id;
    if (followingAgentId) {
      const position = motion.getPosition(agent.id, agent);
      setCameraCenter(camera, { x: position.x + 0.5, y: position.y + 0.5 });
    }
    updateReadouts();
    draw();
  });

  for (const button of shell.layerButtons) {
    button.addEventListener("click", () => {
      const layer = button.dataset.layer as keyof MapLayerPreferences | undefined;
      if (!layer || !(layer in layers)) return;
      layers[layer] = !layers[layer];
      button.classList.toggle("is-active", layers[layer]);
      button.setAttribute("aria-pressed", String(layers[layer]));
      saveMapLayerPreferences(layers);
      draw();
    });
  }

  const onVisibilityChange = (): void => {
    if (document.hidden) void saveCurrentWorld(false).catch(() => undefined);
    clock.reset();
    previousFrameTime = null;
  };
  const onPageHide = (): void => {
    void saveCurrentWorld(false).catch(() => undefined);
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
  window.addEventListener("pagehide", onPageHide);
  window.addEventListener("resize", onResize);

  const advanceOneTick = (): void => {
    const before = new Map(
      world.agents.map((agent) => [agent.id, { x: agent.x, y: agent.y }] as const)
    );
    stepWorld(world);

    for (const agent of world.agents) {
      const prior = before.get(agent.id);
      if (!prior || !agent.alive) continue;
      const distance = Math.abs(agent.x - prior.x) + Math.abs(agent.y - prior.y);
      if (distance === 1) {
        motion.enqueue(agent.id, prior, { x: agent.x, y: agent.y });
      } else if (distance > 1) {
        // Defensive recovery: preserve every orthogonal tile in any future multi-step action.
        let cursor = { ...prior };
        while (cursor.x !== agent.x || cursor.y !== agent.y) {
          const next = cursor.x !== agent.x
            ? { x: cursor.x + Math.sign(agent.x - cursor.x), y: cursor.y }
            : { x: cursor.x, y: cursor.y + Math.sign(agent.y - cursor.y) };
          motion.enqueue(agent.id, cursor, next);
          cursor = next;
        }
      }
    }
  };

  const animate = (timestamp: number): void => {
    if (!running) return;
    frameHandle = window.requestAnimationFrame(animate);

    const elapsed = previousFrameTime === null
      ? 0
      : Math.max(0, Math.min(1000, timestamp - previousFrameTime));
    previousFrameTime = timestamp;

    const active = playing && !document.hidden;
    if (active && timestamp - lastAutosaveAt >= 15_000 && world.tick > 0) {
      lastAutosaveAt = timestamp;
      void saveCurrentWorld(false).catch(() => undefined);
    }
    // Advance existing visual steps using only simulation time accepted by the
    // fixed-step clock, before this frame can enqueue newly decided tile moves.
    clock.advance(
      elapsed * speed,
      active,
      advanceOneTick,
      (acceptedElapsed) => motion.advance(acceptedElapsed, active)
    );

    const followed = followingAgentId
      ? world.agents.find((agent) => agent.id === followingAgentId && agent.alive)
      : undefined;
    if (followed) {
      const position = motion.getPosition(followed.id, followed);
      setCameraCenter(camera, { x: position.x + 0.5, y: position.y + 0.5 });
    } else if (followingAgentId) {
      followingAgentId = null;
      updateReadouts();
    }

    draw();

    if (world.tick !== lastHudTick) {
      lastHudTick = world.tick;
      updateReadouts();
    }
    if (selectedAgentId && world.tick !== lastInspectorTick) {
      lastInspectorTick = world.tick;
      const current = selectedAgent();
      if (current) {
        renderAgentInspector(shell, current);
      } else {
        selectAgent(null);
      }
    }

    if (world.tick - lastActivityTick >= 4) {
      lastActivityTick = world.tick;
      renderAgentActivity(shell, world.agents);
    }

    const latestEvent = world.events.at(-1);
    if (latestEvent && latestEvent.id !== lastEventId) {
      lastEventId = latestEvent.id;
      renderEventLog(shell, world.events);
    }
  };

  renderEventLog(shell, world.events);
  renderAgentInspector(shell, null);
  renderAgentActivity(shell, world.agents);
  shell.activityPanel.hidden = false;
  lastActivityTick = world.tick;
  updateReadouts();
  updateMinimapInitial();
  // Create an initial checkpoint; later checkpoints refresh it while the tab is active.
  void saveCurrentWorld(false).catch(() => undefined);
  frameHandle = window.requestAnimationFrame(animate);

  function updateMinimapInitial(): void {
    if (!minimapContext) return;
    drawMiniMap(minimapContext, world, camera);
    lastMinimapSignature = [
      world.tick,
      camera.centerX.toFixed(2),
      camera.centerY.toFixed(2),
      camera.zoom.toFixed(2)
    ].join(":");
  }

  return () => {
    running = false;
    window.cancelAnimationFrame(frameHandle);
    detachMapInput();
    shell.activityList.removeEventListener("click", onActivitySelect);
    shell.newWorldButton.removeEventListener("click", handleNewWorld);
    shell.mapKeyToggleButton.removeEventListener("click", toggleMapLegend);
    shell.closeMapLegendButton.removeEventListener("click", closeMapLegend);
    shell.minimapCanvas.removeEventListener("pointerdown", onMinimapPointerDown);
    shell.importFileInput.removeEventListener("change", importFileChange);
    document.removeEventListener("keydown", onEscape);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", onPageHide);
    window.removeEventListener("resize", onResize);
  };
}

/** Start by resuming the last local save, or show world creation on first use. */
export function startApp(root: HTMLElement): () => void {
  let setupCleanup: (() => void) | null = null;
  let sessionCleanup: (() => void) | null = null;

  const stopSetup = (): void => {
    setupCleanup?.();
    setupCleanup = null;
  };
  const stopSession = (): void => {
    sessionCleanup?.();
    sessionCleanup = null;
  };

  let openWorldSetup: (
    seed: number,
    returnTo?: { world: WorldState; startingPoint: GridPoint }
  ) => void;

  const startSession = (world: WorldState, startingPoint: GridPoint): void => {
    stopSession();
    stopSetup();
    sessionCleanup = startWorld(
      root,
      world,
      startingPoint,
      () => openWorldSetup(createRandomWorldSeed(world.seed), { world, startingPoint }),
      (saved) => startSession(saved.world, saved.startingPoint)
    );
  };

  openWorldSetup = (
    seed: number,
    returnTo?: { world: WorldState; startingPoint: GridPoint }
  ): void => {
    stopSession();
    stopSetup();

    setupCleanup = createWorldSetup(root, {
      seed,
      canReturnToWorld: returnTo !== undefined,
      onStart(result) {
        stopSetup();
        result.world.agents = createStarterAgents(
          result.world,
          result.population,
          { center: result.startingPoint }
        );
        startSession(result.world, result.startingPoint);
      },
      onCancel() {
        if (!returnTo) return;
        stopSetup();
        startSession(returnTo.world, returnTo.startingPoint);
      }
    });
  };

  void loadAutosave().then((saved) => {
    if (saved) startSession(saved.world, saved.startingPoint);
    else openWorldSetup(WORLD_SEED);
  }).catch(() => {
    // If local storage is unavailable or corrupt, do not prevent a fresh world from starting.
    openWorldSetup(WORLD_SEED);
  });

  return () => {
    stopSetup();
    stopSession();
  };
}
