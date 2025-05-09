@echo off
echo Running Stela CMake Tests...

REM Check if CMake is installed
where cmake >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: CMake is not installed or not in PATH.
    echo Please install CMake from https://cmake.org/download/
    exit /b 1
)

REM Create test build directory
if not exist test_build mkdir test_build
cd test_build

REM Copy the test CMakeLists.txt to use for testing
echo Preparing test configuration...
copy ..\CMakeLists.txt.test CMakeLists.txt

REM Configure the project with testing enabled
echo Configuring test project...
cmake .
if %ERRORLEVEL% neq 0 (
    echo Error: CMake test configuration failed.
    exit /b 1
)

REM Run the tests
echo Running tests...
ctest -C Release --output-on-failure
if %ERRORLEVEL% neq 0 (
    echo Error: Some tests failed.
    exit /b 1
)

echo.
echo All tests completed successfully!
echo.

cd ..