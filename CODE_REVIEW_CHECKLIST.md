# Code Review Checklist

**Purpose**: Preventive measures to maintain code quality and avoid common pitfalls based on battle-tested lessons.

**When to Use**: Before committing code, during code reviews, and when implementing new features.

## Critical Checks

### ✅ JSON Operations

- [ ] No `JSON.stringify(x, null, 2)` in production file writes
- [ ] Pretty-printing only allowed in debug logging or development tools
- [ ] All `fs.writeFile()` calls with JSON use minified output

**Why**: 30-50% reduction in I/O time and file sizes

**How to check**:

```bash
grep -rn "JSON\.stringify([^,)]*,\s*null,\s*2)" src/ --include="*.js"
```

**Exception**: Debug logging in `logger.debug()` statements

---

### ✅ Filter Conditions

- [ ] Complex filter conditions use proper parentheses for operator precedence
- [ ] Conditions with mixed `&&` and `||` have explicit grouping
- [ ] Boolean logic is unambiguous

**Why**: Prevent unexpected filtering behavior

**Examples**:

```javascript
// ❌ WRONG - ambiguous precedence
urls.filter(url => url.includes('/en') || url.includes('/us') && !url.includes('/admin'))

// ✅ CORRECT - explicit grouping
urls.filter(url => (url.includes('/en') || url.includes('/us')) && !url.includes('/admin'))
```

---

### ✅ Async Function Patterns

- [ ] No async functions inside traditional for loops that capture loop variables
- [ ] Use `for...of` or `for await...of` for sequential async operations
- [ ] Use `.map()` with `Promise.all()` for parallel async operations
- [ ] Loop variables not referenced in async callbacks

**Why**: Prevent variable capture bugs that cause incorrect data processing

**Examples**:

```javascript
// ❌ WRONG - captures loop variable 'i'
for (let i = 0; i < urls.length; i++) {
  setTimeout(async () => {
    await processUrl(urls[i]); // BUG: 'i' may be urls.length
  }, 100);
}

// ✅ CORRECT - sequential processing
for (const url of urls) {
  await processUrl(url);
}

// ✅ CORRECT - parallel processing
await Promise.all(urls.map(async (url) => {
  return await processUrl(url);
}));
```

---

### ✅ Error Handling & Control Flow

- [ ] Quit signals propagate through all async operations
- [ ] Concurrent processing checks quit flag before each batch
- [ ] Error handlers distinguish between fatal and recoverable errors
- [ ] User interrupts (Ctrl+C, quit commands) are handled gracefully

**Why**: Prevent orphaned processes and incomplete shutdowns

**Pattern**:

```javascript
const progressTracker = { quit: false };

for (const batch of batches) {
  if (progressTracker.quit) break;

  try {
    await Promise.allSettled(batch.map(async (item) => {
      // Check for quit signal in error handler
      if (error.message === 'USER_QUIT') {
        progressTracker.quit = true;
      }
    }));
  } catch (error) {
    // Handle batch-level errors
  }
}
```

---

### ✅ Imports & Dependencies

- [ ] All imports are used (no unused imports)
- [ ] Import paths include `.js` extension for ES modules
- [ ] No circular dependencies
- [ ] Dependencies match package.json

**Why**: Clean code, faster builds, avoid confusion

**How to check**:

```bash
npm run lint  # With eslint-plugin-unused-imports
```

---

### ✅ Markdown Generation

- [ ] URLs wrapped in angle brackets: `<${url}>` not bare `${url}`
- [ ] Heading names are unique or have contextual suffixes
- [ ] No multiple consecutive blank lines
- [ ] Code blocks specify language: ` ```javascript ` not ` ``` `
- [ ] Tables use spaces around pipes: `| text |` not `|text|`

**Why**: Pass markdownlint validation, better readability

**How to check**:

```bash
npm run lint:md        # Check for errors
npm run lint:md:fix    # Auto-fix where possible
```

**Reference**: See CLAUDE.md "Writing Lint-Free Markdown Files" section

---

## Data Structure Checks

### ✅ Schema Versioning

- [ ] Schema version bumped when adding/changing data fields
- [ ] Version follows semantic versioning (MAJOR.MINOR.PATCH)
- [ ] MAJOR bump for breaking changes to existing structure
- [ ] MINOR bump for new fields or reports
- [ ] PATCH bump for bug fixes without structure changes

**Why**: Invalidate incompatible cached results automatically

**File**: [src/utils/schemaVersion.js](src/utils/schemaVersion.js)

---

### ✅ JSON Validation Pattern

- [ ] Verify data structure exists in `results.json` BEFORE writing report code
- [ ] Use `jq` or Read tool to inspect actual data structure
- [ ] Don't assume fields exist based on collection code
- [ ] Test with actual analysis output, not synthetic data

**Why**: Prevent "assumed field" errors that generate incorrect reports

**How to check**:

```bash
# Inspect results.json structure
jq 'keys' results/results.json
jq '.[0] | keys' results/results.json

# Check specific field exists
jq '.[0].llmMetrics' results/results.json

# Run /json-audit skill for comprehensive verification
```

**Reference**: See LEARNINGS.md "JSON Validation Pattern"

---

## Documentation Checks

### ✅ Documentation Synchronization

- [ ] CLAUDE.md updated if architecture changed
- [ ] README.md updated if user-facing features changed
- [ ] CHANGELOG.md updated with all changes
- [ ] LEARNINGS.md updated with new lessons (if applicable)
- [ ] PROJECTSTATE.md reflects current implementation

