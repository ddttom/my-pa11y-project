#!/bin/bash

# Pre-commit hook to check markdown files before committing
# This hook runs before git commit operations

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    exit 0
fi

# Check if package.json and markdown linting is set up
if [ ! -f "package.json" ]; then
    exit 0
fi

# Check if npm lint:md script exists
if ! grep -q '"lint:md"' package.json 2>/dev/null; then
    exit 0
fi

# Get list of staged markdown files
staged_md_files=$(git diff --cached --name-only --diff-filter=ACM | grep '\.md$')

if [ -z "$staged_md_files" ]; then
    # No markdown files staged, exit successfully
    exit 0
fi

echo ""
echo "📝 Checking markdown files for linting issues..."
echo ""

# Run markdown linter on staged files
if ! npm run lint:md > /dev/null 2>&1; then
    echo "⚠️  Markdown linting issues detected!"
    echo ""
    echo "Staged markdown files:"
    echo "$staged_md_files" | sed 's/^/  - /'
    echo ""
    echo "Run one of the following to fix:"
    echo "  • npm run lint:md:fix       (auto-fix all issues)"
    echo "  • /md-fix                    (use Claude command)"
    echo ""
    echo "Or check details with:"
    echo "  • npm run lint:md           (see all issues)"
    echo ""
    read -p "Continue with commit anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Commit aborted. Please fix markdown linting issues first."
        exit 1
    fi
    echo "Proceeding with commit despite linting issues..."
else
    echo "✓ All markdown files pass linting"
fi

echo ""
exit 0
