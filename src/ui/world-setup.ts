import { createWorld, findNearestWalkablePoint, relocateStockpileNear } from "../core/world-generation";
import { CanvasWorldRenderer, resizeCanvas } from "../render/canvas-renderer";
import { createCamera } from "../render/camera";
import { screenToWorld } from "../render/geometry";
import type { GridPoint, WorldState } from "../core/types";


export const WORLD_SIZE_PRESETS = [
  { id: "small", label: "SMALL · 64 × 48", width: 64, height: 48 },
  { id: "standard", label: "STANDARD · 128 × 96", width: 128, height: 96 },
  { id: "large", label: "LARGE · 192 × 144", width: 192, height: 144 },
  { id: "huge", label: "HUGE · 256 × 192", width: 256, height: 192 }
] as const;

export type WorldSizePreset = typeof WORLD_SIZE_PRESETS[number];

export function clampWaterCoverage(value: number): number {
  if (!Number.isFinite(value)) return 0.38;
  return Math.round(Math.max(0.25, Math.min(0.55, value)) * 100) / 100;
}

export function createRandomWorldSeed(previousSeed: number): number {
  const values = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values);
  }
  const rawCandidate = values[0] || Math.floor(Math.random() * 0x7fff_ffff) + 1;
  const candidate = (rawCandidate % 0x7fff_ffff) || 1;
  return candidate === previousSeed ? (candidate >= 0x7fff_ffff ? 1 : candidate + 1) : candidate;
}

function getWorldSizePreset(id: string): WorldSizePreset {
  return WORLD_SIZE_PRESETS.find((preset) => preset.id === id) ?? WORLD_SIZE_PRESETS[1];
}

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

          <section class="generation-settings" aria-label="Advanced world generation settings">
            <div class="generation-field">
              <label for="world-size">MAP SIZE</label>
              <select id="world-size">
                ${WORLD_SIZE_PRESETS.map((preset) => `<option value="${preset.id}">${preset.label}</option>`).join("")}
              </select>
            </div>
            <div class="generation-field water-setting">
              <div class="generation-label"><label for="water-coverage">WATER COVERAGE</label><strong id="water-value">38%</strong></div>
              <input id="water-coverage" type="range" min="25" max="55" step="1" value="38" />
              <div class="range-labels"><span>MORE LAND</span><span>MORE WATER</span></div>
            </div>
            <div class="generation-field seed-setting">
              <label for="world-seed">WORLD SEED</label>
              <div class="seed-input-row">
                <input id="world-seed" type="number" min="1" max="2147483647" step="1" value="${options.seed}" />
                <button id="apply-seed" class="seed-apply-button" type="button">APPLY</button>
              </div>
            </div>
          </section>

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
            <span id="terrain-seed" class="seed-label">${128} × ${96}</span>
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
  const sizeInput = required<HTMLSelectElement>("#world-size");
  const waterInput = required<HTMLInputElement>("#water-coverage");
  const waterValue = required<HTMLElement>("#water-value");
  const seedInput = required<HTMLInputElement>("#world-seed");
  const applySeedButton = required<HTMLButtonElement>("#apply-seed");
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("GLOOMD could not create a Canvas 2D preview.");

  const renderer = new CanvasWorldRenderer();
  let seed = options.seed;
  let population = DEFAULT_STARTING_POPULATION;
  let size: WorldSizePreset = WORLD_SIZE_PRESETS[1];
  let waterCoverage = 0.38;
  let world = createWorld(seed, {
    width: size.width,
    height: size.height,
    waterCoverage
  });
  let camera = createCamera(world.width, world.height, 6);
  let startingPoint: GridPoint | null = null;

  const regenerateWorld = (): void => {
    world = createWorld(seed, {
      width: size.width,
      height: size.height,
      waterCoverage
    });
    camera = createCamera(world.width, world.height, 6);
    startingPoint = findNearestWalkablePoint(world, {
      x: Math.floor(world.width / 2),
      y: Math.floor(world.height / 2)
    });
    if (startingPoint) relocateStockpileNear(world, startingPoint);
    seedLabel.textContent = `${world.width} × ${world.height}`;
    setSelectionText();
    drawPreview();
  };
  startingPoint = findNearestWalkablePoint(world, {
    x: Math.floor(world.width / 2),
    y: Math.floor(world.height / 2)
  });
  if (startingPoint) relocateStockpileNear(world, startingPoint);

  const setSelectionText = (): void => {
    if (!startingPoint) {
      selectedLocation.textContent = "No walkable land found";
      startButton.disabled = true;
      return;
    }
    selectedLocation.textContent = `MAP ${startingPoint.x + 1}, ${startingPoint.y + 1} · ${world.width} × ${world.height}`;
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
    if (startingPoint) relocateStockpileNear(world, startingPoint);
    setSelectionText();
    drawPreview();
  };

  const onPopulationChange = (): void => {
    population = clampStartingPopulation(Number(populationInput.value));
    populationInput.value = String(population);
    populationValue.textContent = `${population} PEOPLE`;
  };

  const onNewTerrain = (): void => {
    seed = createRandomWorldSeed(seed);
    seedInput.value = String(seed);
    regenerateWorld();
  };

  const onSizeChange = (): void => {
    size = getWorldSizePreset(sizeInput.value);
    regenerateWorld();
  };

  const onWaterInput = (): void => {
    waterValue.textContent = `${Math.round(Number(waterInput.value))}%`;
  };

  const onWaterChange = (): void => {
    waterCoverage = clampWaterCoverage(Number(waterInput.value) / 100);
    waterInput.value = String(Math.round(waterCoverage * 100));
    waterValue.textContent = `${Math.round(waterCoverage * 100)}%`;
    regenerateWorld();
  };

  const onApplySeed = (): void => {
    const requestedSeed = Number(seedInput.value);
    if (!Number.isSafeInteger(requestedSeed) || requestedSeed < 1 || requestedSeed > 0x7fff_ffff) {
      seedInput.setCustomValidity("Enter a whole seed between 1 and 2147483647.");
      seedInput.reportValidity();
      return;
    }
    seedInput.setCustomValidity("");
    seed = requestedSeed;
    regenerateWorld();
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
  sizeInput.addEventListener("change", onSizeChange);
  waterInput.addEventListener("input", onWaterInput);
  waterInput.addEventListener("change", onWaterChange);
  applySeedButton.addEventListener("click", onApplySeed);
  startButton.addEventListener("click", onStart);
  returnButton.addEventListener("click", onCancel);
  window.addEventListener("resize", onResize);

  populationInput.value = String(population);
  populationValue.textContent = `${population} PEOPLE`;
  waterValue.textContent = "38%";
  sizeInput.value = size.id;
  seedInput.value = String(seed);
  seedLabel.textContent = `${world.width} × ${world.height}`;
  setSelectionText();
  drawPreview();

  return () => {
    populationInput.removeEventListener("input", onPopulationChange);
    canvas.removeEventListener("click", onPreviewClick);
    newTerrainButton.removeEventListener("click", onNewTerrain);
    sizeInput.removeEventListener("change", onSizeChange);
    waterInput.removeEventListener("input", onWaterInput);
    waterInput.removeEventListener("change", onWaterChange);
    applySeedButton.removeEventListener("click", onApplySeed);
    startButton.removeEventListener("click", onStart);
    returnButton.removeEventListener("click", onCancel);
    window.removeEventListener("resize", onResize);
  };
}
