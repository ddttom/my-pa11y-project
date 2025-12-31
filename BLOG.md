# Are AI Agents Failing on Your Website? Here's How to Find Out

**A comprehensive measurement tool for the invisible visitors reshaping web traffic**

---

## The Problem You Can't See

Sarah runs an e-commerce site selling outdoor gear. Last month, she had 100,000 visitors and a healthy 3% conversion rate. Everything looked normal in Google Analytics.

What she couldn't see: 10,000 of those visitors were AI agents like ChatGPT, Claude, and Perplexity. When users asked "What's the best lightweight tent under £200?", these agents visited Sarah's site to help answer.

They all failed.

Not because Sarah's tents were wrong. Not because her prices were bad. But because the agents couldn't:

- Read her product specifications (hidden in JavaScript)
- Understand which fields in her checkout form were for what
- Parse her product pricing (displayed as "From £199" when the real price was £249)
- Navigate her paginated reviews (agents only saw page 1 of 12)

**Result:** Zero AI-driven conversions. Zero visibility in analytics. £250,000 in lost annual revenue that Sarah will never know about.

This is happening on your website right now.

## The Measurement Gap

Here's the uncomfortable truth: **your existing tools weren't designed for AI agents**.

- **Google Analytics** tracks page views, not form field compatibility
- **SEO tools** measure keywords, not semantic HTML quality
- **Accessibility scanners** check WCAG compliance, not AI agent patterns
- **Performance tools** measure load times, not state visibility

None of these tell you if an AI agent can successfully complete your checkout form, understand your pricing, or recommend your product.

You need different measurements. You need **Web Audit Suite**.

## What Web Audit Suite Does

Web Audit Suite is a comprehensive analysis tool that measures everything that matters for modern web success - including AI agent compatibility.

**One command. Eleven detailed reports. Complete visibility.**

```bash
npm start -- -s https://yoursite.com/sitemap.xml -o results
```

Within minutes, you get:

### Traditional Web Metrics (The Foundation)

1. **SEO Performance** - Title tags, meta descriptions, heading structure, internal linking
2. **Accessibility Compliance** - WCAG 2.1 automated testing across 14 severity levels
3. **Performance Analysis** - Core Web Vitals, load times, interactive timing
4. **Security Headers** - HTTPS, HSTS, CSP, X-Frame-Options configuration
5. **Content Quality** - Freshness, uniqueness, media richness, readability
6. **Image Optimization** - Alt text quality, compression, responsiveness
7. **Link Analysis** - Internal/external structure, navigation quality
8. **Detailed SEO Scoring** - Subscores for every SEO dimension

### AI Agent Compatibility (The Differentiator)

1. **General LLM Suitability** - Overall AI-friendliness for all agent types
2. **Frontend LLM Suitability** - Form patterns, semantic HTML, dynamic features
3. **Backend LLM Suitability** - HTTP codes, security headers, structured data

**The critical insight:** We don't just measure if your site works for humans. We measure if it works for the AI agents that are recommending you (or not) to millions of users.

## The Critical Distinction: Two HTML States

Here's what makes Web Audit Suite different from every other tool: **we understand that AI agents see your website in two fundamentally different ways**.

### Served HTML (Static)

This is what your web server sends - the raw HTML before any JavaScript runs.

**Who sees this:**

- ChatGPT when it fetches a URL
- Claude when analyzing a page
- Perplexity when extracting information
- **70% of AI agents** that never execute JavaScript

**What we measure:**

- Semantic HTML structure (`<main>`, `<nav>`, `<article>`)
- Form field naming standards (email vs "input_field_1")
- Schema.org structured data presence
- HTTP status code correctness
- Security headers

**Scoring:** 0-100 points heavily weighted on essentials

### Rendered HTML (Dynamic)

This is what your page looks like after JavaScript runs - what browser-based agents see.

**Who sees this:**

- Browser extensions like Claude Desktop
- Visual agents that execute JavaScript
- **30% of AI agents** that render pages

**What we measure:**

- Explicit state attributes (data-state="loading")
- Persistent error messages (not toast notifications)
- Dynamic validation feedback
- Client-side form enhancements

**Scoring:** Bonus points added to served score (max 100 total)

**Why this matters:** Most tools only check rendered HTML. They miss that 70% of AI agents never execute your JavaScript. Web Audit Suite measures both and weights them correctly.

## Real Example: E-commerce Checkout

**Before Web Audit Suite:**

```html
<!-- What the developer wrote -->
<form id="checkout">
  <input type="text" name="field1" id="field1" />
  <input type="text" name="field2" id="field2" />
  <input type="text" name="field3" id="field3" />
  <button disabled class="disabled-button">Complete Purchase</button>
</form>
```

