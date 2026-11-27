import { describe, expect, it } from "vitest";
import { describeStartupError } from "../../src/app/startup-error";

describe("startup failure explanation", () => {
  it("shows an Error message", () => {
    expect(describeStartupError(new Error("Canvas is unavailable"))).toBe("Canvas is unavailable");
  });

  it("shows a non-empty string reason", () => {
    expect(describeStartupError("Module failed to load")).toBe("Module failed to load");
  });

  it("reads a message property from an error-like object", () => {
    expect(describeStartupError({ message: "Unexpected module failure" })).toBe("Unexpected module failure");
  });

  it("uses a helpful fallback for unknown reasons", () => {
    expect(describeStartupError(null)).toMatch(/could not finish starting/i);
  });
});
