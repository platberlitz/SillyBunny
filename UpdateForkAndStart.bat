@echo off
@setlocal enabledelayedexpansion
pushd %~dp0
set "PATH=%USERPROFILE%\.bun\bin;%ProgramFiles%\Git\cmd;%ProgramFiles(x86)%\Git\cmd;%LocalAppData%\Programs\Git\cmd;%PATH%"
set "_need_prereqs=0"

where bun > nul 2>&1
if %errorlevel% neq 0 set "_need_prereqs=1"

echo Checking Git installation
where git > nul 2>&1
if %errorlevel% neq 0 set "_need_prereqs=1"

if "!_need_prereqs!"=="1" (
    where powershell > nul 2>&1
    if !errorlevel! neq 0 (
        echo Missing prerequisites were detected, and PowerShell is unavailable for automatic installation.
        echo Install Bun from https://bun.sh/ and Git from https://git-scm.com/downloads
        goto end
    )

    echo Installing missing prerequisites automatically...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Install-Prerequisites.ps1" -RequireGit
    if !errorlevel! neq 0 goto end
)

if not exist .git (
    echo [91mNot running from a Git repository. Reinstall using an officially supported method to get updates.[0m
    echo See: https://docs.sillytavern.app/installation/windows/
    goto end
)

REM Checking current branch
FOR /F "tokens=*" %%i IN ('git rev-parse --abbrev-ref HEAD') DO SET CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%

REM Checking for automatic branch switching configuration
set AUTO_SWITCH=
FOR /F "tokens=*" %%j IN ('git config --local script.autoSwitch') DO SET AUTO_SWITCH=%%j

SET TARGET_BRANCH=%CURRENT_BRANCH%

if NOT "!AUTO_SWITCH!"=="" (
    if "!AUTO_SWITCH!"=="s" (
        goto autoswitch-staging
    )
    if "!AUTO_SWITCH!"=="r" (
        goto autoswitch-release
    )

    if "!AUTO_SWITCH!"=="staging" (
        :autoswitch-staging
        echo Auto-switching to staging branch
        git checkout staging
        SET TARGET_BRANCH=staging
        goto update
    )
    if "!AUTO_SWITCH!"=="release" (
        :autoswitch-release
        echo Auto-switching to release branch
        git checkout release
        SET TARGET_BRANCH=release
        goto update
    )

    echo Auto-switching defined to stay on current branch
    goto update
)

if "!CURRENT_BRANCH!"=="staging" (
    echo Staying on the current branch
    goto update
)
if "!CURRENT_BRANCH!"=="release" (
    echo Staying on the current branch
    goto update
)

echo You are not on 'staging' or 'release'. You are on '!CURRENT_BRANCH!'.
set /p "CHOICE=Do you want to switch to 'staging' (s), 'release' (r), or stay (any other key)? "
if /i "!CHOICE!"=="s" (
    echo Switching to staging branch
    git checkout staging
    SET TARGET_BRANCH=staging
    goto update
)
if /i "!CHOICE!"=="r" (
    echo Switching to release branch
    git checkout release
    SET TARGET_BRANCH=release
    goto update
)

echo Staying on the current branch

:update
REM Checking for 'upstream' remote
git remote | findstr "upstream" > nul
if %errorlevel% equ 0 (
    echo Updating and rebasing against 'upstream'
    git fetch upstream
    git rebase upstream/%TARGET_BRANCH% --autostash
    goto install
)

echo Updating and rebasing against 'origin'
git pull --rebase --autostash origin %TARGET_BRANCH%


:install
if %errorlevel% neq 0 (
    echo [91mThere were errors while updating.[0m
    echo See the update FAQ at https://docs.sillytavern.app/usage/update/#common-update-problems
    goto end
)

echo Installing Bun packages and starting server
set NODE_ENV=production
set NODE_NO_WARNINGS=1
set SILLYBUNNY_LAUNCHER=1
set "_dependency_profile=bun-production"
if exist node_modules\eslint\package.json set "_dependency_profile=bun-development"
bun scripts\dependency-state.js check !_dependency_profile! > nul 2>&1
if !errorlevel! neq 0 (
    if "!_dependency_profile!"=="bun-development" (
        echo Installing Bun packages including development tooling...
        call bun install --frozen-lockfile --no-progress --no-summary
    ) else (
        echo Installing Bun packages...
        call bun install --frozen-lockfile --production --no-progress --no-summary
    )
    if !errorlevel! neq 0 goto end
    bun scripts\dependency-state.js mark !_dependency_profile!
    if !errorlevel! neq 0 goto end
) else (
    echo Dependencies are up to date.
)

call bun run init
if !errorlevel! neq 0 goto end

:server_loop
bun server.js %*
set "_server_exit=!errorlevel!"
if "!_server_exit!"=="75" (
    echo.
    echo [SillyBunny] Restarting server...
    set SILLYBUNNY_SKIP_BROWSER_AUTO_LAUNCH=1
    goto server_loop
)

:end
pause
popd
