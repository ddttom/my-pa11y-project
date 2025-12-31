# Learnings

This document captures actionable guidance for AI assistants working with this codebase. **This is NOT a changelog** - it contains critical mistakes to avoid and architectural decisions to follow.

## Critical Rules

### Never Break These

1. **package-lock.json Policy**: Always commit package-lock.json to ensure reproducible builds
2. **ES Module Imports**: Always include `.js` extensions in import statements (e.g., `import { foo } from './bar.js'`)
3. **Linting Commands**: Always use `npm run lint`, never global `eslint` command (project uses ESLint 8.57.0 with `.eslintrc.cjs`)
4. **Commit Messages**: Never add attribution, co-author, or "Generated with" messages to commits
5. **Documentation Sync**: When changing features, always update PITCH.md, BLOG.md, CLAUDE.md, and README.md together

## Architecture Decisions

### LLM Agent Features

**llms.txt Detection**
- Detects via `<link>`, `<a>`, and `<meta>` tags
- Worth 10 points (ESSENTIAL_SERVED category)
- Implementation: [src/utils/llmMetrics.js](src/utils/llmMetrics.js)

**data-agent-visible Attribute**
- Tracks explicit agent visibility control
- ESSENTIAL_RENDERED category (browser agents only)
- Implementation: [src/utils/llmMetrics.js](src/utils/llmMetrics.js)

### Three-Phase Pipeline

1. **URL Collection** (`getUrlsFromSitemap`) - Never fetch data here
2. **Data Collection** (`processSitemapUrls`) - Store everything in results.json
3. **Report Generation** (`generateReports`) - Read ONLY from results.json, never fetch

**Critical**: Report generation must NEVER fetch URLs or collect new data. All reports read from results.json.

## Common Mistakes

### Markdown Linting

**Don't auto-fix complex tables** - Markdownlint can make tables worse with mixed styles. Manually format important tables.

**Line length strategy**: 200 char limit hits long URLs. Break at natural punctuation or use reference-style links.

**Code fence languages**: Always specify language (```bash, ```javascript, ```json) to avoid MD040 errors.

### ESLint Configuration

**node/no-missing-import disabled**: This rule incorrectly flags valid ES module imports. Leave it disabled.

**Version constraint**: Project uses ESLint 8.57.0. Global ESLint 9.x is incompatible with `.eslintrc.cjs` format.

### Documentation Updates

**When features change**: Check ALL synchronized files:
- PITCH.md (business pitch)
- BLOG.md (marketing content)
- CLAUDE.md (technical guidance)
- README.md (overview)
- docs/usermanual.md (user docs)

These files contain overlapping information and drift apart if not updated together.

## Tool Usage

### Approved Operations

Pre-approved in [.claude/settings.local.json](.claude/settings.local.json):
- `npm install` - dependency installation
- `npm run lint` - code linting
- `npm run lint:md` - markdown linting
- `npm run lint:md:fix` - auto-fix markdown
- `npm start` - running the application
- Git operations (commit, add, push)
- Directory inspection (ls, tree, find)

### Markdown Linting Workflow

1. Run `npm run lint:md:fix` first (auto-fixes what it can)
2. Review remaining errors with `npm run lint:md`
3. Manually fix line length, table formatting, structural issues
4. Re-run to verify

### Git Workflow

**Conventional commits format**:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes

**Step-Commit Workflow** (`/step-commit` skill):
1. Commit code changes first
2. Run linting, fix errors separately
3. Update documentation (check synchronized files)
4. Update LEARNINGS.md (only if NEW actionable guidance)
5. Update PROJECTSTATE.md (current state snapshot)
6. Update CHANGELOG.md (chronological history)
7. Push to remote

## Performance Constraints

### Known Issues

**Pa11y timeouts**: Pa11y occasionally times out on slow pages. Retry logic handles most cases.

**Cloudflare protection**: Some sites with aggressive bot protection may fail despite stealth plugin.

**Markdown linting limitations**: Some rules (MD013, MD060, MD036) can be overly restrictive. Consider relaxing if they become problematic.

## Reference Documentation

### External Resources

- **llms.txt standard**: <https://llmstxt.org/> and <https://github.com/cfahlgren1/llms-txt>
- **Invisible Users methodology**: `/Users/tomcranstoun/Documents/GitHub/invisible-users` (local repository with LLM agent compatibility patterns)

### Internal Documentation

- [CLAUDE.md](CLAUDE.md) - Comprehensive project guidance
- [PROJECTSTATE.md](PROJECTSTATE.md) - Current implementation state
- [CHANGELOG.md](CHANGELOG.md) - Historical changes
- [docs/usermanual.md](docs/usermanual.md) - User documentation
- [docs/system.md](docs/system.md) - Architecture details
- [docs/report-layout.md](docs/report-layout.md) - Report specifications
