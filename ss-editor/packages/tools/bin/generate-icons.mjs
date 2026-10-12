#!/usr/bin/env node
// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * SCADA Editor Component Icon Generator
 *
 * Auto-discovers plugins -> renders Vue component via Playwright -> extracts real SVG/PNG
 *
 * Usage:
 *   node generate-icons.mjs --all                    # All components
 *   node generate-icons.mjs --category electric       # By category
 *   node generate-icons.mjs --type daozha            # Single component
 *   node generate-icons.mjs --list                   # List only
 */

import {
  readFileSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
} from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const PLUGINS_DIR = resolve(ROOT, "../plugins");

// --- Argument Parser ---

function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    category: null,
    type: null,
    all: false,
    size: 128,
    format: "both",
    force: false,
    bg: "#ffffff",
    list: false,
    help: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--category" || a === "-c") opts.category = args[++i];
    else if (a === "--type" || a === "-t") opts.type = args[++i];
    else if (a === "--all" || a === "-a") opts.all = true;
    else if (a === "--size" || a === "-s") opts.size = +args[++i];
    else if (a === "--format" || a === "-f") opts.format = args[++i];
    else if (a === "--force") opts.force = true;
    else if (a === "--background") opts.bg = args[++i];
    else if (a === "--list") opts.list = true;
    else if (a === "--help" || a === "-h") opts.help = true;
  }
  return opts;
}

// --- Scanner: Discover components from plugins directory ---

const SKIP_DIRS = new Set([
  "locales",
  "node_modules",
  "__tests__",
  "dist",
  ".git",
  ".vscode",
]);

function scanPlugins(pluginsDir) {
  const categories = {};

  if (!existsSync(pluginsDir)) return categories;

  const catDirs = readdirSync(pluginsDir, { withFileTypes: true }).filter(
    (d) => d.isDirectory() && !d.name.startsWith(".") && !SKIP_DIRS.has(d.name),
  );

  for (const cat of catDirs) {
    const catPath = join(pluginsDir, cat.name);
    const components = [];

    const compDirs = readdirSync(catPath, { withFileTypes: true }).filter(
      (d) =>
        d.isDirectory() && !d.name.startsWith(".") && !SKIP_DIRS.has(d.name),
    );

    for (const comp of compDirs) {
      const compDir = join(catPath, comp.name);
      const files = readdirSync(compDir);

      const graphicVue =
        files.find((f) => f.endsWith("Graphic.vue") && !f.includes("Icon")) ||
        files.find((f) => f === "graphic.vue");

      const iconVue =
        files.find((f) => f.endsWith("Icon.vue") && !f.includes("Graphic")) ||
        files.find((f) => f === "icon.vue");

      const srcFile = graphicVue || iconVue;
      const isIconMode = !!iconVue && !graphicVue;
      const pkgJson = files.includes("package.json");
      const hasPng = files.some(
        (f) =>
          f.endsWith(".png") &&
          f.toLowerCase() === `${comp.name.toLowerCase()}.png`,
      );
      const hasSvg = files.some(
        (f) =>
          f.endsWith(".svg") &&
          f.toLowerCase() === `${comp.name.toLowerCase()}.svg`,
      );

      components.push({
        type: comp.name,
        category: cat.name,
        dir: compDir,
        graphicFile: graphicVue ? join(compDir, graphicVue) : null,
        iconFile: iconVue ? join(compDir, iconVue) : null,
        srcFile: srcFile ? join(compDir, srcFile) : null,
        isIconMode,
        hasPkg: pkgJson,
        hasPng,
        hasSvg,
      });
    }

    if (components.length > 0) {
      categories[cat.name] = components;
    }
  }

  return categories;
}

// --- Vue SFC Parser: Extract setup body and prop defaults ---

