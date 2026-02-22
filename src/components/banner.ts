// Banner 显示组件
import chalk from 'chalk';
import { VERSION } from '../constants.js';
import { printLine } from '../utils/terminal.js';

// 显示欢迎 Banner（6 行）
export function showBanner(): void {
  printLine();
  printLine(chalk.rgb(255, 157, 181)('  ╱|、') + '      ' + chalk.italic.rgb(35, 173, 229)('CCONVO') + ' ' + chalk.italic.gray(`v${VERSION}`));
  printLine(chalk.rgb(255, 157, 181)(' (˚ˎ 。7'));
  printLine(chalk.rgb(255, 157, 181)('  |、˜〵') + '    ' + chalk.gray('Claude Code Conversation Manager'));
  printLine(chalk.rgb(255, 157, 181)('  じしˍ,)ノ'));
  printLine();
}
