import { MAP_SYMBOL_LEGEND_ITEMS, TERRAIN_LEGEND_ITEMS } from "../render/terrain-style";

export type AgentNeed = "hunger" | "thirst" | "energy" | "health";
export interface NeedDisplay { fill: HTMLElement; value: HTMLElement; }

export interface AppShell {
  canvas: HTMLCanvasElement;
  minimapCanvas: HTMLCanvasElement;
  newWorldButton: HTMLButtonElement;
  activityPanel: HTMLElement;
  activityList: HTMLElement;
  activityCount: HTMLElement;
  worldTime: HTMLElement;
  population: HTMLElement;
  deathCount: HTMLElement;
  resourceSummary: HTMLElement;
  stockpileSummary: HTMLElement;
  homeCount: HTMLElement;
  zoomLevel: HTMLElement;
  playButton: HTMLButtonElement;
  speedButtons: HTMLButtonElement[];
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  resetViewButton: HTMLButtonElement;
  fitWorldButton: HTMLButtonElement;
  mapKeyToggleButton: HTMLButtonElement;
  mapLegendPanel: HTMLElement;
  closeMapLegendButton: HTMLButtonElement;
  layerButtons: HTMLButtonElement[];
  selectionModeButton: HTMLButtonElement;
  selectionCount: HTMLElement;
  overlayToggleButton: HTMLButtonElement;
  overlayPanel: HTMLElement;
  overlayButtons: HTMLInputElement[];
  hideUiButton: HTMLButtonElement;
  restoreUiButton: HTMLButtonElement;
  storageToggleButton: HTMLButtonElement;
  storagePanel: HTMLElement;
  saveNowButton: HTMLButtonElement;
  loadWorldButton: HTMLButtonElement;
  exportWorldButton: HTMLButtonElement;
  importWorldButton: HTMLButtonElement;
  importFileInput: HTMLInputElement;
  saveStatus: HTMLElement;
  eventList: HTMLElement;
  inspector: HTMLElement;
  inspectorName: HTMLElement;
  inspectorAgentContent: HTMLElement;
  inspectorDetails: HTMLElement;
  inspectorMeta: HTMLElement;
  inspectorGoal: HTMLElement;
  inspectorLocation: HTMLElement;
  inspectorHome: HTMLElement;
  inspectorInventory: HTMLElement;
  closeInspectorButton: HTMLButtonElement;
  followAgentButton: HTMLButtonElement;
  needs: Record<AgentNeed, NeedDisplay>;
}

