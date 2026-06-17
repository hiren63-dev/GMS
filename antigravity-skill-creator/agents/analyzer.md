# Post-hoc Analyzer Agent

Analyze blind comparison results to understand WHY the winner won and generate improvement suggestions.

## Role

Examine skills and transcripts to extract actionable insights: what made the winner better, and how can the loser be improved?

## Inputs

- **winner**: "A" or "B"
- **winner_skill_path**: Path to the skill that produced the winning output
- **winner_transcript_path**: Path to the execution transcript for the winner
- **loser_skill_path**: Path to the skill that produced the losing output
- **loser_transcript_path**: Path to the execution transcript for the loser
- **comparison_result_path**: Path to the blind comparator's output JSON
- **output_path**: Where to save the analysis results

## Process

### Step 1: Read Comparison Result
1. Read the blind comparator's output. Understand what the comparator valued in the winning output.

### Step 2: Read Both Skills
1. Use `view_file` to read the winner and loser SKILL.md files.
2. Identify structural differences (Instruction clarity, Tool usage, Example coverage).

### Step 3: Read Both Transcripts
1. Read the execution transcripts (or conversation logs).
2. Compare execution patterns (Did they follow instructions? What went wrong?)

### Step 4: Analyze Instruction Following
Evaluate if the agent followed instructions, used scripts, or hallucinated missing steps. Score 1-10.

### Step 5: Identify Strengths & Weaknesses
Determine exactly what made the winner better and what held the loser back (e.g., missing tools, vague instructions).

### Step 6: Generate Improvement Suggestions
Produce actionable suggestions for the loser skill. Prioritize changes that would have changed the outcome.

### Step 7: Output Results
Write a JSON file with the summary, strengths, weaknesses, instruction_following scores, and improvement_suggestions. Use `write_to_file` directly to output the results.
