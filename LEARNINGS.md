# Learnings

**Critical mistakes and misunderstandings discovered during AI assistant sessions.**

This is NOT documentation - these are rules learned the hard way when something broke, failed, or was misunderstood.

## Critical Rules

1. **package-lock.json Policy Changed** (2025-12-31): Initially tried to exclude it, but this breaks reproducible builds. Always commit it.

2. **Documentation Sync Required** (2025-12-31): Made changes to PITCH.md without updating BLOG.md and README.md - they drifted apart and contradicted each other. When features change, update ALL synchronized files together: PITCH.md, BLOG.md, CLAUDE.md, README.md.

3. **LEARNINGS.md is NOT a Changelog** (2025-12-31): Initially wrote LEARNINGS.md like a changelog with "Added feature X" and timestamps. This made it useless for preventing future mistakes. LEARNINGS.md should only contain "Never do X" and "Always do Y" rules discovered when things broke.

## Common Mistakes

**Don't auto-fix complex tables with markdownlint** (2025-12-31): Tried running `npm run lint:md:fix` on docs/report-layout.md tables and it made them worse by mixing styles. Manually format complex tables instead.
