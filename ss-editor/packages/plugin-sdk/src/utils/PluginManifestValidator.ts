// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import type { RemotePluginManifest, RemotePluginEntry } from '../registry/RemotePluginLoader';
import { DeployMode } from '../types/DeployMode';

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class PluginManifestValidator {
  static validateManifest(manifest: RemotePluginManifest): ManifestValidationResult {
    const result: ManifestValidationResult = { valid: true, errors: [], warnings: [] };

    if (!manifest.name || typeof manifest.name !== 'string') {
      result.errors.push('manifest.name is required and must be a string');
    }
    if (!manifest.version || typeof manifest.version !== 'string') {
      result.errors.push('manifest.version is required and must be a string');
    }
    if (!Array.isArray(manifest.entries)) {
      result.errors.push('manifest.entries is required and must be an array');
    } else if (manifest.entries.length === 0) {
      result.warnings.push('manifest.entries is empty');
    } else {
      manifest.entries.forEach((entry, idx) => {
        const entryResult = PluginManifestValidator.validateEntry(entry, idx);
        result.errors.push(...entryResult.errors);
        result.warnings.push(...entryResult.warnings);
      });
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  static validateEntry(entry: RemotePluginEntry, index?: number): ManifestValidationResult {
    const prefix = index !== undefined ? `entries[${index}].` : '';
    const result: ManifestValidationResult = { valid: true, errors: [], warnings: [] };

    if (!entry.type || typeof entry.type !== 'string') {
      result.errors.push(`${prefix}type is required`);
    }
    if (!entry.category || typeof entry.category !== 'string') {
      result.errors.push(`${prefix}category is required`);
    }
    if (!entry.url || typeof entry.url !== 'string') {
      result.errors.push(`${prefix}url is required`);
    }
    if (!entry.version || typeof entry.version !== 'string') {
      result.errors.push(`${prefix}version is required`);
    }
    if (!entry.sdkVersionRange || typeof entry.sdkVersionRange !== 'string') {
      result.errors.push(`${prefix}sdkVersionRange is required`);
    }
    if (entry.deployMode !== DeployMode.DIRECTORY) {
      result.errors.push(`${prefix}deployMode must be "${DeployMode.DIRECTORY}"`);
    }

    if (entry.url && !entry.url.startsWith('http')) {
      result.warnings.push(`${prefix}url "${entry.url}" is not a full HTTP URL, remote loading may fail`);
    }

    if (entry.checksum && !entry.checksum.startsWith('sha256-')) {
      result.warnings.push(`${prefix}checksum should use "sha256-" prefix`);
    }

    const semverRegex = /^\d+\.\d+\.\d+(-[\w.]+)?(\+[\w.]+)?$/;
    if (entry.version && !semverRegex.test(entry.version)) {
      result.warnings.push(`${prefix}version "${entry.version}" is not valid semver`);
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  static checkSdkVersionCompatibility(
    entrySdkRange: string,
    currentSdkVersion: string
  ): { compatible: boolean; reason?: string } {
    if (!entrySdkRange || !currentSdkVersion) {
      return { compatible: false, reason: 'Missing SDK version range or current version' };
    }

    const range = entrySdkRange.replace(/^\^|~/, '');
    const [entryMajor, entryMinor] = range.split('.').map(Number);
    const [currentMajor, currentMinor] = currentSdkVersion.split('.').map(Number);

    if (isNaN(entryMajor) || isNaN(currentMajor)) {
      return { compatible: false, reason: 'Invalid SDK version format' };
    }

    if (entrySdkRange.startsWith('^')) {
      if (currentMajor === entryMajor) {
        return { compatible: true };
      }
      return {
        compatible: false,
        reason: `SDK major version mismatch: expected ^${range}, got ${currentSdkVersion}`,
      };
    }

    if (entrySdkRange.startsWith('~')) {
      if (currentMajor === entryMajor && currentMinor >= entryMinor) {
        return { compatible: true };
      }
      return {
        compatible: false,
        reason: `SDK version mismatch: expected ~${range}, got ${currentSdkVersion}`,
      };
    }

    if (currentMajor === entryMajor && currentMinor === entryMinor) {
      return { compatible: true };
    }
    return {
      compatible: false,
      reason: `SDK version mismatch: expected ${range}, got ${currentSdkVersion}`,
    };
  }
}