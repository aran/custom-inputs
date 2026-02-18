# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**custom-inputs** — AI-customizable chat UI where Claude dynamically generates interactive input components at runtime.

### Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Vitest (unit/integration tests) + Playwright (E2E browser tests)
- Anthropic SDK for Claude API

## Commands

```bash
npm run dev          # Start dev server on localhost:3000
npm run build        # Production build (also runs tsc)
npm run lint         # ESLint
npm run test         # Vitest unit + integration tests
npm run test:e2e     # Playwright browser tests (starts dev server)
npm run test:all     # Both Vitest and Playwright

npx tsc --noEmit     # Type check only
```

### Integration tests
The prompt behavior tests in `tests/integration/prompt-behavior.test.ts` require `ANTHROPIC_API_KEY` in the environment. They skip gracefully without it.

```bash
ANTHROPIC_API_KEY=sk-ant-... npm run test
```

## Architecture

### Key paths
- `src/lib/system-prompt.ts` — System prompt template (the product)
- `src/lib/claude.ts` — Anthropic API client + tool definitions
- `src/lib/storage.ts` — localStorage helpers for API key
- `src/lib/sandbox.ts` — postMessage protocol types
- `src/components/Chat.tsx` — Main chat container (conversation state, API calls)
- `src/components/CustomInputPanel.tsx` — Sandboxed iframe wrapper
- `src/app/api/chat/route.ts` — SSE streaming API route
- `public/sandbox.html` — iframe host with Tailwind CDN

### Data flow
1. User sends text → Chat.tsx adds to conversation log → POST to /api/chat
2. Claude responds with text + optional `create_input_component` tool call
3. Tool call → CustomInputPanel renders code in sandboxed iframe
4. User interacts with component → `submitInput(data)` via postMessage
5. Parent formats as `[Custom Input: Title] {json}` → adds to chat → sends to Claude
6. Claude sees data + component state in system prompt → responds meaningfully

### Conversation log
`Chat.tsx` maintains a `conversationLog` ref (separate from display messages) that includes `tool_use` and `tool_result` blocks for proper Anthropic API formatting.

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

## Known Issues

- Node 25's built-in `localStorage` has a limited API (no `removeItem`/`clear`). The Vitest setup file (`tests/setup.ts`) provides a full polyfill.
- Vitest 4 changed test signature: timeout goes as second argument options `{ timeout: N }`, not third argument.
