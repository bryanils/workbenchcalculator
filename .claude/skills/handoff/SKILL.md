---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "[name] [direction for the next session]"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work.

## Parsing the arguments

Arguments are optional and free-form. Parse them like this:

- **No arguments** → YOU pick a meaningful slug (kebab-case, ≤ 4 words) based on the dominant topic of the conversation. Print it back so the user knows what to pass to `/resume-handoff`.
- **First token is a short name/slug** (one word, or quoted, or clearly looks like an identifier) → use it as the slug; everything after it is the **direction** for the next session.
- **Arguments look like a sentence, not a name** (e.g. `finish wiring up the export button`) → treat the whole thing as direction and derive a slug yourself from it.

When in doubt, pick a slug yourself rather than turning a sentence into a giant filename. The slug is what the user will type into `/resume-handoff` — it should be short and memorable.

The **direction** (whether passed explicitly or implied) is what the next session will focus on. Put it in the `next-session-focus` frontmatter field and let it shape what you emphasise in the doc.

## Where to save

Always save to BOTH:

1. `./.claude/handoffs/<slug>.md` — per-project (preferred for project-scoped work)
2. `~/.claude/handoffs/<slug>.md` — global fallback (so `/resume-handoff` works from any cwd)

If `./.claude/handoffs/` does not exist (no `.claude` dir in cwd, or not in a project), save only to the global location.

## Naming

- Kebab-case the slug (whether the user provided it or you derived it).
- If a file with that slug already exists, append `-2`, `-3`, … to avoid overwriting prior handoffs. Do not silently overwrite.
- Final filename pattern: `<slug>.md` (no timestamps in the name — they make `/resume-handoff <name>` harder to type).
- Always echo the chosen slug back to the user at the end, since it's the handle they need to resume.

## Document structure

```
---
slug: <slug>
created: <YYYY-MM-DD>
cwd: <absolute path of the project at handoff time>
branch: <git branch if applicable>
next-session-focus: <one line — what the next agent should do first>
---

# Handoff: <human title>

## Context
<2–6 sentences. What was the user doing, what's the goal, what constraints matter.>

## What's been done
<Bulleted. Reference files with path:line, PRs/commits by hash, plans/PRDs by path. Do NOT duplicate their content.>

## What's left / where to resume
<Bulleted. Concrete next actions. Name the file and function to start in if known.>

## Open questions / decisions pending
<Anything the user hasn't decided yet that the next session must not assume.>

## Suggested skills
<List skills by name the next agent should consider invoking, e.g. `verify`, `code-review`, `run`.>

## Gotchas
<Non-obvious things — environment quirks, failed approaches to avoid, user preferences that came up.>
```

## Rules

- Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL.
- Redact API keys, passwords, tokens, and PII.
- If the user passed a description after the slug, treat it as what the next session will focus on and tailor the doc accordingly.
- After writing, print the absolute path(s) and tell the user: `Resume with: /resume-handoff <slug>`.
