import { createWorld, findNearestWalkablePoint } from "../core/world-generation";
import { CanvasWorldRenderer, resizeCanvas } from "../render/canvas-renderer";
import { createCamera } from "../render/camera";
import { screenToWorld } from "../render/geometry";
import type { GridPoint, WorldState } from "../core/types";

export const MIN_STARTING_POPULATION = 5;
export const MAX_STARTING_POPULATION = 30;
export const DEFAULT_STARTING_POPULATION = 12;

export function clampStartingPopulation(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STARTING_POPULATION;
  return Math.max(
    MIN_STARTING_POPULATION,
    Math.min(MAX_STARTING_POPULATION, Math.round(value))
  );
}

export interface WorldSetupResult {
  world: WorldState;
  population: number;
  startingPoint: GridPoint;
}

export interface WorldSetupOptions {
  seed: number;
  canReturnToWorld?: boolean;
  onStart(result: WorldSetupResult): void;
  onCancel?: () => void;
}

export function createWorldSetup(root: HTMLElement, options: WorldSetupOptions): () => void {
  root.innerHTML = `
    <section class="world-setup" aria-label="Create a new GLOOMD world">
      <header class="setup-header">
        <div class="brand-lockup">
          <span class="brand-glyph">G</span>
          <span class="brand-name">GLOOMD</span>
          <span class="brand-subtitle">WORLD GENERATION</span>
        </div>
        <span class="setup-version">A LIVING WORLD / EXPERIMENTAL SIMULATION</span>
      </header>
      <div class="setup-content">
        <section class="setup-options" aria-label="World settings">
          <p class="setup-eyebrow">BEGIN A NEW EXPERIMENT</p>
          <h1>Create a world.</h1>
          <p class="setup-intro">Choose how many people begin together, then choose where their story starts.</p>

          <div class="population-control">
            <div class="population-label">
              <label for="starting-population">STARTING POPULATION</label>
              <strong id="population-value">12 PEOPLE</strong>
            </div>
            <input id="starting-population" type="range" min="5" max="30" step="1" value="12" />
            <div class="range-labels"><span>5 · SMALL GROUP</span><span>30 · LARGE GROUP</span></div>
          </div>

          <div class="selected-location">
            <span class="setup-field-label">STARTING AREA</span>
            <strong id="selected-location">Locating suitable land…</strong>
            <p>Click anywhere on the terrain preview. Water, mountains and blocked tiles automatically snap to the nearest available land.</p>
          </div>

          <div class="setup-actions">
            <button id="new-terrain" class="secondary-action" type="button">↻ &nbsp; NEW TERRAIN</button>
            <button id="start-world" class="primary-action" type="button">CREATE WORLD &nbsp; →</button>
            <button id="return-world" class="return-action" type="button" ${options.canReturnToWorld ? "" : "hidden"}>BACK TO CURRENT WORLD</button>
          </div>

          <p class="setup-notice">${options.canReturnToWorld
            ? "Your current world is paused and held in memory while this menu is open. Creating a new world replaces that unsaved world."
            : "Worlds currently exist only in this open browser session. Reloading the page starts a fresh experiment."}</p>
        </section>
        <section class="setup-map-section" aria-label="Choose your starting place">
          <div class="preview-heading">
            <div><span class="setup-field-label">TERRAIN PREVIEW</span><strong>Choose your starting ground</strong></div>
            <span id="terrain-seed" class="seed-label">SEED ${options.seed}</span>
          </div>
          <div class="setup-preview-frame">
            <canvas id="setup-preview" class="setup-preview-map" aria-label="Terrain map preview. Click to choose where inhabitants begin."></canvas>
            <div class="preview-legend"><span><i class="legend-start"></i> STARTING AREA</span><span>CLICK THE MAP TO PLACE YOUR GROUP</span></div>
          </div>
        </section>
      </div>
      <footer class="setup-footer"><span>GLOOMD / LOCAL WORLD SIMULATION</span><span>NO SERVER · NO PAID SERVICES · YOUR EXPERIMENT RUNS HERE</span></footer>
    </section>
  `;

  const required = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`GLOOMD world setup is missing ${selector}.`);
    return element;
  };
  const canvas = required<HTMLCanvasElement>("#setup-preview");
  const populationInput = required<HTMLInputElement>("#starting-population");
  const populationValue = required<HTMLElement>("#population-value");
  const selectedLocation = required<HTMLElement>("#selected-location");
  const startButton = required<HTMLButtonElement>("#start-world");
  const newTerrainButton = required<HTMLButtonElement>("#new-terrain");
  const returnButton = required<HTMLButtonElement>("#return-world");
  const seedLabel = required<HTMLElement>("#terrain-seed");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("GLOOMD could not create a Canvas 2D preview.");

  const renderer = new CanvasWorldRenderer();
  let seed = options.seed;
  let population = DEFAULT_STARTING_POPULATION;
  let world = createWorld(seed);
  const camera = createCamera(world.width, world.height, 6);
  let startingPoint: GridPoint | null = findNearestWalkablePoint(world, {
    x: Math.floor(world.width / 2),
    y: Math.floor(world.height / 2)
  });

  const setSelectionText = (): void => {
    if (!startingPoint) {
      selectedLocation.textContent = "No walkable land found";
      startButton.disabled = true;
      return;
    }
    selectedLocation.textContent = `MAP ${startingPoint.x + 1}, ${startingPoint.y + 1}`;
    startButton.disabled = false;
  };

  const drawPreview = (): void => {
    const rect = canvas.getBoundingClientRect();
    const viewport = {
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height)
    };
    const zoom = Math.min(viewport.width / world.width, viewport.height / world.height) * 0.94;
    camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, zoom));
    resizeCanvas(canvas, viewport, window.devicePixelRatio || 1);
    renderer.render(world, camera, context, viewport, {
      terrain: true,
      resources: true,
      agents: false,
      buildings: true,
      stockpile: true,
      startingPoint: startingPoint ?? undefined
    });
  };

  const onPreviewClick = (event: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const viewport = { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
    const point = screenToWorld(camera, {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    }, viewport);
    startingPoint = findNearestWalkablePoint(world, {
      x: Math.floor(point.x),
      y: Math.floor(point.y)
    });
    setSelectionText();
    drawPreview();
  };

  const onPopulationChange = (): void => {
    population = clampStartingPopulation(Number(populationInput.value));
    populationInput.value = String(population);
    populationValue.textContent = `${population} PEOPLE`;
  };

  const onNewTerrain = (): void => {
    seed = seed >= Number.MAX_SAFE_INTEGER - 1 ? 1 : seed + 1;
    world = createWorld(seed);
    startingPoint = findNearestWalkablePoint(world, {
      x: Math.floor(world.width / 2),
      y: Math.floor(world.height / 2)
    });
    seedLabel.textContent = `SEED ${seed}`;
    setSelectionText();
    drawPreview();
  };

  const onStart = (): void => {
    if (!startingPoint) return;
    options.onStart({ world, population, startingPoint });
  };

  const onCancel = (): void => options.onCancel?.();
  const onResize = (): void => drawPreview();

  populationInput.addEventListener("input", onPopulationChange);
  canvas.addEventListener("click", onPreviewClick);
  newTerrainButton.addEventListener("click", onNewTerrain);
  startButton.addEventListener("click", onStart);
  returnButton.addEventListener("click", onCancel);
  window.addEventListener("resize", onResize);

  populationInput.value = String(population);
  populationValue.textContent = `${population} PEOPLE`;
  setSelectionText();
  drawPreview();

  return () => {
    populationInput.removeEventListener("input", onPopulationChange);
    canvas.removeEventListener("click", onPreviewClick);
    newTerrainButton.removeEventListener("click", onNewTerrain);
    startButton.removeEventListener("click", onStart);
    returnButton.removeEventListener("click", onCancel);
    window.removeEventListener("resize", onResize);
  };
}
