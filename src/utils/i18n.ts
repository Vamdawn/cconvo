// 国际化消息模块
export type Language = 'en' | 'zh';

const messages: Record<Language, Record<string, string>> = {
  en: {
    userInput: 'User Input',
    claudeResponse: 'Claude Response',
    emptyInput: '*(Empty)*',
    toolCalls: 'Tool Calls',
    turn: 'Turn',
    messages: 'messages',
    turns: 'turns',
    thinking: 'Thinking',
    tool: 'Tool',
  },
  zh: {
    userInput: '用户输入',
    claudeResponse: 'Claude 响应',
    emptyInput: '*(空)*',
    toolCalls: '工具调用',
    turn: '对话',
    messages: '条',
    turns: '轮对话',
    thinking: '思考过程',
    tool: '工具',
  },
};

// 获取翻译文本
export function t(key: string, lang: Language): string {
  return messages[lang][key] || key;
}
