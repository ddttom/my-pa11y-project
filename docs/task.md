# Purpose

Create a centralized URL validation system for handling localized site variants by adding a new validation layer that wraps around existing code WITHOUT modifying any current functionality. This system will serve as a new, additional checkpoint while keeping all existing code unchanged.

Critical Preservation Requirements:

1. All existing code must remain exactly as is - no modifications to current functions
2. The new validation system must be implemented entirely through new functions
3. Current code paths must continue to work exactly as they do now
4. The new validator must be implemented as a wrapper around existing functionality

Core Architecture Principle:
The system must implement a single, centralized validation utility that becomes an additional checkpoint before existing URL processing occurs. This approach ensures:

- Existing code remains untouched and continues functioning as before
- New validation logic stays separate from current implementation
- All current functionality is preserved exactly as is
- Validation is added through new wrapper functions only

Central Validation Function:
Create a utility function `isAllowedLanguageUrl` that serves as the canonical validator:

- Must be called by all new wrapper functions that process URLs
- Validates URLs based on these rules:
  - Block URLs containing two-letter country codes (e.g., domain.org/fr, domain.org/ru)
  - Allow exceptions for /us and /en paths
  - Return true for allowed URLs, false for blocked ones
- Include comprehensive documentation explaining:
  - The validation logic
  - Integration requirements for wrapper implementation
  - Examples of correct wrapper patterns
  - Common pitfalls to avoid

Integration Requirements:
All URL processing points must integrate with the central validator through new wrapper functions while preserving their current behavior entirely intact:

1. URL Processing Components:
   Each component must be wrapped with new validation logic:
   - URL parsing system
   - Site interpretation engine
   - Analytics tracking service
   - Virtual routing system
   - Sitemap generation utility

   Example wrapper pattern:

   ```javascript
   // New wrapper function - does not modify existing code
   function validateAndProcessUrl(url) {
     // First, check with central validator
     if (!isAllowedLanguageUrl(url)) {
       return handleDisallowedUrl(url);
     }
     // Call existing function without any modifications
     return existingUrlProcessor(url);
   }
