---
name: antigravity-skill-creator
description: Create new global skills in Google Antigravity, modify and improve existing skills, and measure skill performance. Use this when users want to create a skill from scratch, edit or optimize an existing skill, run evals to test a skill, or optimize a skill's description for better triggering accuracy in Antigravity.
compatibility: Google Antigravity
---

# Antigravity Skill Creator

A global skill for creating new Antigravity skills and iteratively improving them.

At a high level, the process of creating a skill goes like this:

- Decide what the user wants the skill to do and roughly how it should do it.
- Write a draft of the skill inside `~/.agents/workflows/` (or the local workspace if testing).
- Create a few test prompts and run Antigravity on them (either in new chats or inline sub-tasks).
- Help the user evaluate the results both qualitatively and quantitatively.
- Rewrite the skill based on feedback from the user's evaluation of the results.
- Repeat until you're satisfied.
- Expand the test set and try again at a larger scale.

Your job when using this skill is to figure out where the user is in this process and then jump in and help them progress through these stages.

## Communicating with the user

When creating an Antigravity skill, remember that the user might be highly technical, or just someone looking to configure their agent. 
- Use the `notify_user` tool whenever you need to wait on the user for review or qualitative feedback.
- Format your output clearly in markdown to help them understand the skill structure.

---

## Creating a skill

### Capture Intent

Start by understanding the user's intent. First extract answers from the conversation history regarding:
1. What should this skill enable Antigravity to do?
2. When should this skill trigger?
3. What is the expected output format?
4. Do we need objective test cases?

### Write the SKILL.md

Based on the user interview, fill in these components:
- **name**: Skill identifier (used inside the YAML frontmatter).
- **description**: When to trigger, what it does. Make descriptions slightly "pushy". Instead of "How to build a dashboard", write "How to build a dashboard. Use this skill whenever the user asks for a dashboard or data visualization."

#### Progressive Disclosure

Skills use a three-level loading system:
1. **Metadata** (name + description in YAML frontmatter).
2. **SKILL.md body** - In context whenever skill triggers. Try to keep this concise.
3. **Bundled resources** - Kept in sub-folders (e.g. `agents/`, `scripts/`, `references/`) and accessed as needed via the `view_file` tool.

### Skill Format Example

```
my-antigravity-skill/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic tasks
    ├── agents/     - Subtask instructions for Antigravity (like grader.md)
    └── references/ - Docs loaded into context as needed
```

## Running and evaluating test cases

1. **Inline Execution**: In Antigravity, run tasks using the `task_boundary` mechanic. Spawn test cases by simulating scenarios within the current workspace, or asking the user to try the skill in a new chat.
2. **Draft Assertions:** Create `evals.json` and decide what quantitative metrics you're looking for (e.g., file generated, format is correct).
3. **Grade**: Use the grader agent logic (if provided in `agents/grader.md`) to read outputs and evaluate if expectations passed or failed.
4. **Review**: Since Antigravity communicates primarily via chat and the Artifacts UI, compile the summary into a clear markdown report and use `notify_user` to present the results to the user. Ask them for qualitative feedback.

## Improving the skill

1. **Generalize from the feedback.** Don't overfit to just the 2 test cases. Make the instructions robust.
2. **Explain the why.** Try hard to explain the **why** behind instructions in `SKILL.md` instead of just writing rigid MUSTs. This makes the agent more flexible.
3. **Look for repeated work.** If a task requires a python script over and over (like converting CSV to PDF), write that script and bundle it in `scripts/`, then tell the skill to use the `run_command` tool to execute it!

Repeat until the user is happy!

## Packaging the Skill

Since this is Antigravity, ask the user if they'd like the skill placed in their active workspace or if they want it copied to their global agents directory (`~/.agents/workflows/` or the equivalent environment skill folder).

Use `write_to_file` to scaffold the entire `SKILL.md` and any associated agents perfectly.
