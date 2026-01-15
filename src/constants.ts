import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { name: string; version: string };

// 程序名称
export const APP_NAME = 'cconvo';

// 版本号（从 package.json 获取）
export const VERSION = pkg.version;
