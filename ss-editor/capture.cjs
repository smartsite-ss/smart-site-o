// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const { chromium } = require('playwright-core');
const path = require('path');

const IMG_DIR = 'f:\\work\\smartdata\\202603_trace\\trunk\\code\\ss-v7\\ss-run\\ss\\data\\faq\\zh-CN\\ss-data\\00-manual\\images';
const EN_IMG_DIR = 'f:\\work\\smartdata\\202603_trace\\trunk\\code\\ss-v7\\ss-run\\ss\\data\\faq\\en-US\\ss-data\\00-manual\\images';
const BASE_URL = 'http://localhost:8765/mockups.html';

const pages = [
  'system-home', 'login-init', 'login-page', 'project-list',
  'device-list', 'device-detail', 'alarm-rules', 'report-list', 'realtime-data'
];

const nameMap = {
  'device-detail': 'device-detail-tags',
};

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  for (const hash of pages) {
    const url = `${BASE_URL}#${hash}`;
    const fileName = (nameMap[hash] || hash) + '.png';
    console.log(`Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(IMG_DIR, fileName), fullPage: false });
    await page.screenshot({ path: path.join(EN_IMG_DIR, fileName), fullPage: false });
    console.log(`Saved ${fileName}`);
  }

  await browser.close();
  console.log('All 9 screenshots done!');
})();