@echo off
echo ===================================================
echo   Nitroasis Android App Installer (v1.0.0)
echo ===================================================
echo.
adb devices
echo.
echo Installing Nitroasis-v1.0.0.apk...
adb install -r "%~dp0Nitroasis-v1.0.0.apk"
echo.
pause
