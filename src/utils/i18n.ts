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
    // 新增：交互式界面文案
    currentProject: 'Current Project',
    selectConversation: 'Select a conversation',
    noConversationsFound: 'No conversations found',
    conversationInfo: 'Conversation Info',
    sessionId: 'Session ID',
    startTime: 'Start Time',
    messageCount: 'Message Count',
    projectPath: 'Project Path',
    pressAnyKeyToReturn: 'Press any key to return...',
    exported: 'Exported',
    exportFormat: 'Export format',
    searchPlaceholder: 'Search',
    noMatchingConversations: 'No matching conversations',
    clearSearch: 'Clear search',
    // 快捷键提示
    shortcuts: '[e] Export  [i] Info  [Enter] Select  [/] Search  [q] Quit  [m] Home',
    shortcutsSearch: '[Esc] Clear  [Enter] Select',
    // 项目浏览相关
    browseProjects: 'Browse Projects',
    viewStatistics: 'View Statistics',
    noProjects: 'No projects found',
    selectProject: 'Select a project',
    selectAction: 'Select an action',
    conversations: 'conversations',
    menu: 'Menu',
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
    // 新增：交互式界面文案
    currentProject: '当前项目',
    selectConversation: '选择对话',
    noConversationsFound: '未找到对话',
    conversationInfo: '对话信息',
    sessionId: '会话 ID',
    startTime: '开始时间',
    messageCount: '消息数量',
    projectPath: '项目路径',
    pressAnyKeyToReturn: '按任意键返回...',
    exported: '已导出',
    exportFormat: '导出格式',
    searchPlaceholder: '搜索',
    noMatchingConversations: '没有匹配的对话',
    clearSearch: '清除搜索',
    // 快捷键提示
    shortcuts: '[e] 导出  [i] 信息  [回车] 选择  [/] 搜索  [q] 退出  [m] 首页',
    shortcutsSearch: '[Esc] 清除  [回车] 选择',
    // 项目浏览相关
    browseProjects: '浏览项目',
    viewStatistics: '查看统计',
    noProjects: '未找到项目',
    selectProject: '选择项目',
    selectAction: '选择操作',
    conversations: '个对话',
    menu: '菜单',
  },
};

// 获取翻译文本
export function t(key: string, lang: Language): string {
  return messages[lang][key] || key;
}
