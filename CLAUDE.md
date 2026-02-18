# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**custom-inputs** — newly initialized project (no source code yet).

## Version Control

This repository uses **Sapling** (`sl`) instead of Git.

- `sl status` — check working directory status
- `sl add <file>` — stage files
- `sl commit --config gpg.key= -m "message"` — commit changes (GPG bypass required in non-interactive env)
- `sl log` — view commit history

## Working Style

**High autonomy is expected.** Act decisively, make choices, and keep moving. Ask questions only when a decision is genuinely irreversible or ambiguous in intent.

### Commit-Driven Workflow

Commit early and often to checkpoint progress. Treat commits as save points, not milestones. Specifically:

- **Commit after each meaningful step** — a passing test, a new function wired up, a config change that works. Don't batch unrelated changes.
- **Commit before risky changes** — if you're about to refactor or try something uncertain, commit the known-good state first so it's easy to revert.
- **Commit CLAUDE.md changes immediately** when updating conventions or adding lessons learned.
- Don't ask for permission to commit. Just commit.

### Feedback-Loop-Driven Development

For every task, before writing implementation code:

1. **Define the acceptance criteria.** What does "done" look like? Express this as something executable — a test, a script, a command whose output you can check, a type-check that must pass, etc.
2. **Build that check first.** Write the test, assertion, or verification step before the implementation. This applies broadly — not just unit tests, but any form of automated feedback: build succeeding, linter passing, a CLI producing expected output, a type error disappearing.
3. **Run the check, confirm it fails** (or is absent) for the right reason.
4. **Implement** the solution.
5. **Run the check again, confirm it passes.**
6. **Verify holistically** — run the full relevant test suite / build / lint to ensure nothing else broke.

This is generalized TDD: the "test" is whatever feedback loop is most appropriate for the task.

### Systematic Self-Correction

When you make a mistake:

1. **Fix the immediate problem.**
2. **Diagnose the root cause.** Why did this happen? Was it a missing check, a wrong assumption, an unclear convention?
3. **Make an upstream fix.** If a convention or check could have prevented the mistake, add it — update this CLAUDE.md, add a lint rule, add a test, or improve the build. The goal is that the same class of mistake becomes mechanically impossible or automatically caught in the future.
