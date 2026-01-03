# Understanding Your LLM Agent Suitability Score

This guide explains what your LLM (Large Language Model) agent suitability score means and provides actionable next steps based on your results.

## What This Score Measures

Your website is evaluated on how well it works for AI agents that might visit on behalf of human users. These agents come in different forms:

- **CLI-based agents**: Process only the served HTML (no JavaScript execution)
- **Browser-based agents**: Can execute JavaScript and interact with dynamic content
- **Server-to-server agents**: Communicate through APIs and structured data

## Understanding Your Scores

### Served Score (All Agents)

This measures patterns that work for ALL types of agents, whether they execute JavaScript or not:

- **Semantic HTML structure**: Proper use of `<main>`, `<nav>`, `<header>`, `<article>` elements
- **Form field naming**: Standard names like `email`, `firstName`, `lastName` vs custom identifiers
- **Structured data**: Schema.org JSON-LD markup for products, events, organizations
- **llms.txt file**: Site-wide guidance file for AI agents (see [llmstxt.org](https://llmstxt.org/))
- **HTTP semantics**: Correct status codes, redirects, and response patterns
- **Security headers**: HSTS, CSP, and other headers that signal trust

**Why it matters**: CLI agents and simple scrapers can only see what the server sends. If your served score is low, these agents will struggle.

### Rendered Score (Browser Agents Only)

This measures patterns that require JavaScript execution:

- **Explicit state attributes**: `data-state`, `data-validation-state` to expose application state
- **Agent visibility control**: `data-agent-visible` attributes to show/hide content for agents
- **Persistent error messages**: `role="alert"`, `aria-live` for errors that don't disappear
- **Dynamic validation feedback**: Real-time form validation feedback

**Why it matters**: Browser-based agents can execute JavaScript and interact with dynamic UIs, but only if state is explicit in the DOM.

## What To Do With Your Score

### Critical (Low Score)

**Your situation**: AI agents will consistently fail to complete tasks on your website.

**Priority actions**:

1. **Add llms.txt file** if missing - This is the single highest-impact change
   - Create `/llms.txt` at your site root
   - Include basic guidance about accessing your site
   - Reference: [llmstxt.org](https://llmstxt.org/)

2. **Fix semantic HTML**:
   - Wrap main content in `<main>` element
   - Use `<nav>` for navigation sections
   - Use proper heading hierarchy (`<h1>` through `<h6>`)

3. **Add Schema.org structured data**:
   - Start with one JSON-LD block on your most important page type
   - Products: Include name, price, availability
   - Organizations: Include name, address, contact information
   - Events: Include name, date, location

4. **Standardize form field names**:
   - Use `email` instead of `user_email_address_field`
   - Use `firstName` and `lastName` instead of `name1` and `name2`
   - Use `phone` instead of `telephone_number_input`

**Expected impact**: These changes move you from "agents consistently fail" to "agents can complete basic tasks."

**Reference**: See the implementation checklist (Priority 1: Critical Quick Wins section) for step-by-step guidance.

### Fair (Moderate Score)

**Your situation**: Some AI agents succeed, but many fail or require excessive effort.

**Priority actions**:

1. **Expand structured data coverage**:
   - Add JSON-LD to ALL key pages (not just homepage)
   - Include comprehensive fields (reviews, ratings, specifications)
   - Add breadcrumb markup for site structure

2. **Improve form patterns**:
   - Add `data-validation-state` to form fields
   - Show validation errors immediately (not after submission)
   - Make submit button disabled states explicit with `data-disabled-reason`

3. **Add explicit loading states**:
   - Use `data-load-state="loading|complete|error"`
   - Include expected duration: `data-expected-duration="3000"`
   - Show what's loading with descriptive text

4. **Enhance error visibility**:
   - Add `role="alert"` to error messages
   - Keep errors visible (don't auto-dismiss)
   - List all errors in one place at form top

**Expected impact**: Moves you from "some agents succeed" to "most agents succeed consistently."

**Reference**: See the implementation checklist (Priority 2: Essential Improvements section).

### Good (High Score)

**Your situation**: Most AI agents succeed, but there's room for optimization.

**Priority actions**:

1. **Create formal API**:
   - Build RESTful or GraphQL API alongside web interface
   - Document comprehensively with examples
   - Advertise in HTML meta tags and llms.txt

2. **Add agent-specific optimizations**:
   - Detect agent sessions (via user-agent patterns)
   - Apply agent-mode CSS class when detected
   - Disable animations for agents (`animation-duration: 0ms`)

3. **Implement progressive disclosure carefully**:
   - Reduce forced pagination where practical
   - Add jump navigation for long pages
   - Don't hide essential information in tabs/accordions

4. **Add agent metadata**:
   - `<meta name="ai-api-endpoint" content="/api/products/123">`
   - `<meta name="ai-rate-limit" content="100/minute">`
   - `<meta name="ai-content-policy" content="summaries-allowed">`

**Expected impact**: Moves you from "most agents succeed" to "agents prefer your site over competitors."

**Reference**: See the implementation checklist (Priority 3: Core Infrastructure section).

### Excellent (Very High Score)

**Your situation**: Your website is highly optimized for AI agents.

**Maintenance actions**:

1. **Monitor agent success rates**:
   - Track completion rates for agent sessions
   - Compare against human user completion rates
   - Set up alerts for regressions

2. **Expand agent guidance**:
   - Keep llms.txt updated with policy changes
   - Document any API changes in advance
   - Provide dedicated agent support channel

3. **Consider advanced features**:
   - Identity delegation token system
   - OAuth-style authorization for agents
   - Scoped, time-limited permissions

4. **Share knowledge**:
   - Document your patterns for the community
   - Contribute to emerging standards
   - Help define best practices

**Expected impact**: Maintain competitive advantage, become reference implementation for others.

**Reference**: See the implementation checklist (Priority 4: Advanced Features section).

## Understanding Issue Categories

### ESSENTIAL_SERVED Issues

**Definition**: Patterns that work for ALL agent types (CLI, browser, API).

**Examples**:

- Missing `<main>` element (agents can't identify primary content)
- Non-standard form field names (agents don't know what `field_x7b3` means)
- Missing structured data (agents can't extract product/event information)
- No llms.txt file (agents don't know your policies)

**Priority**: CRITICAL - Fix these first because they affect every type of agent.

### ESSENTIAL_RENDERED Issues

**Definition**: Patterns that work for browser-based agents that execute JavaScript.

**Examples**:

- Missing `data-validation-state` attributes (agents can't detect field validity)
- No `data-agent-visible` control (agents see everything or nothing)
- Transient error messages (errors disappear before agents can read them)
- Hidden form state (agents don't know if form is ready to submit)

**Priority**: HIGH - Fix these after ESSENTIAL_SERVED issues. Browser agents are common.

### NICE_TO_HAVE Issues

**Definition**: Speculative patterns that may help but aren't critical.

**Examples**:

- Missing `data-price` on table cells (agents might parse anyway)
- No `data-disabled-reason` on buttons (agents might infer from context)
- Missing `data-authenticated` state (agents might detect via other signals)

**Priority**: LOW - Consider these after addressing all ESSENTIAL issues.

## Common Misconceptions

### "My site has good accessibility, so it works for agents"

**Reality**: Accessibility overlap is substantial but not complete.

- Screen readers need human-readable text; agents need machine-parseable structure
- Accessibility focuses on disabilities; agent optimization focuses on automation
- ARIA helps screen readers; structured data helps agents

**Action**: Use accessibility as foundation, but add agent-specific patterns (structured data, explicit state attributes).

### "Agents can figure it out from the visual design"

**Reality**: Agents don't process visual layout - they parse HTML structure.

- Agents don't see CSS positioning, colors, or visual hierarchy
- Whitespace and visual grouping mean nothing to agents
- Implicit state (red borders, disabled appearance) is invisible

**Action**: Make everything explicit in HTML attributes and semantic structure.

### "I'll just block agents if they're a problem"

**Reality**: Agents represent user intent - blocking them blocks your customers.

- Users choose agents to save time, compare prices, automate tasks
- Blocking agents means users shop elsewhere
- Competitors who support agents capture your market share

**Action**: Embrace agents as another interface to your business, like mobile apps.

### "Dynamic content is fine as long as JavaScript works"

**Reality**: Some agents can't or won't execute JavaScript.

- CLI agents (ChatGPT, Claude) process served HTML only
- Server-side scrapers don't execute JavaScript
- Even browser agents may have JavaScript restrictions

**Action**: Ensure critical functionality works in served HTML, enhance with JavaScript.

## Next Steps

### Immediate Actions (This Week)

1. Review your report's "Essential Issues" section
2. Pick the top three highest-impact issues
3. Implement fixes following the implementation checklist
4. Re-run the audit to verify improvements

### Short-Term Goals (This Month)

1. Address all ESSENTIAL_SERVED issues (affects all agents)
2. Add llms.txt file if missing
3. Expand structured data to key pages
4. Standardize form field naming

### Long-Term Strategy (This Quarter)

1. Build agent testing into your CI/CD pipeline
2. Monitor agent traffic and success rates separately
3. Consider formal API development
4. Plan identity delegation system (for e-commerce)

## Getting Help

### Documentation Resources

- **Schema.org**: [schema.org](https://schema.org) - Structured data vocabulary
- **WCAG Guidelines**: [w3.org/WAI/WCAG21/quickref](https://www.w3.org/WAI/WCAG21/quickref/) - Accessibility overlap
- **llms.txt Specification**: [llmstxt.org](https://llmstxt.org/) - Agent guidance format
- **MDN Web Docs**: [developer.mozilla.org](https://developer.mozilla.org) - Semantic HTML reference

### Testing Tools

- **Google Rich Results Test**: Verify structured data
- **Schema Markup Validator**: Check schema.org markup
- **WAVE Accessibility Tool**: Check accessibility overlap
- **Lighthouse**: Performance and best practices
- **This Tool**: Re-run audit after making changes

### Professional Support

- Hire accessibility consultants (substantial overlap with agent compatibility)
- Consider API development agencies for formal APIs
- Engage security consultants for delegation token implementation

### Community

- Share experiences with other implementers
- Report common agent failures to build best practices
- Contribute to emerging standards like llms.txt

## Report Interpretation

### Three Reports Generated

Your audit produces three complementary reports:

1. **General LLM Report** (`llm_general_suitability.csv`)
   - Overview of both served and rendered scores
   - Lists essential vs nice-to-have issues
   - Provides actionable recommendations
   - Start here for site-wide priorities

2. **Frontend LLM Report** (`llm_frontend_suitability.csv`)
   - Separates served metrics (forms, semantic HTML) from rendered metrics (dynamic state)
   - Shows percentages for standard field naming and label usage
   - Identifies critical frontend issues
   - Use this for UI/frontend team

3. **Backend LLM Report** (`llm_backend_suitability.csv`)
   - Focuses on served state only (HTTP codes, headers, structured data)
   - No dynamic/rendered metrics
   - Essential for all agent types
   - Use this for backend/API team

### Key Metrics Explained

**Semantic HTML Elements Found**: Count of proper structural elements (`<main>`, `<nav>`, `<header>`, `<article>`, `<section>`)

- Low count = agents struggle to identify page structure
- High count = agents can navigate and extract content efficiently

**Standard Form Field Names**: Count of fields using conventional names (`email`, `firstName`, `lastName`, `phone`)

- Low count = agents must guess field purpose
- High count = agents fill forms correctly on first attempt

**Agent Visible Elements**: Elements with `data-agent-visible` attribute

- Visible to Agents: Elements agents should see
- Hidden from Agents: Elements agents should ignore (decorative content, ads)

**Has llms.txt**: Boolean indicating presence of agent guidance file

- False = agents don't know your policies, access methods, or rate limits
- True = agents follow your guidelines, reducing conflicts and errors

**Structured Data Properties**: Count of JSON-LD structured data blocks

- Low count = agents can't extract key information reliably
- High count = agents understand products, events, organizations automatically

## Philosophical Context

AI agents are not web scrapers attempting to extract your data without permission. They are **user representatives** - extensions of human intent, acting on behalf of your customers.

When a user asks their AI assistant to "find me the best price on product X" or "book a table for tomorrow night," the agent visits websites just as the human would have. Making your website work well for agents means **making it work well for your customers' chosen interface**.

The future of the web includes both human browsers and AI agents. Sites optimized for both capture more market share, provide better user experiences, and build competitive advantage.

**Your choice**: Be accessible to the agents your customers are already using, or watch them complete transactions on competitor sites that are.

---

**Reference Implementation**: This guide is based on patterns from *The Invisible Users: Designing the Web for AI Agents and Everyone Else*. See the project repository at <https://github.com/tomcranstoun/invisible-users> for the complete implementation checklist and detailed technical guidance.
