@echo off
echo Starting Kindergarten App setup...

REM Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js not found! Please install Node.js first.
    echo Download from: https://nodejs.org/
    exit /b 1
)

REM Проверка наличия PostgreSQL
where psql >nul 2>nul
if %errorlevel% neq 0 (
    echo PostgreSQL not found! Please install PostgreSQL first.
    echo Download from: https://www.postgresql.org/download/windows/
    exit /b 1
)

REM Копирование .env файла
echo Setting up environment variables...
copy .env.example .env
if %errorlevel% neq 0 (
    echo Failed to create .env file!
    exit /b 1
)

REM Установка зависимостей сервера
echo Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 (
    echo Failed to install server dependencies!
    exit /b 1
)

REM Установка зависимостей клиента
echo Installing client dependencies...
cd ../client
call npm install
if %errorlevel% neq 0 (
    echo Failed to install client dependencies!
    exit /b 1
)

echo.
echo Setup completed successfully!
echo.
echo Next steps:
echo 1. Edit the .env file with your database credentials
echo 2. Run the database restore command:
echo    psql -U postgres kindergarten ^< kindergarten_backup.sql
echo 3. Start the server: cd server ^&^& npm run dev
echo 4. Start the client: cd client ^&^& npm start
echo.
pause 