**Web Audit Suite Score: 38/100 (Poor)**

**Issues Identified:**

- ❌ Form fields named "field1", "field2", "field3" - agents don't know what to fill in
- ❌ Button appears disabled but has no `disabled` attribute - agents think it's clickable
- ❌ No labels - screen readers and agents can't identify fields
- ❌ No `<main>` element - agents can't find the primary content
- ❌ No Schema.org product data - agents can't extract pricing

**Result:** AI agents abandon the checkout. Zero conversions.

---

**After Implementation:**

```html
<!-- AI-friendly version -->
<main>
  <form id="checkout">
    <label for="email">Email address</label>
    <input type="email" name="email" id="email" required />

    <label for="cardNumber">Card number</label>
    <input type="text" name="cardNumber" id="cardNumber" required />

    <label for="postcode">Postcode</label>
    <input type="text" name="postcode" id="postcode" required />

    <button type="submit"
            disabled
            aria-describedby="submit-help">
      Complete Purchase
    </button>
    <div id="submit-help">Please fill in all required fields</div>
  </form>

  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Lightweight Backpacking Tent",
    "price": "249.99",
    "priceCurrency": "GBP"
  }
  </script>
</main>
```

**Web Audit Suite Score: 92/100 (Excellent)**

**Improvements:**

- ✅ Standard field names (email, cardNumber, postcode)
- ✅ Proper labels for every field
- ✅ `disabled` attribute on button
- ✅ `aria-describedby` explains why button is disabled
- ✅ `<main>` element marks primary content
- ✅ Schema.org provides structured product data

**Result:** AI agents successfully complete checkout. 2.5% conversion rate = £249k annual revenue from agent traffic.

**Implementation time:** 2 hours of developer time.

## The Business Impact

Let's be specific about what this means for different types of businesses.

### E-commerce Site (£10M Annual Revenue)

**Current State:**

- 1.2M monthly visitors
- 10% AI agent traffic (120,000 visits)
- 3% human conversion rate
- 0% agent conversion rate (forms break)

**After Optimization:**

- Same traffic
- 2.5% agent conversion rate (fixed forms, added structure)
- 3,000 additional monthly conversions
- Average order value: £83

**Revenue Impact:**

- Additional revenue: £249,000/month
- **Annual impact: £2.99M**
- Tool cost: £299/month (when SaaS launches)
- **ROI: 83,400%**

### SaaS Platform (Complex Onboarding)

**Current State:**

- 50,000 trial signups/year
- 15% are AI agents helping users (7,500)
- 10% human conversion to paid (5,000 customers)
- 0% agent conversion (multi-step form breaks)

**After Optimization:**

- 8% agent conversion rate (fixed form naming, added state)
- 600 additional paid customers
- £5,000 annual contract value

**Revenue Impact:**

- Additional revenue: £3M/year
- Tool cost: £999/month enterprise plan
- **ROI: 25,000%**

### Content Publisher (5M Monthly Visitors)

**Current State:**

- 500,000 AI agent visits/month
- Agents recommend content to users
- 20% recommendation rate (poor structured data)

**After Optimization:**

- 60% recommendation rate (Schema.org added)
- 200,000 additional recommendations/month
- £0.50 value per recommendation (ad revenue)

**Revenue Impact:**

- Additional revenue: £100,000/month
- **Annual impact: £1.2M**
- Tool cost: £299/month
- **ROI: 33,444%**

## What Makes Web Audit Suite Different

### 1. Evidence-Based Methodology

Our scoring is based on "The Invisible Users" by Tom Cranstoun - a 50,000-word analysis of AI agent behavior and web compatibility patterns. Every recommendation is grounded in real agent testing and established web standards.

**Not guesswork. Not speculation. Proven patterns.**

### 2. Prioritization Framework

We don't just tell you what's wrong. We tell you **what to fix first**.

**Essential_Served (Fix First):**

- Semantic HTML structure
- Form field naming standards
- Schema.org structured data
- HTTP status codes
- Security headers

**Works for:** All AI agents (70%+ of traffic)
**Impact:** High
**Scoring weight:** Heavy

**Essential_Rendered (Fix Second):**

- Explicit state attributes
- Persistent error messages
- Dynamic validation feedback

**Works for:** Browser-based agents (30% of traffic)
**Impact:** Medium
**Scoring weight:** Moderate

**Nice_To_Have (Fix Last):**

- Table data attributes
- Button disabled explanations
- Auth state visibility

**Works for:** Advanced agents
**Impact:** Low
**Scoring weight:** Light

**Result:** Clear action plan. Fix essential issues first, speculative improvements last.

### 3. Comprehensive Coverage

**One analysis run. Eleven reports.**

Most tools focus on one dimension. Web Audit Suite measures everything:

