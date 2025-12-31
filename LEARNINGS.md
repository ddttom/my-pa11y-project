# Learnings

This document captures actionable guidance for AI assistants working with this codebase.

## Markdown Linting

### Configuration

- Markdownlint configuration is in [.markdownlint.json](.markdownlint.json)
- Line length limit: 200 characters (MD013)
- Code blocks require language specification (MD040)
- Tables must have consistent spacing (MD060)

### Common Issues

**Line Length (MD013):**

- Long lines (>200 chars) in BLOG.md, PITCH.md, and documentation files
- These require manual fixes - cannot be auto-fixed
- Consider breaking into multiple lines at natural break points

**Table Formatting (MD060):**

- Tables in [docs/report-layout.md](docs/report-layout.md) have spacing issues
- Markdownlint expects either "compact" or "aligned" style consistently
- Many tables need manual reformatting

**Emphasis as Heading (MD036):**

- Some sections use bold text instead of proper headings
- Found in BLOG.md and [docs/usermanual.md](docs/usermanual.md)
- Convert to proper heading levels (##, ###)

**Missing Code Fence Languages (MD040):**

- Code blocks in BLOG.md and [docs/report-layout.md](docs/report-layout.md) need language tags
- Add ```bash, ```javascript, ```json as appropriate

### Workflow

1. Run `npm run lint:md:fix` first to auto-fix what can be fixed
2. Review remaining errors with `npm run lint:md`
3. Manually fix line length, table formatting, and structural issues
4. Re-run `npm run lint:md` to verify

## ESLint Configuration

### Version Constraints

- Project uses ESLint 8.57.0 with `.eslintrc.cjs` format
- Global ESLint 9.x is incompatible with this format
- Always use `npm run lint`, never global `eslint` command

### Node.js Import Resolution

- Added `node/no-missing-import: 'off'` to ESLint config
- This rule was incorrectly flagging valid ES module imports
- ES modules require `.js` extensions in imports (e.g., `import { foo } from './bar.js'`)
- ESLint's node plugin sometimes doesn't resolve these correctly

## LLM Agent Features

### llms.txt Detection

**Implementation:** [src/utils/llmMetrics.js](src/utils/llmMetrics.js)

The feature detects llms.txt references in three ways:

1. `<link>` tags with `rel="alternate"` and `type="text/plain"` pointing to llms.txt
2. `<a>` tags with href containing "llms.txt"
3. `<meta>` tags with `name="llms-txt"`

**Scoring:**

- Worth 10 points in served score (ESSENTIAL_SERVED category)
- Critical for all agent types (CLI and browser-based)
- See <https://llmstxt.org/> for standard

### data-agent-visible Attribute

**Implementation:** [src/utils/llmMetrics.js](src/utils/llmMetrics.js)

The feature tracks explicit agent visibility control:

- `data-agent-visible="true"` or empty - element is visible to agents
- `data-agent-visible="false"` - element is hidden from agents
- Provides three counts: total elements, visible to agents, hidden from agents

**Scoring:**

- ESSENTIAL_RENDERED category (browser agents only)
- Helps developers explicitly control agent visibility
- Useful for hiding decorative elements from agents

## Package Management

### package-lock.json Policy

- **Policy:** package-lock.json is not committed to this repository
- **Reason:** Project preference for flexibility in dependency resolution
- **Action:** Delete package-lock.json if it appears in git status
- **Note:** Added to .gitignore

### Approved Operations

The [.claude/settings.local.json](.claude/settings.local.json) pre-approves:

- `npm install` - dependency installation
- `npm run lint` - code linting
- `npm start` - running the application
- Git operations (commit, add, push)
- Directory inspection (ls, tree, find)

## Documentation Synchronization

### Identity Layer Files

When making changes that affect project identity or architecture, check ALL of these files:

- [BLOG.md](BLOG.md) - Marketing content
- [PITCH.md](PITCH.md) - Investment/business pitch
- [CLAUDE.md](CLAUDE.md) - AI assistant guidance
- [README.md](README.md) - Project overview
- [docs/usermanual.md](docs/usermanual.md) - User documentation

**Why:** These files often contain overlapping information and must stay synchronized.

### Recent Synchronization

The llms.txt and data-agent-visible features were added to:

- CLAUDE.md (technical implementation details)
- BLOG.md (feature descriptions)
- [src/utils/llmMetrics.js](src/utils/llmMetrics.js) (implementation)
- [src/utils/reportUtils/llmReports.js](src/utils/reportUtils/llmReports.js) (reporting)

## Git Workflow

### Commit Message Format

This project uses conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes

### Step-Commit Workflow

The `/step-commit` skill enforces:

1. Commit code changes first
2. Run linting and fix errors separately
3. Update documentation
4. Create/update LEARNINGS.md
5. Create/update PROJECTSTATE.md
6. Update CHANGELOG.md
7. Prompt for push to remote

**Important:** Don't add attribution or "Generated with" messages to commits.

## Common Pitfalls

### Markdown Tables

- Don't try to auto-fix complex tables with markdownlint
- The tool can make tables worse if they have mixed styles
- Better to manually format important tables

### Line Length

- 200 character limit is generous but still hits some long URLs
- Break lines at natural punctuation or before URLs
- Consider using reference-style links for very long URLs

### Import Statements

- ES modules require explicit `.js` extensions
- Don't rely on automatic extension resolution
- Example: `import { foo } from './utils/bar.js'` not `'./utils/bar'`

## Future Improvements

### Markdown Linting

Consider disabling or relaxing some rules if they become too restrictive:

- MD013 (line-length) - Could increase to 250
- MD060 (table-column-style) - Could disable for documentation files
- MD036 (no-emphasis-as-heading) - Sometimes emphasis is appropriate

### ESLint Rules

Monitor if `node/no-missing-import` rule causes issues with other imports. May need to disable more node plugin rules if problems persist.

## Reference Documentation

- Local invisible-users repository: `/Users/tomcranstoun/Documents/GitHub/invisible-users`
- Contains authoritative guidance on LLM agent compatibility patterns
- Use when adding new LLM metrics or updating scoring methodology
