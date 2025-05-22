# Kindergarten App

Система управления детским садом

## Установка и настройка

### Предварительные требования

- Node.js (версия 14 или выше)
- npm (версия 6 или выше)
- PostgreSQL (не требуется локальная установка)

### Настройка базы данных

База данных размещена в облачном сервисе Render. Для подключения:

1. Получите учетные данные для подключения к БД от администратора:
   - Host: `dpg-xxx.render.com`
   - Port: `5432`
   - Database name: `kindergarten_xxx`
   - Username: `xxx`
   - Password: `xxx`

2. Создайте файл `.env` в корневой директории проекта со следующими параметрами:
```
DB_HOST=dpg-xxx.render.com
DB_PORT=5432
DB_NAME=kindergarten_xxx
DB_USER=xxx
DB_PASSWORD=xxx
JWT_SECRET=your_jwt_secret
```

### Установка и запуск

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/kindergarten-app.git
cd kindergarten-app
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите сервер:
```bash
npm run server
```

4. В отдельном терминале запустите клиентское приложение:
```bash
npm run client
```

Приложение будет доступно по адресу `http://localhost:3000`

## Структура проекта

- `/client` - React клиент
- `/server` - Express сервер
- `/config` - Конфигурационные файлы
- `/models` - Модели базы данных
- `/routes` - API маршруты
- `/middleware` - Промежуточные обработчики
- `/utils` - Вспомогательные функции

## Лицензия

MIT