export function createAppShell(root: HTMLElement): AppShell {
  root.innerHTML = `
    <section class="world-app" aria-label="GLOOMD living world">
      <canvas class="world-map" id="world-map" aria-label="Top-down living world map"></canvas>
      <header class="top-hud">
        <div class="brand-lockup"><span class="brand-glyph">G</span><span class="brand-name">GLOOMD</span><span class="brand-subtitle">LIVING WORLD / 001</span></div>
        <div class="world-readouts">
          <div class="readout"><span class="readout-label">WORLD TIME</span><strong id="world-time">DAY 01 · 06:00</strong></div>
          <div class="readout"><span class="readout-label">INHABITANTS</span><strong id="population">30</strong></div>
          <div class="readout"><span class="readout-label">DEATHS</span><strong id="death-count">00</strong></div>
          <div class="readout homes-readout"><span class="readout-label">HOMES</span><strong id="home-count">00</strong></div>
          <div class="readout stockpile-readout"><span class="readout-label">STOCKPILE</span><strong id="stockpile-summary">WOOD 00 · STONE 00</strong></div>
          <div class="readout resource-readout"><span class="readout-label">ON MAP</span><strong id="resource-summary">FOOD — · FISH — · WOOD — · STONE —</strong></div>
        </div>
        <div class="header-actions">
          <button id="storage-toggle" class="quiet-button" type="button" aria-expanded="false">WORLD SAVE</button>
          <button id="hide-ui" class="quiet-button" type="button" title="Hide interface">HIDE UI</button>
          <button id="new-world" class="new-world-button" type="button">＋ &nbsp; NEW WORLD</button>
        </div>
      </header>
      <aside id="storage-panel" class="storage-panel" aria-label="World save controls" hidden>
        <div class="storage-heading"><span>WORLD DATA</span><span>LOCAL</span></div>
        <div class="storage-actions">
          <button id="save-now" type="button">SAVE NOW</button>
          <button id="load-world" type="button">LOAD LAST SAVE</button>
          <button id="export-world" type="button">EXPORT FILE</button>
          <button id="import-world" type="button">IMPORT FILE</button>
        </div>
        <div id="save-status" class="save-status" aria-live="polite">Autosave is ready.</div>
        <input id="import-world-file" type="file" accept=".json,application/json" hidden />
      </aside>
      <div class="map-tools" aria-label="Map view and selection controls">
        <button class="icon-button" id="zoom-out" type="button" aria-label="Zoom out">−</button>
        <span id="zoom-level" class="zoom-level">1.0×</span>
        <button class="icon-button" id="zoom-in" type="button" aria-label="Zoom in">+</button>
        <span class="tool-separator"></span>
        <button class="icon-button home-button" id="reset-view" type="button" aria-label="Focus starting settlement" title="Focus settlement">⌂</button>
        <button class="icon-button fit-world-button" id="fit-world" type="button" aria-label="Fit whole world" title="Fit whole world">▣</button>
        <span class="tool-separator"></span>
        <button id="select-people" class="map-mode-button" type="button" aria-pressed="false">SELECT PEOPLE</button>
        <button id="overlay-toggle" class="map-mode-button" type="button" aria-expanded="false">OBSERVE</button>
        <button id="map-key-toggle" class="map-mode-button" type="button" aria-expanded="false">MAP KEY</button>
      </div>
      <aside id="overlay-panel" class="overlay-panel" aria-label="Observation overlays" hidden>
        <div class="overlay-panel-heading"><span>OBSERVATION LAYERS</span><span id="selection-count">0 SELECTED</span></div>
        <label class="overlay-option"><input type="checkbox" data-overlay="routes"> <span>Planned routes</span></label>
        <label class="overlay-option"><input type="checkbox" data-overlay="trails"> <span>Recent travel trails</span></label>
        <label class="overlay-option"><input type="checkbox" data-overlay="vision"> <span>Line of sight</span></label>
        <label class="overlay-option"><input type="checkbox" data-overlay="targets"> <span>Destinations</span></label>
        <p class="overlay-note">Overlays apply to selected inhabitants only.</p>
      </aside>
      <aside id="map-legend" class="map-legend" aria-label="Map key" hidden>
        <div class="map-legend-heading">
          <div><span>FIELD GUIDE</span><strong>MAP KEY</strong></div>
          <button id="close-map-legend" class="close-button" type="button" aria-label="Close map key">×</button>
        </div>
        <section class="map-legend-section">
          <span class="map-legend-label">GEOGRAPHY</span>
          <div class="map-legend-grid">
            ${TERRAIN_LEGEND_ITEMS.map((item) => `<span class="map-legend-item"><i class="map-legend-swatch" style="background:${item.color}"></i><span>${item.label}</span></span>`).join("")}
          </div>
          <p class="map-legend-note">Grassland shades change with local moisture. Hills and mountains vary with elevation.</p>
        </section>
        <section class="map-legend-section">
          <span class="map-legend-label">RESOURCES & PLACES</span>
          <div class="map-legend-grid">
            ${MAP_SYMBOL_LEGEND_ITEMS.map((item) => `<span class="map-legend-item"><i class="map-legend-swatch ${item.shape === "dot" ? "is-dot" : "is-square"}" style="background:${item.color}"></i><span>${item.label}</span></span>`).join("")}
          </div>
        </section>
        <section class="map-legend-section">
          <span class="map-legend-label">MAP KNOWLEDGE</span>
          <div class="map-legend-grid">
            <span class="map-legend-item"><i class="map-legend-swatch" style="background:#080e0b"></i><span>UNKNOWN</span></span>
            <span class="map-legend-item"><i class="map-legend-swatch" style="background:#b08445"></i><span>PERSONAL NOTES</span></span>
            <span class="map-legend-item"><i class="map-legend-swatch" style="background:#5b825d"></i><span>SHARED MAP</span></span>
          </div>
          <p class="map-legend-note">Personal notes are known by an inhabitant. They become part of the settlement map when that inhabitant returns to the stockpile.</p>
        </section>
      </aside>
      <nav class="layer-tools" aria-label="Visible map layers">
        <button class="layer-button is-active" data-layer="terrain" type="button" aria-pressed="true">LAND</button>
        <button class="layer-button is-active" data-layer="knowledge" type="button" aria-pressed="true">MAPPED</button>
        <button class="layer-button is-active" data-layer="resources" type="button" aria-pressed="true">RESOURCES</button>
        <button class="layer-button is-active" data-layer="agents" type="button" aria-pressed="true">PEOPLE</button>
        <button class="layer-button is-active" data-layer="buildings" type="button" aria-pressed="true">HOMES</button>
        <button class="layer-button is-active" data-layer="stockpile" type="button" aria-pressed="true">STOCKPILE</button>
        <button class="layer-button" data-layer="resourceDensity" type="button" aria-pressed="false" title="Remaining natural resource quantities">RESOURCE HEAT</button>
        <button class="layer-button" data-layer="activities" type="button" aria-pressed="false" title="Current inhabitant tasks across the map">ACTIVITY</button>
      </nav>
      <nav class="playback-controls" aria-label="Simulation playback">
        <button class="play-button" id="play-toggle" type="button">Ⅱ &nbsp; PAUSE</button>
        <span class="playback-separator"></span><span class="speed-label">SPEED</span>
        <button class="speed-button is-active" data-speed="1" type="button" aria-pressed="true">1×</button>
        <button class="speed-button" data-speed="2" type="button" aria-pressed="false">2×</button>
        <button class="speed-button" data-speed="4" type="button" aria-pressed="false">4×</button>
      </nav>
      <aside class="activity-panel" id="activity-panel" aria-label="Live inhabitant activities">
        <div class="activity-heading">
          <div><span>PEOPLE</span><strong>What everyone is doing</strong></div>
          <span id="activity-count" class="activity-count">00 ALIVE</span>
        </div>
        <ul id="activity-list" class="activity-list"><li class="empty-event">Gathering the settlement…</li></ul>
      </aside>
      <section class="event-feed" aria-label="Recent world events">
        <div class="feed-heading"><span>FIELD NOTES</span><span class="live-indicator">● LIVE</span></div>
        <ul id="event-list" class="event-list"><li class="empty-event">The world is waking up.</li></ul>
      </section>
      <aside class="agent-inspector" id="agent-inspector" aria-label="Selected inhabitant" hidden>
        <div class="inspector-topline"><span>WORLD INSPECTOR</span><button id="close-inspector" class="close-button" type="button" aria-label="Close profile">×</button></div>
        <div id="inspector-agent-content" class="inspector-agent-content">
        <div class="agent-heading"><div class="agent-avatar">·</div><div><h2 id="inspector-name">Ari</h2><p id="inspector-meta">AGE 24 · FORAGER</p></div></div>
        <div class="inspector-status"><span>CURRENT INTENT</span><strong id="inspector-goal">Exploring</strong></div>
        <div class="inspector-status"><span>LOCATION</span><strong id="inspector-location">—</strong></div>
        <div class="inspector-status"><span>HOME</span><strong id="inspector-home">NONE</strong></div>
        <div class="needs-heading">CONDITION</div>
        <div class="need-row"><div><span>HUNGER</span><strong id="need-hunger-value">—</strong></div><div class="need-track"><i id="need-hunger"></i></div></div>
        <div class="need-row"><div><span>THIRST</span><strong id="need-thirst-value">—</strong></div><div class="need-track"><i id="need-thirst"></i></div></div>
        <div class="need-row"><div><span>ENERGY</span><strong id="need-energy-value">—</strong></div><div class="need-track"><i id="need-energy"></i></div></div>
        <div class="need-row"><div><span>HEALTH</span><strong id="need-health-value">—</strong></div><div class="need-track"><i id="need-health"></i></div></div>
        <div class="inventory-line"><span>INVENTORY</span><strong id="inspector-inventory">—</strong></div>
        <div class="inspector-actions"><button id="follow-agent" class="follow-button" type="button">FOLLOW</button></div>
      </div>
      <div id="inspector-details" class="inspector-detail-list" hidden></div>
      </aside>
      <canvas id="minimap" class="minimap" width="180" height="120" aria-label="World minimap; click to move the camera"></canvas>
      <button id="restore-ui" class="restore-ui-button" type="button" hidden>SHOW INTERFACE</button>
      <div class="map-hint">DRAG TO PAN <span>·</span> SCROLL TO ZOOM <span>·</span> CLICK A PERSON TO INSPECT <span>·</span> SELECT PEOPLE TO BOX-SELECT</div>
    </section>
  `;

  const required = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`GLOOMD interface element is missing: ${selector}`);
    return element;
  };

  return {
    canvas: required<HTMLCanvasElement>("#world-map"),
    minimapCanvas: required<HTMLCanvasElement>("#minimap"),
    newWorldButton: required<HTMLButtonElement>("#new-world"),
    activityPanel: required("#activity-panel"),
    activityList: required("#activity-list"),
    activityCount: required("#activity-count"),
    worldTime: required("#world-time"),
    population: required("#population"),
    deathCount: required("#death-count"),
    resourceSummary: required("#resource-summary"),
    stockpileSummary: required("#stockpile-summary"),
    homeCount: required("#home-count"),
    zoomLevel: required("#zoom-level"),
    playButton: required<HTMLButtonElement>("#play-toggle"),
    speedButtons: Array.from(root.querySelectorAll<HTMLButtonElement>("[data-speed]")),
    zoomInButton: required<HTMLButtonElement>("#zoom-in"),
    zoomOutButton: required<HTMLButtonElement>("#zoom-out"),
    resetViewButton: required<HTMLButtonElement>("#reset-view"),
    fitWorldButton: required<HTMLButtonElement>("#fit-world"),
    mapKeyToggleButton: required<HTMLButtonElement>("#map-key-toggle"),
    mapLegendPanel: required("#map-legend"),
    closeMapLegendButton: required<HTMLButtonElement>("#close-map-legend"),
    layerButtons: Array.from(root.querySelectorAll<HTMLButtonElement>("[data-layer]")),
    selectionModeButton: required<HTMLButtonElement>("#select-people"),
    selectionCount: required("#selection-count"),
    overlayToggleButton: required<HTMLButtonElement>("#overlay-toggle"),
    overlayPanel: required("#overlay-panel"),
    overlayButtons: Array.from(root.querySelectorAll<HTMLInputElement>("[data-overlay]")),
    hideUiButton: required<HTMLButtonElement>("#hide-ui"),
    restoreUiButton: required<HTMLButtonElement>("#restore-ui"),
    storageToggleButton: required<HTMLButtonElement>("#storage-toggle"),
    storagePanel: required("#storage-panel"),
    saveNowButton: required<HTMLButtonElement>("#save-now"),
    loadWorldButton: required<HTMLButtonElement>("#load-world"),
    exportWorldButton: required<HTMLButtonElement>("#export-world"),
    importWorldButton: required<HTMLButtonElement>("#import-world"),
    importFileInput: required<HTMLInputElement>("#import-world-file"),
    saveStatus: required("#save-status"),
    eventList: required("#event-list"),
    inspector: required("#agent-inspector"),
    inspectorName: required("#inspector-name"),
    inspectorAgentContent: required("#inspector-agent-content"),
    inspectorDetails: required("#inspector-details"),
    inspectorMeta: required("#inspector-meta"),
    inspectorGoal: required("#inspector-goal"),
    inspectorLocation: required("#inspector-location"),
    inspectorHome: required("#inspector-home"),
    inspectorInventory: required("#inspector-inventory"),
    closeInspectorButton: required<HTMLButtonElement>("#close-inspector"),
    followAgentButton: required<HTMLButtonElement>("#follow-agent"),
    needs: {
      hunger: { fill: required("#need-hunger"), value: required("#need-hunger-value") },
      thirst: { fill: required("#need-thirst"), value: required("#need-thirst-value") },
      energy: { fill: required("#need-energy"), value: required("#need-energy-value") },
      health: { fill: required("#need-health"), value: required("#need-health-value") }
    }
  };
}