function extractSfcParts(vueFilePath) {
  if (!vueFilePath || !existsSync(vueFilePath)) return null;
  const content = readFileSync(vueFilePath, "utf-8");

  const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (!templateMatch) return null;
  const templateContent = templateMatch[1].trim();

  const scriptMatch = content.match(/<script\b[^>]*>([\s\S]*?)<\/script>/);
  const scriptTag = content.match(/<script\b([^>]*)>/);
  const isScriptSetup = scriptTag ? /\bsetup\b/.test(scriptTag[1]) : false;
  let setupBody = null;
  let propDefaults = parseDefaultsFromScript(scriptMatch ? scriptMatch[1] : "");

  if (scriptMatch) {
    const script = scriptMatch[1];
    if (isScriptSetup) {
      setupBody = script
        .replace(/import\s+.*?from\s+['"][^'"]+['"];?\s*\n?/g, "")
        .replace(/import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"];?\s*\n?/g, "")
        .replace(/defineProps\s*<[^>]*>\s*\(\s*\);?/g, "")
        .replace(/defineProps\s*\(\s*\{[^}]*\}\s*\);?/g, "")
        .replace(/withDefaults\s*\([^)]+\);?/g, "")
        .trim();
    } else {
      setupBody = extractSetupBody(script);
    }
  }

  return { templateContent, setupBody, propDefaults, isScriptSetup };
}

function parseDefaultsFromScript(scriptContent) {
  const defaults = {};
  // Match patterns like:  w: { type: Number, default: 40 }
  const propPattern =
    /(\w+):\s*\{\s*(?:type:\s*\w+\s*,\s*)?default:\s*([^,\n}]+)/g;
  let m;
  while ((m = propPattern.exec(scriptContent)) !== null) {
    const key = m[1];
    let val = m[2].trim();
    if (val === "false") val = false;
    else if (val === "true") val = true;
    else if (!isNaN(Number(val))) val = Number(val);
    else if (
      (val.startsWith("'") && val.endsWith("'")) ||
      (val.startsWith('"') && val.endsWith('"'))
    ) {
      val = val.slice(1, -1);
    }
    defaults[key] = val;
  }
  return defaults;
}

function extractSetupBody(scriptContent) {
  const setupMatch = scriptContent.match(/setup\s*\(\s*(?:props)?\s*\)\s*\{/);
  if (!setupMatch) return null;
  const start = setupMatch.index + setupMatch[0].length;
  let depth = 1;
  let i = start;
  while (i < scriptContent.length && depth > 0) {
    if (scriptContent[i] === "{") depth++;
    else if (scriptContent[i] === "}") depth--;
    i++;
  }
  return scriptContent.slice(start, i - 1).trim();
}

// --- TypeScript type annotation stripper ---

function stripTypeScript(code) {
  return code
    .replace(
      /\b(const|let|var)\s+(\w+)\s*:\s*[\w<>,\s\[\]]+\s*=\s*/g,
      "$1 $2 = ",
    )
    .replace(
      /(\w+)\s*:\s*(\w+(\[\])?)\s*([,)=])/g,
      (m, name, type, brackets, delim) => (/^\d/.test(name) ? m : name + delim),
    )
    .replace(/\)\s*:\s*\w+\s*\{/g, ") {")
    .replace(/\)\s*:\s*\w+\s*=>/g, ") =>")
    .replace(/\s+as\s+\w+(\s|[;,})])/g, "$1");
}

function buildVueScriptSource(
  setupCode,
  defaultProps,
  templateContent,
  isScriptSetup,
) {
  let s = "";
  s += "  var props = " + JSON.stringify(defaultProps) + ";\n";
  s += "  var t = function(k) { return k; };\n\n";
  if (isScriptSetup && setupCode) {
    const exports = collectScriptSetupExports(setupCode);
    const exportObj =
      exports.length > 0
        ? "{ " + exports.map((n) => n + ": " + n).join(", ") + " }"
        : "{}";
    s += "  Vue.createApp({\n";
    s += "    setup: function() {\n";
    s +=
      setupCode
        .split("\n")
        .map((l) => "      " + l)
        .join("\n") + "\n";
    s += "      return Object.assign({}, props, " + exportObj + ");\n";
    s += "    },\n";
    s += "    template: " + JSON.stringify(templateContent) + "\n";
    s += "  }).mount('#app');\n";
  } else if (setupCode) {
    s +=
      "  var setupResult = (function(props) { " +
      setupCode +
      " })(props) || {};\n";
    s += "\n";
    s += "  var _d = {};\n";
    s +=
      "  for (var k in setupResult) { if (Object.prototype.hasOwnProperty.call(setupResult, k)) _d[k] = setupResult[k]; }\n";
    s +=
      "  for (var k in props) { if (Object.prototype.hasOwnProperty.call(props, k)) _d[k] = props[k]; }\n";
    s += "\n";
    s += "  Vue.createApp({\n";
    s += "    setup: function() { return _d; },\n";
    s += "    template: " + JSON.stringify(templateContent) + "\n";
    s += "  }).mount('#app');\n";
  } else {
    s += "  var _d = {};\n";
    s +=
      "  for (var k in props) { if (Object.prototype.hasOwnProperty.call(props, k)) _d[k] = props[k]; }\n";
    s += "\n";
    s += "  Vue.createApp({\n";
    s += "    setup: function() { return _d; },\n";
    s += "    template: " + JSON.stringify(templateContent) + "\n";
    s += "  }).mount('#app');\n";
  }
  return s;
}

