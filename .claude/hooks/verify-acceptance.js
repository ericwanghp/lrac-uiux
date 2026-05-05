#!/usr/bin/env node
/**
 * verify-acceptance.js
 *
 * Feature Completion Checklist enforcement reminder.
 * Fires on PostToolUse:Write|Edit to remind the agent of the mandatory
 * three-step completion sequence: tasks.json -> progress.txt -> git commit.
 */

const path = require('path');
const fs = require('fs');

const ROOT_DIR = path.resolve(__dirname, '../../');
const TASKS_JSON = path.join(ROOT_DIR, '.auto-coding/tasks.json');

function verifyAcceptance() {
  console.log('\n=== Feature Completion Checklist Reminder ===');
  console.log('');
  console.log('MANDATORY completion sequence (in order):');
  console.log('  Step 1: Update .auto-coding/tasks.json  (passes: true, status: "completed")');
  console.log('  Step 2: Update .auto-coding/progress.txt (append session record)');
  console.log('  Step 3: git commit                       (atomic commit per feature)');
  console.log('');

  // Quick sanity: does tasks.json exist?
  if (!fs.existsSync(TASKS_JSON)) {
    console.log('⚠️  .auto-coding/tasks.json not found — create it before committing.');
  }

  console.log('Code quality checks:');
  console.log('  [ ] All unit tests pass');
  console.log('  [ ] Integration tests pass (if applicable)');
  console.log('  [ ] Code review completed (if required)');
  console.log('  [ ] Feature works as expected');
  console.log('  [ ] No blocking issues');
  console.log('');
  console.log('⚠️  Do NOT git commit until Steps 1 AND 2 are done.');
  console.log('');

  return true;
}

// Export function
module.exports = { verifyAcceptance };

// If run directly
if (require.main === module) {
  const success = verifyAcceptance();
  process.exit(success ? 0 : 1);
}
