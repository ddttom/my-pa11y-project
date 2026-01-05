# JSON Data Audit

Perform comprehensive "ultrathink" audit of results.json structure, implementation code, and documentation to catch data mismatches.

This command verifies:

1. **Data Collection**: Every field referenced in report generation exists in results.json
2. **Implementation Consistency**: Code that writes data matches code that reads data
3. **Documentation Accuracy**: CLAUDE.md, report-layout.md, and CHANGELOG.md reflect actual structure
4. **Metric Initialization**: All metrics are properly initialized and populated during URL processing
5. **Executive Summary Fields**: All fields referenced in executive summary exist in source data

Execute systematic verification:

1. Read results.json to understand actual structure
2. Scan all report generation code for field references
3. Verify each referenced field exists in results.json
4. Check metric collection code (metricsUpdater.js, pageAnalyzer.js, urlProcessor.js)
5. Cross-reference documentation against actual implementation
6. Report all mismatches with file locations and line numbers
7. Provide specific fixes for each issue found

This is a critical quality check to prevent "assumed field" errors that cause incorrect reports.
