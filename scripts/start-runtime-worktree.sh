#!/usr/bin/env bash

set -euo pipefail

runtime_path="${SILLYBUNNY_RUNTIME_PATH:-}"
runtime_ref="${SILLYBUNNY_RUNTIME_REF:-origin/staging}"
runtime_branch="${SILLYBUNNY_RUNTIME_BRANCH:-runtime/sillybunny-server}"
skip_fetch=0
skip_install=0
server_args=()

usage() {
    cat <<'USAGE'
Usage: scripts/start-runtime-worktree.sh [options] [-- server args...]

Options:
  --runtime-path PATH      Runtime worktree path (default: SillyBunny Contribution/*-runtime)
  --runtime-ref REF        Stable ref to run (default: origin/staging)
  --runtime-branch NAME    Local runtime branch (default: runtime/sillybunny-server)
  --skip-fetch             Do not fetch the runtime ref remote before updating
  --skip-install           Do not run bun install in the runtime worktree
  -h, --help               Show this help

Environment overrides:
  SILLYBUNNY_RUNTIME_PATH
  SILLYBUNNY_RUNTIME_REF
  SILLYBUNNY_RUNTIME_BRANCH
USAGE
}

while (($#)); do
    case "$1" in
        --runtime-path)
            runtime_path="${2:?Missing value for --runtime-path}"
            shift 2
            ;;
        --runtime-ref)
            runtime_ref="${2:?Missing value for --runtime-ref}"
            shift 2
            ;;
        --runtime-branch)
            runtime_branch="${2:?Missing value for --runtime-branch}"
            shift 2
            ;;
        --skip-fetch)
            skip_fetch=1
            shift
            ;;
        --skip-install)
            skip_install=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        --)
            shift
            server_args+=("$@")
            break
            ;;
        *)
            server_args+=("$1")
            shift
            ;;
    esac
done

die() {
    echo "start-runtime-worktree: $*" >&2
    exit 1
}

have_command() {
    command -v "$1" >/dev/null 2>&1
}

resolve_remote_name() {
    local ref="$1"
    local candidate

    case "$ref" in
        */*)
            candidate="${ref%%/*}"
            if git remote get-url "$candidate" >/dev/null 2>&1; then
                printf '%s\n' "$candidate"
                return 0
            fi
            ;;
    esac

    return 1
}

default_runtime_path() {
    local source_root="$1"
    local parent parent_leaf contribution_root leaf

    parent="$(dirname "$source_root")"
    parent_leaf="$(basename "$parent")"
    if [[ "$parent_leaf" == "SillyBunny Contribution" ]]; then
        contribution_root="$parent"
    else
        contribution_root="$parent/SillyBunny Contribution"
    fi

    leaf="$(basename "$source_root")"

    case "$leaf" in
        *-runtime-workflow)
            leaf="${leaf%-runtime-workflow}-runtime"
            ;;
        *-runtime)
            leaf="${leaf}-server"
            ;;
        *)
            leaf="${leaf}-runtime"
            ;;
    esac

    printf '%s/%s\n' "$contribution_root" "$leaf"
}

absolute_path() {
    local path="$1"
    local parent leaf

    case "$path" in
        /*|[A-Za-z]:/*) ;;
        *) path="$source_root/$path" ;;
    esac

    parent="$(dirname "$path")"
    leaf="$(basename "$path")"
    mkdir -p "$parent"
    printf '%s/%s\n' "$(cd "$parent" && pwd)" "$leaf"
}

require_clean_runtime_worktree() {
    local path="$1"
    local status

    status="$(git -C "$path" status --porcelain --untracked-files=normal)"
    [[ -z "$status" ]] || die "Runtime worktree has local changes. Commit, stash, or remove them before updating $path."
}

have_command git || die "Git is required to manage the runtime worktree."
have_command bun || die "Bun is required to start the SillyBunny runtime worktree."

source_root="$(git rev-parse --show-toplevel)"
source_root="$(cd "$source_root" && pwd)"

if [[ -z "$runtime_path" ]]; then
    runtime_path="$(default_runtime_path "$source_root")"
fi

runtime_path="$(absolute_path "$runtime_path")"

if (( ! skip_fetch )); then
    if runtime_remote="$(resolve_remote_name "$runtime_ref")"; then
        echo "Fetching $runtime_remote for runtime ref $runtime_ref..."
        git fetch --quiet "$runtime_remote"
    fi
fi

target_commit="$(git rev-parse --verify "${runtime_ref}^{commit}")" \
    || die "Could not resolve runtime ref '$runtime_ref'. Fetch it first or pass --runtime-ref with an existing branch/ref."

if [[ ! -e "$runtime_path" ]]; then
    echo "Creating runtime worktree at $runtime_path from $runtime_ref..."
    if git show-ref --verify --quiet "refs/heads/$runtime_branch"; then
        git worktree add "$runtime_path" "$runtime_branch"
        git -C "$runtime_path" merge --ff-only "$target_commit"
    else
        git worktree add -b "$runtime_branch" "$runtime_path" "$target_commit"
    fi
else
    echo "Updating runtime worktree at $runtime_path..."
    current_branch="$(git -C "$runtime_path" symbolic-ref --quiet --short HEAD)" \
        || die "Runtime worktree at $runtime_path is detached or invalid."
    [[ "$current_branch" == "$runtime_branch" ]] \
        || die "Runtime worktree is on branch '$current_branch', expected '$runtime_branch'."

    require_clean_runtime_worktree "$runtime_path"
    git -C "$runtime_path" merge --ff-only "$target_commit"
fi

if runtime_remote="$(resolve_remote_name "$runtime_ref")"; then
    git -C "$runtime_path" branch --set-upstream-to="$runtime_ref" "$runtime_branch" >/dev/null
fi

cd "$runtime_path"

if (( ! skip_install )); then
    echo "Installing runtime dependencies..."
    bun install --frozen-lockfile --production --no-progress --no-summary
fi

data_root="$source_root/data"
config_path="$source_root/config.yaml"
forwarded_args=(--dataRoot "$data_root")
if [[ -f "$config_path" ]]; then
    forwarded_args+=(--configPath "$config_path")
fi
forwarded_args+=("${server_args[@]}")

echo "Starting SillyBunny from $runtime_path"
echo "Using contributor data root $data_root"
if [[ -f "$config_path" ]]; then
    echo "Using contributor config $config_path"
fi

exec bun server.js "${forwarded_args[@]}"
