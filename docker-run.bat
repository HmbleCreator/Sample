@echo off
setlocal enabledelayedexpansion

echo Building and starting the application in development mode...
echo.

:: Check if .env file exists
if not exist .env.local (
    echo Error: .env.local file not found. Please make sure you have a .env.local file in the project root.
    echo You can copy .env.example to .env.local and update the values.
    pause
    exit /b 1
)

echo Step 1: Building the Docker image...
docker build -f Dockerfile.dev -t chatgpt-clone-dev .
if !ERRORLEVEL! NEQ 0 (
    echo Error: Failed to build the Docker image
    pause
    exit /b !ERRORLEVEL!
)

echo.
echo Step 2: Starting the development container...
echo.

:: Create a temporary file to store the environment variables
set "TEMP_ENV_FILE=%TEMP%\chatgpt-clone-env.tmp"
echo # Environment variables for chatgpt-clone > "%TEMP_ENV_FILE%"

:: Process each line in .env.local and remove any single quotes
for /f "usebackq delims=" %%a in (`.env.local`) do (
    set "line=%%a"
    :: Remove any single quotes from the line
    set "line=!line:'=!"
    :: Skip empty lines and comments
    if not "!line:~0,1!"=="#" if not "!line!"=="" (
        echo !line!>> "%TEMP_ENV_FILE%"
    )
)

echo Environment variables being used:
type "%TEMP_ENV_FILE%"
echo.

echo Starting the application with Docker...
docker run -it --rm ^
    -p 3000:3000 ^
    --env-file "%TEMP_ENV_FILE%" ^
    -e NEXTAUTH_URL=http://localhost:3000 ^
    -e NEXTAUTH_SECRET=%RANDOM%%RANDOM%%RANDOM%%RANDOM% ^
    -e HOSTNAME=0.0.0.0 ^
    -e NODE_ENV=development ^
    -v "%cd%:/app" ^
    -v "/app/node_modules" ^
    -v "%cd%/.next:/app/.next" ^
    --name chatgpt-clone-dev ^
    --add-host=host.docker.internal:host-gateway ^
    chatgpt-clone-dev

:: Clean up the temporary file
del "%TEMP_ENV_FILE%" >nul 2>&1

if !ERRORLEVEL! NEQ 0 (
    echo.
    echo Error: Failed to start the container
    echo.
    echo Troubleshooting steps:
    echo 1. Make sure port 3000 is not in use by another application
    echo 2. Check Docker Desktop for any error messages
    echo 3. Try restarting Docker Desktop
    echo 4. Check if your .env.local file has all required variables
    echo.
    pause
    exit /b !ERRORLEVEL!
)

pause
