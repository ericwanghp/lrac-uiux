#!/usr/bin/env node
/**
 * verify-git-commit.js
 *
 * Post-task check: Verifies that a git commit has been performed
 * Checks for clean working directory and recent commit
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Script is in .claude/hooks/
// Project root is ../../ from here
const ROOT_DIR = path.resolve(__dirname, '../../');

function main() {
  console.log('\n=== Git Commit Verification ===\n');

  // Skip if not a git repo
  if (!fs.existsSync(path.join(ROOT_DIR, '.git'))) {
    console.log('⚠️  Not a git repository, skipping verification');
    process.exit(0);
  }

  try {
    // 1. Check for uncommitted changes
    const status = execSync('git status --porcelain', { cwd: ROOT_DIR, encoding: 'utf8' });

    if (status.trim().length > 0) {
      console.log('❌ Uncommitted changes detected:');

      // Print first few lines of status
      const lines = status.split('\n').filter(l => l.trim());
      lines.slice(0, 10).forEach(line => console.log(`  ${line}`));
      if (lines.length > 10) console.log(`  ... and ${lines.length - 10} more files`);

      console.log('\nPlease run git commit after task completion');
      console.log('Suggested: git commit -m "feat(TASK-XXX): description"');
      process.exit(1);
    }

    // 2. Check if latest commit is recent (within last 15 minutes)
    // This ensures a commit was actually made during this session
    const lastCommitTimeStr = execSync('git log -1 --format=%ct', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
    const lastCommitTime = parseInt(lastCommitTimeStr, 10);
    const now = Math.floor(Date.now() / 1000);
    const diffSeconds = now - lastCommitTime;
    const diffMinutes = Math.floor(diffSeconds / 60);

    // --- Checklist enforcement for recent commits ---
    if (diffMinutes > 15) {
      console.log(`⚠️  Working tree is clean, but last commit was ${diffMinutes} minutes ago.`);
      console.log('If you just modified code, please verify the commit was successful.');
      console.log('If no code was modified, this warning can be ignored.');
      process.exit(0);
    }

    // Recent commit found — verify Feature Completion Checklist
    const lastCommitMsg = execSync('git log -1 --format=%s', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
    const lastCommitHash = execSync('git log -1 --format=%h', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();

    console.log('✅ Git commit verification passed');
    console.log(`   Latest commit: [${lastCommitHash}] ${lastCommitMsg}`);
    console.log(`   Committed: ${diffMinutes} minutes ago`);

    // Check if tasks.json was touched in the recent commit
    const diffFiles = execSync('git diff-tree --no-commit-id --name-only -r HEAD', {
      cwd: ROOT_DIR,
      encoding: 'utf8',
    }).trim();

    const changedFiles = diffFiles.split('\n').filter(Boolean);
    const tasksJsonChanged = changedFiles.some(
      (f) => f === '.auto-coding/tasks.json' || f === '.auto-coding\\tasks.json'
    );
    const progressTxtChanged = changedFiles.some(
      (f) => f === '.auto-coding/progress.txt' || f === '.auto-coding\\progress.txt'
    );

    console.log('');
    console.log('=== Feature Completion Checklist Verification ===');
    console.log(`   tasks.json updated:    ${tasksJsonChanged ? '✅ YES' : '❌ NO'}`);
    console.log(`   progress.txt updated:  ${progressTxtChanged ? '✅ YES' : '⚠️  NO (may not be needed for this commit)'}`);

    if (!tasksJsonChanged && changedFiles.some((f) => f.startsWith('app/') || f.startsWith('components/') || f.startsWith('lib/'))) {
      console.log('');
      console.log('⚠️  WARNING: Code files were committed but .auto-coding/tasks.json was NOT updated.');
      console.log('   Feature Completion Checklist requires: tasks.json -> progress.txt -> git commit');
      console.log('   If this commit completes a feature, update tasks.json and amend or create a follow-up commit.');
    }

    process.exit(0);

  } catch (e) {
    console.error(`Git verification failed: ${e.message}`);
    // Don't fail the hook if git commands fail unexpectedly (e.g. no commits yet)
    process.exit(0);
  }
}

main();
