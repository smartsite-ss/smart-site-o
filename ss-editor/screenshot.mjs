// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, '..', 'docs', '01-功能说明', 'scimages');
const BASE_URL = 'http://localhost:5173';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // 1. Open the app - main editor interface
  console.log('1. Opening main app...');
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await sleep(3000);

  // Try to create a new project or see what's available
  // Look for "新建项目" button
  const newProjectBtn = page.locator('button:has-text("新建"), button:has-text("新建项目"), a:has-text("新建"), a:has-text("新建项目")');
  if (await newProjectBtn.count() > 0) {
    await newProjectBtn.first().click();
    await sleep(2000);
    // Fill project name
    const nameInput = page.locator('input[placeholder*="名称"], input[placeholder*="项目名"], input[placeholder*="name"]');
    if (await nameInput.count() > 0) {
      await nameInput.first().fill('测试项目');
      await sleep(500);
      // Click confirm
      const confirmBtn = page.locator('button:has-text("确认"), button:has-text("确定"), button:has-text("创建")');
      if (await confirmBtn.count() > 0) {
        await confirmBtn.first().click();
        await sleep(3000);
      }
    }
  }

  // Wait for page to fully render
  await sleep(2000);

  // Take full-page screenshot - the main editor overview
  console.log('2. Screenshot: main editor overview...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '01-main-editor-overview.png'), fullPage: true });
  console.log('   -> 01-main-editor-overview.png');

  // Screenshot: top toolbar area
  console.log('3. Screenshot: top toolbar...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '02-top-toolbar.png'),
    clip: { x: 0, y: 0, width: 1920, height: 60 },
  });
  console.log('   -> 02-top-toolbar.png');

  // Click on canvas area to ensure it's focused
  const canvasArea = page.locator('canvas');
  if (await canvasArea.count() > 0) {
    await canvasArea.first().click();
    await sleep(1000);

    // Screenshot: canvas area
    console.log('4. Screenshot: canvas area...');
    const canvasBox = await canvasArea.first().boundingBox();
    if (canvasBox) {
      await page.screenshot({
        path: path.join(OUTPUT_DIR, '03-canvas-area.png'),
        clip: {
          x: Math.max(0, canvasBox.x - 50),
          y: Math.max(0, canvasBox.y - 50),
          width: Math.min(canvasBox.width + 100, 1920 - canvasBox.x + 50),
          height: Math.min(canvasBox.height + 100, 1080 - canvasBox.y + 50),
        },
      });
      console.log('   -> 03-canvas-area.png');
    }
  }

  // Look for graphic library / left sidebar
  console.log('5. Screenshot: left sidebar...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '04-left-graphic-library.png'),
    clip: { x: 0, y: 40, width: 320, height: 950 },
  });
  console.log('   -> 04-left-graphic-library.png');

  // Look for property panel / right sidebar
  console.log('6. Screenshot: right property panel...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '05-right-property-panel.png'),
    clip: { x: 1600, y: 40, width: 320, height: 950 },
  });
  console.log('   -> 05-right-property-panel.png');

  // Try to click on a graphic in the library to add to canvas
  // Look for draggable items in the left panel
  const graphicItems = page.locator('.graphic-item, .plugin-item, [data-plugin-type], .sidebar-item');
  if (await graphicItems.count() > 0) {
    await graphicItems.first().click();
    await sleep(1000);
  }

  // Screenshot: context menu / right-click on canvas
  if (await canvasArea.count() > 0) {
    await canvasArea.first().click({ button: 'right' });
    await sleep(800);
    console.log('7. Screenshot: right-click context menu...');
    await page.screenshot({ path: path.join(OUTPUT_DIR, '06-context-menu.png'), fullPage: true });
    console.log('   -> 06-context-menu.png');
    // Escape to close menu
    await page.keyboard.press('Escape');
    await sleep(500);
  }

  // Try to find and click data source related buttons
  // Look for data panel elements
  console.log('8. Looking for data panels...');
  const dataTabBtns = page.locator('button:has-text("数据"), div:has-text("数据面板"), span:has-text("数据源")');
  const hasClicked = false;

  // Try various selectors for property panel data section
  const propertyPanelSelectors = [
    '.property-panel',
    '.right-panel',
    '[data-panel="property"]',
    '#property-panel',
    '.attribute-panel',
    '[class*="PropertyPanel"]',
  ];

  for (const selector of propertyPanelSelectors) {
    const panel = page.locator(selector);
    if (await panel.count() > 0) {
      const panelBox = await panel.first().boundingBox();
      if (panelBox) {
        await page.screenshot({
          path: path.join(OUTPUT_DIR, '07-property-panel-data.png'),
          clip: { x: panelBox.x, y: panelBox.y, width: panelBox.width, height: panelBox.height },
        });
        console.log('   -> 07-property-panel-data.png');
        break;
      }
    }
  }

  // Bottom status bar
  console.log('9. Screenshot: bottom status bar...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '08-bottom-status-bar.png'),
    clip: { x: 0, y: 1040, width: 1920, height: 40 },
  });
  console.log('   -> 08-bottom-status-bar.png');

  // Page tabs area
  console.log('10. Screenshot: page tabs...');
  await page.screenshot({
    path: path.join(OUTPUT_DIR, '09-page-tabs.png'),
    clip: { x: 200, y: 40, width: 1200, height: 45 },
  });
  console.log('   -> 09-page-tabs.png');

  // Full page without clip for the complete UI
  console.log('11. Full page final screenshot...');
  await page.screenshot({ path: path.join(OUTPUT_DIR, '10-full-ui.png'), fullPage: true });
  console.log('   -> 10-full-ui.png');

  await browser.close();
  console.log('\nAll screenshots saved to:', OUTPUT_DIR);
}

main().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});