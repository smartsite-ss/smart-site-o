// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

export enum Language {
  ZH_CN = 'zh-CN',
  EN_US = 'en-US',
  ZH_TW = 'zh-TW',
  JA_JP = 'ja-JP',
  KO_KR = 'ko-KR',
  DE_DE = 'de-DE',
  FR_FR = 'fr-FR',
}

export const SUPPORTED_LANGUAGES = [Language.ZH_CN, Language.EN_US];

export const DEFAULT_LANGUAGE = Language.ZH_CN;

export const LANGUAGE_NAMES: Record<string, string> = {
  [Language.ZH_CN]: '简体中文',
  [Language.EN_US]: 'English',
  [Language.ZH_TW]: '繁體中文',
  [Language.JA_JP]: '日本語',
  [Language.KO_KR]: '한국어',
};
