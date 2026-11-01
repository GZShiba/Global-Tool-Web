#!/usr/bin/env node
/**
 * ToolNest — Git-native build checkpoint & rollback workflow.
 *
 * The Git history is the single source of truth: every checkpoint is an
 * ordinary commit; rollback is branch/worktree based; the pre-rollback
 * state is always preserved via a uniquely named recovery branch.
 *
 * Commands:
 *   node scripts/git-checkpoint.mjs init [--branch main]
 *   node scripts/git-checkpoint.mjs checkpoint [--name N] [--message M] [--build] [--yes]
 *   node scripts/git-checkpoint.mjs list [--json]
 *   node scripts/git-checkpoint.mjs info <commit>
 *   node scripts/git-checkpoint.mjs push [--remote origin]
 *   node scripts/git-checkpoint.mjs restore <commit>            (test in a disposable worktree)
 *   node scripts/git-checkpoint.mjs restore <commit> --switch [--branch NAME]
 *   node scripts/git-checkpoint.mjs return
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

function git(args, opts = {}) {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    ...opts,
  }).trim();
}

function gitSafe(args, opts = {}) {
  try {
    return { ok: true, out: git(args, opts) };
  } catch (err) {
    return { ok: false, out: (err.stderr || err.message || '').trim() };
  }
}

function timestamp() {
  const now = new Date();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const local = now.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  });
  return { local, tz, utc: now.toISOString(), stamp: now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14) };
}

function isRepo() {
  const r = gitSafe(['rev-parse', '--is-inside-work-tree']);
  return r.ok && r.out === 'true';
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true;
      if (value !== true) i += 1;
      args[key] = value;
    } else {
      args._.push(a);
    }
  }
  return args;
}

const SECRET_PATTERNS = [
  /BEGIN (RSA|EC|OPENSSH|PRIVATE) KEY/,
  /ghp_[A-Za-z0-9]{20,}/,
  /\bsk-[A-Za-z0-9]{20,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /api[_-]?key\s*[:=]\s*["'][^"']{12,}/,
  /(aws_secret_access_key|github_token|openai_api_key)\s*[:=]\s*\S+/i,
];

const SENSITIVE_PATH_PATTERNS = [
  /(^|[/\\])\.env([^.]|$)/,
  /\.(pem|key|p12|cert|pfx)$/i,
  /credentials\.json$/i,
  /(^|[/\\])\.local-checkpoints([/\\]|$)/,
];

function scanForSecrets(files) {
  const hits = [];
  for (const rel of files) {
    if (SENSITIVE_PATH_PATTERNS.some(re => re.test(rel))) {
      hits.push(`${rel} (sensitive path)`);
      continue;
    }
    try {
      const content = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      if (SECRET_PATTERNS.some(re => re.test(content))) hits.push(`${rel} (possible secret content)`);
    } catch {
      /* unreadable/binary — skip content scan */
    }
  }
  return hits;
}

/* ------------------------------------------------------------------ */
/* Commands                                                            */
/* ------------------------------------------------------------------ */

function cmdInit(args) {
  if (isRepo()) {
    console.log('Already a Git repository.');
    return;
  }
  const branch = typeof args.branch === 'string' ? args.branch : 'main';
  git(['init', '-b', branch]);
  console.log(`Initialized empty Git repository (branch: ${branch}).`);
  console.log('Create the first checkpoint with:  npm run checkpoint -- --name "Baseline" --yes');
}

function cmdCheckpoint(args) {
  if (!isRepo()) throw new Error('Not a Git repository. Run `node scripts/git-checkpoint.mjs init` first.');

  const status = git(['status', '--porcelain']);
  if (!status) {
    console.log('Working tree clean — nothing to commit. No checkpoint created.');
    return;
  }

  const lines = status.split('\n').filter(Boolean);
  const changed = lines.map(l => l.slice(3));
  const secretHits = scanForSecrets(changed);
  if (secretHits.length) {
    console.error('Aborting: sensitive files or content detected in the staged set:');
    secretHits.forEach(h => console.error(`  - ${h}`));
    throw new Error('Checkpoint cancelled for safety. Review the listed files first.');
  }

  const name = typeof args.name === 'string' && args.name.trim() ? args.name.trim() : `Checkpoint ${timestamp().stamp}`;
  const { local, tz } = timestamp();
  const buildNote = args.build === true || args.build === 'true' ? '[build success]' : '';
  const message = typeof args.message === 'string' && args.message.trim()
    ? args.message.trim()
    : `checkpoint: ${name} — ${local} ${tz} ${buildNote}`.trim();

  console.log('Changes that would be included in this checkpoint:');
  lines.forEach(l => console.log(`  ${l}`));
  console.log(`\nCommit message: ${message}`);

  const yes = args.yes === true || args.yes === 'true';
  if (!yes) {
    console.error('\nConfirm with --yes to create this checkpoint.');
    process.exitCode = 1;
    return;
  }

  git(['add', '-A']);
  const sha = git(['commit', '-m', message]);
  const stat = git(['show', '--stat', '--oneline', '--format=%h', 'HEAD']);
  console.log(`Checkpoint created: ${sha}`);
  console.log(stat.split('\n').slice(0, 6).join('\n'));
}

