#!/bin/bash

echo "Starting Kindergarten App setup..."

# Проверка наличия Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js not found! Please install Node.js first."
    echo "Download from: https://nodejs.org/"
    exit 1
fi

# Проверка наличия PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "PostgreSQL not found! Please install PostgreSQL first."
    echo "Ubuntu: sudo apt-get install postgresql"
    echo "Mac: brew install postgresql"
    exit 1
fi

# Копирование .env файла
echo "Setting up environment variables..."
cp .env.example .env
if [ $? -ne 0 ]; then
    echo "Failed to create .env file!"
    exit 1
fi

# Установка зависимостей сервера
echo "Installing server dependencies..."
cd server
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install server dependencies!"
    exit 1
fi

# Установка зависимостей клиента
echo "Installing client dependencies..."
cd ../client
npm install
if [ $? -ne 0 ]; then
    echo "Failed to install client dependencies!"
    exit 1
fi

echo
echo "Setup completed successfully!"
echo
echo "Next steps:"
echo "1. Edit the .env file with your database credentials"
echo "2. Run the database restore command:"
echo "   sudo -u postgres psql kindergarten < kindergarten_backup.sql"
echo "3. Start the server: cd server && npm run dev"
echo "4. Start the client: cd client && npm start"
echo 