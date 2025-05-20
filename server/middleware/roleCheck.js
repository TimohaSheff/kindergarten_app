const checkRole = (allowedRoles) => {
    return (req, res, next) => {
        try {
            const userRole = req.user.role;

            if (!userRole) {
                return res.status(403).json({
                    error: 'Доступ запрещен',
                    message: 'Роль пользователя не определена'
                });
            }

            if (!Array.isArray(allowedRoles)) {
                allowedRoles = [allowedRoles];
            }

            if (!allowedRoles.includes(userRole)) {
                return res.status(403).json({
                    error: 'Доступ запрещен',
                    message: 'У вас нет прав для выполнения этого действия'
                });
            }

            next();
        } catch (error) {
            console.error('Role check error:', error);
            return res.status(500).json({
                error: 'Ошибка при проверке прав доступа',
                message: error.message
            });
        }
    };
};

module.exports = { checkRole }; 