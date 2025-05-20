# Kindergarten Application

Веб-приложение для управления детским садом

## Требования для локальной установки

- Node.js (версия 14 или выше)
- PostgreSQL (версия 13 или выше)
- npm или yarn

## Быстрый старт

### 1. Скачайте проект
```bash
git clone https://github.com/your-username/kindergarten-app.git
cd kindergarten-app
```

### 2. Настройка базы данных

1. Установите PostgreSQL:
   - Windows: Скачайте и установите с [официального сайта](https://www.postgresql.org/download/windows/)
   - Mac: `brew install postgresql`
   - Ubuntu: `sudo apt-get install postgresql`

2. Восстановите базу данных из резервной копии:
```bash
# Windows (запустите psql)
createdb -U postgres kindergarten
psql -U postgres kindergarten < kindergarten_backup.sql

# Linux/Mac
sudo -u postgres createdb kindergarten
sudo -u postgres psql kindergarten < kindergarten_backup.sql
```

### 3. Настройка проекта

1. Скопируйте файл с настройками:
```bash
cp .env.example .env
```

2. Отредактируйте `.env` файл:
   - Укажите пароль от вашей базы данных PostgreSQL в `DB_PASSWORD`
   - Остальные настройки можно оставить по умолчанию для локальной разработки

### 4. Запуск сервера

```bash
# Перейдите в папку сервера
cd server

# Установите зависимости
npm install

# Запустите сервер
npm run dev
```

### 5. Запуск клиента

Откройте новое окно терминала и выполните:
```bash
# Перейдите в папку клиента
cd client

# Установите зависимости
npm install

# Запустите клиент
npm start
```

### 6. Готово!

- Откройте браузер и перейдите по адресу: http://localhost:3000
- API сервер работает по адресу: http://localhost:5000

## Возможные проблемы и решения

### Ошибка подключения к базе данных
- Проверьте, что PostgreSQL запущен
- Проверьте правильность пароля в файле `.env`
- Убедитесь, что база данных `kindergarten` создана

### Ошибка "port already in use"
- Проверьте, не запущено ли уже приложение
- Измените порт в файле `.env` если нужно

### Не работает авторизация
- Проверьте, что в `.env` установлены корректные значения для JWT_SECRET и JWT_REFRESH_SECRET

## Поддержка

Если возникли проблемы при установке, создайте issue в репозитории проекта.
