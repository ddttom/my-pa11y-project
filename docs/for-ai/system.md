# Author & Context

**Author**: Tom Cranstoun (GitHub: @ddttom)

This document defines development standards and code quality expectations for projects under my stewardship. AI assistants and human collaborators should follow these guidelines to ensure consistency across all implementations.

**Language Convention**: British English spelling and grammar throughout all documentation and code comments.

---

## Development Requirements

### Core Technology Stack

- Modern JavaScript (ES6+) without TypeScript, utilising arrow functions, destructuring, async/await, modules, and template literals, unless the project states otherwise
- Pure CSS without Sass/Less preprocessors, leveraging CSS Grid, Flexbox, custom properties, and modern selectors for responsive design
  - PostCSS for autoprefixing is acceptable for cross-browser compatibility, unless project specifies otherwise
- HTML5 with semantic elements and ARIA attributes for accessibility compliance
- No front-end frameworks (React, Vue, Angular) unless explicitly required by the project
- Focus on simplicity and performance with emphasis on fast load times, minimal bundle sizes, and efficient DOM manipulation

### Dependency Philosophy

- **Runtime dependencies**: Zero external dependencies where possible - prioritise browser-native APIs and web standards
- **Development dependencies**: Limited to essential tools (linter, bundler, basic transpilation, test runner)
- Simple plain JavaScript with limited build steps, maximum of basic bundling, minification, or transpilation

### Code Organisation

- Clear code organisation and documentation with logical file structure, meaningful variable names, and comprehensive inline comments
- Configuration objects at file level scope for constants and settings
- Modular code structure with reusable functions and components, avoiding monolithic files
- Separation of concerns: distinct layers for data handling, business logic, and presentation

---

## Code Documentation Standards

### Inline Code Formatting

- Use single backticks to enclose all code snippets and technical terms
- **Strictly avoid triple backticks, `<pre>` tags, or code blocks** in documentation
- Format examples consistently:
  - `const greeting = "Hello World Example"`
  - `console.log("Hello, World!");`
  - `document.querySelector('.example-class')`

### Comment Guidelines

Add meaningful comments that explain:

- Purpose and intended outcomes
- Logic flow and decision trees
- Important considerations and trade-offs
- Edge cases and error scenarios
- Performance implications and optimisation opportunities

**Avoid obvious comments**:

```javascript
// Bad: Set x to 5
const x = 5;

// Bad: Loop through array
items.forEach(item => { });
```

**Prefer insightful comments**:

```javascript
// Using binary search here because dataset can exceed 10k items
const result = binarySearch(sortedData, target);

// HACK: Workaround for Safari bug #12345 - remove after iOS 18 adoption
if (isSafari) { applyWorkaround(); }
```

---

## Writing Best Practices

### Tone & Style

- Use clear, concise, and professional language appropriate for technical documentation
- Avoid stating obvious information - focus on non-trivial insights and implementation details
- Emphasise the "why" behind decisions and "how" to implement solutions rather than just describing "what" exists

### Documentation Focus

- Explain the reasoning behind architectural decisions
- Document trade-offs and alternatives considered
- Provide context for future maintainers
- Include performance implications and scaling considerations

---

## Code Quality & Craftsmanship

### Readability & Organisation

