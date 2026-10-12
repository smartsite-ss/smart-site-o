// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs module before importing the module under test
const mockFs = {
  readdirSync: vi.fn(),
  statSync: vi.fn(),
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
};

vi.mock('fs', () => mockFs);

// Dynamic import after mock setup
const scannerModule = await import('../scanner/index');

const { scanComponents, scanCategories, _discoverCategories } = scannerModule as {
  scanComponents: (pluginsDir: string, options?: Record<string, unknown>) => Promise<{ type: string; category: string; primaryCategory?: string; dirPath: string; hasGraphicVue: boolean; hasIconVue: boolean; hasPng: boolean; hasSvg: boolean; packageJson?: Record<string, unknown> }[]>;
  scanCategories: (pluginsDir: string) => Promise<Record<string, { type: string; category: string; primaryCategory?: string; dirPath: string; hasGraphicVue: boolean; hasIconVue: boolean; hasPng: boolean; hasSvg: boolean; packageJson?: Record<string, unknown> }[]>>;
  _discoverCategories: (pluginsDir: string) => string[];
};

function mockDirEntry(name: string, isDirectory: boolean) {
  return {
    name,
    isDirectory: () => isDirectory,
    isFile: () => !isDirectory,
    isSymbolicLink: () => false,
  };
}

function _setupComponentDir(
  category: string,
  type: string,
  files: string[],
  pkgJson?: Record<string, unknown>
) {
  const dirPath = `/plugins/${category}/${type}`;
  mockFs.existsSync.mockImplementation((p: string) => {
    if (p === '/plugins') return true;
    if (p === `/plugins/${category}`) return true;
    if (p === dirPath) return true;
    for (const f of files) {
      if (p === `${dirPath}/${f}`) return true;
    }
    if (pkgJson && p === `${dirPath}/package.json`) return true;
    return false;
  });

  mockFs.readFileSync.mockImplementation((p: string) => {
    if (pkgJson && p === `${dirPath}/package.json`) {
      return JSON.stringify(pkgJson);
    }
    return '';
  });
}

