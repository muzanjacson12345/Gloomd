import "../styles.css";
import { createStarterAgents } from "../core/agents";
import { stepWorld } from "../core/simulation";
import { createWorld } from "../core/world-generation";
import { FixedStepClock } from "./fixed-step-clock";
import { CanvasWorldRenderer, resizeCanvas } from "../render/canvas-renderer";
import { createCamera, setCameraCenter, zoomCamera } from "../render/camera";
import { screenToWorld } from "../render/geometry";
import { renderAgentInspector } from "../ui/agent-inspector";
import { createAppShell } from "../ui/app-shell";
import { renderEventLog } from "../ui/event-log";
import { updateHud } from "../ui/hud";
import { attachMapInput } from "../ui/map-input";

const INITIAL_WORLD_SEED = 20_261_127;
const STARTING_POPULATION = 30;
const SIMULATION_STEP_MS = 250;

export function startApp(root: HTMLElement): void {
  const shell = createAppShell(root);
  const context = shell.canvas.getContext("2d");
  if (!context) throw new Error("This browser does not provide a Canvas 2D context.");

  const world = createWorld(INITIAL_WORLD_SEED);
  world.agents = createStarterAgents(world, STARTING_POPULATION);

  const measureViewport = () => {
    const rect = shell.canvas.getBoundingClientRect();
    return {
      width: Math.max(1, rect.width || window.innerWidth),
      height: Math.max(1, rect.height || window.innerHeight)
    };
  };

  let viewport = measureViewport();
  const initialZoom = Math.max(
    3,
    Math.min(12, Math.min(viewport.width / world.width, viewport.height / world.height) * 0.9)
  );
  const camera = createCamera(world.width, world.height, initialZoom);
  const renderer = new CanvasWorldRenderer();
  const clock = new FixedStepClock(SIMULATION_STEP_MS, 6);

  let playing = true;
  let speed = 1;
  let selectedAgentId: string | null = null;
  let followingAgent = false;
  let previousFrameTime: number | null = null;
  let lastEventCount = -1;

  const selectedAgent = () =>
    world.agents.find((agent) => agent.id === selectedAgentId && agent.alive) ?? null;

  const drawMap = (): void => {
    renderer.render(world, camera, context, viewport, {
      terrain: true,
      resources: true,
      agents: true,
      selectedAgentId
    });
  };

  const updatePanels = (): void => {
    updateHud(shell, world, playing, speed, camera.zoom);
    renderAgentInspector(shell, selectedAgent());
    shell.followAgentButton.textContent = followingAgent ? "FOLLOWING" : "FOLLOW";
    shell.followAgentButton.setAttribute("aria-pressed", String(followingAgent));

    if (world.events.length !== lastEventCount) {
      renderEventLog(shell, world.events);
      lastEventCount = world.events.length;
    }
  };

  const refreshView = (): void => {
    updateHud(shell, world, playing, speed, camera.zoom);
    drawMap();
  };

  const resize = (): void => {
    viewport = measureViewport();
    resizeCanvas(shell.canvas, viewport, window.devicePixelRatio || 1);
    drawMap();
  };

  const selectAt = (screenPoint: { x: number; y: number }): void => {
    const point = screenToWorld(camera, screenPoint, viewport);
    let nearest: { id: string; distance: number } | null = null;

    for (const agent of world.agents) {
      if (!agent.alive) continue;
      const distance = Math.hypot(agent.x + 0.5 - point.x, agent.y + 0.5 - point.y);
      if (!nearest || distance < nearest.distance) nearest = { id: agent.id, distance };
    }

    const selectionRadius = camera.zoom < 5 ? 3.2 : 0.9;
    selectedAgentId = nearest && nearest.distance <= selectionRadius ? nearest.id : null;
    followingAgent = false;
    updatePanels();
    drawMap();
  };

  const detachMapInput = attachMapInput(shell.canvas, camera, () => viewport, {
    onSelect: selectAt,
    onChange: refreshView
  });

  shell.playButton.addEventListener("click", () => {
    playing = !playing;
    if (!playing) clock.advance(0, false, () => undefined);
    updatePanels();
  });

  for (const button of shell.speedButtons) {
    button.addEventListener("click", () => {
      const nextSpeed = Number(button.dataset.speed);
      if (!Number.isFinite(nextSpeed) || nextSpeed <= 0) return;
      speed = nextSpeed;
      updatePanels();
    });
  }

  shell.zoomInButton.addEventListener("click", () => {
    zoomCamera(camera, 1.25, viewport);
    refreshView();
  });
  shell.zoomOutButton.addEventListener("click", () => {
    zoomCamera(camera, 1 / 1.25, viewport);
    refreshView();
  });
  shell.resetViewButton.addEventListener("click", () => {
    setCameraCenter(camera, { x: world.width / 2, y: world.height / 2 });
    camera.zoom = initialZoom;
    refreshView();
  });
  shell.closeInspectorButton.addEventListener("click", () => {
    selectedAgentId = null;
    followingAgent = false;
    updatePanels();
    drawMap();
  });
  shell.followAgentButton.addEventListener("click", () => {
    if (!selectedAgent()) return;
    followingAgent = !followingAgent;
    const agent = selectedAgent();
    if (followingAgent && agent) setCameraCenter(camera, { x: agent.x + 0.5, y: agent.y + 0.5 });
    updatePanels();
    drawMap();
  });

  const visibilityChange = (): void => {
    previousFrameTime = null;
    if (document.hidden) clock.advance(0, false, () => undefined);
  };
  document.addEventListener("visibilitychange", visibilityChange);
  window.addEventListener("resize", resize);

  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(resize);
  observer?.observe(root);

  const frame = (timestamp: number): void => {
    const elapsed = previousFrameTime === null
      ? 0
      : Math.max(0, Math.min(1_000, timestamp - previousFrameTime));
    previousFrameTime = timestamp;

    const steps = clock.advance(elapsed * speed, playing && !document.hidden, () => {
      stepWorld(world);
    });

    if (steps > 0) {
      const followed = followingAgent ? selectedAgent() : null;
      if (followed) {
        setCameraCenter(camera, { x: followed.x + 0.5, y: followed.y + 0.5 });
      }
      updatePanels();
    }

    drawMap();
    window.requestAnimationFrame(frame);
  };

  resize();
  updatePanels();
  window.requestAnimationFrame(frame);

  window.addEventListener("pagehide", () => {
    detachMapInput();
    observer?.disconnect();
    document.removeEventListener("visibilitychange", visibilityChange);
    window.removeEventListener("resize", resize);
  }, { once: true });
}
