import type { AgentRole } from "./types";

export interface RoleVisual {
  label: string;
}

/** Occupations are shown in the People roster and profile, not as sprite badges. */
export const ROLE_VISUALS: Readonly<Record<AgentRole, RoleVisual>> = {
  forager: { label: "FORAGER" },
  fisher: { label: "FISHER" },
  farmer: { label: "FARMER" },
  hauler: { label: "HAULER" },
  builder: { label: "BUILDER" },
  generalist: { label: "UNASSIGNED" }
};
