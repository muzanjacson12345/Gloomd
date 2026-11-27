import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const scriptPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../scripts/inline-assets.mjs"
);
const temporaryDirectories: string[] = [];

function createBuildFixture(): string {
  const directory = mkdtempSync(join(tmpdir(), "gloomd-inline-build-"));
  temporaryDirectories.push(directory);
  mkdirSync(join(directory, "assets"), { recursive: true });
  writeFileSync(
    join(directory, "index.html"),
    `<!doctype html>
<html><head>
  <link rel="stylesheet" crossorigin href="/Gloomd/assets/index-test.css">
</head><body>
  <main id="app">Loading</main>
  <script>window.watchdogInstalled = true;</script>
  <script type="module" crossorigin src="/Gloomd/assets/index-test.js"></script>
</body></html>`
  );
  writeFileSync(join(directory, "assets", "index-test.js"), 'window.appLoaded = true; const htmlText = "</script>";');
  writeFileSync(join(directory, "assets", "index-test.css"), "body { background: #111; }");
  return directory;
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe("single-file production build", () => {
  it("inlines the Vite JavaScript and CSS bundles into index.html", () => {
    const directory = createBuildFixture();
    const result = spawnSync(process.execPath, [scriptPath, directory], {
      encoding: "utf8"
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    const html = readFileSync(join(directory, "index.html"), "utf8");

    expect(html).toContain('<style>\nbody { background: #111; }\n</style>');
    expect(html).toContain('<script type="module">');
    expect(html).toContain("window.appLoaded = true");
    expect(html).toContain("const htmlText = \"<\\/script>\"");
    expect(html).toContain("window.watchdogInstalled = true");
    expect(html).not.toMatch(/<script[^>]+\bsrc=/i);
    expect(html).not.toMatch(/<link[^>]+\brel=["']stylesheet["'][^>]+\bhref=/i);
    expect(existsSync(join(directory, "assets", "index-test.js"))).toBe(false);
    expect(existsSync(join(directory, "assets", "index-test.css"))).toBe(false);
  });

  it("fails clearly when the built page has no Vite entry bundle", () => {
    const directory = mkdtempSync(join(tmpdir(), "gloomd-inline-invalid-"));
    temporaryDirectories.push(directory);
    writeFileSync(join(directory, "index.html"), "<!doctype html><html></html>");

    const result = spawnSync(process.execPath, [scriptPath, directory], {
      encoding: "utf8"
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("module entry bundle");
  });
});
