Check for markdown linting errors across all markdown files and fix them.

Execute the following steps:

1. Scan all markdown files in the repository for linting errors
2. Report summary of errors found by type (MD034, MD024, MD012, etc.)
3. Run `npm run lint:md:fix` to automatically fix all issues
4. Verify all issues are resolved with `npm run lint:md`
5. Report any remaining issues that couldn't be auto-fixed
6. Show which files were modified
7. Provide guidance on 6 critical markdown linting rules from CLAUDE.md

This command proactively ensures ALL markdown files in the repository are lint-free, not just recently modified files.
