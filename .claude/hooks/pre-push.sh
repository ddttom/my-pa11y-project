#!/bin/bash

# Pre-push hook to remind about step-commit workflow
# This hook runs before git push operations

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    exit 0
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  WARNING: You have uncommitted changes."
    echo "Consider using the step-commit workflow:"
    echo "  - Run: /step-commit"
    echo "  - Or use the step-commit skill"
    echo ""
    echo "This ensures proper documentation and attribution."
    echo ""
    read -p "Continue with push anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check if recent commits have proper attribution
recent_commits=$(git log -5 --format=%B)
if ! echo "$recent_commits" | grep -q "Claude Code"; then
    echo "ℹ️  NOTE: Recent commits may be missing AI attribution."
    echo "The step-commit workflow ensures proper attribution."
    echo ""
fi

# Check if documentation files need updates
last_code_change=$(git log -1 --format=%ct -- . ':!*.md')
last_readme_change=$(git log -1 --format=%ct -- README.md 2>/dev/null || echo 0)
last_claude_change=$(git log -1 --format=%ct -- CLAUDE.md 2>/dev/null || echo 0)

if [ "$last_code_change" -gt "$last_readme_change" ] || [ "$last_code_change" -gt "$last_claude_change" ]; then
    echo "ℹ️  NOTE: Code changes are newer than documentation."
    echo "Consider reviewing:"
    echo "  - README.md"
    echo "  - CLAUDE.md"
    echo "  - CHANGELOG.md"
    echo ""
fi

exit 0
