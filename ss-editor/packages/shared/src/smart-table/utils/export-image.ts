// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

/**
 * PNG 导出 by html2canvas
 * 
 * 注意：需要先安装 html2canvas
 *   pnpm --filter @scada-editor/system add html2canvas
 */
export async function exportToImage(
  tableEl: HTMLElement,
  filename: string,
): Promise<void> {
  const { default: html2canvas } = await import('html2canvas');

  const canvas = await html2canvas(tableEl, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  });

  canvas.toBlob((blob) => {
    if (!blob) return;
    downloadBlob(blob, `${filename}.png`);
  }, 'image/png');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