- Code readability with logical flow, intuitive organisation, and self-documenting structure
- Consistent naming conventions: camelCase for JavaScript, kebab-case for CSS
- Comment quality ensuring necessity, relevance, and perfect alignment with code intent without redundancy
- DRY (Don't Repeat Yourself) principle adherence with appropriate abstraction levels and reusable utility functions
- Single Responsibility Principle compliance at function, class, module, and component levels
- SOLID principles implementation where applicable, particularly Interface Segregation and Dependency Inversion

### Technical Implementation Excellence

#### Functional Correctness

- Complete requirement fulfilment with **production-level code quality**:
  - Handles error cases gracefully without exposing sensitive information
  - Includes appropriate logging for debugging in production
  - Performs efficiently under expected load
  - Is testable and maintainable by other developers
- Algorithm efficiency with computational complexity analysis and Big O notation considerations
- Performance optimisation opportunities including bottleneck identification, lazy loading, and efficient data structures
- Memory usage pattern analysis with potential leak detection and garbage collection optimisation

#### Resource Management

- Proper cleanup of event listeners, timers, file handles, database connections, and network resources
- Concurrency handling with Promise management, async/await patterns, and race condition prevention
- Browser compatibility considerations and progressive enhancement strategies

---

## Security & Robustness

### Input Validation & Sanitisation

- Comprehensive input validation and sanitisation strategies for all user inputs and external data sources
- Vulnerability assessment covering SQL injection, XSS, CSRF, clickjacking, and other OWASP Top 10 threats
- Sensitive data handling with proper encryption, secure storage, and transmission protocols

### Error Handling

- Error handling completeness with information disclosure prevention and user-friendly error messages
- Edge case coverage including boundary condition testing, null/undefined handling, and type coercion scenarios
- Exception management with graceful degradation strategies and fallback mechanisms
- Logging practices with appropriate detail levels whilst preventing sensitive information exposure

### Security Headers & Policies

- Content Security Policy implementation and secure HTTP headers configuration
- Protection against common web vulnerabilities through defence-in-depth approach

---

## Architecture & Design Patterns

### Component Design

- Component modularity with loose coupling principles and high cohesion within modules
- Code reusability through effective abstraction layers and composable utility functions
- Dependency injection and inversion of control implementation where beneficial
- Design pattern consistency with appropriate usage of Observer, Factory, Module, and Revealing Module patterns

### System Architecture

- API design quality including RESTful principles, proper HTTP status codes, and consistent response formats
- Event-driven architecture with custom events, message passing, and decoupled communication
- Caching strategies including browser caching, localStorage/sessionStorage, and in-memory caching approaches
- State management patterns for complex applications without external state libraries
- Progressive Web App considerations including service workers, offline functionality, and responsive design

---

## Testing Standards

### Testing Approach

- Write tests for critical business logic and complex algorithms
- Manual testing checklist for UI interactions and user workflows
- Browser compatibility testing across major browsers

### Testing Patterns (Vanilla JavaScript)

- Unit tests for pure functions and utility modules
- Integration tests for API interactions and data flow
- Use native browser testing capabilities where possible
- Keep tests simple and maintainable without heavy test frameworks

### When to Test

- All public API functions and exported modules
- Complex conditional logic and edge cases
- Critical user workflows (authentication, payments, data submission)
- Performance-sensitive operations

---

## Accessibility Standards

### Semantic HTML

- Use appropriate HTML5 semantic elements (`<nav>`, `<main>`, `<article>`, `<section>`, etc.)
- Proper heading hierarchy (h1 → h2 → h3) without skipping levels
- Form elements with associated `<label>` elements

### ARIA & Screen Readers

- ARIA labels for interactive elements without visible text
- ARIA live regions for dynamic content updates
- ARIA roles only when semantic HTML is insufficient

### Keyboard Navigation

- All interactive elements accessible via keyboard (Tab, Enter, Space, Escape)
- Visible focus indicators for keyboard users
- Logical tab order matching visual layout

### Inclusive Design

- Sufficient colour contrast ratios (WCAG AA minimum: 4.5:1 for text)
- Text resizable up to 200% without loss of functionality
- No reliance on colour alone to convey information

---

## Version Control Standards

### Commit Messages

- Use clear, descriptive commit messages explaining the "why" not just the "what"
- Format: `[Type] Brief description` where Type is: feat, fix, docs, refactor, test, chore
- Examples:
  - `[feat] Add user authentication with JWT tokens`
  - `[fix] Resolve memory leak in event listener cleanup`
  - `[refactor] Extract validation logic into separate module`

### Branch Management

- Descriptive branch names: `feature/user-auth`, `fix/memory-leak`, `refactor/validation`
- Keep branches focused on single features or fixes
- Delete branches after merging

### Pull Requests

- Include clear description of changes and reasoning
- Reference related issues or documentation
- Ensure all tests pass before requesting review
- Address reviewer feedback promptly

---

## Maintenance & Updates

**Important**: Remember to perform linting and update [README.md](/README.md), [CLAUDE.md](/CLAUDE.md), and relevant documentation in `/docs` to reflect any significant changes made to this standards document before committing to version control.
