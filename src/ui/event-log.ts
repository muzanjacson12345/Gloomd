import type { WorldEvent } from "../core/types";
import type { AppShell } from "./app-shell";

export function renderEventLog(shell: AppShell, events: readonly WorldEvent[]): void {
  const recent = events.slice(-4).reverse();
  shell.eventList.replaceChildren();
  if (recent.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-event";
    empty.textContent = "The world is waking up.";
    shell.eventList.append(empty);
    return;
  }
  for (const event of recent) {
    const item = document.createElement("li");
    const tick = document.createElement("span");
    const message = document.createElement("span");
    item.className = "event-item";
    tick.className = "event-tick";
    message.className = "event-message";
    tick.textContent = `T+${event.tick.toString().padStart(3, "0")}`;
    message.textContent = event.message;
    item.append(tick, message);
    shell.eventList.append(item);
  }
}
