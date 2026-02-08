#!/bin/bash
# File: /home/ec2-user/.openclaw/workspace/sangokushi-web/run-automation.sh
# Run daily at 1 AM PST via cron: 0 8 * * * cd /home/ec2-user/.openclaw/workspace/sangokushi-web && ./run-automation.sh

cd /home/ec2-user/.openclaw/workspace/sangokushi-web \
&& git checkout master \
&& git pull \
&& if [ ! -f IMPL-INDEX.md ]; then \
    echo " ERROR: IMPL-INDEX.md not found. Aborting." \
    && exit 1; \
fi

echo " Using Claude Opus to find the next feature to implement..."

# STEP 1: Ask Opus to identify the next  task
NEXT_FEATURE_INFO=$(opencode -m "amazon-bedrock/us.anthropic.claude-opus-4-6-v1" run "
You are tasked with selecting the next feature to implement from IMPL-INDEX.md.

Read IMPL-INDEX.md.  
Find the first line where status is 'not implemented'
Return ONLY this exact format:
Feature: <name>
Description: <text>

Do not add explanations, markdown, or commentary.
" 2>&1)

# If no item found
if echo "$NEXT_FEATURE_INFO" | grep -q "Feature:"; then
    FEATURE_NAME=$(echo "$NEXT_FEATURE_INFO" | grep "Feature:" | sed 's/Feature: *//')
    FEATURE_DESC=$(echo "$NEXT_FEATURE_INFO" | grep "Description:" | sed 's/Description: *//')
    echo " Selected: $FEATURE_NAME"
    echo "   $FEATURE_DESC"
else
    echo " All features are completed in IMPL-INDEX.md. Awaiting updates."
    exit 0
fi

echo " Using Kimi K2.5 to implement $FEATURE_NAME..."

# STEP 2: Use Kimi K2.5 to implement the feature — actual coding
OUTPUT=$(opencode -m "opencode/kimi-k2.5-free" run "
Implement the following feature from IMPL-INDEX.md:
Feature: $FEATURE_NAME
Description: $FEATURE_DESC

Follow exactly:
1. Create a new feature branch named: 'feat/rtk4-<lowercase-feature-name>-<random-5chars>'
2. Write clean, comment-rich TypeScript/JavaScript code in correct files.
3. Write unit tests using Vitest or Jest — achieve ≥90% coverage (run 'npm run test' to verify)
4. Run 'npm run lint' and 'npm run build' — fail if any error
5. git add .
6. git commit -m 'feat: implement $FEATURE_NAME (RTK IV original)'
7. git push --set-upstream origin feat/rtk4-<feature-name>-<random> — if this fails, STOP
8. gh pr create --title 'feat: implement $FEATURE_NAME (RTK IV)' --body 'Implements the original Romance of the Three Kingdoms IV $FEATURE_NAME mechanic. No modernization. See IMPL-INDEX.md for details.' — if this fails, STOP
9. After successful PR creation, update IMPL-INDEX.md: change the '' next to this feature to ''
10. Print ONLY this line at the end: 'PR_CREATED: <URL_OF_THE_PR>'
11. DO NOT say 'I will', 'I assume', 'I think', or 'simulating'. 
12. DO NOT invent URLs. DO NOT skip steps.
13. If any step fails, return: 'ERROR: <detailed-message>' and exit with code 1.

Do not explain. Do not summarize. Just do it.
" 2>&1)

# STEP 3: Handle outcome
if echo "$OUTPUT" | grep -q "PR_CREATED:"; then
    PR_LINE=$(echo "$OUTPUT" | grep "PR_CREATED:" | tail -n 1)
    echo " Feature implemented and PR created: $PR_LINE"
    exit 0

elif echo "$OUTPUT" | grep -q "ERROR:"; then
    echo " Execution failed with error: $(echo "$OUTPUT" | grep "ERROR:")"
    echo " Preserving IMPL-INDEX.md. Awaiting next run."
    exit 0

else echo "⚠️ No PR_CREATED or ERROR found — assuming incomplete work."
    echo "✅ Cleaning workspace, preserving IMPL-INDEX.md."
    git restore .
    git clean -fd
    echo "✅ Cleaned. Awaiting next run."
    exit 0
fi
