# Learnings

**Critical mistakes discovered during AI assistant sessions.**

This is NOT documentation - these are rules learned the hard way when something broke or went wrong.

## Critical Rules

### Discovered During Sessions

1. **package-lock.json Policy Changed**: Initially tried to exclude it, but this breaks reproducible builds. Always commit it. (Discovered: Session when policy was debated)

2. **Documentation Sync Required**: Made changes to PITCH.md without updating BLOG.md and README.md - they drifted apart and contradicted each other. When features change, update ALL synchronized files together: PITCH.md, BLOG.md, CLAUDE.md, README.md. (Discovered: Feature update session)

3. **LEARNINGS.md is NOT a Changelog**: Initially wrote LEARNINGS.md like a changelog with "Added feature X" and timestamps. This made it useless for preventing future mistakes. LEARNINGS.md should only contain "Never do X" and "Always do Y" rules discovered when things broke. (Discovered: This session)

## Common Mistakes

### Discovered During Sessions

**Don't auto-fix complex tables with markdownlint** - Tried running `npm run lint:md:fix` on docs/report-layout.md tables and it made them worse by mixing styles. Manually format complex tables instead. (Discovered: Markdown linting session)
