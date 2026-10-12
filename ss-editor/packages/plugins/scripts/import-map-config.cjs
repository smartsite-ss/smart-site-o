// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const { existsSync, readdirSync } = require("fs");
const { join, resolve } = require("path");

var PLUGINS_ROOT = resolve(__dirname, "..");

function findInPnpm(editorDir, packageName) {
  var pnpmDir = join(editorDir, "node_modules", ".pnpm");
  if (!existsSync(pnpmDir)) return null;

  var dirs = readdirSync(pnpmDir);
  var pnpmPkgName = packageName.replace(/\//g, "+");
  var pkgDir = null;
  for (var i = 0; i < dirs.length; i++) {
    if (dirs[i].startsWith(pnpmPkgName + "@")) {
      pkgDir = dirs[i];
      break;
    }
  }
  if (!pkgDir) return null;

  return join(pnpmDir, pkgDir, "node_modules", packageName);
}

function resolveDevPath(packageName, relativePath, editorDir) {
  var pnpmPkgDir = findInPnpm(editorDir, packageName);
  if (pnpmPkgDir) {
    var fullPath = join(pnpmPkgDir, relativePath);
    if (existsSync(fullPath)) {
      return "/@fs/" + fullPath.replace(/\\/g, "/");
    }
  }

  return (
    "/@fs/" +
    resolve(editorDir, "node_modules", packageName, relativePath).replace(
      /\\/g,
      "/",
    )
  );
}

function generateDevImportMap(editorDir) {
  var root = editorDir || PLUGINS_ROOT;

  return {
    imports: {
      vue: resolveDevPath("vue", "dist/vue.esm-browser.js", root),
      "vue-i18n": resolveDevPath(
        "vue-i18n",
        "dist/vue-i18n.esm-browser.js",
        root,
      ),
      pinia: resolveDevPath("pinia", "dist/pinia.esm-browser.js", root),
      "vue-demi": resolveDevPath("vue-demi", "lib/index.mjs", root),
      "@vue/devtools-api": resolveDevPath(
        "@vue/devtools-api",
        "lib/esm/index.js",
        root,
      ),
      "@scada-editor/core":
        "/@fs/" +
        resolve(PLUGINS_ROOT, "..", "core", "src", "index.ts").replace(
          /\\/g,
          "/",
        ),
      "@scada-editor/plugin-sdk":
        "/@fs/" +
        resolve(PLUGINS_ROOT, "..", "plugin-sdk", "src", "index.ts").replace(
          /\\/g,
          "/",
        ),
      // Map @plugins/ bare specifier to @fs protocol so that browser-side
      // dynamic import("@plugins/electric/busbar/index.ts") resolves to
      // the actual TS source file via Vite's @fs serving.
      "@plugins/": "/@fs/" + PLUGINS_ROOT.replace(/\\/g, "/") + "/",
      three: resolveDevPath("three", "build/three.module.js", root),
    },
  };
}

module.exports = {
  generateDevImportMap: generateDevImportMap,
  findInPnpm: findInPnpm,
  resolveDevPath: resolveDevPath,
  PLUGINS_ROOT: PLUGINS_ROOT,
};