import { describe, expect, it } from "vitest";
import { APP_VERSION } from "../../src/app/version";

describe("GLOOMD application version", () => {
  it("exports the initial application version", () => {
    expect(APP_VERSION).toBe("0.1.0");
  });
});
