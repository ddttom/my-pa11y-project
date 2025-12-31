Execute the systematic "step commit" workflow:

1. Initial Commit
   - Review all current changes with git status and git diff
   - Commit all current code changes with a clear, descriptive commit message
   - Do NOT add attribution or "Generated with" messages

2. Linting
   - Run lint on all changed files
   - Fix all linting errors
   - Commit lint fixes separately

3. Documentation Review
   - Check last modification dates of README.md, CLAUDE.md, and CHANGELOG.md
   - Review if these files need updates based on recent changes
   - Use CHANGELOG.md to understand past changes if needed
   - Review all project documents mentioned in CLAUDE.md
   - Check if changes affect synchronized files: PITCH.md, BLOG.md, CLAUDE.md, README.md

4. Documentation Updates
   - Update any necessary documentation files
   - Verify PITCH.md and BLOG.md reflect current features and approach
   - Commit documentation changes

5. Learning Documentation
   - CRITICAL: LEARNINGS.md is NOT a changelog
   - ONLY update if NEW critical mistakes or architectural rules were discovered
   - Contains actionable guidance: "Never do X", "Always do Y", "Critical pattern Z"
   - NEVER add historical entries like "Added feature X" or "Updated files A, B, C"
   - If no new critical guidance discovered, SKIP this step

6. Project State
   - Update or create PROJECTSTATE.md
   - Document current state only (not historical)
   - Keep this as a snapshot of current implementation status

7. Changelog
   - Update CHANGELOG.md with all changes made in this session
   - This is where historical "what we did" content goes
   - Follow chronological order (newest first)

8. Final Steps
   - Commit changelog updates
   - Ask user if they want to push all commits to remote

Execute each step methodically, reporting progress after each stage is complete.
