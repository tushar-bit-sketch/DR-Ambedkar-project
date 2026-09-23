@echo off
REM ==============================================================================
REM SIH26096 — Digital Heritage Archive for Memorials, Manuscripts & Ambedkar
REM WINDOWS 11 EXHIBITION TERMINAL KIOSK LAUNCHER
REM ==============================================================================
REM Launches the exhibition workstation in a locked-down, full-screen kiosk mode.
REM Prevents unauthorized navigation, touch gestures, and desktop breakout.
REM ==============================================================================

setlocal enabledelayedexpansion

title Ambedkar Memorial Archive Kiosk Station
echo ==============================================================================
echo   AMBEDKAR MEMORIAL ARCHIVE - INTERACTIVE EXHIBITION KIOSK TERMINAL
echo ==============================================================================

REM Configure terminal endpoint and credentials
if "%KIOSK_SERVER_URL%"=="" set KIOSK_SERVER_URL=http://localhost:5173
if "%KIOSK_START_ROUTE%"=="" set KIOSK_START_ROUTE=/kiosk/media
set KIOSK_FULL_URL=%KIOSK_SERVER_URL%%KIOSK_START_ROUTE%

echo Target Kiosk URL: %KIOSK_FULL_URL%

REM Check for Chrome or Edge browser executable
set BROWSER_EXE=
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=C:\Program Files\Microsoft\Edge\Application\msedge.exe"
)

if "%BROWSER_EXE%"=="" (
    echo [ERROR] Neither Google Chrome nor Microsoft Edge could be located.
    echo Please install a Chromium-based browser to launch in locked-down kiosk mode.
    pause
    exit /b 1
)

echo Found browser: %BROWSER_EXE%
echo Starting locked-down exhibition kiosk display...

REM Launch browser in dedicated user profile with kiosk lockdown flags:
REM --kiosk : Full-screen kiosk display without URL bar or window frames
REM --disable-pinch : Prevents unwanted touch pinch-zooming
REM --overscroll-history-navigation=0 : Prevents swipe-to-navigate gestures
REM --no-first-run : Bypasses first-run onboarding popups
REM --disable-session-crashed-bubble : Suppresses crash restore dialogs
REM --autoplay-policy=no-user-gesture-required : Smooth media playback for archival clips

start "" "%BROWSER_EXE%" ^
    --app="%KIOSK_FULL_URL%" ^
    --kiosk ^
    --disable-pinch ^
    --overscroll-history-navigation=0 ^
    --no-first-run ^
    --disable-features=TranslateUI ^
    --disable-session-crashed-bubble ^
    --autoplay-policy=no-user-gesture-required ^
    --user-data-dir="%TEMP%\kiosk_archive_profile"

echo Kiosk terminal launched successfully.
