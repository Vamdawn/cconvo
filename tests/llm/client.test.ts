import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('LLM Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('buildRequestForOpenAI', () => {
    it('should build correct OpenAI request', async () => {
      const { buildRequest } = await import('../../src/llm/client.js');
      const provider = {
        name: 'test',
        provider: 'openai' as const,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      };
      const options = {
        messages: [{ role: 'user' as const, content: 'hello' }],
        stream: false,
      };

      const { url, init } = buildRequest(provider, options);

      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(init.method).toBe('POST');
      const headers = init.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer sk-test');
      const body = JSON.parse(init.body as string);
      expect(body.model).toBe('gpt-4o');
      expect(body.messages).toHaveLength(1);
    });
  });

  describe('buildRequestForAnthropic', () => {
    it('should build correct Anthropic request', async () => {
      const { buildRequest } = await import('../../src/llm/client.js');
      const provider = {
        name: 'test',
        provider: 'anthropic' as const,
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'sk-ant-test',
        model: 'claude-sonnet-4-20250514',
      };
      const options = {
        messages: [
          { role: 'system' as const, content: 'You are helpful.' },
          { role: 'user' as const, content: 'hello' },
        ],
        stream: false,
      };

      const { url, init } = buildRequest(provider, options);

      expect(url).toBe('https://api.anthropic.com/v1/messages');
      const headers = init.headers as Record<string, string>;
      expect(headers['x-api-key']).toBe('sk-ant-test');
      expect(headers['anthropic-version']).toBe('2023-06-01');
      const body = JSON.parse(init.body as string);
      expect(body.system).toBe('You are helpful.');
      // system 消息应从 messages 中移除
      expect(body.messages.every((m: { role: string }) => m.role !== 'system')).toBe(true);
    });
  });

  describe('chatCompletion', () => {
    it('should return text from OpenAI response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello back!' } }],
        }),
      });

      const { chatCompletion } = await import('../../src/llm/client.js');
      const provider = {
        name: 'test',
        provider: 'openai' as const,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      };

      const result = await chatCompletion(provider, {
        messages: [{ role: 'user', content: 'hello' }],
      });

      expect(result).toBe('Hello back!');
    });

    it('should return text from Anthropic response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Hello from Claude!' }],
        }),
      });

      const { chatCompletion } = await import('../../src/llm/client.js');
      const provider = {
        name: 'test',
        provider: 'anthropic' as const,
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'sk-ant-test',
        model: 'claude-sonnet-4-20250514',
      };

      const result = await chatCompletion(provider, {
        messages: [{ role: 'user', content: 'hello' }],
      });

      expect(result).toBe('Hello from Claude!');
    });

    it('should throw on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      });

      const { chatCompletion } = await import('../../src/llm/client.js');
      const provider = {
        name: 'test',
        provider: 'openai' as const,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'bad-key',
        model: 'gpt-4o',
      };

      await expect(
        chatCompletion(provider, { messages: [{ role: 'user', content: 'hello' }] })
      ).rejects.toThrow('401');
    });
  });

  describe('testConnection', () => {
    it('should return true on successful response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'hi' } }],
        }),
      });

      const { testConnection } = await import('../../src/llm/client.js');
      const provider = {
        name: 'test',
        provider: 'openai' as const,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        model: 'gpt-4o',
      };

      const result = await testConnection(provider);
      expect(result).toBe(true);
    });

    it('should return false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { testConnection } = await import('../../src/llm/client.js');
      const provider = {
        name: 'test',
        provider: 'openai' as const,
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'bad',
        model: 'gpt-4o',
      };

      const result = await testConnection(provider);
      expect(result).toBe(false);
    });
  });
});
