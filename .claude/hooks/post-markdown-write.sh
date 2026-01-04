#!/bin/bash

# Post-markdown-write hook to remind about markdown linting best practices
# This hook runs after Write or Edit tools are used on markdown files

# Get the tool name and output
TOOL_NAME="$1"
TOOL_OUTPUT="$2"

# Only proceed if this was a Write or Edit tool
if [ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "Edit" ]; then
    exit 0
fi

# Check if the operation involved a markdown file
if ! echo "$TOOL_OUTPUT" | grep -q "\.md"; then
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

echo ""
echo "📝 Markdown file modified - Linting reminders:"
echo ""
echo "CRITICAL RULES for lint-free markdown:"
echo "  1. URLs: Wrap in angle brackets <https://example.com> (MD034)"
echo "  2. Headings: Make duplicate headings unique with context (MD024)"
echo "  3. Blank lines: Only single blank lines between sections (MD012)"
echo "  4. Code blocks: Always specify language \`\`\`javascript (MD040)"
echo "  5. Tables: Use compact style with spaces | text | text | (MD060)"
echo "  6. Headings: Use proper headings (###), not bold text (MD036)"
echo ""
echo "Check your changes:"
echo "  • npm run lint:md           (see all issues)"
echo "  • npm run lint:md:fix       (auto-fix issues)"
echo "  • /md-fix                    (use Claude command)"
echo ""
echo "See CLAUDE.md 'Writing Lint-Free Markdown Files' section for examples."
echo ""

exit 0