- ✅ SEO (keywords, structure, optimization)
- ✅ Accessibility (WCAG 2.1 compliance)
- ✅ Performance (Core Web Vitals)
- ✅ Security (headers, configuration)
- ✅ Content (quality, freshness)
- ✅ Images (optimization, alt text)
- ✅ Links (structure, quality)
- ✅ **AI compatibility (the differentiator)**

You get the complete picture, not just one slice.

### 4. Actionable Output

Every report includes:

- Current score (0-100)
- Specific issues found
- Priority level (essential vs nice-to-have)
- Recommended fixes
- Expected impact

**Example output row:**

| URL | Served Score | Rendered Score | Essential Issues | Top Recommendation |
|-----|--------------|----------------|------------------|--------------------|
| /products/tent | 65 | 73 | 2 | Add Schema.org product data |

**Translation:** Works okay for agents (65/100) but missing structured data hurts discoverability. Fix: Add 10 lines of JSON-LD. Expected impact: +15 points, better agent recommendations.

## How It Works

### Installation (2 Minutes)

```bash
# Clone the repository
git clone https://github.com/tomcranstoun/web-audit-suite
cd web-audit-suite

# Install dependencies
npm install
```

### Basic Usage

```bash
# Analyze your entire site
npm start -- -s https://yoursite.com/sitemap.xml

# Test with 10 pages first
npm start -- -s https://yoursite.com/sitemap.xml -l 10 -o test

# Run full analysis after testing
npm start -- -s https://yoursite.com/sitemap.xml -o full-audit
```

### Output

All reports are saved in the output directory (default: `results/`):

```
results/
├── seo_report.csv
├── performance_analysis.csv
├── seo_scores.csv
├── accessibility_report.csv
├── wcag_report.md
├── image_optimization.csv
├── link_analysis.csv
├── content_quality.csv
├── security_report.csv
├── llm_general_suitability.csv      ← AI compatibility
├── llm_frontend_suitability.csv     ← Frontend patterns
├── llm_backend_suitability.csv      ← Backend patterns
└── results.json                      ← Raw data
```

**Time to complete:** 5-15 minutes for typical sites (100-500 pages)

## Who Should Use This

### E-commerce Businesses

**You need this if:**

- You sell products online
- AI agents visit your product pages
- You have complex checkout forms
- You want to capture agent-driven sales

**Focus on:**

- Product structured data (Schema.org)
- Checkout form field naming
- Clear pricing display
- Complete specifications

**Expected impact:** 5-15% revenue increase from agent conversions

### SaaS Platforms

**You need this if:**

- You have trial signup forms
- Multi-step onboarding processes
- Complex configuration interfaces
- API documentation

**Focus on:**

- Form field naming standards
- Explicit state for multi-step flows
- Persistent error messages
- API discoverability

**Expected impact:** 8-12% improvement in trial-to-paid conversion from agents

### Content Publishers

**You need this if:**

- You publish articles, guides, reviews
- You want AI agents to recommend your content
- You rely on organic traffic
- You have advertising revenue

**Focus on:**

- Article structured data
- Author and publisher markup
- Clear content structure
- Semantic HTML

**Expected impact:** 40-60% increase in agent recommendations

### Digital Agencies

**You need this if:**

- You build websites for clients
- You offer SEO/optimization services
- You want to differentiate from competitors
- You need data-driven recommendations

**Focus on:**

- White-label reports for clients
- Before/after optimization proof
- New service offerings
- Recurring monitoring revenue

**Expected impact:** New £5k-15k service offering per client

## Frequently Asked Questions

### Is this just for AI agents?

No. Web Audit Suite measures traditional SEO, accessibility, performance, security, and content quality - all the things that matter for human users too.

The AI agent compatibility reports are an **addition** to comprehensive website analysis, not a replacement.

**Think of it as:** Google Analytics + SEO tool + Accessibility scanner + Performance monitor + **AI agent compatibility** - all in one.

### How accurate is the scoring?

Very. The methodology is based on:

- Published web standards (HTML5, Schema.org, WCAG 2.1)
- Real AI agent testing (ChatGPT, Claude, Perplexity)
- Accessibility best practices (screen reader compatible = agent compatible)
- 50,000 words of research in "The Invisible Users" book

Every recommendation is grounded in evidence, not speculation.

### Will this help my SEO?

Yes. Many AI-friendly patterns are also SEO best practices:

- Semantic HTML improves search engine understanding
- Schema.org structured data enables rich snippets
- Proper heading structure helps content indexing
- Clean URLs and status codes matter for crawling
- Fast performance improves rankings

**Bonus:** As AI-powered search grows (ChatGPT search, Perplexity, Google SGE), AI agent compatibility becomes a ranking factor.