function collectScriptSetupExports(code) {
  const names = [];
  const lines = code.split("\n");
  let depth = 0;
  for (const line of lines) {
    if (depth === 0) {
      const m = line.match(/(?:const|let|var)\s+(\w+)\s*=/);
      if (m && !m[1].startsWith("_")) names.push(m[1]);
      const fm = line.match(/\bfunction\s+(\w+)\s*\(/);
      if (fm && !fm[1].startsWith("_")) names.push(fm[1]);
    }
    for (const ch of line) {
      if (ch === "{" || ch === "(") depth++;
      else if (ch === "}" || ch === ")") depth--;
    }
  }
  return names;
}

// --- Vue render page builder ---

function buildVueRenderHtml(
  templateContent,
  setupBody,
  propDefaults,
  isScriptSetup,
) {
  const defaultProps = {
    w: 100,
    h: 100,
    color: "#222222",
    backgroundColor: "transparent",
    lineWidth: 2,
    colors: ["#2080f0", "#18a058"],
    flowColor: ["#63e2b7"],
    pipeColor: ["#606266"],
    ...propDefaults,
  };

  let setupCode = "";
  if (setupBody) {
    setupCode = stripTypeScript(setupBody)
      .replace(/\bdefineComponent\b/g, "Vue.defineComponent")
      .replace(/\bcomputed\b/g, "Vue.computed")
      .replace(/\bref\b/g, "Vue.ref")
      .replace(/\breactive\b/g, "Vue.reactive")
      .replace(/\bwatch\b/g, "Vue.watch")
      .replace(/\bonMounted\b/g, "Vue.onMounted")
      .replace(/\bnextTick\b/g, "Vue.nextTick")
      .replace(/import\s*\{[^}]*\}\s*from\s*['"]@scada-editor\/core['"];?/g, "")
      .replace(/const\s*\{\s*t\s*\}\s*=\s*i18n\.global;?/g, "")
      .replace(/i18n\.global\.t/g, "t");
  }

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>*{margin:0;padding:0}body{display:flex;align-items:center;justify-content:center;min-width:${defaultProps.w + 32}px;min-height:${defaultProps.h + 32}px;overflow:hidden}svg{display:block}</style></head>
<body><div id="app"></div>
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<script>
(function() {
${buildVueScriptSource(setupCode, defaultProps, templateContent, isScriptSetup)}
})();
</script></body></html>`;
}

// --- Playwright Renderer ---

let _browser = null;

async function getBrowser() {
  if (_browser) return _browser;

  const candidates = [
    "playwright",
    join(process.cwd(), "node_modules", "playwright"),
    join(process.env.APPDATA || "", "npm", "node_modules", "playwright"),
    ...(process.env.NODE_PATH?.split(";")
      .filter(Boolean)
      .map((p) => join(p, "playwright")) || []),
    "C:/Program Files/nodejs/node_modules/playwright",
  ];

  let pw = null;
  for (const c of candidates) {
    try {
      pw = await import(
        c.startsWith("C:") || c.startsWith("F:") || c.includes(":")
          ? "file:///" + c.replace(/\\/g, "/") + "/index.mjs"
          : c
      );
      break;
    } catch {
      /* try next */
    }
  }

  if (!pw?.chromium) {
    throw new Error(
      "Playwright not found.\nInstall: npm install -g playwright && npx playwright install chromium\n" +
        "Or set NODE_PATH to include playwright location.",
    );
  }

  _browser = await pw.chromium.launch({ headless: true });
  return _browser;
}

// Renders a Vue .vue file to SVG string
async function renderVueToSvg(vueFilePath, options = {}) {
  const parts = extractSfcParts(vueFilePath);
  if (!parts) return null;

  const html = buildVueRenderHtml(
    parts.templateContent,
    parts.setupBody,
    parts.propDefaults,
    parts.isScriptSetup,
  );

  const browser = await getBrowser();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  try {
    await page.setContent(html, { waitUntil: "networkidle", timeout: 15000 });

    try {
      await page.waitForSelector("svg", { timeout: 5000 });
    } catch {
      if (errors.length > 0) {
        throw new Error(`Vue render error: ${errors.slice(0, 3).join(" | ")}`);
      }
      return null;
    }

    const svgOuterHTML = await page.evaluate(() => {
      const svg = document.querySelector("svg");
      if (!svg) return null;
      const clone = svg.cloneNode(true);
      clone.querySelectorAll("*").forEach((el) => {
        for (const attr of [...el.attributes]) {
          if (attr.name.startsWith("data-v-")) el.removeAttribute(attr.name);
        }
      });
      return clone.outerHTML;
    });

    return svgOuterHTML;
  } finally {
    await page.close();
  }
}

// Renders a Vue .vue file to PNG
async function renderVueToPng(vueFilePath, outputPath, options = {}) {
  const size = options.size || 128;
  const bg = options.bg || "#ffffff";

  const parts = extractSfcParts(vueFilePath);
  if (!parts) throw new Error("Cannot parse SFC");

  let setupCode = "";
  if (parts.setupBody) {
    setupCode = stripTypeScript(parts.setupBody)
      .replace(/\bdefineComponent\b/g, "Vue.defineComponent")
      .replace(/\bcomputed\b/g, "Vue.computed")
      .replace(/\bref\b/g, "Vue.ref")
      .replace(/\breactive\b/g, "Vue.reactive")
      .replace(/\bwatch\b/g, "Vue.watch")
      .replace(/\bonMounted\b/g, "Vue.onMounted")
      .replace(/\bnextTick\b/g, "Vue.nextTick")
      .replace(/import\s*\{[^}]*\}\s*from\s*['"]@scada-editor\/core['"];?/g, "")
      .replace(/const\s*\{\s*t\s*\}\s*=\s*i18n\.global;?/g, "")
      .replace(/i18n\.global\.t/g, "t");
  }

  const defaultProps = {
    w: 100,
    h: 100,
    color: "#222222",
    backgroundColor: "transparent",
    lineWidth: 2,
    colors: ["#2080f0", "#18a058"],
    flowColor: ["#63e2b7"],
    pipeColor: ["#606266"],
    ...parts.propDefaults,
  };

  const pageHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
*{margin:0;padding:0}
body{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bg};overflow:hidden}
#app{display:flex;align-items:center;justify-content:center;max-width:${size - 16}px;max-height:${size - 16}px}
svg{display:block;max-width:${size - 16}px;max-height:${size - 16}px}
</style></head>
<body><div id="app"></div>
<script src="https://unpkg.com/vue@3/dist/vue.global.prod.js"></script>
<script>
(function() {
${buildVueScriptSource(setupCode, defaultProps, parts.templateContent, parts.isScriptSetup)}
})();
</script></body></html>`;

  const browser = await getBrowser();
  const page = await browser.newPage();
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  try {
    await page.setContent(pageHtml, {
      waitUntil: "networkidle",
      timeout: 15000,
    });

    try {
      await page.waitForSelector("svg", { timeout: 5000 });
    } catch {
      if (errors.length > 0) {
        throw new Error(`Vue render error: ${errors.slice(0, 3).join(" | ")}`);
      }
      throw new Error("No SVG rendered");
    }

    await page.screenshot({
      path: outputPath,
      type: "png",
      fullPage: false,
    });
  } finally {
    await page.close();
  }
}

async function closeBrowser() {
  if (_browser) {
    try {
      await _browser.close();
    } catch {}
    _browser = null;
  }
}

// --- Output Helpers ---

const C = {
  r: "\x1b[31m",
  g: "\x1b[32m",
  y: "\x1b[33m",
  b: "\x1b[34m",
  m: "\x1b[35m",
  c: "\x1b[36m",
  w: "\x1b[37m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  rst: "\x1b[0m",
};

function log(c, ...a) {
  console.log(C[c], ...a, C.rst);
}

process.on("SIGINT", async () => {
  log("y", "\nInterrupted.");
  await closeBrowser();
  process.exit(130);
});
process.on("SIGTERM", async () => {
  await closeBrowser();
  process.exit(143);
});

// --- Main ---

async function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) {
    console.log(`
${C.b}+====================================================+
|     SCADA Editor Icon Generator CLI               |
+====================================================+${C.rst}

${C.y}Usage:${C.rst}
  node generate-icons.mjs [options]

${C.y}Options:${C.rst}
  ${C.g}--category, -c <name>${C.rst}   Generate icons for category (electric, mines, ...)
  ${C.g}--type, -t <name>${C.rst}       Generate single component icon
  ${C.g}--all, -a${C.rst}                 Generate ALL discovered components
  ${C.g}--size, -s <px>${C.rst}          Image size (default: 128)
  ${C.g}--format, -f <fmt>${C.rst}       png | svg | both (default: both)
  ${C.g}--force${C.rst}                 Regenerate existing files
  ${C.g}--background <color>${C.rst}     Background color (default: #ffffff)
  ${C.g}--list${C.rst}                  List components without generating
  ${C.g}--help, -h${C.rst}              Show this help

${C.y}Examples:${C.rst}
  node generate-icons.mjs --all
  node generate-icons.mjs --category electric
  node generate-icons.mjs --type daozha
  node generate-icons.mjs --list
`);
    process.exit(0);
  }

  const t0 = Date.now();
  log("b", `\n  SCADA Editor Icon Generator`);
  log(
    "dim",
    `   Size: ${opts.size}px | Format: ${opts.format} | BG: ${opts.bg}\n`,
  );

  const allCategories = scanPlugins(PLUGINS_DIR);

  let categories = allCategories;
  if (opts.category) {
    const filtered = {};
    if (allCategories[opts.category]) {
      filtered[opts.category] = allCategories[opts.category];
    }
    categories = filtered;
  }

  if (opts.list) {
    let total = 0;
    for (const [cat, comps] of Object.entries(categories)) {
      total += comps.length;
      log("w", `\n  ${C.m}[${cat}]${C.rst} (${comps.length})`);
      for (const c of comps) {
        const g = c.graphicFile
          ? C.g + "G"
          : c.iconFile
            ? C.m + "I"
            : C.dim + ".";
        const icons = [c.hasPng ? "PNG" : "", c.hasSvg ? "SVG" : ""]
          .filter(Boolean)
          .join(",");
        log(
          "dim",
          `    ${g} ${C.c}${c.type}${C.rst} ${icons ? "(" + icons + ")" : ""}`,
        );
      }
    }
    log(
      "g",
      `\n  Total: ${total} components in ${Object.keys(categories).length} categories`,
    );
    return;
  }

  let targets = [];
  for (const [, comps] of Object.entries(categories)) {
    for (const c of comps) {
      if (opts.type && c.type !== opts.type) continue;
      targets.push(c);
    }
  }

  if (targets.length === 0) {
    log("y", "  No matching components found.");
    return;
  }

  log("c", `  Found ${targets.length} component(s)\n`);

  const needSvg = opts.format === "svg" || opts.format === "both";
  const needPng = opts.format === "png" || opts.format === "both";
  let ok = 0,
    skip = 0,
    fail = 0;

  // Check if Vue CDN is reachable once
  let cdnReachable = true;
  try {
    const browser = await getBrowser();
    const testPage = await browser.newPage();
    try {
      await Promise.race([
        testPage.goto("https://unpkg.com/vue@3/dist/vue.global.prod.js", {
          timeout: 8000,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("CDN timeout")), 8000),
        ),
      ]);
    } catch {
      cdnReachable = false;
      log("y", "  Warning: Vue CDN unreachable, using offline fallback\n");
    }
    await testPage.close();
  } catch {
    cdnReachable = false;
  }

  for (let i = 0; i < targets.length; i++) {
    const c = targets[i];
    const prefix = `[${i + 1}/${targets.length}]`;

    if (!c.srcFile) {
      log("y", `  ${prefix} SKIP ${c.type} - no Graphic.vue or Icon.vue`);
      skip++;
      continue;
    }

    try {
      let svgContent = null;

      if (cdnReachable) {
        svgContent = await renderVueToSvg(c.srcFile);
      }

      // Fallback to regex extraction if CDN unavailable or Vue render fails
      if (!svgContent) {
        svgContent = extractSvgFromVueFallback(c.srcFile);
      }

      if (!svgContent) {
        log("y", `  ${prefix} SKIP ${c.type} - no SVG element in template`);
        skip++;
        continue;
      }

      if (needSvg) {
        const outPath = join(c.dir, `${c.type}.svg`);
        if (!existsSync(outPath) || opts.force) {
          writeFileSync(outPath, svgContent, "utf-8");
          log("g", `  ${prefix} OK  ${c.type}.svg`);
        } else {
          log("dim", `  ${prefix} -   ${c.type}.svg (exists)`);
        }
      }

      if (needPng) {
        const outPath = join(c.dir, `${c.type}.png`);
        if (!existsSync(outPath) || opts.force) {
          if (cdnReachable) {
            await renderVueToPng(c.srcFile, outPath, {
              size: opts.size,
              bg: opts.bg,
            });
          } else {
            await renderPngFallback(svgContent, outPath, {
              size: opts.size,
              bg: opts.bg,
            });
          }
          log("g", `  ${prefix} OK  ${c.type}.png`);
        } else {
          log("dim", `  ${prefix} -   ${c.type}.png (exists)`);
        }
      }

      ok++;
    } catch (err) {
      log("r", `  ${prefix} FAIL ${c.type}: ${err.message}`);
      fail++;
    }
  }

  await closeBrowser();

  const ms = Date.now() - t0;
  log("w", "\n  " + "-".repeat(40));
  log(
    "b",
    `  Result: ${C.g}${ok} ok${C.rst} / ${skip > 0 ? C.y + skip + " skip / " : ""}${fail > 0 ? C.r + fail + " fail" : ""}`,
  );
  log("dim", `  Time: ${ms < 1000 ? ms + "ms" : (ms / 1000).toFixed(1) + "s"}`);
}

