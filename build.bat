@echo off
setlocal enabledelayedexpansion

:: Create build directory if it doesn't exist
if not exist "build" mkdir build

:: Configure with CMake
cmake -B build -DCMAKE_BUILD_TYPE=Release

:: Build the project
cmake --build build --config Release

:: Check if build was successful
if %ERRORLEVEL% EQU 0 (
    echo Build completed successfully!
    echo Executable is located at: build\Release\Stela.exe
) else (
    echo Build failed with error code %ERRORLEVEL%
    exit /b %ERRORLEVEL%
)

endlocal