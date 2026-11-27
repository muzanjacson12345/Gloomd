import { describe, expect, it } from "vitest";

describe("GLOOMD application version", () => {
  it("exports the initial application version", async () => {
    const modulePath = "../../src/app/version.ts";
    const versionModule = await import(/* @vite-ignore */ modulePath).catch(() => null);

    expect(versionModule?.APP_VERSION).toBe("0.1.0");
  });
});
