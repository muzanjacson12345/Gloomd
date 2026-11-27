export type AgentNeed = "hunger" | "thirst" | "energy" | "health";
export interface NeedDisplay { fill: HTMLElement; value: HTMLElement; }

export interface AppShell {
  canvas: HTMLCanvasElement;
  worldTime: HTMLElement;
  population: HTMLElement;
  resourceSummary: HTMLElement;
  zoomLevel: HTMLElement;
  playButton: HTMLButtonElement;
  speedButtons: HTMLButtonElement[];
  zoomInButton: HTMLButtonElement;
  zoomOutButton: HTMLButtonElement;
  resetViewButton: HTMLButtonElement;
  eventList: HTMLElement;
  inspector: HTMLElement;
  inspectorName: HTMLElement;
  inspectorMeta: HTMLElement;
  inspectorGoal: HTMLElement;
  inspectorLocation: HTMLElement;
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
          <div class="readout resource-readout"><span class="readout-label">AVAILABLE</span><strong id="resource-summary">FOOD — · WOOD — · STONE —</strong></div>
        </div>
      </header>
      <div class="map-tools" aria-label="Map view controls">
        <button class="icon-button" id="zoom-out" type="button" aria-label="Zoom out">−</button>
        <span id="zoom-level" class="zoom-level">1.0×</span>
        <button class="icon-button" id="zoom-in" type="button" aria-label="Zoom in">+</button>
        <span class="tool-separator"></span>
        <button class="icon-button home-button" id="reset-view" type="button" aria-label="Reset map view">⌂</button>
      </div>
      <nav class="playback-controls" aria-label="Simulation playback">
        <button class="play-button" id="play-toggle" type="button">Ⅱ &nbsp; PAUSE</button>
        <span class="playback-separator"></span><span class="speed-label">SPEED</span>
        <button class="speed-button is-active" data-speed="1" type="button" aria-pressed="true">1×</button>
        <button class="speed-button" data-speed="2" type="button" aria-pressed="false">2×</button>
        <button class="speed-button" data-speed="4" type="button" aria-pressed="false">4×</button>
      </nav>
      <section class="event-feed" aria-label="Recent world events">
        <div class="feed-heading"><span>FIELD NOTES</span><span class="live-indicator">● LIVE</span></div>
        <ul id="event-list" class="event-list"><li class="empty-event">The world is waking up.</li></ul>
      </section>
      <aside class="agent-inspector" id="agent-inspector" aria-label="Selected inhabitant" hidden>
        <div class="inspector-topline"><span>INHABITANT PROFILE</span><button id="close-inspector" class="close-button" type="button" aria-label="Close profile">×</button></div>
        <div class="agent-heading"><div class="agent-avatar">·</div><div><h2 id="inspector-name">Ari</h2><p id="inspector-meta">AGE 24 · FORAGER</p></div></div>
        <div class="inspector-status"><span>CURRENT INTENT</span><strong id="inspector-goal">Exploring</strong></div>
        <div class="inspector-status"><span>LOCATION</span><strong id="inspector-location">—</strong></div>
        <div class="needs-heading">CONDITION</div>
        <div class="need-row"><div><span>HUNGER</span><strong id="need-hunger-value">—</strong></div><div class="need-track"><i id="need-hunger"></i></div></div>
        <div class="need-row"><div><span>THIRST</span><strong id="need-thirst-value">—</strong></div><div class="need-track"><i id="need-thirst"></i></div></div>
        <div class="need-row"><div><span>ENERGY</span><strong id="need-energy-value">—</strong></div><div class="need-track"><i id="need-energy"></i></div></div>
        <div class="need-row"><div><span>HEALTH</span><strong id="need-health-value">—</strong></div><div class="need-track"><i id="need-health"></i></div></div>
        <div class="inventory-line"><span>INVENTORY</span><strong id="inspector-inventory">—</strong></div>
        <div class="inspector-actions"><button id="follow-agent" class="follow-button" type="button">FOLLOW</button></div>
      </aside>
      <div class="map-hint">DRAG TO PAN <span>·</span> SCROLL TO ZOOM <span>·</span> SELECT AN INHABITANT</div>
    </section>
  `;

  const required = <T extends Element>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`GLOOMD interface element is missing: ${selector}`);
    return element;
  };

  return {
    canvas: required<HTMLCanvasElement>("#world-map"),
    worldTime: required("#world-time"),
    population: required("#population"),
    resourceSummary: required("#resource-summary"),
    zoomLevel: required("#zoom-level"),
    playButton: required<HTMLButtonElement>("#play-toggle"),
    speedButtons: Array.from(root.querySelectorAll<HTMLButtonElement>("[data-speed]")),
    zoomInButton: required<HTMLButtonElement>("#zoom-in"),
    zoomOutButton: required<HTMLButtonElement>("#zoom-out"),
    resetViewButton: required<HTMLButtonElement>("#reset-view"),
    eventList: required("#event-list"),
    inspector: required("#agent-inspector"),
    inspectorName: required("#inspector-name"),
    inspectorMeta: required("#inspector-meta"),
    inspectorGoal: required("#inspector-goal"),
    inspectorLocation: required("#inspector-location"),
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
