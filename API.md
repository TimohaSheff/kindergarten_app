# Документация API

## Аутентификация

### Регистрация
```
POST /api/auth/register
```
Тело запроса:
```json
{
    "email": "string",
    "password": "string",
    "role": "admin|teacher|parent",
    "first_name": "string",
    "last_name": "string",
    "phone": "string"
}
```

### Вход
```
POST /api/auth/login
```
Тело запроса:
```json
{
    "email": "string",
    "password": "string"
}
```

## Дети

### Получение списка детей
```
GET /api/children
```
Доступ: все авторизованные пользователи

### Получение информации о ребенке
```
GET /api/children/:id
```
Доступ: все авторизованные пользователи

### Создание ребенка
```
POST /api/children
```
Доступ: admin, teacher
Тело запроса:
```json
{
    "first_name": "string",
    "last_name": "string",
    "birth_date": "date",
    "group_id": "number",
    "parent_id": "number",
    "medical_info": "string",
    "photo_url": "string"
}
```

### Обновление информации о ребенке
```
PUT /api/children/:id
```
Доступ: admin, teacher
Тело запроса: аналогично созданию

### Удаление ребенка
```
DELETE /api/children/:id
```
Доступ: admin

## Группы

### Получение списка групп
```
GET /api/groups
```
Доступ: все авторизованные пользователи

### Получение информации о группе
```
GET /api/groups/:id
```
Доступ: все авторизованные пользователи

### Создание группы
```
POST /api/groups
```
Доступ: admin
Тело запроса:
```json
{
    "name": "string",
    "age_range": "string",
    "teacher_id": "number",
    "capacity": "number",
    "description": "string"
}
```

### Обновление информации о группе
```
PUT /api/groups/:id
```
Доступ: admin
Тело запроса: аналогично созданию

### Удаление группы
```
DELETE /api/groups/:id
```
Доступ: admin

## Посещаемость

### Получение посещаемости за период
```
GET /api/attendance
```
Параметры запроса:
- start_date: дата начала периода
- end_date: дата окончания периода
- group_id: ID группы (опционально)

### Получение посещаемости ребенка
```
GET /api/attendance/child/:child_id
```
Параметры запроса:
- start_date: дата начала периода
- end_date: дата окончания периода

### Создание записи о посещаемости
```
POST /api/attendance
```
Доступ: admin, teacher
Тело запроса:
```json
{
    "child_id": "number",
    "date": "date",
    "status": "present|absent|late|excused",
    "notes": "string"
}
```

### Массовое создание записей
```
POST /api/attendance/bulk
```
Доступ: admin, teacher
Тело запроса:
```json
{
    "date": "date",
    "records": [
        {
            "child_id": "number",
            "status": "present|absent|late|excused",
            "notes": "string"
        }
    ]
}
```

## Расписание

### Получение расписания группы
```
GET /api/schedule/group/:group_id
```
Доступ: все авторизованные пользователи

### Получение расписания учителя
```
GET /api/schedule/teacher/:teacher_id
```
Доступ: все авторизованные пользователи

### Получение расписания на день
```
GET /api/schedule/day/:day_of_week
```
Доступ: все авторизованные пользователи

### Создание записи в расписании
```
POST /api/schedule
```
Доступ: admin, teacher
Тело запроса:
```json
{
    "group_id": "number",
    "day_of_week": "number",
    "start_time": "time",
    "end_time": "time",
    "activity_type": "string",
    "teacher_id": "number"
}
```

## Прогресс

### Получение прогресса ребенка
```
GET /api/progress/child/:child_id
```
Параметры запроса:
- start_date: дата начала периода
- end_date: дата окончания периода
- category: категория прогресса (опционально)

### Получение прогресса группы
```
GET /api/progress/group/:group_id
```
Параметры запроса: аналогично прогрессу ребенка

### Создание записи о прогрессе
```
POST /api/progress
```
Доступ: admin, teacher
Тело запроса:
```json
{
    "child_id": "number",
    "date": "date",
    "category": "physical|cognitive|social|emotional|language",
    "score": "number",
    "notes": "string",
    "teacher_id": "number"
}
```

## Услуги

### Получение списка услуг
```
GET /api/services
```
Доступ: все авторизованные пользователи

### Создание услуги
```
POST /api/services
```
Доступ: admin
Тело запроса:
```json
{
    "name": "string",
    "description": "string",
    "price": "number",
    "duration": "number",
    "teacher_id": "number"
}
```

### Получение посещаемости платных услуг
```
GET /api/services/:id/attendance
```
Доступ: все авторизованные пользователи

### Создание записи о посещении платной услуги
```
POST /api/services/:id/attendance
```
Доступ: admin, teacher
Тело запроса:
```json
{
    "child_id": "number",
    "date": "date",
    "status": "string",
    "payment_status": "string"
}
```

## Финансы

### Получение финансовых операций
```
GET /api/finance
```
Параметры запроса:
- start_date: дата начала периода
- end_date: дата окончания периода
- child_id: ID ребенка (опционально)
- payment_type: тип платежа (опционально)
- status: статус платежа (опционально)

### Создание финансовой операции
```
POST /api/finance
```
Доступ: admin
Тело запроса:
```json
{
    "child_id": "number",
    "payment_type": "monthly|service|other",
    "amount": "number",
    "date": "date",
    "status": "pending|completed|cancelled",
    "description": "string"
}
```

### Получение финансовой статистики
```
GET /api/finance/stats/summary
```
Параметры запроса:
- start_date: дата начала периода
- end_date: дата окончания периода

## Рекомендации

### Получение списка рекомендаций
```
GET /api/recommendations
```
Параметры запроса:
- child_id: ID ребенка (опционально)
- teacher_id: ID учителя (опционально)
- status: статус рекомендации (опционально)

### Создание рекомендации
```
POST /api/recommendations
```
Доступ: admin, teacher, psychologist
Тело запроса:
```json
{
    "child_id": "number",
    "teacher_id": "number",
    "content": "string",
    "date": "date",
    "status": "new|in_progress|completed|cancelled"
}
```

### Получение рекомендаций для ребенка
```
GET /api/recommendations/child/:child_id
```
Доступ: все авторизованные пользователи 