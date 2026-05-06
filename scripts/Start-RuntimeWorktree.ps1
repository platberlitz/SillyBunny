[CmdletBinding()]
param(
    [string]$RuntimePath,
    [string]$RuntimeRef = $(if ($env:SILLYBUNNY_RUNTIME_REF) { $env:SILLYBUNNY_RUNTIME_REF } else { 'origin/staging' }),
    [string]$RuntimeBranch = $(if ($env:SILLYBUNNY_RUNTIME_BRANCH) { $env:SILLYBUNNY_RUNTIME_BRANCH } else { 'runtime/sillybunny-server' }),
    [switch]$SkipFetch,
    [switch]$SkipInstall,
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$ServerArgs
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Git {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    $output = & git @Arguments 2>&1
    $exitCode = $LASTEXITCODE

    return [pscustomobject]@{
        Output = @($output)
        ExitCode = $exitCode
    }
}

function Invoke-CheckedGit {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$Arguments
    )

    $result = Invoke-Git @Arguments
    if ($result.ExitCode -ne 0) {
        throw "git $($Arguments -join ' ') failed.`n$($result.Output -join "`n")"
    }

    return $result
}

function Get-FirstGitOutputLine {
    param(
        [Parameter(Mandatory = $true)]
        [pscustomobject]$Result
    )

    return (($Result.Output | Select-Object -First 1) -as [string]).Trim()
}

function Resolve-RepositoryRoot {
    $rootResult = Invoke-CheckedGit rev-parse --show-toplevel
    return (Resolve-Path -LiteralPath (Get-FirstGitOutputLine $rootResult)).Path
}

function Resolve-DefaultRuntimePath {
    param(
        [Parameter(Mandatory = $true)]
        [string]$SourceRoot
    )

    $sourceItem = Get-Item -LiteralPath $SourceRoot
    $parentItem = $sourceItem.Parent
    $contributionRoot = if ($parentItem.Name -eq 'SillyBunny Contribution') {
        $parentItem.FullName
    } else {
        Join-Path $parentItem.FullName 'SillyBunny Contribution'
    }
    $leaf = $sourceItem.Name

    if ($leaf -like '*-runtime-workflow') {
        $leaf = $leaf -replace '-runtime-workflow$', '-runtime'
    } elseif ($leaf -like '*-runtime') {
        $leaf = "$leaf-server"
    } else {
        $leaf = "$leaf-runtime"
    }

    return (Join-Path $contributionRoot $leaf)
}

function Resolve-GitRef {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Ref
    )

    $refResult = Invoke-Git rev-parse --verify "$Ref^{commit}"
    if ($refResult.ExitCode -ne 0) {
        throw "Could not resolve runtime ref '$Ref'. Fetch it first or pass -RuntimeRef with an existing branch/ref."
    }

    return Get-FirstGitOutputLine $refResult
}

function Get-RemoteNameFromRef {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Ref
    )

    if ($Ref -match '^[^/\s]+/.+') {
        $candidate = $Ref.Split('/')[0]
        $remoteResult = Invoke-Git remote get-url $candidate
        if ($remoteResult.ExitCode -eq 0) {
            return $candidate
        }
    }

    return $null
}

function Test-CleanWorktree {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    Push-Location $Path
    try {
        $statusResult = Invoke-CheckedGit status --porcelain --untracked-files=normal
        return (($statusResult.Output -join "`n").Trim().Length -eq 0)
    } finally {
        Pop-Location
    }
}

