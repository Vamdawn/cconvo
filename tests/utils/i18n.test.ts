import { describe, it, expect } from 'vitest';
import { t } from '../../src/utils/i18n.js';
import type { Language } from '../../src/utils/i18n.js';

describe('t (translate)', () => {
  describe('英文翻译', () => {
    const lang: Language = 'en';

    it('应返回英文翻译', () => {
      expect(t('userInput', lang)).toBe('User Input');
      expect(t('claudeResponse', lang)).toBe('Claude Response');
      expect(t('thinking', lang)).toBe('Thinking');
    });

    it('应返回 UI 相关翻译', () => {
      expect(t('selectConversation', lang)).toBe('Select a conversation');
      expect(t('noConversationsFound', lang)).toBe('No conversations found');
    });
  });

  describe('中文翻译', () => {
    const lang: Language = 'zh';

    it('应返回中文翻译', () => {
      expect(t('userInput', lang)).toBe('用户输入');
      expect(t('claudeResponse', lang)).toBe('Claude 响应');
      expect(t('thinking', lang)).toBe('思考过程');
    });

    it('应返回 UI 相关翻译', () => {
      expect(t('selectConversation', lang)).toBe('选择对话');
      expect(t('noConversationsFound', lang)).toBe('未找到对话');
    });
  });

  describe('键值回退', () => {
    it('应在键不存在时返回键名', () => {
      expect(t('nonExistentKey', 'en')).toBe('nonExistentKey');
      expect(t('nonExistentKey', 'zh')).toBe('nonExistentKey');
    });
  });
});
