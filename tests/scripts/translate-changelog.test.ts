import { describe, it, expect } from 'vitest';
import { extractLatestSection, replaceSectionHeaders } from '../../scripts/translate-changelog.js';

describe('translate-changelog helpers', () => {
  describe('extractLatestSection', () => {
    it('should extract the first version section', () => {
      const content = `# Changelog

## [1.9.0](link) (2026-02-23)

### ✨ Features

* add new feature ([abc1234](link))

## [1.8.2](link) (2026-02-22)

### 🐛 Bug Fixes

* fix something ([def5678](link))
`;
      const result = extractLatestSection(content);
      expect(result).toContain('## [1.9.0]');
      expect(result).toContain('add new feature');
      expect(result).not.toContain('## [1.8.2]');
    });

    it('should return null for empty changelog', () => {
      const result = extractLatestSection('# Changelog\n\nNothing here.');
      expect(result).toBeNull();
    });

    it('should handle single version section', () => {
      const content = `# Changelog

## [1.0.0](link) (2026-01-01)

### ✨ Features

* initial release
`;
      const result = extractLatestSection(content);
      expect(result).toContain('## [1.0.0]');
      expect(result).toContain('initial release');
    });
  });

  describe('replaceSectionHeaders', () => {
    it('should translate known section headers', () => {
      const input = '### ✨ Features\n\n* something\n\n### 🐛 Bug Fixes\n\n* fix';
      const result = replaceSectionHeaders(input);
      expect(result).toContain('### ✨ 新功能');
      expect(result).toContain('### 🐛 问题修复');
    });

    it('should leave unknown headers unchanged', () => {
      const input = '### 🎉 Unknown Section\n\n* something';
      const result = replaceSectionHeaders(input);
      expect(result).toContain('### 🎉 Unknown Section');
    });
  });
});
