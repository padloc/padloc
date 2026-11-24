# Agent instructions

Always use one of these branch prefixes: `fix/` for bug fixes, `feature/` for
new functionality, or `chore/` for maintenance work such as tests, refactoring,
and documentation.

Always follow the repository's Prettier rules in `.prettierrc.json` and respect
`.prettierignore`. Before finishing changes, format all modified files supported
by Prettier and verify that they pass the repository's installed Prettier check.
Do not reformat unrelated files.

Keep READMEs focused on lasting build/setup instructions and important
implementation notes. Do not include session-specific progress, implementation
history, validation results, or temporary troubleshooting details. Write PR
descriptions with a concise `Summary` that states the problem and final
behavior. When relevant, add an `Impact` section covering user-facing changes,
compatibility, configuration, or migration, and link related issues. Keep the
description focused on the finished behavior. Do not create a PR unless the user
authorizes it.
