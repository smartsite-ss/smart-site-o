// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { StorageError, errorService } from '../utils/core/errors';

// 存储键名
const STORAGE_KEYS = {
  PROJECT: 'scada-editor-project',
  AUTO_SAVE: 'scada-editor-auto-save',
  SETTINGS: 'scada-editor-settings',
  PROJECTS: 'scada-editor-projects',
  TEMPLATES: 'scada-editor-templates',
};

// 保存数据到本地存储
export const saveToStorage = (key: string, data: any, throwOnError: boolean = false): void => {
  try {
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
  } catch (error) {
    const err = new StorageError('save', error instanceof Error ? error.message : 'Unknown error');
    errorService.record(err, `Storage save key: ${key}`);
    
    if (throwOnError) {
      throw err;
    }
    console.error('Error saving to storage:', error);
  }
};

// 从本地存储读取数据
export const loadFromStorage = (key: string, throwOnError: boolean = false): any => {
  try {
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) {
      return null;
    }
    return JSON.parse(serializedData);
  } catch (error) {
    const err = new StorageError('load', error instanceof Error ? error.message : 'Unknown error');
    errorService.record(err, `Storage load key: ${key}`);
    
    if (throwOnError) {
      throw err;
    }
    console.error('Error loading from storage:', error);
    return null;
  }
};

// 从本地存储删除数据
export const removeFromStorage = (key: string, throwOnError: boolean = false): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    const err = new StorageError('remove', error instanceof Error ? error.message : 'Unknown error');
    errorService.record(err, `Storage remove key: ${key}`);
    
    if (throwOnError) {
      throw err;
    }
    console.error('Error removing from storage:', error);
  }
};

// 清除所有存储数据
export const clearStorage = (throwOnError: boolean = false): void => {
  try {
    localStorage.clear();
  } catch (error) {
    const err = new StorageError('clear', error instanceof Error ? error.message : 'Unknown error');
    errorService.record(err, 'Storage clear');
    
    if (throwOnError) {
      throw err;
    }
    console.error('Error clearing storage:', error);
  }
};

// 保存项目数据
export const saveProject = (project: any, throwOnError: boolean = false): void => {
  saveToStorage(STORAGE_KEYS.PROJECT, project, throwOnError);
};

// 加载项目数据
export const loadProject = (throwOnError: boolean = false): any => {
  return loadFromStorage(STORAGE_KEYS.PROJECT, throwOnError);
};

// 保存自动保存数据
export const saveAutoSave = (data: any, throwOnError: boolean = false): void => {
  saveToStorage(STORAGE_KEYS.AUTO_SAVE, data, throwOnError);
};

// 加载自动保存数据
export const loadAutoSave = (throwOnError: boolean = false): any => {
  return loadFromStorage(STORAGE_KEYS.AUTO_SAVE, throwOnError);
};

// 保存设置数据
export const saveSettings = (settings: any, throwOnError: boolean = false): void => {
  saveToStorage(STORAGE_KEYS.SETTINGS, settings, throwOnError);
};

// 加载设置数据
export const loadSettings = (throwOnError: boolean = false): any => {
  const defaultSettings = {
    autoSave: true,
    autoSaveInterval: 30000,
  };
  const loaded = loadFromStorage(STORAGE_KEYS.SETTINGS, throwOnError);
  return loaded || defaultSettings;
};

// 保存项目列表
export const saveProjects = (projects: any[], throwOnError: boolean = false): void => {
  saveToStorage(STORAGE_KEYS.PROJECTS, projects, throwOnError);
};

// 加载项目列表
export const loadProjects = (throwOnError: boolean = false): any[] => {
  return loadFromStorage(STORAGE_KEYS.PROJECTS, throwOnError) || [];
};

// 保存模板列表
export const saveTemplates = (templates: any[], throwOnError: boolean = false): void => {
  saveToStorage(STORAGE_KEYS.TEMPLATES, templates, throwOnError);
};

// 加载模板列表
export const loadTemplates = (throwOnError: boolean = false): any[] => {
  return loadFromStorage(STORAGE_KEYS.TEMPLATES, throwOnError) || [];
};

// 清除自动保存数据
export const clearAutoSave = (throwOnError: boolean = false): void => {
  removeFromStorage(STORAGE_KEYS.AUTO_SAVE, throwOnError);
};

export default {
  saveToStorage,
  loadFromStorage,
  removeFromStorage,
  clearStorage,
  saveProject,
  loadProject,
  saveAutoSave,
  loadAutoSave,
  saveSettings,
  loadSettings,
  saveProjects,
  loadProjects,
  saveTemplates,
  loadTemplates,
  clearAutoSave,
};