## Tech Stack

- **Language**: TypeScript (ES2022, strict mode, ESM)
- **Runtime**: Node.js >= 18.0.0
- **Package Manager**: pnpm
- **Build**: tsc
- **Dev Runner**: tsx
- **Test**: Vitest, @vitest/coverage-v8, memfs
- **Lint**: ESLint
- **CLI Framework**: commander
- **Terminal UI**: chalk, ora, cli-table3
- **Templating**: handlebars (HTML export)
- **Date**: dayjs
- **i18n**: Custom (English / Chinese)

## Critical Rules

### Testing Strategy

- **TDD**: Write tests first
- **80% minimum coverage**
- **Unit tests** for utilities
- **Integration tests** for APIs
- **E2E tests** for critical flows

## Git Workflow

- Prefer using the relevant skill for commits
- Otherwise follow Conventional Commits with types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `revert`
- Commit messages must be written in English
- All tests must pass before merge