describe('scanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ================================================================
  // _discoverCategories
  // ================================================================
  describe('_discoverCategories', () => {
    // TC-SCANNER-001
    it('should discover all valid category directories', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        mockDirEntry('basic', true),
        mockDirEntry('industrial', true),
        mockDirEntry('chart', true),
      ]);

      const result = _discoverCategories('/plugins');
      expect(result).toEqual(['basic', 'chart', 'industrial']);
    });

    // TC-SCANNER-002
    it('should exclude directories starting with dot', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        mockDirEntry('.git', true),
        mockDirEntry('.hidden', true),
        mockDirEntry('basic', true),
        mockDirEntry('industrial', true),
      ]);

      const result = _discoverCategories('/plugins');
      expect(result).toEqual(['basic', 'industrial']);
      expect(result).not.toContain('.git');
      expect(result).not.toContain('.hidden');
    });

    // TC-SCANNER-003
    it('should exclude node_modules, __tests__, dist, build directories', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        mockDirEntry('node_modules', true),
        mockDirEntry('__tests__', true),
        mockDirEntry('dist', true),
        mockDirEntry('build', true),
        mockDirEntry('basic', true),
        mockDirEntry('industrial', true),
      ]);

      const result = _discoverCategories('/plugins');
      expect(result).toEqual(['basic', 'industrial']);
      expect(result).not.toContain('node_modules');
      expect(result).not.toContain('__tests__');
      expect(result).not.toContain('dist');
      expect(result).not.toContain('build');
    });

    // TC-SCANNER-004
    it('should return empty array for non-existent directory', () => {
      mockFs.existsSync.mockReturnValue(false);

      const result = _discoverCategories('/nonexistent');
      expect(result).toEqual([]);
    });

    // TC-SCANNER-005
    it('should filter out files (non-directory entries)', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readdirSync.mockReturnValue([
        mockDirEntry('basic', true),
        mockDirEntry('README.md', false),
        mockDirEntry('index.ts', false),
        mockDirEntry('industrial', true),
      ]);

      const result = _discoverCategories('/plugins');
      expect(result).toEqual(['basic', 'industrial']);
    });
  });

  // ================================================================
  // scanComponents
  // ================================================================
  describe('scanComponents', () => {
    // TC-SCANNER-010
    it('should scan all categories and return ComponentInfo[]', async () => {
      // Mock category discovery
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/industrial') return true;
        if (p === '/plugins/basic/button') return true;
        if (p === '/plugins/basic/button/Graphic.vue') return true;
        if (p === '/plugins/basic/button/Icon.vue') return true;
        if (p === '/plugins/basic/button/button.png') return true;
        if (p === '/plugins/basic/button/button.svg') return true;
        if (p === '/plugins/basic/button/package.json') return true;
        if (p === '/plugins/industrial/tank') return true;
        if (p === '/plugins/industrial/tank/Graphic.vue') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins') {
          return [mockDirEntry('basic', true), mockDirEntry('industrial', true)];
        }
        if (p === '/plugins/basic') {
          return [mockDirEntry('button', true)];
        }
        if (p === '/plugins/industrial') {
          return [mockDirEntry('tank', true)];
        }
        return [];
      });

      mockFs.readFileSync.mockImplementation((p: string) => {
        if (p === '/plugins/basic/button/package.json') {
          return JSON.stringify({ name: 'button', version: '1.0' });
        }
        return '';
      });

      const result = await scanComponents('/plugins');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        type: 'button',
        category: 'basic',
        hasGraphicVue: true,
        hasIconVue: true,
        hasPng: true,
        hasSvg: true,
        packageJson: { name: 'button', version: '1.0' },
      });
      expect(result[1]).toMatchObject({
        type: 'tank',
        category: 'industrial',
        hasGraphicVue: true,
        hasIconVue: false,
        hasPng: false,
        hasSvg: false,
      });
    });

    // TC-SCANNER-011
    it('should filter by categories option', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/basic/button') return true;
        if (p === '/plugins/basic/button/Graphic.vue') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins') {
          return [];
        }
        if (p === '/plugins/basic') {
          return [mockDirEntry('button', true)];
        }
        return [];
      });

      const result = await scanComponents('/plugins', { categories: ['basic'] });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('button');
      expect(result[0].category).toBe('basic');
    });

    // TC-SCANNER-012
    it('should include empty categories when includeEmpty is true', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/empty-cat') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins') {
          return [mockDirEntry('basic', true), mockDirEntry('empty-cat', true)];
        }
        if (p === '/plugins/basic') {
          return [];
        }
        if (p === '/plugins/empty-cat') {
          return [];
        }
        return [];
      });

      const result = await scanComponents('/plugins', { includeEmpty: true });

      expect(result).toHaveLength(0);
    });

    // TC-SCANNER-013
    it('should skip non-existent categories in filter', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/nonexistent') return false;
        if (p === '/plugins/basic/button') return true;
        if (p === '/plugins/basic/button/Graphic.vue') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins/basic') {
          return [mockDirEntry('button', true)];
        }
        return [];
      });

      const result = await scanComponents('/plugins', {
        categories: ['basic', 'nonexistent'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].category).toBe('basic');
    });

    // TC-SCANNER-014
    it('should handle case-insensitive file matching (graphic.vue)', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/basic/button') return true;
        if (p === '/plugins/basic/button/graphic.vue') return true;
        if (p === '/plugins/basic/button/icon.vue') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins') {
          return [mockDirEntry('basic', true)];
        }
        if (p === '/plugins/basic') {
          return [mockDirEntry('button', true)];
        }
        return [];
      });

      const result = await scanComponents('/plugins');

      expect(result).toHaveLength(1);
      expect(result[0].hasGraphicVue).toBe(true);
      expect(result[0].hasIconVue).toBe(true);
    });

    // TC-SCANNER-015
    it('should return empty array for empty plugins directory', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        return false;
      });

      mockFs.readdirSync.mockReturnValue([]);

      const result = await scanComponents('/plugins');
      expect(result).toEqual([]);
    });

    // TC-SCANNER-016
    it('should return empty array for non-existent plugins directory', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);

      const result = await scanComponents('/nonexistent');
      expect(result).toEqual([]);
    });

    // TC-SCANNER-017
    it('should detect component with only Graphic.vue', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/basic/button') return true;
        if (p === '/plugins/basic/button/Graphic.vue') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins') return [mockDirEntry('basic', true)];
        if (p === '/plugins/basic') return [mockDirEntry('button', true)];
        return [];
      });

      const result = await scanComponents('/plugins');

      expect(result).toHaveLength(1);
      expect(result[0].hasGraphicVue).toBe(true);
      expect(result[0].hasIconVue).toBe(false);
      expect(result[0].hasPng).toBe(false);
      expect(result[0].hasSvg).toBe(false);
    });

    // TC-SCANNER-018
    it('should detect component with package.json', async () => {
      const pkg = { name: 'my-plugin', version: '2.0.0', description: 'A test plugin' };
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/basic/button') return true;
        if (p === '/plugins/basic/button/package.json') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins') return [mockDirEntry('basic', true)];
        if (p === '/plugins/basic') return [mockDirEntry('button', true)];
        return [];
      });

      mockFs.readFileSync.mockImplementation((p: string) => {
        if (p === '/plugins/basic/button/package.json') return JSON.stringify(pkg);
        return '';
      });

      const result = await scanComponents('/plugins');

      expect(result).toHaveLength(1);
      expect(result[0].packageJson).toEqual(pkg);
    });

    // TC-SCANNER-019
    it('should handle invalid package.json gracefully', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/basic/button') return true;
        if (p === '/plugins/basic/button/package.json') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins') return [mockDirEntry('basic', true)];
        if (p === '/plugins/basic') return [mockDirEntry('button', true)];
        return [];
      });

      mockFs.readFileSync.mockReturnValue('{ invalid json }');

      const result = await scanComponents('/plugins');

      expect(result).toHaveLength(1);
      expect(result[0].packageJson).toBeUndefined();
    });

    // TC-SCANNER-020
    it('should sort components alphabetically by type', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/basic/zzz') return true;
        if (p === '/plugins/basic/aaa') return true;
        if (p === '/plugins/basic/mmm') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins') return [mockDirEntry('basic', true)];
        if (p === '/plugins/basic') return [
          mockDirEntry('zzz', true),
          mockDirEntry('aaa', true),
          mockDirEntry('mmm', true),
        ];
        return [];
      });

      const result = await scanComponents('/plugins');

      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('aaa');
      expect(result[1].type).toBe('mmm');
      expect(result[2].type).toBe('zzz');
    });
  });

  // ================================================================
  // scanCategories
  // ================================================================
  describe('scanCategories', () => {
    // TC-SCANNER-030
    it('should return categorized results', async () => {
      mockFs.existsSync.mockImplementation((p: string) => {
        if (p === '/plugins') return true;
        if (p === '/plugins/basic') return true;
        if (p === '/plugins/industrial') return true;
        if (p === '/plugins/basic/button') return true;
        if (p === '/plugins/basic/button/Graphic.vue') return true;
        if (p === '/plugins/industrial/tank') return true;
        if (p === '/plugins/industrial/tank/Graphic.vue') return true;
        return false;
      });

      mockFs.readdirSync.mockImplementation((p: string) => {
        if (p === '/plugins') {
          return [mockDirEntry('basic', true), mockDirEntry('industrial', true)];
        }
        if (p === '/plugins/basic') {
          return [mockDirEntry('button', true)];
        }
        if (p === '/plugins/industrial') {
          return [mockDirEntry('tank', true)];
        }
        return [];
      });

      const result = await scanCategories('/plugins');

      expect(result).toHaveProperty('basic');
      expect(result).toHaveProperty('industrial');
      expect(result.basic).toHaveLength(1);
      expect(result.basic[0].type).toBe('button');
      expect(result.basic[0].category).toBe('basic');
      expect(result.industrial).toHaveLength(1);
      expect(result.industrial[0].type).toBe('tank');
      expect(result.industrial[0].category).toBe('industrial');
    });

    // TC-SCANNER-031
    it('should return empty object for non-existent directory', async () => {
      mockFs.existsSync.mockReturnValue(false);
      mockFs.readdirSync.mockReturnValue([]);

      const result = await scanCategories('/nonexistent');
      expect(result).toEqual({});
    });
  });
});