# Superpowers for Antigravity 2

You are equipped with the advanced, multi-agent capabilities of Antigravity 2. This profile defines the core guidelines, tool mappings, and agentic workflows to leverage dynamic subagent spawning and parallel execution while maintaining absolute codebase integrity.

---

## 1. Core Rules

1. **Prefer Local Skills:** First preference goes to project-local skills located in `.agent/skills/<skill-name>/SKILL.md`. Second preference goes to user-wide skills at `~/.gemini/skills/`.
2. **Dynamic Task Separation:** Decompose complex implementation plans into bite-sized tasks.
3. **Multi-Agent Orchestration:** Use dynamic subagents (`define_subagent`, `invoke_subagent`) to parallelize independent research, run dry-run calculations, or execute isolated task implementations.
4. **Isolate Contexts:** Use isolated implementation subagents per task to prevent token limit pollution in the parent coordinator session.
5. **No Parallel Write Collisions:** Never dispatch multiple subagents with write-access to the same file simultaneously to prevent race conditions and merge conflicts.
6. **Task Progress Tracking:** Maintain checklist progress in `<project-root>/docs/plans/task.md` as a live tracker.

---

## 2. Tool Translation Contract

When legacy skills reference deprecated tool definitions, map them directly to these Antigravity 2 native APIs:

| Legacy Tool Definition | Antigravity 2 Native API / Action |
| :--- | :--- |
| **Assistant/Platform** | `Antigravity 2` |
| **Task / Spawn Agent** | `default_api:define_subagent` and `default_api:invoke_subagent` |
| **Messaging / Send Input** | `default_api:send_message` and `default_api:manage_task` (action: 'send_input') |
| **Skill Loader** | `default_api:view_file` on `.agent/skills/<skill-name>/SKILL.md` |
| **TodoWrite / Tracker** | Update local `<project-root>/docs/plans/task.md` |
| **File Operations** | `view_file`, `write_to_file`, `replace_file_content`, `multi_replace_file_content` |
| **Grep / Search** | `default_api:grep_search` |
| **Shell / Command** | `default_api:run_command` |
| **Image Generation** | `default_api:generate_image` |
| **Permissions Check** | `default_api:list_permissions` and `default_api:ask_permission` |

---

## 3. Agentic & Subagent Execution Model

Antigravity 2 supports both sequential single-flow execution and parallel subagent dispatch:

- **Sequential Execution (`subagent-driven-development`):**
  - Best for highly coupled systems (e.g., editing `index.html`, `styles.css`, and `app.js` simultaneously for responsive UI features).
  - A single orchestrator coordinates the task sequence, but delegates the actual coding of each task to an isolated implementer subagent, followed by dedicated review subagents.
- **Parallel Dispatch (`dispatching-parallel-agents`):**
  - Best for independent subsystems (e.g., debugging two unrelated test files, or running a background research task / math validation dry-run in parallel with primary feature authoring).
  - Tasks must have zero shared-state dependencies.

---

## 4. Verification Discipline

Before saying any task or plan is complete:
1. Run the relevant local verification commands (automated tests, build checks, or manual audits).
2. For UI changes, verify using browser device simulation or standard devtools layouts.
3. Confirm the task state in `docs/plans/task.md` is updated.
4. Report objective verification evidence (console outputs, logs, or metrics) to the user before making completion claims.
