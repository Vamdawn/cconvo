# cconvo Development Guidelines

## Development Environment

- Node.js >= 18.0.0
- pnpm

## Code Standards

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| File names | kebab-case | `path-utils.ts` |
| Functions | camelCase | `scanProjects()` |
| Constants | UPPER_SNAKE_CASE | `PROJECTS_DIR` |
| Types/Interfaces | PascalCase | `MessageRecord` |

### TypeScript Standards

- Strict mode (`strict: true`)
- ES Module, use `.js` suffix for imports
- Use `import type` for type imports
- Avoid `any`, use `unknown` when necessary

### Comment Standards

- Use Chinese comments
- Keep comments concise and place above code

### Import Order

1. Node.js built-in modules
2. Third-party libraries
3. Local modules (type imports first)

## Git Commit Standards

Format: `<emoji> <type>: <description>`

| Emoji | Type | Description |
|-------|------|-------------|
| ✨ | feat | New feature |
| 🐛 | fix | Bug fix |
| 📝 | docs | Documentation update |
| ♻️ | refactor | Code refactoring |
| ⚡️ | perf | Performance optimization |
| 🔧 | config | Configuration change |
| ⬆️ | deps | Dependency update |

### Pre-commit Checklist

**Important**: Before every `git commit` (including `/commit` slash commands), you must:

1. Check if changes need to be recorded in CHANGELOG
2. If yes, update the `[Unreleased]` section in `CHANGELOG.md`
3. Commit CHANGELOG changes together with code changes

## CHANGELOG Maintenance

Based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

### Core Principles

- CHANGELOG is for **humans**, making it easy to understand version changes
- Latest version first, sorted in reverse chronological order
- Each version includes release date (YYYY-MM-DD format)

### Change Categories

Organize in the following order, only include categories that exist:

| Category | Description | Commit Type |
|----------|-------------|-------------|
| Added | New features | ✨ feat |
| Changed | Changes to existing features | ♻️ refactor, ⚡️ perf |
| Deprecated | Features to be removed | - |
| Removed | Removed features | - |
| Fixed | Bug fixes | 🐛 fix |
| Security | Security vulnerability fixes | 🔒 security |

### Update Process

1. **During development**: After each commit, add record under `[Unreleased]` in appropriate category
2. **On release**:
   - Move `[Unreleased]` content to new version `[x.y.z] - YYYY-MM-DD`
   - Create new empty `[Unreleased]` section
   - Create git tag `vx.y.z`

### Format Example

```markdown
## [Unreleased]

### Added
- ✨ Add XXX feature

## [1.0.0] - 2025-01-15

### Added
- ✨ Add YYY feature

### Fixed
- 🐛 Fix ZZZ issue
```