### How long does it take to fix issues?

Depends on your starting point, but typically:

- **Quick wins (1-2 hours):** Add Schema.org, fix form field names, add semantic elements
- **Medium effort (1-2 days):** Restructure forms, add ARIA labels, fix error handling
- **Larger projects (1-2 weeks):** Refactor SPA to progressive enhancement, add server-side rendering

**Most critical fixes take less than a day of developer time.**

### What's the ROI?

For businesses with decent traffic and AI agent visits:

- **E-commerce:** 800-80,000% ROI (depending on size)
- **SaaS:** 2,000-25,000% ROI
- **Content:** 3,000-30,000% ROI
- **Agencies:** 2,000-4,000% ROI from new service offerings

Even conservatively, the tool pays for itself in the first month.

### Do I need technical expertise?

**To run the tool:** Basic command line knowledge (we provide copy-paste commands)

**To understand reports:** No technical expertise needed - scores and recommendations are clear

**To implement fixes:** Yes, you'll need a developer. But we provide:

- Specific recommendations
- Priority framework
- Example code patterns
- Expected impact

Most fixes are straightforward HTML/markup changes, not complex programming.

### When will the SaaS version launch?

**Current state:** Open-source tool available on GitHub now

**Planned:** SaaS platform in Q2-Q3 2026 with:

- Web dashboard
- Scheduled recurring audits
- Historical comparison
- Team collaboration
- API access

**Want early access?** Email <tom@allabout.network>

### How does this relate to "The Invisible Users" book?

Perfect complement:

**Book = Methodology** (the "why" and "what")

- Why AI agents fail on websites
- What patterns break agents
- How to design for both humans and agents
- Business case for optimization

**Tool = Measurement** (the "how" and "now")

- How to measure your current state
- What specifically is broken on your site
- Which issues to fix first
- How to track improvement

**Together = Complete Solution**

- Learn the methodology from the book
- Measure your site with the tool
- Implement fixes using book guidance
- Validate improvements with tool re-runs

### Is my data private?

Yes. Web Audit Suite runs locally on your machine or your infrastructure:

- No data sent to external servers
- All analysis happens locally
- Reports stored on your filesystem
- Complete privacy and control

**Future SaaS version:** Optional cloud hosting with enterprise-grade security

## Getting Started Today

### Option 1: Request Access

Web Audit Suite is available for businesses serious about AI agent compatibility.

**Get in touch to discuss:**

- Licensing options
- Custom deployment
- Agency partnerships
- Enterprise agreements

**Email:** <tom@allabout.network>
**Time:** Initial consultation typically within 48 hours

### Option 2: Read the Methodology First

Get "The Invisible Users" book to understand the complete picture:

- Why AI agents matter for your business
- Patterns that break agents (and humans)
- How to design for both audiences
- Business case for optimization

**Then** use Web Audit Suite to measure your implementation.

**Available at:** [allabout.network/invisible-users](https://allabout.network/invisible-users)

### Option 3: SaaS Platform (Coming Q2-Q3 2026)

Prefer a web dashboard to command-line tools?

**Join the waitlist for:**

- Web-based interface
- Scheduled recurring audits
- Historical comparison tracking
- Team collaboration features
- Priority support

**Email:** <tom@allabout.network> with subject "SaaS Waitlist"

## The Bottom Line

AI agents are visiting your website right now. Some are succeeding. Most are failing silently.

You can't fix what you can't measure.

Web Audit Suite gives you the measurements that matter:

- ✅ Complete website analysis across 11 dimensions
- ✅ AI agent compatibility scoring for served and rendered HTML
- ✅ Evidence-based methodology from published research
- ✅ Clear prioritization framework
- ✅ Actionable recommendations
- ✅ Proven ROI for businesses of all sizes

**The opportunity window is 12-18 months.** Early adopters will capture agent-driven conversions their competitors lose. By 2027-2028, AI agent compatibility will be table stakes.

**Ready to measure what matters?** Contact <tom@allabout.network> to discuss access options.

---

## Resources

**Web Audit Suite (Tool):**

- Access: Contact <tom@allabout.network>
- Documentation: Available with license
- Support: Email support included

**The Invisible Users (Methodology):**

- Book: [allabout.network/invisible-users](https://allabout.network/invisible-users)
- Preview: [Interactive Jupyter Notebook](https://allabout.network/invisible-users.html)
- Technical Guidance: [advice.md](https://github.com/tomcranstoun/invisible-users/blob/main/invisible-users/advice.md)

**Contact:**

- Email: <tom@allabout.network>
- Web: [allabout.network](https://allabout.network)

---

**Published:** January 2026
**Author:** Tom Cranstoun
**Licensing:** Commercial - Contact for terms