function Initialize-OrUpdateRuntimeWorktree {
    param(
        [Parameter(Mandatory = $true)]
        [string]$RuntimeWorktreePath,
        [Parameter(Mandatory = $true)]
        [string]$TargetCommit
    )

    $existingPath = if (Test-Path -LiteralPath $RuntimeWorktreePath) {
        (Resolve-Path -LiteralPath $RuntimeWorktreePath).Path
    } else {
        $null
    }

    if (-not $existingPath) {
        $runtimeParent = Split-Path -Parent $RuntimeWorktreePath
        if (-not (Test-Path -LiteralPath $runtimeParent)) {
            New-Item -ItemType Directory -Path $runtimeParent | Out-Null
        }

        Write-Host "Creating runtime worktree at $RuntimeWorktreePath from $RuntimeRef..."
        $branchExists = (Invoke-Git show-ref --verify --quiet "refs/heads/$RuntimeBranch").ExitCode -eq 0
        if ($branchExists) {
            Invoke-CheckedGit worktree add $RuntimeWorktreePath $RuntimeBranch | Out-Null
            Push-Location $RuntimeWorktreePath
            try {
                Invoke-CheckedGit merge --ff-only $TargetCommit | Out-Null
            } finally {
                Pop-Location
            }
        } else {
            Invoke-CheckedGit worktree add -b $RuntimeBranch $RuntimeWorktreePath $TargetCommit | Out-Null
        }
    } else {
        Write-Host "Updating runtime worktree at $existingPath..."
        Push-Location $existingPath
        try {
            $branchResult = Invoke-CheckedGit symbolic-ref --quiet --short HEAD
            $currentBranch = Get-FirstGitOutputLine $branchResult
            if ($currentBranch -ne $RuntimeBranch) {
                throw "Runtime worktree is on branch '$currentBranch', expected '$RuntimeBranch'."
            }

            if (-not (Test-CleanWorktree -Path $existingPath)) {
                throw "Runtime worktree has local changes. Commit, stash, or remove them before updating $existingPath."
            }

            Invoke-CheckedGit merge --ff-only $TargetCommit | Out-Null
        } finally {
            Pop-Location
        }
    }

    Push-Location $RuntimeWorktreePath
    try {
        $remoteName = Get-RemoteNameFromRef -Ref $RuntimeRef
        if ($remoteName) {
            Invoke-CheckedGit branch --set-upstream-to=$RuntimeRef $RuntimeBranch | Out-Null
        }
    } finally {
        Pop-Location
    }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git is required to manage the runtime worktree.'
}

if (-not (Get-Command bun -ErrorAction SilentlyContinue)) {
    throw 'Bun is required to start the SillyBunny runtime worktree.'
}

$sourceRoot = Resolve-RepositoryRoot
if ([string]::IsNullOrWhiteSpace($RuntimePath)) {
    $RuntimePath = Resolve-DefaultRuntimePath -SourceRoot $sourceRoot
}

if (-not [System.IO.Path]::IsPathRooted($RuntimePath)) {
    $RuntimePath = Join-Path $sourceRoot $RuntimePath
}

$RuntimePath = [System.IO.Path]::GetFullPath($RuntimePath)
$dataRoot = Join-Path $sourceRoot 'data'
$configPath = Join-Path $sourceRoot 'config.yaml'

if (-not $SkipFetch) {
    $runtimeRemote = Get-RemoteNameFromRef -Ref $RuntimeRef
    if ($runtimeRemote) {
        Write-Host "Fetching $runtimeRemote for runtime ref $RuntimeRef..."
        Invoke-CheckedGit fetch --quiet $runtimeRemote | Out-Null
    }
}

$targetCommit = Resolve-GitRef -Ref $RuntimeRef
Initialize-OrUpdateRuntimeWorktree -RuntimeWorktreePath $RuntimePath -TargetCommit $targetCommit

Push-Location $RuntimePath
try {
    if (-not $SkipInstall) {
        Write-Host 'Installing runtime dependencies...'
        bun install --frozen-lockfile --production --no-progress --no-summary
        if ($LASTEXITCODE -ne 0) {
            throw 'bun install failed in the runtime worktree.'
        }
    }

    $forwardedArgs = @('--dataRoot', $dataRoot)
    if (Test-Path -LiteralPath $configPath) {
        $forwardedArgs += @('--configPath', $configPath)
    }
    $forwardedArgs += $ServerArgs

    Write-Host "Starting SillyBunny from $RuntimePath"
    Write-Host "Using contributor data root $dataRoot"
    if (Test-Path -LiteralPath $configPath) {
        Write-Host "Using contributor config $configPath"
    }

    bun server.js @forwardedArgs
    exit $LASTEXITCODE
} finally {
    Pop-Location
}
