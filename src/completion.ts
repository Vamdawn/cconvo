// Shell 自动补全脚本生成器

const COMMANDS = ['list', 'export', 'stats', 'completion', 'completion:setup', 'completion:uninstall'];
const FORMATS = ['markdown', 'json', 'html'];

// Bash 补全脚本
export function generateBashCompletion(): string {
  return `# cconvo bash completion
# 安装方法: cconvo completion bash >> ~/.bashrc && source ~/.bashrc

_cconvo_completions() {
  local cur prev words cword
  _init_completion || return

  local commands="list export stats completion completion:setup completion:uninstall"
  local formats="markdown json html"

  case "$prev" in
    cconvo)
      COMPREPLY=($(compgen -W "$commands" -- "$cur"))
      return
      ;;
    -f|--format)
      COMPREPLY=($(compgen -W "$formats" -- "$cur"))
      return
      ;;
    -p|--project)
      # 动态获取项目列表
      local projects
      projects=$(cconvo list 2>/dev/null | grep "^📁" | sed 's/^📁 //' || echo "")
      COMPREPLY=($(compgen -W "$projects" -- "$cur"))
      return
      ;;
    -o|--output)
      # 文件路径补全
      _filedir
      return
      ;;
    list)
      COMPREPLY=($(compgen -W "-p --project" -- "$cur"))
      return
      ;;
    export)
      if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "-f --format -o --output --no-thinking --no-tools --subagents" -- "$cur"))
      fi
      return
      ;;
    stats)
      COMPREPLY=($(compgen -W "-p --project" -- "$cur"))
      return
      ;;
    completion)
      COMPREPLY=($(compgen -W "bash zsh fish" -- "$cur"))
      return
      ;;
  esac

  # 根据当前命令补全选项
  local cmd=""
  for word in "\${words[@]}"; do
    case "$word" in
      list|export|stats|completion)
        cmd="$word"
        break
        ;;
    esac
  done

  case "$cmd" in
    list|stats)
      if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "-p --project" -- "$cur"))
      fi
      ;;
    export)
      if [[ "$cur" == -* ]]; then
        COMPREPLY=($(compgen -W "-f --format -o --output --no-thinking --no-tools --subagents" -- "$cur"))
      fi
      ;;
    completion)
      COMPREPLY=($(compgen -W "bash zsh fish" -- "$cur"))
      ;;
    *)
      COMPREPLY=($(compgen -W "$commands" -- "$cur"))
      ;;
  esac
}

complete -F _cconvo_completions cconvo
`;
}

// Zsh 补全脚本
export function generateZshCompletion(): string {
  return `#compdef cconvo
# cconvo zsh completion
# 安装方法: cconvo completion zsh > ~/.zsh/completions/_cconvo
# 确保 fpath 包含 ~/.zsh/completions 并运行 autoload -Uz compinit && compinit

_cconvo() {
  local -a commands formats shells
  commands=(
    'list:List all projects and conversations'
    'export:Export a conversation'
    'stats:Show conversation statistics'
    'completion:Generate shell completion script'
    'completion\\:setup:Install shell completion'
    'completion\\:uninstall:Remove shell completion'
  )
  formats=(markdown json html)
  shells=(bash zsh fish)

  _arguments -C \\
    '1: :->command' \\
    '*:: :->args'

  case $state in
    command)
      _describe -t commands 'cconvo commands' commands
      ;;
    args)
      case $words[1] in
        list)
          _arguments \\
            '(-p --project)'{-p,--project}'[Filter by project name]:project name:_cconvo_projects'
          ;;
        export)
          _arguments \\
            '1:session id:_cconvo_sessions' \\
            '(-f --format)'{-f,--format}'[Export format]:format:(markdown json html)' \\
            '(-o --output)'{-o,--output}'[Output file path]:output file:_files' \\
            '--no-thinking[Exclude thinking blocks]' \\
            '--no-tools[Exclude tool calls]' \\
            '--subagents[Include subagent conversations]'
          ;;
        stats)
          _arguments \\
            '(-p --project)'{-p,--project}'[Filter by project name]:project name:_cconvo_projects'
          ;;
        completion)
          _arguments '1:shell:(bash zsh fish)'
          ;;
      esac
      ;;
  esac
}

# 动态获取项目列表
_cconvo_projects() {
  local -a projects
  projects=(\${(f)"$(cconvo list 2>/dev/null | grep '^📁' | sed 's/^📁 //')"})
  _describe -t projects 'projects' projects 2>/dev/null
}

# 动态获取 session ID 列表
_cconvo_sessions() {
  local -a sessions
  sessions=(\${(f)"$(cconvo list 2>/dev/null | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}')"})
  _describe -t sessions 'session ids' sessions 2>/dev/null
}

compdef _cconvo cconvo
`;
}

