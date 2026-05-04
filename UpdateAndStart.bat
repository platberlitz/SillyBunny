@echo off
setlocal enabledelayedexpansion
pushd %~dp0

set "PATH=%USERPROFILE%\.bun\bin;%ProgramFiles%\Git\cmd;%ProgramFiles(x86)%\Git\cmd;%LocalAppData%\Programs\Git\cmd;%PATH%"
set "_need_prereqs=0"

where bun > nul 2>&1
if %errorlevel% neq 0 set "_need_prereqs=1"

where git > nul 2>&1
if %errorlevel% neq 0 set "_need_prereqs=1"

if "%_need_prereqs%"=="1" (
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

call git pull --rebase --autostash
if %errorlevel% neq 0 (
    REM In case there is still something wrong.
    echo [91mThere were errors while updating.[0m
    echo See the update FAQ at https://docs.sillytavern.app/installation/updating/
    goto end
)

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
endlocal
