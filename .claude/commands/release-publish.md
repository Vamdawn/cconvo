# Claude Command: Release Publish

发布当前版本到 npm registry。

## Usage

```
/release-publish
```

## 前置条件

在执行此命令前，请确保：
1. 已通过 `/release` 命令完成版本更新
2. 已推送代码和标签到远程仓库
3. 已登录 npm (`npm whoami` 验证)

## 发布流程

### 1. 检查发布条件

- 运行 `git status` 确保工作区干净
- 检查当前版本标签是否存在
- 验证 npm 登录状态

### 2. 确认发布信息

读取 `package.json` 并显示：
- 包名称
- 版本号
- 发布范围 (public/private)

询问用户确认后继续。

### 3. 构建项目

```bash
pnpm build
```

确保构建成功。

### 4. 发布到 npm

```bash
pnpm publish
```

### 5. 完成提示

显示发布结果：
- npm 包地址
- 版本号

## 注意事项

- 发布前确保已推送代码和标签
- 如果发布失败，检查 npm 登录状态和网络连接
- scoped 包 (@scope/name) 首次发布需要 `--access public`
