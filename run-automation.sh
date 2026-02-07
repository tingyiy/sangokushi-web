#!/bin/bash
# File: /home/ec2-user/.openclaw/workspace/sangokushi-web/run-automation.sh
# Run daily at 1 AM PST via cron: 0 8 * * * cd /home/ec2-user/.openclaw/workspace/sangokushi-web && ./run-automation.sh

cd /home/ec2-user/.openclaw/workspace/sangokushi-web \
&& git checkout master \
&& git pull \
&& if [ ! -f PLAN.md ]; then \
    echo "📝 Creating PLAN.md using opencode..." \
    && opencode -m "amazon-bedrock/us.anthropic.claude-opus-4-6-v1" run "Read @FEATURES.md. Research the original Romance of the Three Kingdoms IV (SNES/PC, 1995). Identify ONE missing, authentic, impactful gameplay mechanic not yet implemented. ONLY output a detailed implementation plan in Markdown format, including: (1) name of feature, (2) how it worked in RTK IV, (3) where in codebase to implement (files/directories), (4) required data structures, (5) how it interacts with existing systems, (6) test coverage goals. Save this plan to PLAN.md. DO NOT implement. DO NOT write code. DO NOT update @FEATURES.md. DO NOT add commentary." > /dev/null; \
elif [ -f PLAN.md ]; then \
    echo "🚀 Executing feature from PLAN.md using opencode..." \
&& OUTPUT=$(opencode -m "opencode/kimi-k2.5-free" run "Implement the feature described in @PLAN.md. Follow exactly: 1. Create a new feature branch named: 'feat/rtk4-<lowercase-feature-name>-<random-5chars>'. 2. Write clean, comment-rich TypeScript/JavaScript code in correct files. 3. Write unit tests using Vitest or Jest — achieve ≥90% coverage. Run 'npm run test' to verify. 4. Run 'npm run lint' and 'npm run build' — if any error, STOP and return error. 5. Add all changed files: git add . 6. Commit with message: 'feat: implement <feature-name> (RTK IV original)'. 7. Push the branch to origin: git push --set-upstream origin feat/rtk4-<feature-name>-<random> — IF THIS FAILS, STOP. 8. Create a GitHub Pull Request using: gh pr create --title 'feat: implement <feature-name> (RTK IV)' --body 'Implements the original Romance of the Three Kingdoms IV <feature-name> mechanic. No modernization. See PLAN.md for details.' — IF THIS FAILS, STOP. 9. Print ONLY this exact line at the end: 'PR_CREATED: <URL_OF_THE_PR>'. 10. DO NOT say 'I will...', 'I have...', 'Assuming...', or 'Simulating...'. DO NOT invent URLs. 11. If any step fails, return a single line with: 'ERROR: <detailed-reason>' — and exit with code 1. DO NOT SKIP STEPS. DO NOT GUESS. DO NOT SIMULATE." 2>&1); \
    \
    if echo "$OUTPUT" | grep -q "PR_CREATED:"; then \
        PR_LINE=$(echo "$OUTPUT" | grep "PR_CREATED:" | tail -n 1); \
        echo "✅ Feature implemented and PR created: $PR_LINE" \
        && rm PLAN.md \
        && echo "✅ PLAN.md deleted. Feature complete." \
        && exit 0; \
    elif echo "$OUTPUT" | grep -q "ERROR:"; then \
        echo "⚠️ Execution failed with error: $(echo "$OUTPUT" | grep "ERROR:")" \
        && echo "✅ Preserving PLAN.md. Awaiting next run." \
        && exit 0; \
    else \
        echo "⚠️ No PR_CREATED or ERROR found — assuming incomplete work. Cleaning workspace, preserving PLAN.md." \
        && git restore . \
        && git clean -fd \
        && echo "✅ Cleaned. PLAN.md retained. Awaiting next run." \
        && exit 0; \
    fi \
fi

