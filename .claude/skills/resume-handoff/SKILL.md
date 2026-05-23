---
name: resume-handoff
description: Resume a prior session by loading a handoff document written by the /handoff skill.
argument-hint: "<slug>"
---

Load a handoff document and continue the work it describes.

## How to find the handoff

The user passes `<slug>` (the filename stem from `/handoff`). Look in this order and use the FIRST match:

1. `./.claude/handoffs/<slug>.md` — project-scoped
2. `~/.claude/handoffs/<slug>.md` — global

If neither exists, list candidates so the user can pick:

```bash
ls ./.claude/handoffs/ 2>/dev/null; ls ~/.claude/handoffs/
```

Then ask the user which one they meant. Do NOT guess — slugs can collide across projects.

If the user passes no slug, list both directories and ask which to resume.

## After loading

1. Read the file in full with the Read tool.
2. Briefly (3–5 lines) summarise back to the user what you understand the resumed task to be and where you'll pick up. Quote the `next-session-focus` from frontmatter.
3. If the handoff's `cwd` field differs from the current working directory, flag it — file paths in the doc may not resolve here.
4. Invoke any skills listed under "Suggested skills" only if the immediate next step calls for them. Don't fire them all preemptively.
5. Wait for the user to confirm or redirect before making changes. The handoff is context, not a command.

## Don't

- Don't delete the handoff file after resuming — the user may want to resume again or fork from it.
- Don't re-fetch / re-read every file the handoff references unless you actually need to act on them.
- Don't assume the repo state matches the handoff. Run `git status` / `git log` if state matters before acting.
