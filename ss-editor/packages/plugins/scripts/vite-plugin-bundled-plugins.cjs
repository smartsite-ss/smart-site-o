// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const fs = require("fs");
const path = require("path");

const PLUGINS_ROOT = path.resolve(__dirname, "..");
const CATEGORIES_PATH = path.join(PLUGINS_ROOT, "categories.json");

let _categoriesCache = null;

function getCategories() {
  if (_categoriesCache) return _categoriesCache;
  var raw = JSON.parse(fs.readFileSync(CATEGORIES_PATH, "utf-8"));
  _categoriesCache = {
    bundled: raw
      .filter(function (c) {
        return c.deployMode === "bundled";
      })
      .map(function (c) {
        return c.id;
      }),
    directory: raw
      .filter(function (c) {
        return c.deployMode === "directory";
      })
      .map(function (c) {
        return c.id;
      }),
  };
  return _categoriesCache;
}

function scanPluginFiles(category, patternDir, globPattern, relativeBase) {
  var catDir = path.join(PLUGINS_ROOT, category);
  if (!fs.existsSync(catDir)) return [];

  var plugins = fs
    .readdirSync(catDir, { withFileTypes: true })
    .filter(function (d) {
      return d.isDirectory();
    });

  var result = [];
  for (var i = 0; i < plugins.length; i++) {
    var pluginName = plugins[i].name;
    var indexPath = path.join(catDir, pluginName, "index.ts");
    if (fs.existsSync(indexPath)) {
      var relPath = path.relative(relativeBase, indexPath).replace(/\\/g, "/");
      result.push({ relPath: relPath, indexPath: indexPath });
    }
  }
  return result;
}

/**
 * Scan all plugin locale files (zh-CN.json, en-US.json) so they can be
 * pre-merged into i18n BEFORE plugin modules are evaluated.
 * This prevents "Not found 'xxx.label' key" warnings caused by
 * @Graphic({name: i18n.global.t('xxx.label')}) decorators executing
 * before index.ts merges locales.
 */
function scanPluginLocales(category, relativeBase) {
  var catDir = path.join(PLUGINS_ROOT, category);
  if (!fs.existsSync(catDir)) return [];

  var plugins = fs
    .readdirSync(catDir, { withFileTypes: true })
    .filter(function (d) {
      return d.isDirectory();
    });

  var locales = [];
  for (var i = 0; i < plugins.length; i++) {
    var localeDir = path.join(catDir, plugins[i].name, "locales");
    if (!fs.existsSync(localeDir)) continue;

    var langFiles = fs
      .readdirSync(localeDir, { withFileTypes: true })
      .filter(function (f) {
        return f.isFile() && f.name.endsWith(".json");
      });

    for (var j = 0; j < langFiles.length; j++) {
      var fileName = langFiles[j].name;
      var lang = fileName.replace(".json", "");
      var localePath = path.join(localeDir, fileName);
      var relPath = path.relative(relativeBase, localePath).replace(/\\/g, "/");
      locales.push({ relPath: relPath, indexPath: localePath, lang: lang });
    }
  }
  return locales;
}

function scanPluginMediaFiles(category, relativeBase) {
  var catDir = path.join(PLUGINS_ROOT, category);
  if (!fs.existsSync(catDir)) return [];

  var plugins = fs
    .readdirSync(catDir, { withFileTypes: true })
    .filter(function (d) {
      return d.isDirectory();
    });

  var pngFiles = [];
  var jpgFiles = [];
  var indexFiles = [];

  for (var i = 0; i < plugins.length; i++) {
    var pluginDir = path.join(catDir, plugins[i].name);
    var entries = fs.readdirSync(pluginDir, { withFileTypes: true });

    for (var j = 0; j < entries.length; j++) {
      var file = entries[j];
      if (!file.isFile()) continue;
      var ext = path.extname(file.name).toLowerCase();
      var absPath = path.join(pluginDir, file.name);
      var relPath = path.relative(relativeBase, absPath).replace(/\\/g, "/");

      if (ext === ".png") {
        pngFiles.push({ relPath: relPath, indexPath: absPath });
      } else if (ext === ".jpg") {
        jpgFiles.push({ relPath: relPath, indexPath: absPath });
      }
    }

    var indexPath = path.join(pluginDir, "index.ts");
    if (fs.existsSync(indexPath)) {
      var irelPath = path.relative(relativeBase, indexPath).replace(/\\/g, "/");
      indexFiles.push({ relPath: irelPath, indexPath: indexPath });
    }
  }

  return { pngFiles: pngFiles, jpgFiles: jpgFiles, indexFiles: indexFiles };
}

