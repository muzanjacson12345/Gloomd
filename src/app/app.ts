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

const WORLD_SEED = createRandomWorldSeed(0);
const SIMULATION_STEP_MS = 250;
const SPEEDS = [1, 2, 4] as const;

function startWorld(
  root: HTMLElement,
  world: WorldState,
  startingPoint: GridPoint,
  onNewWorld: () => void
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
  const layers = { terrain: true, resources: true, agents: true, buildings: true, stockpile: true };
  const overlays = { routes: false, trails: false, vision: false, targets: false };

  const selectedAgent = () =>
    world.agents.find((agent) => agent.id === selectedAgentId && agent.alive) ?? null;

  const updateMinimap = (): void => {
    if (!minimapContext) return;
    const signature = [
      world.tick,
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
    }
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
          Math.max(0.6, 10 / camera.zoom)
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
        const ids = selectAgentsInWorldRect(world.agents, worldRect);
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
    if (!shell.overlayPanel.hidden) {
      shell.overlayPanel.hidden = true;
      shell.overlayToggleButton.setAttribute("aria-expanded", "false");
    }
  };

  onResize();
  shell.newWorldButton.addEventListener("click", onNewWorld);
  shell.activityList.addEventListener("click", onActivitySelect);
  shell.minimapCanvas.addEventListener("pointerdown", onMinimapPointerDown);
  document.addEventListener("keydown", onEscape);

  shell.playButton.addEventListener("click", () => {
    playing = !playing;
    clock.reset();
    previousFrameTime = null;
    updateReadouts();
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
  });
  for (const input of shell.overlayButtons) {
    input.addEventListener("change", () => {
      const name = input.dataset.overlay as keyof typeof overlays | undefined;
      if (!name || !(name in overlays)) return;
      overlays[name] = input.checked;
      draw();
    });
  }

  shell.hideUiButton.addEventListener("click", () => setUiHidden(true));
  shell.restoreUiButton.addEventListener("click", () => setUiHidden(false));
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
      const layer = button.dataset.layer as keyof typeof layers;
      if (!(layer in layers)) return;
      layers[layer] = !layers[layer];
      button.classList.toggle("is-active", layers[layer]);
      button.setAttribute("aria-pressed", String(layers[layer]));
      draw();
    });
  }

  const onVisibilityChange = (): void => {
    clock.reset();
    previousFrameTime = null;
  };

  document.addEventListener("visibilitychange", onVisibilityChange);
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
    // Advance existing visual steps before recording new simulation steps so a newly
    // enqueued move cannot consume time that elapsed before the decision was made.
    motion.advance(elapsed * speed, active);
    clock.advance(elapsed * speed, active, advanceOneTick);

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
    shell.newWorldButton.removeEventListener("click", onNewWorld);
    shell.minimapCanvas.removeEventListener("pointerdown", onMinimapPointerDown);
    document.removeEventListener("keydown", onEscape);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("resize", onResize);
  };
}

/** Start on the world-creation screen, then mount or restore an in-memory world. */
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

  const openWorldSetup = (
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
        const savedWorld = {
          world: result.world,
          startingPoint: result.startingPoint
        };
        sessionCleanup = startWorld(
          root,
          result.world,
          result.startingPoint,
          () => openWorldSetup(createRandomWorldSeed(result.world.seed), savedWorld)
        );
      },
      onCancel() {
        if (!returnTo) return;
        stopSetup();
        sessionCleanup = startWorld(
          root,
          returnTo.world,
          returnTo.startingPoint,
          () => openWorldSetup(createRandomWorldSeed(returnTo.world.seed), returnTo)
        );
      }
    });
  };

  openWorldSetup(WORLD_SEED);
  return () => {
    stopSetup();
    stopSession();
  };
}
