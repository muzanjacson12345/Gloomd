import { createStarterAgents } from "../core/agents";
import { stepWorld } from "../core/simulation";
import { createWorld } from "../core/world-generation";
import { FixedStepClock } from "./fixed-step-clock";
import { CanvasWorldRenderer, resizeCanvas } from "../render/canvas-renderer";
import {
  createCamera,
  setCameraCenter,
  zoomCamera
} from "../render/camera";
import { screenToWorld } from "../render/geometry";
import { attachMapInput, findAgentAtWorldPoint } from "../ui/map-input";
import { createAppShell } from "../ui/app-shell";
import { updateHud } from "../ui/hud";
import { renderAgentInspector } from "../ui/agent-inspector";
import { renderEventLog } from "../ui/event-log";

const WORLD_SEED = 20261127;
const STARTING_POPULATION = 30;
const SIMULATION_STEP_MS = 250;
const SPEEDS = [1, 2, 4] as const;

export function startApp(root: HTMLElement): () => void {
  const shell = createAppShell(root);
  const world = createWorld(WORLD_SEED);
  world.agents = createStarterAgents(world, STARTING_POPULATION);

  const getViewport = () => ({
    width: Math.max(1, window.innerWidth),
    height: Math.max(1, window.innerHeight)
  });
  const initialViewport = getViewport();
  const fitZoom = Math.min(
    initialViewport.width / world.width,
    initialViewport.height / world.height
  ) * 0.88;
  const camera = createCamera(world.width, world.height, fitZoom);
  const renderer = new CanvasWorldRenderer();
  const context = shell.canvas.getContext("2d", { alpha: false });

  if (!context) {
    throw new Error("GLOOMD could not create a Canvas 2D rendering context.");
  }

  let playing = true;
  let speed = 1;
  let selectedAgentId: string | null = null;
  let followingAgentId: string | null = null;
  let running = true;
  let previousFrameTime: number | null = null;
  let lastHudTick = -1;
  let lastInspectorTick = -1;
  let lastEventId = "";
  let frameHandle = 0;
  const initialZoom = camera.zoom;
  const clock = new FixedStepClock(SIMULATION_STEP_MS, 5);
  const layers = { terrain: true, resources: true, agents: true };

  const selectedAgent = () =>
    world.agents.find((agent) => agent.id === selectedAgentId && agent.alive) ?? null;

  const draw = (): void => {
    renderer.render(world, camera, context, getViewport(), {
      ...layers,
      selectedAgentId
    });
  };

  const updateReadouts = (): void => {
    updateHud(shell, world, playing, speed, camera.zoom);
    shell.followAgentButton.textContent = followingAgentId ? "STOP FOLLOWING" : "FOLLOW";
  };

  const selectAgent = (agentId: string | null): void => {
    selectedAgentId = agentId;
    followingAgentId = null;
    renderAgentInspector(shell, selectedAgent());
    updateReadouts();
    draw();
  };

  const detachMapInput = attachMapInput(
    shell.canvas,
    camera,
    getViewport,
    {
      onSelect(screenPoint) {
        const worldPoint = screenToWorld(camera, screenPoint, getViewport());
        const agent = findAgentAtWorldPoint(
          world.agents,
          worldPoint,
          Math.max(0.6, 10 / camera.zoom)
        );
        selectAgent(agent?.id ?? null);
      },
      onChange() {
        shell.zoomLevel.textContent = `${camera.zoom.toFixed(1)}×`;
      }
    }
  );

  const onResize = (): void => {
    resizeCanvas(shell.canvas, getViewport(), window.devicePixelRatio || 1);
    draw();
  };
  onResize();

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
    setCameraCenter(camera, { x: world.width / 2, y: world.height / 2 });
    camera.zoom = initialZoom;
    followingAgentId = null;
    draw();
    updateReadouts();
  });

  shell.closeInspectorButton.addEventListener("click", () => selectAgent(null));
  shell.followAgentButton.addEventListener("click", () => {
    const agent = selectedAgent();
    if (!agent) return;
    followingAgentId = followingAgentId === agent.id ? null : agent.id;
    if (followingAgentId) {
      setCameraCenter(camera, { x: agent.x + 0.5, y: agent.y + 0.5 });
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

  const animate = (timestamp: number): void => {
    if (!running) return;
    frameHandle = window.requestAnimationFrame(animate);

    const elapsed = previousFrameTime === null
      ? 0
      : Math.max(0, Math.min(1000, timestamp - previousFrameTime));
    previousFrameTime = timestamp;

    clock.advance(
      elapsed * speed,
      playing && !document.hidden,
      () => stepWorld(world)
    );

    const followed = followingAgentId
      ? world.agents.find((agent) => agent.id === followingAgentId && agent.alive)
      : undefined;
    if (followed) {
      setCameraCenter(camera, { x: followed.x + 0.5, y: followed.y + 0.5 });
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
      renderAgentInspector(shell, selectedAgent());
    }

    const latestEvent = world.events.at(-1);
    if (latestEvent && latestEvent.id !== lastEventId) {
      lastEventId = latestEvent.id;
      renderEventLog(shell, world.events);
    }
  };

  renderEventLog(shell, world.events);
  renderAgentInspector(shell, null);
  updateReadouts();
  frameHandle = window.requestAnimationFrame(animate);

  return () => {
    running = false;
    window.cancelAnimationFrame(frameHandle);
    detachMapInput();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("resize", onResize);
  };
}
