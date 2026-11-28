import type { AgentRole } from "./types";

export interface RoleVisual {
  label: string;
  color: string;
  symbol: string;
}

export const ROLE_VISUALS: Readonly<Record<AgentRole, RoleVisual>> = {
  forager: { label: "FORAGER", color: "#9fbd78", symbol: "G" },
  fisher: { label: "FISHER", color: "#72b6ce", symbol: "F" },
  farmer: { label: "FARMER", color: "#d6b35c", symbol: "A" },
  hauler: { label: "HAULER", color: "#c39868", symbol: "H" },
  builder: { label: "BUILDER", color: "#b9a7a0", symbol: "B" },
  generalist: { label: "GENERALIST", color: "#d0b88b", symbol: "·" }
};