// --- Fallback: Regex SVG extraction (for offline mode) ---

function extractSvgFromVueFallback(vueFilePath) {
  if (!vueFilePath || !existsSync(vueFilePath)) return null;

  const content = readFileSync(vueFilePath, "utf-8");
  const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
  if (!templateMatch) return null;

  let template = templateMatch[1];
  const svg = matchRootTag(template, "svg");
  if (!svg) return null;

  let cleaned = svg
    // Remove v-* directives
    .replace(
      /\s*v-(?:if|for|show|else|else-if|bind|model|on|html|text|cloak|pre|once|memo)\s*="[^"]*"/g,
      "",
    )
    // Remove @event handlers
    .replace(
      /\s*@(?:click|input|change|mouseover|mouseout|keydown|keyup|focus|blur|wheel|submit)[^\s=]*="[^"]*"/g,
      "",
    )
    // Remove {{ }} interpolations
    .replace(/\{\{[^}]*\}\}/g, "")
    // Convert known :attr bindings to static defaults
    .replace(/:width="[^"]*"/g, 'width="100"')
    .replace(/:height="[^"]*"/g, 'height="100"')
    .replace(/:w="[^"]*"/g, ':w="100"')
    .replace(/:h="[^"]*"/g, ':h="100"')
    .replace(/:viewBox="[^"]*"/g, 'viewBox="0 0 100 100"')
    .replace(/:color="[^"]*"/g, 'color="#222222"')
    .replace(/:stroke="[^"]*"/g, 'stroke="#222222"')
    .replace(/:fill="[^"]*"/g, 'fill="none"')
    .replace(/:r="[^"]*"/g, 'r="30"')
    .replace(/:rx="[^"]*"/g, 'rx="4"')
    .replace(/:ry="[^"]*"/g, 'ry="4"')
    .replace(/:stroke-width="[^"]*"/g, 'stroke-width="2"')
    .replace(/:font-size="[^"]*"/g, 'font-size="20"')
    .replace(/:x="[^"]*"/g, 'x="50"')
    .replace(/:y="[^"]*"/g, 'y="50"')
    .replace(/:x1="[^"]*"/g, 'x1="0"')
    .replace(/:y1="[^"]*"/g, 'y1="0"')
    .replace(/:x2="[^"]*"/g, 'x2="100"')
    .replace(/:y2="[^"]*"/g, 'y2="100"')
    .replace(/:cx="[^"]*"/g, 'cx="50"')
    .replace(/:cy="[^"]*"/g, 'cy="50"')
    .replace(/:d="[^"]*"/g, 'd="M0 0 L100 100"')
    .replace(/:points="[^"]*"/g, 'points="0,0 100,100"')
    .replace(/:stop-color="[^"]*"/g, 'stop-color="#222222"')
    .replace(/:stop-opacity="[^"]*"/g, 'stop-opacity="0.5"')
    .replace(/:opacity="[^"]*"/g, 'opacity="1"')
    .replace(/:transform="[^"]*"/g, 'transform="translate(0,0)"')
    .replace(/:class="[^"]*"/g, "")
    .replace(/:[a-zA-Z][a-zA-Z0-9-]*=(?:"[^"]*"|`[^`]*`)/g, "")
    // Remove expression fragments in static attrs
    .replace(/\bx1="[^"]*\/\s?\d/g, 'x1="0"')
    .replace(/\bx2="[^"]*\/\s?\d/g, 'x2="0"')
    .replace(/\by1="[^"]*\/\s?\d/g, 'y1="0"')
    .replace(/\by2="[^"]*\/\s?\d/g, 'y2="0"')
    .replace(/[\n\s]+&&[^\n<>]*/g, "")
    .replace(/[\n\s]+"[^"]*"[ \t]*\n/g, "\n")
    .replace(/\sclass="[^"]*-graphic[^"]*"/g, "")
    .replace(/\sclass="[^"]*Graphic[^"]*"/g, "");

  return cleaned.trim();
}

