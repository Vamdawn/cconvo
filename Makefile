# cconvo Makefile

.PHONY: install build dev start clean link unlink help

# 默认目标
.DEFAULT_GOAL := help

# 安装依赖
install:
	pnpm install

# 构建项目
build:
	pnpm build
	chmod +x dist/index.js

# 开发模式运行
dev:
	pnpm dev

# 运行构建后的版本
start:
	pnpm start

# 类型检查
typecheck:
	pnpm typecheck

# 清理构建产物
clean:
	rm -rf dist

# 全局链接（可在任意位置使用 cconvo 命令）
link: build
	pnpm link --global

# 取消全局链接
unlink:
	pnpm unlink --global

# 完整构建流程：清理 -> 安装 -> 构建
all: clean install build

# 帮助信息
help:
	@echo "cconvo Makefile 命令："
	@echo ""
	@echo "  make install    - 安装依赖"
	@echo "  make build      - 构建项目"
	@echo "  make dev        - 开发模式运行"
	@echo "  make start      - 运行构建后的版本"
	@echo "  make typecheck  - 类型检查"
	@echo "  make clean      - 清理构建产物"
	@echo "  make link       - 全局安装（可在任意位置使用 cconvo）"
	@echo "  make unlink     - 取消全局安装"
	@echo "  make all        - 完整构建流程"
	@echo "  make help       - 显示帮助信息"
