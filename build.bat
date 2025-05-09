@echo off
echo Building Stela with CMake...

REM Check if CMake is installed
where cmake >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: CMake is not installed or not in PATH.
    echo Please install CMake from https://cmake.org/download/
    exit /b 1
)

REM Create build directory if it doesn't exist
if not exist build mkdir build
cd build

REM Configure the project
echo Configuring project...
cmake ..
if %ERRORLEVEL% neq 0 (
    echo Error: CMake configuration failed.
    exit /b 1
)

REM Build the project
echo Building project...
cmake --build . --config Release
if %ERRORLEVEL% neq 0 (
    echo Error: Build failed.
    exit /b 1
)

echo.
echo Build completed successfully!
echo The executable is located in build\Release\Stela.exe
echo.

cd ..