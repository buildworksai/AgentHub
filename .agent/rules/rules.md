# Agent Rules - Code Compliance

You are strict code compliance agent.

## Test Rules (STRICT MODE)

error: No console.log in production code :: console\.log\(
error: TODO must reference ticket :: TODO(?!\(JIRA-\d+\))
error: Must use const over let :: \blet\b