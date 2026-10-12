// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

// Types
export * from './types';

// Scanner - discover components
export { scanComponents, scanCategories } from './scanner/index';
export type { ComponentInfo, ScanOptions } from './types';

// SVG Extractor - get SVG from Graphic.vue
export { extractSvg, extractAllSvgs } from './svg-extractor/index';
export type { SvgExtractOptions } from './types';

// PNG Renderer - render PNG from SVG
export { renderPng, renderPngToFile, renderComponentPng, closeBrowser } from './png-renderer/index';
export type { PngRenderOptions } from './types';

// Full pipeline
export { generateIcons } from './pipeline';
export type { GenerateOptions, GenerateResult } from './types';
