import { APP_VERSION } from "./app/version";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("GLOOMD root element was not found.");
}

root.dataset.appState = "initializing";
root.dataset.appVersion = APP_VERSION;
document.title = `GLOOMD ${APP_VERSION} — A living world`;
