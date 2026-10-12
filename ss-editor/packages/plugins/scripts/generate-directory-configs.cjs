// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const {
  readdirSync,
  writeFileSync,
  existsSync,
  readFileSync,
  mkdirSync,
} = require("fs");
const { join, resolve } = require("path");

const PLUGINS_ROOT = resolve(__dirname, "..");
const CATEGORIES_PATH = join(PLUGINS_ROOT, "categories.json");
const EDITOR_ROOT = resolve(__dirname, "..", "..", "..");
const ENV_PRODUCTION_PATH = join(EDITOR_ROOT, "apps", "web", ".env.production");

function loadEnvFile() {
  if (!existsSync(ENV_PRODUCTION_PATH)) return;
  const content = readFileSync(ENV_PRODUCTION_PATH, "utf-8");
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    let value = trimmed.substring(eqIdx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Dev mode (--dev flag): skip loading .env.production so VITE_DEPLOY_BASE
// stays undefined → isDev = true → generates @plugins/.../index.ts URLs
// that Vite resolves via its alias to live TypeScript source.
// Without --dev: load .env.production → VITE_DEPLOY_BASE=/ →
// CDN_BASE=/plugins → isDev = false → generates production .mjs URLs.
if (!process.argv.includes('--dev')) {
  loadEnvFile();
}

function loadDirectoryCategories() {
  if (!existsSync(CATEGORIES_PATH)) {
    throw new Error("categories.json not found: " + CATEGORIES_PATH);
  }
  const config = JSON.parse(readFileSync(CATEGORIES_PATH, "utf-8"));
  return config
    .filter(function (c) {
      return c.deployMode === "directory";
    })
    .map(function (c) {
      return c.id;
    });
}

function extractPluginInfo(indexPath, category, pluginName) {
  const content = readFileSync(indexPath, "utf-8");

  const typeMatch = content.match(/type:\s*['"]([^'"]+)['"]/);
  const labelMatch = content.match(
    /label:\s*(?:\(\)\s*=>\s*)?(?:i18n\.global\.t\(['"]([^'"]+)['"]\)|['"]([^'"]+)['"])/,
  );
  const labelEnMatch = content.match(/labelEn:\s*['"]([^'"]+)['"]/);

  var version = "0.1.0";
  var pluginDir = join(PLUGINS_ROOT, category, pluginName);
  var pkgPath = join(pluginDir, "package.json");
  if (existsSync(pkgPath)) {
    try {
      var pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      version = pkg.version || "0.1.0";
    } catch (e) {}
  }

  return {
    type: (typeMatch && typeMatch[1]) || pluginName,
    category: category,
    label: (labelMatch && (labelMatch[1] || labelMatch[2])) || pluginName,
    labelEn: (labelEnMatch && labelEnMatch[1]) || pluginName,
    version: version,
  };
}

function generateCategoryManifest(category, plugins) {
  var deployBase = process.env.VITE_DEPLOY_BASE;
  var CDN_BASE = deployBase
    ? deployBase + "plugins"
    : process.env.PLUGIN_CDN_URL || "";
  var isDev = !CDN_BASE;

  var entries = plugins.map(function (p) {
    var url;
    if (isDev) {
      url = "@plugins/" + p.category + "/" + p.type + "/index.ts";
    } else {
      url =
        CDN_BASE +
        "/" +
        p.category +
        "/" +
        p.type +
        "/" +
        p.version +
        "/index.mjs";
    }

    return {
      type: p.type,
      category: p.category,
      label: p.label || p.type,
      labelEn: p.labelEn || p.type,
      url: url,
      version: p.version,
      checksum: "",
      deployMode: "directory",
      sdkVersionRange: "^1.0.0",
    };
  });

  // 构建新 manifest（不含 generatedAt，用于内容比对）
  var newManifest = {
    name: "scada-editor-plugins-" + category,
    version: "1.0.0",
    entries: entries,
  };

  // 读取已有 manifest，比对 entries 是否有变化
  var manifestPath = join(PLUGINS_ROOT, category, "plugin-manifest.json");
  var existingManifest = null;
  if (existsSync(manifestPath)) {
    try {
      existingManifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    } catch (e) {
      existingManifest = null;
    }
  }

  // entries 内容相同则跳过写入（避免 generatedAt 时间戳导致的无意义变更）
  var entriesChanged =
    !existingManifest ||
    JSON.stringify(existingManifest.entries) !==
      JSON.stringify(newManifest.entries);

  if (!entriesChanged) {
    console.log("  " + category + ": manifest unchanged, skipping write");
    // 仍需同步 publicDir 副本（如果缺失或内容不一致）
    // 注意：生产模式下也必须同步，否则 public/ 中残留的旧 manifest
    // （可能含 /@fs/ 开发态 URL）会被 Vite 原样拷贝到 dist/，
    // 导致生产环境浏览器请求 /@fs/F:/... 这种 Vite dev server 专属路径。
    syncPublicManifest(category, manifestPath);
    return;
  }

  // entries 有变化：写入新 manifest（更新 generatedAt 时间戳）
  var manifest = {
    name: newManifest.name,
    version: newManifest.version,
    generatedAt: new Date().toISOString(),
    entries: newManifest.entries,
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // 无论 dev/prod 模式都同步到 publicDir：
  // 生产构建时 Vite 会把 public/ 原样拷贝到 dist/，所以 public/ 中的
  // manifest 必须是生产态 URL（/plugins/.../index.mjs），否则浏览器会
  // 请求开发态的 /@fs/ 路径导致 404。
  syncPublicManifest(category, manifestPath);
}

/**
 * 同步 packages/plugins/{category}/plugin-manifest.json 到
 * apps/web/public/plugins/{category}/plugin-manifest.json。
 * 仅当目标缺失或内容不同时写入，避免无意义的文件变更。
 */
function syncPublicManifest(category, manifestPath) {
  var publicDir = join(
    PLUGINS_ROOT,
    "..",
    "..",
    "apps",
    "web",
    "public",
    "plugins",
    category,
  );
  var publicManifestPath = join(publicDir, "plugin-manifest.json");
  var srcContent = readFileSync(manifestPath, "utf-8");
  var needWrite = true;
  if (existsSync(publicManifestPath)) {
    try {
      var dstContent = readFileSync(publicManifestPath, "utf-8");
      needWrite = dstContent !== srcContent;
    } catch (_e) {
      needWrite = true;
    }
  }
  if (needWrite) {
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
    }
    writeFileSync(publicManifestPath, srcContent);
    console.log("  " + category + ": synced manifest to public/plugins/");
  }
}

function parseArgs(args) {
  for (var i = 0; i < args.length; i++) {
    var arg = args[i];
    if (arg === "--all") {
      return loadDirectoryCategories();
    }
    if (arg.startsWith("--category=")) {
      return [arg.replace("--category=", "")];
    }
  }
  return args.length > 0 ? [args[0]] : loadDirectoryCategories();
}

function main() {
  const args = process.argv.slice(2);
  const categories = parseArgs(args);

  console.log("Generating directory manifests for: " + categories.join(", "));
  console.log("   Source: " + PLUGINS_ROOT);
  console.log();

  var totalGenerated = 0;

  for (var i = 0; i < categories.length; i++) {
    var category = categories[i];
    const categoryDir = join(PLUGINS_ROOT, category);
    if (!existsSync(categoryDir)) {
      console.log("  (not found) " + category);
      continue;
    }

    const plugins = readdirSync(categoryDir, { withFileTypes: true }).filter(
      function (d) {
        return d.isDirectory() && d.name !== "node_modules";
      },
    );

    var pluginInfos = [];

    for (var j = 0; j < plugins.length; j++) {
      var plugin = plugins[j];
      const pluginDir = join(categoryDir, plugin.name);
      const indexPath = join(pluginDir, "index.ts");

      if (!existsSync(indexPath)) {
        console.log("  (no index.ts) " + category + "/" + plugin.name);
        continue;
      }

      const info = extractPluginInfo(indexPath, category, plugin.name);
      pluginInfos.push(info);

      console.log(
        "  " + category + "/" + plugin.name + ' -> type="' + info.type + '"',
      );
      totalGenerated++;
    }

    generateCategoryManifest(category, pluginInfos);
    console.log(
      category + ": generated manifest with " + pluginInfos.length + " entries",
    );
    console.log();
  }

  console.log("Total manifests generated: " + totalGenerated);
}

main();
