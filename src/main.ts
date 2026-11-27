import { APP_VERSION } from "./app/version";
import { startApp } from "./app/app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("GLOOMD root element was not found.");
}

root.dataset.appState = "initializing";
root.dataset.appVersion = APP_VERSION;
document.title = `GLOOMD ${APP_VERSION} — A living world`;

try {
  startApp(root);
  root.dataset.appState = "running";
} catch (error) {
  root.dataset.appState = "error";
  root.textContent = error instanceof Error
    ? `GLOOMD could not start: ${error.message}`
    : "GLOOMD could not start.";
  throw error;
}