// Fish 补全脚本
export function generateFishCompletion(): string {
  return `# cconvo fish completion
# 安装方法: cconvo completion fish > ~/.config/fish/completions/cconvo.fish

# 禁用默认文件补全
complete -c cconvo -f

# 子命令
complete -c cconvo -n "__fish_use_subcommand" -a "list" -d "List all projects and conversations"
complete -c cconvo -n "__fish_use_subcommand" -a "export" -d "Export a conversation"
complete -c cconvo -n "__fish_use_subcommand" -a "stats" -d "Show conversation statistics"
complete -c cconvo -n "__fish_use_subcommand" -a "completion" -d "Generate shell completion script"
complete -c cconvo -n "__fish_use_subcommand" -a "completion:setup" -d "Install shell completion"
complete -c cconvo -n "__fish_use_subcommand" -a "completion:uninstall" -d "Remove shell completion"

# list 命令选项
complete -c cconvo -n "__fish_seen_subcommand_from list" -s p -l project -d "Filter by project name" -xa "(cconvo list 2>/dev/null | grep '^📁' | sed 's/^📁 //')"

# export 命令选项
complete -c cconvo -n "__fish_seen_subcommand_from export" -s f -l format -d "Export format" -xa "markdown json html"
complete -c cconvo -n "__fish_seen_subcommand_from export" -s o -l output -d "Output file path" -r
complete -c cconvo -n "__fish_seen_subcommand_from export" -l no-thinking -d "Exclude thinking blocks"
complete -c cconvo -n "__fish_seen_subcommand_from export" -l no-tools -d "Exclude tool calls"
complete -c cconvo -n "__fish_seen_subcommand_from export" -l subagents -d "Include subagent conversations"

# stats 命令选项
complete -c cconvo -n "__fish_seen_subcommand_from stats" -s p -l project -d "Filter by project name" -xa "(cconvo list 2>/dev/null | grep '^📁' | sed 's/^📁 //')"

# completion 命令选项
complete -c cconvo -n "__fish_seen_subcommand_from completion" -a "bash zsh fish" -d "Shell type"
`;
}

export type ShellType = 'bash' | 'zsh' | 'fish';

export function generateCompletion(shell: ShellType): string {
  switch (shell) {
    case 'bash':
      return generateBashCompletion();
    case 'zsh':
      return generateZshCompletion();
    case 'fish':
      return generateFishCompletion();
    default:
      throw new Error(`Unsupported shell: ${shell}`);
  }
}

export function getInstallInstructions(shell: ShellType): string {
  switch (shell) {
    case 'bash':
      return `# 将以下内容添加到 ~/.bashrc 或 ~/.bash_profile:
cconvo completion bash >> ~/.bashrc
source ~/.bashrc`;
    case 'zsh':
      return `# 方法 1: 添加到 ~/.zshrc
cconvo completion zsh >> ~/.zshrc
source ~/.zshrc

# 方法 2: 使用补全目录 (推荐)
mkdir -p ~/.zsh/completions
cconvo completion zsh > ~/.zsh/completions/_cconvo
# 在 ~/.zshrc 中添加: fpath=(~/.zsh/completions $fpath)
# 然后运行: autoload -Uz compinit && compinit`;
    case 'fish':
      return `# 保存到 fish 补全目录:
cconvo completion fish > ~/.config/fish/completions/cconvo.fish`;
    default:
      return '';
  }
}