function cmdList() {
  if (!isRepo()) throw new Error('Not a Git repository.');
  const json = process.argv.includes('--json');
  const log = git(['log', '--format=%H|%cI|%D|%s', '--decorate=short', '-n', '50']);
  const rows = log.split('\n').filter(Boolean).map(line => {
    const [sha, date, refs, subject] = line.split('|');
    return { sha, date, refs, subject };
  });
  if (json) {
    console.log(JSON.stringify({ checkpoints: rows }, null, 2));
    return;
  }
  if (!rows.length) {
    console.log('No commits yet — create a checkpoint with `npm run checkpoint`.');
    return;
  }
  console.log('Checkpoints (newest first):');
  rows.forEach(r => {
    const short = r.sha.slice(0, 10);
    console.log(`  ${short}  ${r.date}  ${r.subject}`);
  });
  const upstream = gitSafe(['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  console.log(`\nCurrent branch: ${git(['branch', '--show-current'])}`);
  console.log(upstream.ok ? `Upstream: ${upstream.out}` : 'Upstream: none (not yet pushed)');
}

function cmdInfo(args) {
  if (!isRepo()) throw new Error('Not a Git repository.');
  const commit = args._[1];
  if (!commit) throw new Error('Usage: info <commit>');
  const r = gitSafe(['cat-file', '-e', `${commit}^{commit}`]);
  if (!r.ok) throw new Error(`Commit not found locally: ${commit}`);

  console.log(git(['show', '--no-patch', '--format=commit %H%nAuthor: %an <%ae>%nDate:   %cI%nRefs:   %D%n%n%s%n%b', commit]));
  const localBranches = gitSafe(['branch', '--contains', commit]);
  if (localBranches.ok && localBranches.out) console.log(`\nBranches containing locally:\n${localBranches.out}`);
  const remoteBranches = gitSafe(['branch', '-r', '--contains', commit]);
  if (remoteBranches.ok && remoteBranches.out) console.log(`Remote branches containing:\n${remoteBranches.out}`);
  else console.log('Not present on any remote ref (or no remote configured).');
}

function cmdPush(args) {
  if (!isRepo()) throw new Error('Not a Git repository.');
  const remote = typeof args.remote === 'string' ? args.remote : 'origin';
  const remoteCheck = gitSafe(['remote', 'get-url', remote]);
  if (!remoteCheck.ok) throw new Error(`Remote "${remote}" is not configured. Add it first, e.g. git remote add ${remote} <url>`);

  const branch = git(['branch', '--show-current']);
  const fetchRes = gitSafe(['fetch', remote, branch]);
  if (!fetchRes.ok) {
    console.warn(`Warning: could not fetch ${remote}/${branch} (${fetchRes.out}). Push will still be attempted and errors reported.`);
  } else {
    const divergence = gitSafe(['rev-list', '--left-right', '--count', `HEAD...${remote}/${branch}`]);
    if (divergence.ok && divergence.out !== '0\t0') {
      console.warn(`Note: local and ${remote}/${branch} have diverged (${divergence.out}). Push may be rejected unless history is in sync.`);
    }
  }

  console.log(`Pushing ${branch} → ${remote}/${branch} …`);
  const pushRes = gitSafe(['push', remote, branch]);
  if (!pushRes.ok) {
    throw new Error(`Push failed — checkpoint remains local only.\n${pushRes.out}`);
  }
  console.log(`Push succeeded: ${branch} → ${remote}/${branch}`);
}

function cmdRestore(args) {
  if (!isRepo()) throw new Error('Not a Git repository.');
  const commit = args._[1];
  if (!commit) throw new Error('Usage: restore <commit> [--switch]');

  const exists = gitSafe(['cat-file', '-e', `${commit}^{commit}`]);
  if (!exists.ok) throw new Error(`Commit not found locally: ${commit} — fetch it from the remote first if it exists there.`);

  const status = git(['status', '--porcelain']);
  const switching = args.switch === true || args.switch === 'true';

  if (switching) {
    if (status) {
      throw new Error('Working tree has uncommitted changes. Stash or commit them first (e.g. `git stash`) before switching. No rollback performed.');
    }
    const currentBranch = git(['branch', '--show-current']) || 'detached';
    const { stamp } = timestamp();
    const branch = typeof args.branch === 'string' && args.branch.trim()
      ? args.branch.trim()
      : `checkpoint/${currentBranch}/pre-rollback-${stamp}`;

    // 1. Protect the current state with a uniquely named recovery branch.
    const recoveryBranch = `recovery/${currentBranch}/pre-rollback-${stamp}`;
    if (!gitSafe(['show-ref', '--verify', '--quiet', `refs/heads/${recoveryBranch}`]).ok) {
      git(['branch', recoveryBranch]);
      console.log(`Recovery branch created: ${recoveryBranch} → ${git(['rev-parse', '--short', 'HEAD'])}`);
    }

    // 2. Non-destructive switch to a new branch at the target checkpoint.
    git(['switch', '-c', branch, commit]);
    console.log(`Switched to checkpoint branch: ${branch} (commit ${git(['rev-parse', '--short', branch])})`);
    console.log(`Return to pre-rollback state with:  npm run checkpoint:return  (→ ${currentBranch})`);
    console.log('Note: recovery branches/tags are never deleted automatically.');
    return;
  }

  // Default: disposable worktree for safe inspection/testing.
  if (status) {
    console.warn('Note: working tree has uncommitted changes; the worktree is isolated and will not touch them.');
  }
  const short = git(['rev-parse', '--short', commit]);
  const wd = path.join(ROOT, '..', `${path.basename(ROOT)}-recovery-${short}`);
  if (fs.existsSync(wd)) {
    throw new Error(`Target worktree already exists: ${wd}`);
  }
  git(['worktree', 'add', wd, commit]);
  console.log(`Disposable recovery worktree created: ${wd}`);
  console.log(`Inspect/test the checkpoint there. Remove it later with: git worktree remove ${wd}`);
}

function cmdReturn() {
  if (!isRepo()) throw new Error('Not a Git repository.');
  const current = git(['branch', '--show-current']);
  const m = current.match(/^checkpoint\/(.+)\/pre-rollback-\d{14}$/);
  if (!m) {
    throw new Error(`Current branch "${current}" is not a checkpoint-restore branch; nothing to return from.`);
  }
  const original = m[1];
  const status = git(['status', '--porcelain']);
  if (status) {
    throw new Error('Working tree has uncommitted changes. Stash or commit first; no switch performed.');
  }
  git(['switch', original]);
  console.log(`Returned to pre-rollback branch: ${original} (${git(['rev-parse', '--short', original])})`);
}

/* ------------------------------------------------------------------ */
/* Main                                                                */
/* ------------------------------------------------------------------ */

const args = parseArgs(process.argv.slice(2));
const command = args._[0];

try {
  switch (command) {
    case 'init': cmdInit(args); break;
    case 'checkpoint': cmdCheckpoint(args); break;
    case 'list': cmdList(); break;
    case 'info': cmdInfo(args); break;
    case 'push': cmdPush(args); break;
    case 'restore': cmdRestore(args); break;
    case 'return': cmdReturn(); break;
    default:
      console.log(`Usage:
  node scripts/git-checkpoint.mjs init [--branch main]
  node scripts/git-checkpoint.mjs checkpoint [--name N] [--message M] [--build] [--yes]
  node scripts/git-checkpoint.mjs list [--json]
  node scripts/git-checkpoint.mjs info <commit>
  node scripts/git-checkpoint.mjs push [--remote origin]
  node scripts/git-checkpoint.mjs restore <commit>            (disposable worktree)
  node scripts/git-checkpoint.mjs restore <commit> --switch [--branch NAME]
  node scripts/git-checkpoint.mjs return`);
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exitCode = 1;
}
