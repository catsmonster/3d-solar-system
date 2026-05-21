---
name: subagent-driven-development
description: Use when executing implementation plans in Antigravity 2 by dispatching fresh, isolated subagents per task with specialized roles
---

# Subagent-Driven Development (Antigravity 2 Edition)

Execute structured implementation plans by delegating individual tasks to dedicated, isolated subagents using Antigravity 2's native multi-agent tools. This ensures context-free execution without history pollution, keeping the parent coordinator's context clean and focused on integration and review.

---

## 1. Subagent Lifecycle & Tools

In Antigravity 2, subagent execution is fully asynchronous, reactive, and managed via native APIs:
- **Spawning:** Use `default_api:invoke_subagent` to spawn a new subagent in the background. Specify `Workspace: 'share'` or `Workspace: 'branch'` based on whether the subagent needs to work on the parent directory or an isolated clone.
- **Role Assignment:** Define a specialized `Role` (e.g., `"Planet Carousel Implementer"`, `"Pinch Gesture Expert"`, or `"Spec Reviewer"`) and write a clear, self-contained `Prompt` containing the task specification.
- **Communication:** Use `default_api:send_message` to send direct guidelines or answer questions surfaced by subagents.
- **Coordination:** The main orchestrator reviews the outputs returned by subagents, coordinates merge integration, and manages overall project state.

---

## 2. The Multi-Agent Workflow

For each task in the approved implementation plan, follow this strict three-stage subagent review loop:

```
                  +---------------------------+
                  |  Read Task Specification  |
                  +-------------+-------------+
                                |
                                v
             +------------------+------------------+
             | Dispatch Implementer Subagent      |  <--- (Workspace: 'share')
             | (invoke_subagent)                   |
             +------------------+------------------+
                                |
                                v
             +------------------+------------------+
             | Dispatch Spec Reviewer Subagent     |  <--- (Workspace: 'share' / read-only)
             | (Verify code meets plan rules)      |
             +------------------+------------------+
                                |
                   (Fails?)     |     (Passes?)
                     +----------+----------+
                     |                     |
                     v                     v
          +----------+----------+  +-------+-------+
          | Re-dispatch         |  | Dispatch Code |
          | Implementer Subagent|  | Quality Sub-  |
          | to apply fixes      |  | agent         |
          +---------------------+  +-------+-------+
                                           |
                                           v
                                   (Approve and Merge)
```

### Stage A: Isolated Implementation
1. **Define the Implementer Subagent:** Specify their role and exact prompt bounds (e.g., file paths, expected functions).
2. **Launch:** Call `invoke_subagent` with `Workspace: 'share'` so changes are directly reflected in the local project workspace.
3. **Verify:** Once the implementer subagent reports completion, ensure they ran manual/automated verifications.

### Stage B: Spec Compliance Review
1. **Define the Spec Reviewer Subagent:** Instruct a new subagent to compare the newly committed code with the task description in the implementation plan.
2. **Review Criteria:** Check for missing requirements or extra/over-built features. If gaps exist, re-dispatch the implementer subagent to address them.

### Stage C: Code Quality Review
1. **Define the Code Quality Subagent:** Instruct a subagent to check for architecture consistency, clean coding standards (DRY/YAGNI), robust error handling, and correct touch gesture math in `app.js`.
2. **Approval:** Once approved, mark the task as complete in `docs/plans/task.md` and proceed to the next plan task.

---

## 3. Advantages in Antigravity 2

- **Zero Context Pollution:** Coordinator context remains small and efficient, avoiding token-limit exhaustion.
- **Non-blocking Execution:** The parent orchestrator can run multiple research/verification tasks in parallel.
- **Systematic Quality Gates:** Dedicated reviewers prevent "shortcut" implementations or unhandled exceptions.
