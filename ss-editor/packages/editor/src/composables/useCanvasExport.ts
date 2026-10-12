// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

interface CanvasExportOptions {
  getSelectedGraphic: () => any;
  getCurrentPage: () => any;
  getCanvasElement: () => HTMLCanvasElement | null;
}

function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadImage(canvas: HTMLCanvasElement, filename: string) {
  const dataURL = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataURL;
  a.download = `${filename}.png`;
  a.click();
}

export function useCanvasExport(options: CanvasExportOptions) {
  const { getSelectedGraphic, getCurrentPage, getCanvasElement } = options;

  const exportGraphicData = () => {
    const graphic = getSelectedGraphic();
    if (!graphic) return;
    downloadJSON(graphic.toJSON(), `graphic-${graphic.id}`);
  };

  const exportSceneData = () => {
    const currentPage = getCurrentPage();
    if (!currentPage) return;
    downloadJSON(currentPage.toJSON(), `${currentPage.name || 'scene'}_${new Date().toISOString().slice(0, 10)}`);
  };

  const exportScene = () => {
    const canvas = getCanvasElement();
    if (!canvas) return;
    downloadImage(canvas, `scene_${Date.now()}`);
  };

  const previewGraphic = () => {
    // 预览功能 - 可后续扩展
  };

  return {
    exportGraphicData,
    exportSceneData,
    exportScene,
    previewGraphic,
  };
}
