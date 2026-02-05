---
name: release
description: Automated version release workflow. Analyzes git commit history to infer semantic version, updates package.json and multilingual CHANGELOGs, creates git commit and tag. Use when: (1) user says "release", "publish version", "bump version", (2) user invokes /release command, (3) preparing to release a new version.
---

# Release Workflow

Automated version release based on [Semantic Versioning 2.0.0](https://semver.org/).

## Execution Steps

### 1. Get Last Version Tag

```bash
git describe --tags --abbrev=0
```

Use `v0.0.0` as baseline if no tags exist.

### 2. Analyze Commit History

```bash
git log <last-tag>..HEAD --pretty=format:"%s"
```

Parse each commit message to identify type:

| Pattern | Type | Version Impact |
|---------|------|----------------|
| `BREAKING CHANGE:` or `!:` suffix | breaking | MAJOR |
| `feat:` / `✨ feat:` | feat | MINOR |
| `fix:` / `🐛 fix:` | fix | PATCH |
| `perf:` / `⚡️ perf:` | perf | PATCH |
| `refactor:` / `♻️ refactor:` | refactor | PATCH |
| `docs:` / `📝 docs:` | docs | none |
| `chore:` / `🔧 config:` / `⬆️ deps:` | chore | none |

### 3. Calculate New Version

Based on current version `MAJOR.MINOR.PATCH`:

- Has breaking → `(MAJOR+1).0.0`
- Has feat → `MAJOR.(MINOR+1).0`
- Has fix/perf/refactor → `MAJOR.MINOR.(PATCH+1)`
- Only docs/chore → Ask user whether to force patch release

### 4. Generate CHANGELOG Content

Read `[Unreleased]` section from `CHANGELOG.md` and `CHANGELOG.zh-CN.md`.

Merge git analysis with existing [Unreleased] content:
- Check for missing changes from git commits
- Add missing changes to appropriate categories

Organize by category (include only non-empty categories):

```markdown
### Added
- ✨ New feature

### Changed
- ♻️ Refactor/improvement
- ⚡️ Performance optimization

### Deprecated
- Deprecated feature

### Removed
- Removed feature

### Fixed
- 🐛 Bug fix

### Security
- 🔒 Security fix
```

**Translation rules**:
- English version (`CHANGELOG.md`): Use English descriptions
- Chinese version (`CHANGELOG.zh-CN.md`): Use Chinese descriptions
- Keep emoji prefixes consistent

### 5. Interactive Preview

Show user:

```
## Release Preview

Current version: v1.5.1
New version: v1.6.0

### Changes (English)

## [1.6.0] - 2026-02-05

### Added
- ✨ Add release skill for automated versioning

### Changes (Chinese)

## [1.6.0] - 2026-02-05

### Added
- ✨ 添加 release 技能用于自动化版本发布

Confirm release? (y/n)
```

Use AskUserQuestion tool to request user confirmation.

### 6. Execute Changes

After user confirmation, execute in order:

1. **Update package.json**: Modify `version` field

2. **Update CHANGELOG.md**:
   - Move `[Unreleased]` content to new version `[x.y.z] - YYYY-MM-DD`
   - Create new empty `[Unreleased]` section

3. **Update CHANGELOG.zh-CN.md**: Same as above, with Chinese content

4. **Git operations**:
   ```bash
   git add package.json CHANGELOG.md CHANGELOG.zh-CN.md
   git commit -m "🔖 release: vX.Y.Z"
   git tag vX.Y.Z
   ```

### 7. Completion Message

```
Version vX.Y.Z released successfully!

Next steps:
- git push origin main
- git push origin vX.Y.Z
- pnpm publish (if publishing to npm)
```

## Notes

- Ensure working directory is clean before execution (no uncommitted changes)
- If uncommitted changes exist, prompt user to handle them first
- Tag format: `vX.Y.Z` (with v prefix)
- Commit message format: `🔖 release: vX.Y.Z`
