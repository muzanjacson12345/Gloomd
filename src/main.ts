import "./styles.css";
import { startApp } from "./app/app";
import { describeStartupError } from "./app/startup-error";
import { APP_VERSION } from "./app/version";

const root = document.querySelector<HTMLElement>("#app");

function showStartupFailure(reason: unknown): void {
  if (!root) return;
  root.dataset.appState = "error";

  const panel = document.createElement("section");
  const title = document.createElement("h1");
  const message = document.createElement("p");
  const detail = document.createElement("pre");
  const reload = document.createElement("button");

  panel.className = "startup-failure";
  panel.setAttribute("role", "alert");
  title.textContent = "GLOOMD could not start";
  message.textContent = "The world did not finish loading. You do not need to wait here; refresh the page to try again.";
  detail.textContent = describeStartupError(reason);
  reload.type = "button";
  reload.className = "startup-reload";
  reload.textContent = "REFRESH GLOOMD";
  reload.addEventListener("click", () => window.location.reload());
  panel.append(title, message, detail, reload);
  root.replaceChildren(panel);
}

if (!root) {
  throw new Error("GLOOMD root element was not found.");
}

root.dataset.appState = "starting";
root.dataset.appVersion = APP_VERSION;
document.title = `GLOOMD ${APP_VERSION} — A living world`;

function registerOfflineAppShell(): void {
  if (!("serviceWorker" in navigator)) return;

  // Vite's configured base keeps the worker and its scope inside /Gloomd/
  // on GitHub Pages rather than accidentally registering it at the domain root.
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL
  }).catch((error: unknown) => {
    // Offline support is an enhancement; a worker failure must not stop play.
    console.warn("GLOOMD offline app setup could not be registered.", error);
  });
}

try {
  startApp(root);
  root.dataset.appState = "ready";
  registerOfflineAppShell();
} catch (error) {
  showStartupFailure(error);
}
