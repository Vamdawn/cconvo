import type {
  Conversation,
  UserMessage,
  AssistantMessage,
  ExportOptions,
} from '../models/types.js';
import {
  formatDateTime,
  formatTokens,
  extractTextContent,
  extractThinking,
  extractToolCalls,
  escapeHtml,
} from '../utils/format.js';

// 导出为HTML格式
export function exportToHtml(conversation: Conversation, options: ExportOptions): string {
  const messages = conversation.messages.filter(
    m => m.type === 'user' || m.type === 'assistant'
  ) as (UserMessage | AssistantMessage)[];

  const messagesHtml = messages.map(m => formatMessageHtml(m, options)).join('\n');

  let subagentsHtml = '';
  if (options.includeSubagents && conversation.subagents.length > 0) {
    subagentsHtml = `
      <div class="subagents">
        <h2>Subagent Conversations</h2>
        ${conversation.subagents.map(sub => `
          <div class="subagent">
            <h3>Agent: ${escapeHtml(sub.agentId)}</h3>
            ${sub.messages
              .filter(m => m.type === 'user' || m.type === 'assistant')
              .map(m => formatMessageHtml(m as UserMessage | AssistantMessage, options))
              .join('\n')}
          </div>
        `).join('\n')}
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(conversation.slug || conversation.sessionId)}</title>
  <style>
    :root {
      --bg-color: #1a1a2e;
      --card-bg: #16213e;
      --user-bg: #0f3460;
      --assistant-bg: #1a1a2e;
      --text-color: #e8e8e8;
      --text-muted: #a0a0a0;
      --border-color: #2a2a4a;
      --accent-color: #e94560;
      --code-bg: #0d1117;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      line-height: 1.6;
      margin: 0;
      padding: 20px;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    .header {
      background: var(--card-bg);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      border: 1px solid var(--border-color);
    }

    .header h1 {
      margin: 0 0 16px 0;
      color: var(--accent-color);
    }

    .meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
      font-size: 14px;
      color: var(--text-muted);
    }

    .meta-item {
      display: flex;
      gap: 8px;
    }

    .meta-label {
      font-weight: 600;
      color: var(--text-color);
    }

    .message {
      margin-bottom: 16px;
      border-radius: 12px;
      padding: 16px 20px;
      border: 1px solid var(--border-color);
    }

    .message.user {
      background: var(--user-bg);
    }

    .message.assistant {
      background: var(--assistant-bg);
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }

    .message-role {
      font-weight: 600;
      font-size: 14px;
    }

    .message-role.user {
      color: #4fc3f7;
    }

    .message-role.assistant {
      color: #81c784;
    }

    .message-time {
      font-size: 12px;
      color: var(--text-muted);
    }

    .message-content {
      white-space: pre-wrap;
      word-break: break-word;
    }

    .thinking, .tool-call {
      margin-top: 12px;
      background: var(--code-bg);
      border-radius: 8px;
      overflow: hidden;
    }

    .thinking-header, .tool-header {
      padding: 8px 12px;
      background: rgba(255,255,255,0.05);
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      user-select: none;
    }

    .thinking-header:hover, .tool-header:hover {
      background: rgba(255,255,255,0.08);
    }

    .thinking-content, .tool-content {
      padding: 12px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 13px;
      max-height: 300px;
      overflow-y: auto;
      display: none;
    }

    .thinking-content.show, .tool-content.show {
      display: block;
    }

    .subagents {
      margin-top: 40px;
      padding-top: 24px;
      border-top: 2px solid var(--border-color);
    }

    .subagents h2 {
      color: var(--accent-color);
    }

    .subagent {
      margin-top: 24px;
    }

    .subagent h3 {
      color: var(--text-muted);
      font-size: 14px;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${escapeHtml(conversation.slug || 'Conversation')}</h1>
      <div class="meta">
        <div class="meta-item">
          <span class="meta-label">Project:</span>
          <span>${escapeHtml(conversation.projectPath)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Session:</span>
          <span>${escapeHtml(conversation.sessionId)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Time:</span>
          <span>${formatDateTime(conversation.startTime)} - ${formatDateTime(conversation.endTime)}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Messages:</span>
          <span>${conversation.messageCount}</span>
        </div>
        <div class="meta-item">
          <span class="meta-label">Tokens:</span>
          <span>In: ${formatTokens(conversation.totalTokens.input_tokens)} / Out: ${formatTokens(conversation.totalTokens.output_tokens)}</span>
        </div>
      </div>
    </div>

    <div class="messages">
      ${messagesHtml}
    </div>

    ${subagentsHtml}
  </div>

  <script>
    document.querySelectorAll('.thinking-header, .tool-header').forEach(el => {
      el.addEventListener('click', () => {
        const content = el.nextElementSibling;
        content.classList.toggle('show');
        el.textContent = content.classList.contains('show')
          ? el.textContent.replace('Show', 'Hide')
          : el.textContent.replace('Hide', 'Show');
      });
    });
  </script>
</body>
</html>`;
}

// 格式化单条消息为HTML
function formatMessageHtml(message: UserMessage | AssistantMessage, options: ExportOptions): string {
  const role = message.type;
  const timestamp = formatDateTime(message.timestamp);
  const textContent = extractTextContent(message);

  let thinkingHtml = '';
  if (options.includeThinking && message.type === 'assistant') {
    const thinkings = extractThinking(message);
    if (thinkings.length > 0) {
      thinkingHtml = thinkings.map(t => `
        <div class="thinking">
          <div class="thinking-header">Show Thinking</div>
          <div class="thinking-content"><pre>${escapeHtml(t)}</pre></div>
        </div>
      `).join('');
    }
  }

  let toolsHtml = '';
  if (options.includeToolCalls && message.type === 'assistant') {
    const toolCalls = extractToolCalls(message);
    if (toolCalls.length > 0) {
      toolsHtml = toolCalls.map(tool => `
        <div class="tool-call">
          <div class="tool-header">Show Tool: ${escapeHtml(tool.name)}</div>
          <div class="tool-content"><pre>${escapeHtml(JSON.stringify(tool.input, null, 2))}</pre></div>
        </div>
      `).join('');
    }
  }

  return `
    <div class="message ${role}">
      <div class="message-header">
        <span class="message-role ${role}">${role === 'user' ? 'User' : 'Assistant'}</span>
        <span class="message-time">${timestamp}</span>
      </div>
      <div class="message-content">${escapeHtml(textContent)}</div>
      ${thinkingHtml}
      ${toolsHtml}
    </div>
  `;
}
