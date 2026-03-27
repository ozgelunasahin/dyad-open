---
topic: Committing hotfixes directly to main causes cherry-pick debt
date: 2026-03-27
prs: [61]
tags: [git, process, hotfix, branching]
---

# Direct-to-Main Hotfix Antipattern

## Context

During the post-deploy window for v0.1, a series of UX issues (squashed map pins, invitation flow rough edges, cover URL validation) needed rapid fixes. Ten commits were pushed directly to `main` without a feature branch or PR. The intent was speed -- skip the branch/PR ceremony for "obvious" one-line fixes.

The result was PR #61: a retroactive PR created by cherry-picking those 10 commits onto a branch, then force-pushing `main` to remove them. The PR description itself calls out "the direct-to-main lesson."

## What We Learned

1. **"Quick fixes" compound.** What starts as one fix becomes ten. Each direct commit makes it harder to back out because subsequent commits may depend on earlier ones. By the time you realise you need a PR, the damage is done.

2. **Cherry-picking is lossy.** When consolidating the 10 commits into a branch, the cherry-picks required careful ordering. Conflicts arose because some fixes touched the same files (e.g., `conversations/[id]/+page.svelte` was modified by the invitation flow fix AND the SlotCard selection fix). The final PR was a single squashed commit -- losing the granular history of which fix addressed which issue.

3. **Review is skipped, not deferred.** The whole point of a PR is that someone (including your future self) reviews the change. Direct-to-main commits bypass this entirely. PR #61's description needed a retrospective summary of all 10 changes because there was no review trail.

4. **Force-pushing main is always scary.** Even in a small team, force-pushing the default branch risks losing work if anyone else has pulled. The window between "commits on main" and "force-push to clean main" is a period of real risk.

## The Fix / Pattern

**Always branch, even for hotfixes.** The ceremony is minimal:

```bash
git checkout -b fix/hotfix-description
# make the fix
git commit
git push -u origin fix/hotfix-description
gh pr create --title "fix: description" --body "..."
# merge immediately if truly urgent
gh pr merge --squash
```

This takes 30 seconds longer than a direct push and provides:
- A review record (even if self-merged)
- Clean revert path (`git revert <merge-commit>`)
- No force-push needed on main
- CI runs on the branch before merge

For genuine emergencies (site is down), create the branch and PR *retroactively within minutes*, not after 10 commits have accumulated.

**If you already committed to main:** Stop immediately. Do not add more commits hoping to "fix it later." Create a branch from the current main, then reset main to before your commits. The longer you wait, the worse the cherry-pick debt gets.

## Why This Matters

The velocity gain from skipping branches is illusory. The time saved on 10 direct commits was more than consumed by the cherry-pick consolidation, the force-push coordination, and writing the retroactive PR description. The project now has a single squashed commit where it should have had 3-4 focused PRs with clear review trails.
