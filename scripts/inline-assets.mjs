import { readFile, rm, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";

function findAssetTag(html, pattern, description) {
  const match = html.match(pattern);
  if (!match?.[1]) {
    throw new Error("The Vite build is missing its " + description + " bundle reference in index.html.");
  }
  return { tag: match[0], reference: match[1] };
}

function assetFile(buildDirectory, reference, expectedExtension) {
  const filename = basename(new URL(reference, "https://gloomd.invalid").pathname);
  if (!filename.endsWith(expectedExtension) || filename === expectedExtension) {
    throw new Error("Unexpected Vite asset path: " + reference);
  }
  return resolve(buildDirectory, "assets", filename);
}

/**
 * Turn the Vite output into a single HTML document.
 * This avoids separate JS/CSS fetches on case-sensitive project-page paths,
 * including stale or unavailable asset URLs after a Pages deployment.
 */
export async function inlineBuiltAssets(buildDirectory = resolve("dist")) {
  const indexPath = resolve(buildDirectory, "index.html");
  let html = await readFile(indexPath, "utf8");

  const scriptTag = findAssetTag(
    html,
    /<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["']([^"']+)["'])[^>]*>\s*<\/script>/i,
    "module entry bundle"
  );
  const stylesheetTag = findAssetTag(
    html,
    /<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/i,
    "stylesheet bundle"
  );

  const scriptPath = assetFile(buildDirectory, scriptTag.reference, ".js");
  const stylesheetPath = assetFile(buildDirectory, stylesheetTag.reference, ".css");
  const [javascript, stylesheet] = await Promise.all([
    readFile(scriptPath, "utf8"),
    readFile(stylesheetPath, "utf8")
  ]);

  const safeJavascript = javascript.replace(/<\/script/gi, "<\\/script");
  const safeStylesheet = stylesheet.replace(/<\/style/gi, "<\\/style");
  const inlineScript = '<script type="module">\n' + safeJavascript + '\n</script>';
  const inlineStyle = '<style>\n' + safeStylesheet + '\n</style>';

  html = html.replace(scriptTag.tag, inlineScript);
  html = html.replace(stylesheetTag.tag, inlineStyle);

  if (/<script\b[^>]*\bsrc=/i.test(html) || /<link\b[^>]*\brel=["']stylesheet["'][^>]*\bhref=/i.test(html)) {
    throw new Error("The generated page still contains an external JavaScript or stylesheet request.");
  }

  await writeFile(indexPath, html, "utf8");
  await Promise.all([rm(scriptPath, { force: true }), rm(stylesheetPath, { force: true })]);
  return { indexPath, javascriptBytes: Buffer.byteLength(javascript), stylesheetBytes: Buffer.byteLength(stylesheet) };
}

const buildDirectory = resolve(process.argv[2] ?? "dist");
try {
  const result = await inlineBuiltAssets(buildDirectory);
  console.log(
    "Created a self-contained GLOOMD page at " + result.indexPath +
    " (" + result.javascriptBytes + " JS bytes + " +
    result.stylesheetBytes + " CSS bytes)."
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
