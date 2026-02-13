import type { LLMProvider, ChatMessage, ChatCompletionOptions, StreamCallback } from '../models/types.js';

// 构建请求参数
interface RequestData {
  url: string;
  init: RequestInit;
}

// 构建请求
export function buildRequest(provider: LLMProvider, options: ChatCompletionOptions): RequestData {
  if (provider.provider === 'anthropic') {
    return buildAnthropicRequest(provider, options);
  }
  return buildOpenAIRequest(provider, options);
}

// 构建 OpenAI 兼容请求
function buildOpenAIRequest(provider: LLMProvider, options: ChatCompletionOptions): RequestData {
  const url = `${provider.baseUrl.replace(/\/$/, '')}/chat/completions`;

  const body: Record<string, unknown> = {
    model: provider.model,
    messages: options.messages,
    stream: options.stream ?? false,
  };

  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }
  if (options.maxTokens !== undefined) {
    body.max_tokens = options.maxTokens;
  }

  return {
    url,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify(body),
    },
  };
}

// 构建 Anthropic 原生请求
function buildAnthropicRequest(provider: LLMProvider, options: ChatCompletionOptions): RequestData {
  const url = `${provider.baseUrl.replace(/\/$/, '')}/messages`;

  // 提取 system 消息
  let system: string | undefined;
  const messages: ChatMessage[] = [];
  for (const msg of options.messages) {
    if (msg.role === 'system') {
      system = msg.content;
    } else {
      messages.push(msg);
    }
  }

  const body: Record<string, unknown> = {
    model: provider.model,
    messages,
    max_tokens: options.maxTokens ?? 8192,
    stream: options.stream ?? false,
  };

  if (system) {
    body.system = system;
  }
  if (options.temperature !== undefined) {
    body.temperature = options.temperature;
  }

  return {
    url,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': provider.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    },
  };
}

// 从响应中提取文本
function extractTextFromResponse(provider: LLMProvider, data: unknown): string {
  if (provider.provider === 'anthropic') {
    const resp = data as { content: { type: string; text: string }[] };
    return resp.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('');
  }

  // OpenAI 兼容格式
  const resp = data as { choices: { message: { content: string } }[] };
  return resp.choices[0]?.message?.content || '';
}

// 非流式调用
export async function chatCompletion(
  provider: LLMProvider,
  options: ChatCompletionOptions
): Promise<string> {
  const { url, init } = buildRequest(provider, { ...options, stream: false });
  const response = await fetch(url, init);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return extractTextFromResponse(provider, data);
}

// 流式调用
export async function chatCompletionStream(
  provider: LLMProvider,
  options: ChatCompletionOptions,
  onChunk: StreamCallback
): Promise<string> {
  const { url, init } = buildRequest(provider, { ...options, stream: true });
  const response = await fetch(url, init);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error ${response.status}: ${errorText}`);
  }

  if (!response.body) {
    throw new Error('Response body is empty');
  }

  let fullText = '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const jsonStr = trimmed.slice(6);
      if (jsonStr === '[DONE]') continue;

      try {
        const chunk = JSON.parse(jsonStr);
        let text = '';

        if (provider.provider === 'anthropic') {
          // Anthropic SSE 格式
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) {
            text = chunk.delta.text;
          }
        } else {
          // OpenAI SSE 格式
          text = chunk.choices?.[0]?.delta?.content || '';
        }

        if (text) {
          fullText += text;
          onChunk(text);
        }
      } catch {
        // 跳过无效 JSON
      }
    }
  }

  return fullText;
}

// 连接测试
export async function testConnection(provider: LLMProvider): Promise<boolean> {
  try {
    await chatCompletion(provider, {
      messages: [{ role: 'user', content: 'hi' }],
      maxTokens: 10,
    });
    return true;
  } catch {
    return false;
  }
}
