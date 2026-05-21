---
name: dispatching-parallel-agents
description: Use when facing multiple independent tasks, research explorations, or dry-run math validations that can run in parallel
---

# Dispatching Parallel Agents (Antigravity 2 Edition)

Facilitate concurrent execution of independent tasks by spawning parallel, isolated subagents. Antigravity 2's native background execution system allows spawning multiple subagents concurrently, accelerating research, dry-run validations, and multi-file debugging.

---

## 1. Concurrency Safety Rules

In Antigravity 2, multiple subagents can run concurrently in the background. To prevent collision or race conditions:

- **Workspace Selection (`Workspace` parameter):**
  - **`'share'` (Shared Workspace):** Use only when subagents are working on different subsystems, different test files, or distinct, non-overlapping source files. **Never** dispatch multiple write-level subagents with `'share'` to edit the same file simultaneously.
  - **`'branch'` (Isolated Workspace):** Use when subagents are doing exploratory coding, temporary refactorings, or independent feature branches. These can be safely merged back sequentially via Git.
  - **`'inherit'` (Default / Read-only):** Use for concurrent research, web queries, math dry-runs, and system status queries.
- **Problem Domain Isolation:** Each dispatched subagent must have a strict, highly focused scope. If tasks are inter-dependent (e.g. modifying the same central function), execute them sequentially using `subagent-driven-development` instead.

---

## 2. Dispatching the Parallel Agents

When facing independent subsystems that require simultaneous work:

1. **Partition the Work:** Divide the requirements into discrete, standalone problem domains.
2. **Draft the Instructions:** Compose self-contained prompts for each subagent.
3. **Trigger Concurrent Invocations:** Make a single `default_api:invoke_subagent` call containing multiple subagent configurations in the `Subagents` array.
4. **Monitor Progress:** Wait reactively. Antigravity 2's internal messaging queue will wake you up when each subagent sends updates or finishes their execution block.

---

## 3. Real-World Applications in Antigravity 2

*   **Exploratory Math Dry-Runs:** While implementing a primary task, spawn a background subagent to dry-run and verify complex multi-touch vector equations or OrbitControls formulas.
*   **CSS Browser Compatibility Research:** Dispatch a research subagent to verify mobile browser compatibility and CSS variables rules while you build out the main HTML structure.
*   **Independent Bug Fixing:** If both a stylesheet bug and a script syntax error occur simultaneously, dispatch two separate subagents in parallel to fix them, reducing downtime.
