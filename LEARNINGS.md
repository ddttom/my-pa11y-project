# Learnings

**Critical mistakes and misunderstandings discovered during AI assistant sessions.**

This is NOT documentation - these are rules learned the hard way when something broke, failed, or was misunderstood.

## Critical Rules

1. **ALWAYS run /json-audit before modifying report generation code** (2026-01-04): Repeatedly made "assumed field" errors - adding code that references fields that don't exist, or accessing wrong data structures. Created `/json-audit` skill to systematically verify results.json structure matches implementation. MANDATORY: Run `/json-audit` before any changes to src/utils/reportUtils/ files. The hook `pre-report-generation.sh` reminds you but you MUST actually run the audit.

2. **package-lock.json Policy Changed** (2025-12-31): Initially tried to exclude it, but this breaks reproducible builds. Always commit it.

3. **Documentation Sync Required** (2025-12-31): Made changes to PITCH.md without updating BLOG.md and README.md - they drifted apart and contradicted each other. When features change, update ALL synchronized files together: PITCH.md, BLOG.md, CLAUDE.md, README.md.

4. **LEARNINGS.md is NOT a Changelog** (2025-12-31): Initially wrote LEARNINGS.md like a changelog with "Added feature X" and timestamps. This made it useless for preventing future mistakes. LEARNINGS.md should only contain "Never do X" and "Always do Y" rules discovered when things broke.

## Common Mistakes

**Don't auto-fix complex tables with markdownlint** (2025-12-31): Tried running `npm run lint:md:fix` on docs/report-layout.md tables and it made them worse by mixing styles. Manually format complex tables instead.

**Avoid capturing loop variables in async functions** (2026-01-01): Tried incrementing a `completed` counter inside `map()` callbacks within a loop, triggered ESLint no-loop-func error. Always use object references (`{ completed: 0 }`) or capture loop index in const before mapping to avoid unsafe variable references in closures.

**Wrap multi-line filter conditions in parentheses** (2026-01-03): ESLint error when filter callback has multi-line condition without wrapping parentheses. Always wrap the entire condition expression in parentheses: `.filter((item) => (condition1 || condition2))` instead of `.filter((item) => condition1 || condition2)`.

**Remove unused imports immediately** (2026-01-03): Added import statement planning to use it later, but never used it - ESLint caught it. Always remove unused imports immediately or only add them when you're about to use them.

**ALWAYS validate JSON structure against code before making changes** (2026-01-03): Made 10+ errors in executiveSummary.js by assuming field names existed in results.json without checking. Had to use comprehensive audit twice to find all mismatches. CRITICAL RULE: Before writing code that reads from results.json, ALWAYS open results.json first and verify the exact field names and data structure. Never assume - always verify. Examples of errors made:

- Reading `m.headingCount` when actual fields are `h1Count`, `h2Count`, `h3Count`
- Reading `m.metaDescription` from `seoScores[]` array when it's in `contentAnalysis[]` array
- Reading `m.servedScore` from `llmMetrics[]` when scores must be calculated on-the-fly
- Reading `m.totalScore` when actual field is `m.score`
- Awarding points for `largestContentfulPaint` and `cumulativeLayoutShift` metrics that don't exist in data

**Pattern:** When adding/modifying report generation:

1. Open results.json FIRST
2. Find the exact array you're reading from
3. Verify every field name you plan to use exists
4. Check sample values to understand data types
5. ONLY THEN write the code

This prevents hours of debugging data structure mismatches.

**Check HTTP header date formats when parsing cache data** (2026-01-03): Added cache staleness capability check to executive summary by reading cache files and checking for Last-Modified headers. Made assumption about date format without verifying actual header values. HTTP Last-Modified headers use RFC 7231 format (e.g., "Sun, 28 Dec 2025 18:44:06 GMT") which JavaScript Date constructor can parse, but always verify actual data format before assuming parsing will work. When working with HTTP headers or any external date sources, check actual values first to confirm format matches expectations.

**ALWAYS verify TYPES (array vs object) when documenting JSON structures** (2026-01-03): Made 6+ errors documenting results.json structure by assuming types without checking. Documented `securityMetrics[]` as array when it's an object with URL keys. Documented `robotsTxtAnalysis` and `llmsTxtAnalysis` as objects when they're arrays. Documented field lists for `performanceAnalysis[]`, `seoScores[]`, `llmMetrics[]`, and `pa11y[]` without verifying actual nested structures. CRITICAL RULE: When documenting JSON structures, ALWAYS check BOTH the type (array vs object) AND the actual field structure with sample data. Use `jq 'to_entries | map({key: .key, type: (.value | type)})'` to verify types, then check actual structure with `jq '.<field>[0] | keys'` for arrays or `jq '.<field>'` for objects.

**Pattern for documenting JSON structures:**

1. Use `jq` to get ALL top-level types FIRST
2. For each field, verify if it's array or object
3. For arrays: Check first element structure with `[0] | keys`
4. For objects: Check actual structure and key patterns
5. Verify nested objects within arrays/objects
6. Check sample values to understand data types
7. ONLY THEN document the structure

Examples of errors made:

- Documented `securityMetrics[]` as array when it's `securityMetrics` object with URL keys
- Documented `robotsTxtAnalysis` as object when it's `robotsTxtAnalysis[]` array
- Documented `llmsTxtAnalysis` as object when it's `llmsTxtAnalysis[]` array
- Documented `performanceAnalysis[]` with 7 fields when only 6 exist
- Documented `seoScores[]` as flat structure when it has nested `details` object
- Documented `llmMetrics[]` with simplified structure when it has 15 complex category objects
- Documented `pa11y[]` with 8 fields when issues have 14 fields

This prevents incorrect documentation that causes confusion when developers try to use the data structures.
