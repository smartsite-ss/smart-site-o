// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

const DEFAULT_PROJECTS_DIR = 'F:\\work\\smartdata\\202603_trace\\trunk\\code\\ss-v7\\ss-run\\ss\\services\\ss-data\\data\\projects';

const STORAGE_KEY = 'scada-editor-project-dir';

export class ProjectConfig {
  private static projectsDir: string | null = null;

  static getProjectsDir(): string {
    if (this.projectsDir) return this.projectsDir;

    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.projectsDir = saved;
        return saved;
      }
    }

    return DEFAULT_PROJECTS_DIR;
  }

  static setProjectsDir(dir: string): void {
    this.projectsDir = dir;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, dir);
    }
  }

  static getDefaultProjectsDir(): string {
    return DEFAULT_PROJECTS_DIR;
  }

  static resetToDefault(): void {
    this.projectsDir = null;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}