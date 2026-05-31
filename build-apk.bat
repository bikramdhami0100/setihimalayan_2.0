@echo off
echo ========================================
echo Setting up icons...
echo ========================================

set ASSETS=D:\backupfile\setihimalayan_2.0\seti_app\assets
set RES=D:\backupfile\setihimalayan_2.0\seti_app\android\app\src\main\res

copy /y "%ASSETS%\logo.png" "%ASSETS%\icon.png" > nul
copy /y "%ASSETS%\logo.png" "%ASSETS%\adaptive-icon.png" > nul
copy /y "%ASSETS%\logo.png" "%ASSETS%\splash-icon.png" > nul

echo Icons set from logo.png

echo Deleting old mipmap icon cache...
del /s /q "%RES%\mipmap-*\ic_launcher*" 2> nul
echo Done.

echo.
echo ========================================
echo Building APK...
echo ========================================
cd /d "D:\backupfile\setihimalayan_2.0\seti_app\android"
call .\gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon

echo.
echo ========================================
echo Building AAB...
echo ========================================
call .\gradlew.bat bundleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon

echo.
echo ========================================
echo BUILD COMPLETE!
echo APK: android\app\build\outputs\apk\release\app-release.apk
echo AAB: android\app\build\outputs\bundle\release\app-release.aab
echo ========================================
pause
