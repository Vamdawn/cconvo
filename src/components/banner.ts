// Banner 显示组件
import chalk from 'chalk';
import { VERSION } from '../constants.js';

// 显示欢迎 Banner
export function showBanner(): void {
  console.log();
  console.log(chalk.rgb(255, 157, 181)('  ╱|、') + '      ' + chalk.italic.rgb(35, 173, 229)('CCONVO') + ' ' + chalk.italic.gray(`v${VERSION}`));
  console.log(chalk.rgb(255, 157, 181)(' (˚ˎ 。7'));
  console.log(chalk.rgb(255, 157, 181)('  |、˜〵') + '    ' + chalk.gray('Claude Code Conversation Manager'));
  console.log(chalk.rgb(255, 157, 181)('  じしˍ,)ノ'));
  console.log();
}