function matchRootTag(html, tagName) {
  const openRegex = new RegExp(`<${tagName}[\\s\\S]*?>`, "i");
  const openMatch = html.match(openRegex);
  if (!openMatch) return null;

  const startIdx = openMatch.index;
  let depth = 1;
  let i = startIdx + openMatch[0].length;

  while (i < html.length && depth > 0) {
    if (html[i] === "<") {
      if (html[i + 1] === "/") {
        const closeMatch = html
          .slice(i)
          .match(new RegExp(`</${tagName}\\s*>`, "i"));
        if (closeMatch) {
          depth--;
          if (depth === 0) {
            return html.slice(startIdx, i + closeMatch[0].length);
          }
          i += closeMatch[0].length;
          continue;
        }
      } else if (html[i + 1] !== "!") {
        const selfClose = html
          .slice(i)
          .match(/^<([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/>/);
        if (selfClose) {
          i += selfClose[0].length;
          continue;
        }
        const tagMatch = html.slice(i).match(/^<([a-zA-Z][a-zA-Z0-9]*)\b/);
        if (
          tagMatch &&
          !tagMatch[1].match(
            /^(br|hr|img|input|meta|link|area|base|col|embed|source|track|wbr)$/i,
          )
        ) {
          depth++;
        }
      }
    }
    i++;
  }

  return null;
}

// Fallback PNG renderer for offline mode
async function renderPngFallback(svgContent, outputPath, options = {}) {
  const size = options.size || 128;
  const bg = options.bg || "#ffffff";

  const browser = await getBrowser();
  const page = await browser.newPage();

  const html = `<!DOCTYPE html>
<html><head><style>
*{margin:0;padding:0}
body{width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:${bg}}
svg{max-width:${size - 16}px;max-height:${size - 16}px}
</style></head>
<body>${svgContent}</body></html>`;

  await page.setContent(html, {
    waitUntil: "domcontentloaded",
    timeout: 10000,
  });
  await new Promise((r) => setTimeout(r, 200));
  await page.screenshot({
    path: outputPath,
    type: "png",
    fullPage: false,
  });

  await page.close();
}

main().catch(async (e) => {
  log("r", `Fatal: ${e.message}`);
  await closeBrowser();
  process.exit(1);
});
