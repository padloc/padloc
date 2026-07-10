# Agent Instructions - padloc fork

Project-level rules for AI agents (opencode, Claude Code, etc.) working in this
repository. These are inherited by every session and by every contributor who
uses an agent.

## Language policy (STRICT)

-   **Everything committed to this repository MUST be in English.** No Russian
    or any other non-English words anywhere in git - this includes, without
    exception:
    -   Git commit messages
    -   All documentation (`README`, `CONTRIBUTING.md`, everything under
        `docs/`, including internal `docs/superpowers/` specs and plans)
    -   Code comments, identifiers (variables, functions, types), and
        log/user-facing strings in source
    -   Pull request and issue titles/descriptions, and all GitHub templates
    -   Any other file tracked by git
-   **Conversation with the user happens in the user's preferred language**
    (currently Russian). This spoken/chat language is the ONLY thing that may be
    non-English. The moment content is written to a tracked file or a git/GitHub
    artifact, it MUST be English.
-   If the user gives an instruction or content in Russian that needs to land in
    the repo, translate it to clear English before committing.
