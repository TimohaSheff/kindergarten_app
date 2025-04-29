const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const backupDatabase = () => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');
    const backupFile = path.join(backupDir, `backup-${timestamp}.sql`);

    // Создаем директорию для бэкапов, если её нет
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const command = `pg_dump -h ${process.env.DB_HOST} -U ${process.env.DB_USER} -d ${process.env.DB_NAME} > "${backupFile}"`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error('Ошибка при создании резервной копии:', error);
            return;
        }
        console.log(`Резервная копия успешно создана: ${backupFile}`);
    });
};

// Запускаем бэкап
backupDatabase(); 