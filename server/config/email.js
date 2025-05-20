const nodemailer = require('nodemailer');

// Проверяем наличие переменных окружения при загрузке модуля
console.log('Loading email configuration:', {
    SMTP_USER: process.env.SMTP_USER ? 'present' : 'missing',
    SMTP_PASS: process.env.SMTP_PASS ? 'present' : 'missing'
});

if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('Missing required environment variables for email configuration');
}

// Создаем транспорт для отправки email
const transporter = nodemailer.createTransport({
    host: 'smtp.mail.ru',
    port: 465,
    secure: true, // true для 465 порта
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    tls: {
        rejectUnauthorized: false
    }
});

// Проверяем соединение при запуске
transporter.verify(function(error, success) {
    if (error) {
        console.error('Ошибка проверки SMTP соединения:', error);
    } else {
        console.log('SMTP сервер готов к отправке сообщений');
    }
});

// Функция для отправки email
const sendEmail = async ({ to, subject, text, html }) => {
    try {
        // Проверяем наличие необходимых переменных окружения
        if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
            console.error('SMTP credentials:', {
                user: process.env.SMTP_USER ? 'present' : 'missing',
                pass: process.env.SMTP_PASS ? 'present' : 'missing'
            });
            throw new Error('Отсутствуют учетные данные SMTP');
        }

        const mailOptions = {
            from: `"Детский сад" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html
        };

        console.log('Attempting to send email with options:', {
            from: mailOptions.from,
            to: mailOptions.to,
            subject: mailOptions.subject
        });

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(`Ошибка отправки email: ${error.message}`);
    }
};

module.exports = { sendEmail }; 