function generateGlobModuleViaStaticImports(fileList, importPrefix) {
  var imports = [];
  var entries = [];
  var hasFiles = fileList.length > 0;

  if (hasFiles) {
    for (var i = 0; i < fileList.length; i++) {
      var file = fileList[i];
      var varName = importPrefix + "_" + i;
      var absPath = file.indexPath.replace(/\\/g, "/");
      imports.push("import * as " + varName + " from '" + absPath + "';");
      entries.push("  '" + absPath + "': " + varName + ",");
    }
  }

  return {
    imports: imports.join("\n"),
    entries: entries.join("\n"),
    hasFiles: hasFiles,
  };
}

function generateBundledPluginsModule(modulesDir) {
  var categories = getCategories();
  var allFiles = [];
  for (var i = 0; i < categories.bundled.length; i++) {
    var cat = categories.bundled[i];
    var files = scanPluginFiles(cat, null, null, modulesDir);
    for (var j = 0; j < files.length; j++) {
      allFiles.push(files[j]);
    }
  }

  var result = generateGlobModuleViaStaticImports(allFiles, "__bp");
  var lines = [
    "// AUTO-GENERATED by vite-plugin-bundled-plugins.cjs",
    "// Source: packages/plugins/categories.json",
    "// Generated: " + new Date().toISOString(),
    "",
    "export const BUNDLED_CATEGORIES = " +
      JSON.stringify(categories.bundled) +
      ";",
    "export const DIRECTORY_CATEGORIES = " +
      JSON.stringify(categories.directory) +
      ";",
  ];

  if (result.hasFiles) {
    lines.push(result.imports);
  }
  lines.push("");
  lines.push("export const bundledModules = {");
  if (result.hasFiles) {
    lines.push(result.entries);
  }
  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate a virtual module that exports all plugin locale data.
 * A regular file (apps/web/src/preload-locales.ts) imports this data
 * and merges it into i18n BEFORE ./plugins evaluates the plugin modules.
 */
function generatePluginLocalesModule(modulesDir) {
  var categories = getCategories();
  var allLocales = [];
  for (var i = 0; i < categories.bundled.length; i++) {
    var cat = categories.bundled[i];
    var locales = scanPluginLocales(cat, modulesDir);
    for (var j = 0; j < locales.length; j++) {
      allLocales.push(locales[j]);
    }
  }

  var lines = [
    "// AUTO-GENERATED by vite-plugin-bundled-plugins.cjs",
    "// Exports all plugin locale data for pre-merging into i18n",
    "// Generated: " + new Date().toISOString(),
  ];

  for (var li = 0; li < allLocales.length; li++) {
    lines.push(
      "import __pl_" +
        li +
        " from '" +
        allLocales[li].indexPath.replace(/\\/g, "/") +
        "';",
    );
  }

  lines.push("");
  lines.push("export const pluginLocales = [");
  for (var li = 0; li < allLocales.length; li++) {
    lines.push(
      "  { lang: '" + allLocales[li].lang + "', data: __pl_" + li + " },",
    );
  }
  lines.push("];");
  lines.push("");

  return lines.join("\n");
}

function generateBundledPluginModulesEditor(modulesDir) {
  var categories = getCategories();
  var allFiles = [];
  for (var i = 0; i < categories.bundled.length; i++) {
    var cat = categories.bundled[i];
    var files = scanPluginFiles(cat, null, null, modulesDir);
    for (var j = 0; j < files.length; j++) {
      allFiles.push(files[j]);
    }
  }

  var result = generateGlobModuleViaStaticImports(allFiles, "__ep");
  var lines = [
    "// AUTO-GENERATED by vite-plugin-bundled-plugins.cjs",
    "// Source: packages/plugins/categories.json",
    "// Generated: " + new Date().toISOString(),
  ];

  if (result.hasFiles) {
    lines.push(result.imports);
  }
  lines.push("");
  lines.push("export const bundledPluginModules = {");
  if (result.hasFiles) {
    lines.push(result.entries);
  }
  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

function generatePluginIconsModule(modulesDir) {
  var categories = getCategories();
  var allPng = [];
  var allJpg = [];
  var allIndex = [];

  for (var i = 0; i < categories.bundled.length; i++) {
    var cat = categories.bundled[i];
    var media = scanPluginMediaFiles(cat, modulesDir);
    for (var j = 0; j < media.pngFiles.length; j++) {
      allPng.push(media.pngFiles[j]);
    }
    for (var j = 0; j < media.jpgFiles.length; j++) {
      allJpg.push(media.jpgFiles[j]);
    }
    for (var j = 0; j < media.indexFiles.length; j++) {
      allIndex.push(media.indexFiles[j]);
    }
  }

  var pngResult = generateGlobModuleViaStaticImports(allPng, "__png");
  var jpgResult = generateGlobModuleViaStaticImports(allJpg, "__jpg");
  var idxResult = generateGlobModuleViaStaticImports(allIndex, "__pidx");

  var lines = [
    "// AUTO-GENERATED by vite-plugin-bundled-plugins.cjs",
    "// Source: packages/plugins/categories.json",
    "// Generated: " + new Date().toISOString(),
  ];

  if (pngResult.hasFiles) lines.push(pngResult.imports);
  if (jpgResult.hasFiles) lines.push(jpgResult.imports);
  if (idxResult.hasFiles) lines.push(idxResult.imports);

  lines.push("");
  lines.push("export var bundledPngModules = {");
  if (pngResult.hasFiles) lines.push(pngResult.entries);
  lines.push("};");
  lines.push("");
  lines.push("export var bundledJpgModules = {");
  if (jpgResult.hasFiles) lines.push(jpgResult.entries);
  lines.push("};");
  lines.push("");
  lines.push("export var bundledIndexModules = {");
  if (idxResult.hasFiles) lines.push(idxResult.entries);
  lines.push("};");
  lines.push("");

  return lines.join("\n");
}

/**
 * Generate a per-plugin locale merge module.  This is a side-effect module
 * that merges the plugin's own zh-CN.json / en-US.json into i18n at module
 * evaluation time.  Because it is a *dependency* of the Plugin class file
 * (injected via the transform hook as the very first import), its body
 * executes BEFORE the @Graphic decorator runs.
 */
function generateAutoLocaleModule(pluginDirPath) {
  var localeDir = path.join(pluginDirPath, "locales");
  if (!fs.existsSync(localeDir)) return "export {};";

  var langFiles = fs.readdirSync(localeDir).filter(function (f) {
    return f.endsWith(".json");
  });
  if (langFiles.length === 0) return "export {};";

  var lines = [];
  lines.push("import { i18n } from '@scada-editor/core';");
  for (var i = 0; i < langFiles.length; i++) {
    var fileName = langFiles[i];
    var lang = fileName.replace(".json", "");
    var absPath = path.join(localeDir, fileName).replace(/\\/g, "/");
    lines.push("import __plm_" + i + " from '" + absPath + "';");
  }
  for (var i = 0; i < langFiles.length; i++) {
    var lang = langFiles[i].replace(".json", "");
    lines.push("i18n.global.mergeLocaleMessage('" + lang + "', __plm_" + i + ");");
  }
  return lines.join("\n");
}

function vitePluginBundledPlugins() {
  var VIRTUAL_PREFIX = "\0virtual:";

  return {
    name: "vite-plugin-bundled-plugins",
    enforce: "pre",

    resolveId: function (id) {
      if (id === "virtual:bundled-plugins")
        return VIRTUAL_PREFIX + "bundled-plugins";
      if (id === "virtual:bundled-plugin-modules")
        return VIRTUAL_PREFIX + "bundled-plugin-modules";
      if (id === "virtual:plugin-icons") return VIRTUAL_PREFIX + "plugin-icons";
      if (id === "virtual:plugin-locales")
        return VIRTUAL_PREFIX + "plugin-locales";
      if (typeof id === "string" && id.startsWith("virtual:plugin-auto-locale"))
        return id; // keep as-is, no \0 prefix so workspace packages resolve
      return null;
    },

    load: function (id) {
      if (id === VIRTUAL_PREFIX + "bundled-plugins") {
        return generateBundledPluginsModule(
          path.resolve(PLUGINS_ROOT, "..", "..", "apps", "web", "src"),
        );
      }
      if (id === VIRTUAL_PREFIX + "bundled-plugin-modules") {
        return generateBundledPluginModulesEditor(
          path.resolve(PLUGINS_ROOT, "..", "editor", "src", "utils"),
        );
      }
      if (id === VIRTUAL_PREFIX + "plugin-icons") {
        return generatePluginIconsModule(
          path.resolve(PLUGINS_ROOT, "..", "editor", "src", "utils"),
        );
      }
      if (id === VIRTUAL_PREFIX + "plugin-locales") {
        return generatePluginLocalesModule(
          path.resolve(PLUGINS_ROOT, "..", "..", "apps", "web", "src"),
        );
      }
      if (typeof id === "string" && id.startsWith("virtual:plugin-auto-locale")) {
        // Parse dir= parameter from the virtual module id
        var dirParam = null;
        var qIndex = id.indexOf("?");
        if (qIndex >= 0) {
          var queryStr = id.substring(qIndex + 1);
          var pairs = queryStr.split("&");
          for (var pi = 0; pi < pairs.length; pi++) {
            var kv = pairs[pi].split("=");
            if (kv[0] === "dir") {
              dirParam = decodeURIComponent(kv[1]);
              break;
            }
          }
        }
        if (dirParam) {
          var pluginDir = path.join(PLUGINS_ROOT, dirParam);
          return generateAutoLocaleModule(pluginDir);
        }
        return "export {};";
      }
      return null;
    },

    /**
     * Transform hook: for every .ts file inside a plugin directory that has
     * a locales/ subdirectory, inject a side-effect import that merges the
     * plugin's locale messages into i18n BEFORE the @Graphic decorator runs.
     *
     * Why this works:
     *   - The injected import 'virtual:plugin-auto-locale?...' is a static
     *     dependency of the .ts file.
     *   - ES module semantics guarantee that dependencies are evaluated
     *     (including their body code) BEFORE the importing module's body.
     *   - So mergeLocaleMessage() runs BEFORE @Graphic({name: t(...)}).
     */
    transform: function (code, id) {
      if (!id.startsWith(PLUGINS_ROOT) || !id.endsWith(".ts")) return null;
      var pluginDir = path.dirname(id);
      var localeDir = path.join(pluginDir, "locales");
      if (!fs.existsSync(localeDir)) return null;

      // Check there's at least one .json locale file
      var hasJson = false;
      try {
        var entries = fs.readdirSync(localeDir);
        for (var ei = 0; ei < entries.length; ei++) {
          if (entries[ei].endsWith(".json")) { hasJson = true; break; }
        }
      } catch (_) {}
      if (!hasJson) return null;

      var relDir = path.relative(PLUGINS_ROOT, pluginDir).replace(/\\/g, "/");
      var injectImport = "import 'virtual:plugin-auto-locale?dir=" + encodeURIComponent(relDir) + "';\n";

      return injectImport + code;
    },

    handleHotUpdate: function (ctx) {
      if (ctx.file === CATEGORIES_PATH) {
        _categoriesCache = null;
        return [];
      }
    },
  };
}

module.exports = { vitePluginBundledPlugins };
