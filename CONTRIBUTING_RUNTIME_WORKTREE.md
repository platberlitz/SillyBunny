# Runtime Worktree Contribution Workflow

Use this workflow when you are contributing from pull-request branches and want the SillyBunny server to keep running from a stable, tracked branch.

The normal launchers and built-in updater expect the running checkout to be clean and to have upstream tracking. Feature branches and stacked PR branches are often not in that state, so the runtime worktree helper keeps the server checkout separate from the worktree where you edit code.

## Start A Stable Runtime

Windows PowerShell:

```powershell
.\scripts\Start-RuntimeWorktree.ps1
```

macOS, Linux, or WSL:

```bash
./scripts/start-runtime-worktree.sh
```

By default the helper:

- creates or updates a runtime worktree under a sibling `SillyBunny Contribution` folder;
- runs the local branch `runtime/sillybunny-server`;
- tracks and fast-forwards from `origin/staging`;
- installs production dependencies in the runtime worktree;
- starts `server.js` from the runtime worktree;
- forwards the current checkout's `data/` directory;
- forwards the current checkout's `config.yaml` when that file exists.

## Use A Different Runtime Ref

Use another stable ref when a PR stack needs to run on an integration branch that is not `origin/staging`.

Windows PowerShell:

```powershell
.\scripts\Start-RuntimeWorktree.ps1 -RuntimeRef origin/my-stable-branch
```

macOS, Linux, or WSL:

```bash
SILLYBUNNY_RUNTIME_REF=origin/my-stable-branch ./scripts/start-runtime-worktree.sh
```

You can also pass the POSIX option form:

```bash
./scripts/start-runtime-worktree.sh --runtime-ref origin/my-stable-branch
```

## Forward Server Arguments

Windows PowerShell:

```powershell
.\scripts\Start-RuntimeWorktree.ps1 -ServerArgs @('--port', '4445')
```

macOS, Linux, or WSL:

```bash
./scripts/start-runtime-worktree.sh -- --port 4445
```

## Keep Contribution Files Together

Keep additional PR worktrees, runtime logs, and temporary contribution artifacts under the same sibling `SillyBunny Contribution` folder. This keeps the main checkout clean and makes it clear which folders are contribution tooling rather than the primary app checkout.

For example:

```text
SillyBunny/
SillyBunny Contribution/
  SillyBunny-runtime/
  SillyBunny-runtime-logs/
  SillyBunny-feature-worktree/
```

## Safety Rules

The helper refuses to update a runtime worktree with local changes. Commit, stash, or remove those changes first.

Runtime updates use fast-forward merges only. If the runtime branch diverges from the selected runtime ref, resolve that branch manually before using the helper again.

The helper does not move or delete your main checkout. It only creates or updates the requested runtime worktree.