**Why**: Prevent documentation drift, maintain project knowledge

**When**: After any significant code changes (>3 files modified)

---

### ✅ Comment Quality

- [ ] Comments explain "why", not "what"
- [ ] Complex logic has explanatory comments
- [ ] Function docstrings include parameters and return values
- [ ] TODO comments include ticket numbers or context

**Why**: Maintainability, onboarding new developers

---

## Performance Checks

### ✅ Caching Strategy

- [ ] Expensive operations cache results when appropriate
- [ ] Cache invalidation logic exists for stale data
- [ ] Cache policy matches data lifecycle (ephemeral vs persistent)
- [ ] `--force-delete-cache` preserves persistent data only

**Why**: Balance performance with storage and data freshness

**Reference**: See CLAUDE.md "Data Lifecycle Management"

---

### ✅ Concurrent Operations

- [ ] Browser pool used for Puppeteer operations
- [ ] URL processing uses configured concurrency level
- [ ] No unnecessary sequential operations that could be parallel
- [ ] Resource limits respected (max browsers, max concurrent)

**Why**: 3-5x performance improvement for large crawls

**Configuration**: [src/config/defaults.js](src/config/defaults.js)

- `browserPoolSize: 3` - Number of reusable browsers
- `urlConcurrency: 3` - Concurrent URL processing

---

## Security & Safety Checks

### ✅ robots.txt Compliance

- [ ] robots.txt checked BEFORE crawling begins (Phase 0)
- [ ] User prompted for disallowed URLs (unless force-scrape mode)
- [ ] Quit signal terminates crawl if user declines
- [ ] Force-scrape mode state changes are logged prominently

**Why**: Ethical scraping, respect site owners' preferences

**Files**:

- [src/utils/robotsFetcher.js](src/utils/robotsFetcher.js)
- [src/utils/robotsCompliance.js](src/utils/robotsCompliance.js)

---

### ✅ Input Validation

- [ ] URLs validated before processing
- [ ] File paths sanitized to prevent directory traversal
- [ ] Command-line arguments validated
- [ ] Environment variables have sensible defaults

**Why**: Security, prevent crashes from malformed input

---

### ✅ Error Messages

- [ ] No sensitive data (passwords, tokens) in logs
- [ ] Stack traces available in debug mode only
- [ ] User-friendly error messages for common issues
- [ ] Error codes/types allow programmatic handling

**Why**: Security, debuggability, user experience

---

## Testing Checks

### ✅ Test Coverage

- [ ] New features have corresponding tests
- [ ] Edge cases tested (empty arrays, null values, etc.)
- [ ] Error conditions tested
- [ ] Integration tests for critical paths

**Why**: Prevent regressions, document expected behavior

---

### ✅ Manual Testing

- [ ] Tested with small sample first: `npm start -- -c 10`
- [ ] Reviewed generated reports for accuracy
- [ ] Verified cache behavior (cache hit/miss)
- [ ] Tested error recovery (network errors, timeouts)

**Why**: Catch issues before production use

---

## Pre-Commit Checklist Summary

Quick checklist before committing:

1. [ ] `npm run lint` passes (no errors)
2. [ ] `npm run lint:md` passes (if markdown changed)
3. [ ] No `JSON.stringify(x, null, 2)` in production code
4. [ ] Schema version bumped (if data structure changed)
5. [ ] Documentation updated (CLAUDE.md, CHANGELOG.md)
6. [ ] Manual testing completed
7. [ ] No unused imports
8. [ ] Async patterns follow best practices
9. [ ] Error handling includes quit signal propagation

---

## Git Hooks

The following hooks enforce these checks automatically:

- **pre-commit.sh** - Checks markdown linting, warns about doc updates
- **pre-push.sh** - Warns about uncommitted changes and outdated docs
- **post-markdown-write.sh** - Displays markdown linting rules after file writes
- **pre-report-generation.sh** - Reminds to verify JSON structure before coding

See [.claude/hooks/](.claude/hooks/) for implementation details.

---

## Quick Reference Commands

```bash
# Linting
npm run lint                    # ESLint (includes unused imports check)
npm run lint:md                 # Markdown linting
npm run lint:md:fix             # Auto-fix markdown issues

# Testing
npm start -- -c 10              # Small sample test
npm test                        # Run test suite

# Code Analysis
grep -rn "JSON\.stringify([^,)]*,\s*null,\s*2)" src/  # Find pretty-print JSON
grep -A 5 "for\s*(" src/*.js | grep -i "async"        # Find loop + async patterns

# JSON Structure Verification
jq 'keys' results/results.json                         # Top-level keys
jq '.[0] | keys' results/results.json                  # Page-level keys
jq '.[0].llmMetrics' results/results.json              # Specific field check

# Skills
/json-audit                     # Comprehensive JSON structure audit
/step-commit                    # Systematic commit workflow
/md-fix                         # Fix markdown linting issues
/md-lint-all                    # Check all markdown files
```

---

## Resources

- [CLAUDE.md](CLAUDE.md) - Project architecture and guidelines
- [LEARNINGS.md](LEARNINGS.md) - Critical lessons from mistakes
- [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md) - Code improvement roadmap
- [appendix-battle-tested-lessons.md](appendix-battle-tested-lessons.md) - Detailed battle-tested lessons

---

**Last Updated**: 2026-01-04
**Version**: 1.0.0

This checklist evolves with the project. Add new items as you discover patterns worth preventing.
