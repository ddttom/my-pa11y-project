#!/bin/bash

# Pre-report-generation hook - reminds about JSON data verification
# This hook runs when report generation files are modified

TOOL_NAME="$1"
TOOL_OUTPUT="$2"

# Only proceed if this was a Write or Edit tool
if [ "$TOOL_NAME" != "Write" ] && [ "$TOOL_NAME" != "Edit" ]; then
    exit 0
fi

# Check if the operation involved a report generation file
if ! echo "$TOOL_OUTPUT" | grep -q "reportUtils\|executiveSummary\|reportGenerators\|dashboardGenerator"; then
    exit 0
fi

echo ""
echo "⚠️  REPORT GENERATION FILE MODIFIED - Critical Reminder:"
echo ""
echo "BEFORE assuming any field exists in results.json:"
echo ""
echo "  1. Run: cat results/results.json | jq 'keys'"
echo "  2. Run: cat results/results.json | jq '.arrayName[0] | keys'"
echo "  3. VERIFY the exact field names in actual JSON"
echo "  4. Check BOTH type (array vs object) AND field structure"
echo "  5. Verify metric collection code populates this data"
echo ""
echo "COMMON MISTAKES TO AVOID:"
echo ""
echo "  ❌ m.headingCount          → ✅ (m.h1Count + m.h2Count + m.h3Count)"
echo "  ❌ m.servedScore           → ✅ calculateServedScore(m)"
echo "  ❌ m.hasLlmsTxt            → ✅ m.llmsTxt?.metrics?.hasLLMsTxtReference"
echo "  ❌ results.someArray.field → ✅ Verify someArray exists first"
echo "  ❌ Assuming metric exists  → ✅ Check metricsUpdater.js writes it"
echo ""
echo "VERIFICATION COMMANDS:"
echo ""
echo "  • /json-audit              (run comprehensive audit)"
echo "  • cat results/results.json | jq '.performanceAnalysis[0]'"
echo "  • cat results/results.json | jq '.contentAnalysis[0]'"
echo "  • grep -r 'someField' src/utils/metricsUpdater.js"
echo ""
echo "See LEARNINGS.md 'JSON Validation Pattern' section for detailed guidance."
echo ""

exit 0
