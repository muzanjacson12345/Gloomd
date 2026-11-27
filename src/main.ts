const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("GLOOMD root element was not found.");
}

root.dataset.appState = "initializing";
