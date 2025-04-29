const checkRole = (roles) => {
    return (req, res, next) => {
        console.log('Проверка роли - входные данные:', {
            allowedRoles: roles,
            userRole: req.user?.role,
            user: req.user
        });

        if (!req.user) {
            console.log('Пользователь не аутентифицирован');
            return res.status(401).json({ message: 'Требуется аутентификация' });
        }

        if (!roles.includes(req.user.role)) {
            console.log('Доступ запрещен - недостаточно прав');
            return res.status(403).json({ message: 'Доступ запрещен' });
        }

        console.log('Проверка роли пройдена успешно');
        next();
    };
};

module.exports = { checkRole }; 