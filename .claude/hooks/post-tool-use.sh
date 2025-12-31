#!/bin/bash

# Post-tool-use hook to remind about step-commit workflow after git operations
# This hook runs after certain tool uses

# Get the tool name and check if it was a Bash tool with git commands
TOOL_NAME="$1"
TOOL_OUTPUT="$2"

# Only proceed if this was a Bash tool
if [ "$TOOL_NAME" != "Bash" ]; then
    exit 0
fi

# Check if the command involved git commit
if echo "$TOOL_OUTPUT" | grep -q "git commit"; then
    # Check if this looks like a step-commit workflow
    if ! echo "$TOOL_OUTPUT" | grep -q "step-commit" && ! echo "$TOOL_OUTPUT" | grep -q "LEARNINGS.md" && ! echo "$TOOL_OUTPUT" | grep -q "PROJECTSTATE.md"; then
        echo ""
        echo "💡 TIP: Consider using the step-commit workflow for comprehensive commits:"
        echo "   /step-commit"
        echo ""
        echo "This ensures:"
        echo "  ✓ Proper linting"
        echo "  ✓ Documentation updates"
        echo "  ✓ Learning documentation"
        echo "  ✓ Project state tracking"
        echo "  ✓ Proper attribution"
        echo ""
    fi
fi

exit 0
