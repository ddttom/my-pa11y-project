# TODO

Task tracking for Web Audit Suite development.

## High Priority

### LLM Reports
- [ ] Test LLM reports with real websites to validate scoring
- [ ] Add examples of good vs bad LLM scores to documentation
- [ ] Consider collecting served HTML metrics separately (before JS execution)
- [ ] Add llms.txt detection and parsing to LLM reports
- [ ] Add data-agent-visible attribute detection

### Core Functionality
- [ ] Add tests (currently no test suite despite npm test script)
- [ ] Fix setup.js eslint errors (import/extensions, import/prefer-default-export rules)
- [ ] Add resume capability documentation with examples
- [ ] Implement rate limiting configuration for large sites

### Documentation
- [ ] Add usage examples to README with real output samples
- [ ] Create CONTRIBUTING.md for external contributors
- [ ] Document all command-line options with examples
- [ ] Add troubleshooting section to README

## Medium Priority

### Reports Enhancement
- [ ] Add comparative analysis (compare multiple runs over time)
- [ ] Generate executive summary report (single page overview)
- [ ] Add configurable thresholds for pass/fail scoring
- [ ] Create HTML dashboard for viewing all reports
- [ ] Add chart/graph generation for trends

### LLM Suitability
- [ ] Add detection of robots.txt and its impact on agents
- [ ] Check for ai.txt presence and parse directives
- [ ] Analyze form autocomplete attributes
- [ ] Detect CAPTCHA and bot protection mechanisms
- [ ] Score API endpoint discoverability

### Performance
- [ ] Optimize Cheerio parsing (avoid multiple loads of same HTML)
- [ ] Add parallel URL processing option
- [ ] Implement incremental caching (only re-fetch changed pages)
- [ ] Add streaming report generation for large sites

### Security Analysis
- [ ] Add more security header checks (Permissions-Policy, etc.)
- [ ] Check for mixed content issues
- [ ] Detect insecure dependencies in detected tech stack
- [ ] Add cookie security analysis

## Low Priority

### New Features
- [ ] Add mobile vs desktop comparison
- [ ] Integrate real browser performance metrics (Lighthouse CLI)
- [ ] Add screenshot comparison over time
- [ ] Create plugin system for custom analyzers
- [ ] Add webhook notifications for completed analyses

### Quality of Life
- [ ] Add progress bar for long-running analyses
- [ ] Create interactive CLI with prompts
- [ ] Add config file support (.webaauditrc.json)
- [ ] Create Docker image for easy deployment
- [ ] Add CI/CD pipeline examples

### Reports
- [ ] Add PDF report generation
- [ ] Create email-friendly report format
- [ ] Add Slack/Discord webhook integration
- [ ] Generate diff reports (compare two analyses)

## Documentation Improvements

### User Guide
- [ ] Add video tutorial/demo
- [ ] Create FAQ section
- [ ] Document common error messages and solutions
- [ ] Add architecture decision records (ADRs)

### Developer Guide
- [ ] Document internal APIs
- [ ] Add code architecture diagrams
- [ ] Create guide for adding new metrics
- [ ] Document report generation pipeline

## Technical Debt

### Code Quality
- [ ] Add JSDoc comments to all public functions
- [ ] Refactor large functions (some >100 lines)
- [ ] Reduce cognitive complexity in analyzers
- [ ] Implement proper error types (not just Error)

### Testing
- [ ] Add unit tests for metrics collection
- [ ] Add integration tests for full pipeline
- [ ] Add fixture data for testing
- [ ] Set up test coverage reporting
- [ ] Add CI/CD with automated testing

### Configuration
- [ ] Move magic numbers to constants file
- [ ] Create config schema validation
- [ ] Add environment variable support
- [ ] Document all configuration options

## Known Issues

### Bugs
- [ ] setup.js has eslint rule definition errors
- [ ] Some sites with heavy JavaScript fail to render properly
- [ ] Cloudflare bypass doesn't work on all sites
- [ ] Language variant filtering may be too aggressive

### Limitations
- [ ] Cannot handle sites requiring login (no auth support)
- [ ] Single-page apps (SPAs) may not fully render
- [ ] Large sites (>1000 pages) are slow to process
- [ ] No support for APIs/JSON responses

## Future Considerations

### Scaling
- [ ] Add distributed processing support
- [ ] Implement database storage for large datasets
- [ ] Create web service API version
- [ ] Add support for scheduled recurring analyses

### Integration
- [ ] Create GitHub Action for CI/CD integration
- [ ] Add WordPress plugin
- [ ] Create Netlify/Vercel build plugin
- [ ] Add Google Analytics integration for cross-referencing

### AI/ML
- [ ] Use ML to predict SEO impact of changes
- [ ] Automated content quality scoring with NLP
- [ ] Intelligent form field detection beyond name matching
- [ ] Predictive accessibility issue detection

## Completed ✅

- [x] Rename project from my-pa11y-project to web-audit-suite
- [x] Add LLM suitability metrics collection
- [x] Create three LLM reports (general, frontend, backend)
- [x] Implement served vs rendered HTML distinction
- [x] Add essential vs nice-to-have metric categorization
- [x] Update CLAUDE.md with comprehensive guidance
- [x] Fix linting errors in llmMetrics.js and llmReports.js
- [x] Update all documentation with new project name

## Notes

- **Priority Assessment**: Priorities may change based on user feedback and actual usage patterns
- **Breaking Changes**: Major refactoring should be done in feature branches
- **Documentation**: Keep documentation in sync with code changes
- **Testing**: Add tests before implementing complex new features

## Development Workflow

When working on items from this TODO:
1. Document the task in issue tracker
2. Create a feature branch
3. Implement with tests
4. Update documentation
5. Merge to main after review

**Note:** This is a private repository under commercial development.
