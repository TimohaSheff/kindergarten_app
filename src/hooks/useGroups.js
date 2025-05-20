import { useState, useEffect } from 'react';
import axios from '../utils/axios';
import { useAuth } from '../contexts/AuthContext';
import { useSnackbar } from './useSnackbar';

export const useGroups = () => {
    const [groups, setGroups] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { showSnackbar } = useSnackbar();
    const { user } = useAuth();

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // Для родителей загружаем информацию о детях и их группах
                if (user.role === 'parent') {
                    console.log('Загрузка данных для родителя:', user.id);
                    const childrenResponse = await axios.get('/children', {
                        params: { parent_id: user.id }
                    });

                    const children = childrenResponse.data;
                    console.log('Получены дети родителя:', children);

                    // Получаем ID групп из списка детей
                    const groupIds = Array.from(new Set(
                        children.map(child => child.group_id)
                            .filter(Boolean)
                    ));

                    console.log('Уникальные ID групп:', groupIds);

                    // Загружаем информацию о группах
                    if (groupIds.length > 0) {
                        const groupsResponse = await axios.get('/groups');
                        const allGroups = groupsResponse.data;

                        // Фильтруем только группы детей этого родителя и добавляем информацию о детях
                        const parentGroups = allGroups
                            .filter(group => groupIds.includes(group.id || group.group_id))
                            .map(group => {
                                const groupChildren = children.filter(child => 
                                    child.group_id === (group.id || group.group_id)
                                );
                                
                                return {
                                    id: group.id || group.group_id,
                                    group_id: group.id || group.group_id,
                                    name: group.name || group.group_name,
                                    age_range: group.age_range,
                                    children: groupChildren.map(child => ({
                                        id: child.id,
                                        name: child.name,
                                        group_id: child.group_id,
                                        group_name: group.name || group.group_name
                                    }))
                                };
                            });

                        console.log('Группы родителя с детьми:', parentGroups);
                        
                        // Устанавливаем группы и сохраняем список всех детей
                        setGroups(parentGroups);
                        setTeachers(children.map(child => ({
                            id: child.id,
                            name: child.name,
                            group_id: child.group_id,
                            group_name: allGroups.find(g => g.id === child.group_id)?.name || ''
                        })));
                    }
                } else {
                    // Для остальных ролей загружаем полный список групп
                    console.log('Запрос списка воспитателей...');
                    const [teachersResponse, groupsResponse] = await Promise.all([
                        axios.get('/users', { params: { role: 'teacher' } }),
                        axios.get('/groups')
                    ]);

                    const groups = groupsResponse.data.map(group => ({
                        ...group,
                        teacher: teachersResponse.data.find(t => t.id === group.teacher_id)
                    }));

                    setGroups(groups);
                    setTeachers(teachersResponse.data);
                }
            } catch (error) {
                console.error('Ошибка при загрузке данных:', error);
                setError(error.message || 'Ошибка при загрузке данных');
                showSnackbar({
                    message: 'Ошибка при загрузке данных: ' + (error.message || 'Неизвестная ошибка'),
                    severity: 'error'
                });
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user]);

    const getTeacherById = (teacherId) => {
        if (!teacherId) return null;
        return teachers.find(teacher => String(teacher.id) === String(teacherId)) || null;
    };

    const getGroupById = (groupId) => {
        if (!groupId) return null;
        return groups.find(group => String(group.id) === String(groupId)) || null;
    };

    const createGroup = async (groupData) => {
        try {
            const response = await axios.post('/groups', {
                group_name: groupData.name,
                age_range: groupData.age_range,
                teacher_id: groupData.selectedTeachers
            });

            const newGroup = {
                id: String(response.data.group_id || response.data.id),
                name: response.data.group_name || response.data.name,
                age_range: response.data.age_range,
                teachers: response.data.teachers || [],
                children_count: 0
            };

            setGroups(prev => [...prev, newGroup]);
            return { success: true };
        } catch (error) {
            console.error('Ошибка при создании группы:', error);
            showSnackbar({
                message: error.response?.data?.error || 'Ошибка при создании группы',
                severity: 'error'
            });
            return { success: false, error: error.message };
        }
    };

    const updateGroup = async (groupId, groupData) => {
        try {
            const response = await axios.put(`/groups/${groupId}`, {
                group_name: groupData.name,
                age_range: groupData.age_range,
                teacher_id: groupData.selectedTeachers
            });

            const updatedGroup = {
                id: String(response.data.group_id || response.data.id),
                name: response.data.group_name || response.data.name,
                age_range: response.data.age_range,
                teachers: response.data.teachers || [],
                children_count: response.data.children_count || 0
            };

            setGroups(prev => prev.map(group => 
                String(group.id) === String(groupId) ? updatedGroup : group
            ));
            return { success: true };
        } catch (error) {
            console.error('Ошибка при обновлении группы:', error);
            showSnackbar({
                message: error.response?.data?.error || 'Ошибка при обновлении группы',
                severity: 'error'
            });
            return { success: false, error: error.message };
        }
    };

    const deleteGroup = async (groupId) => {
        try {
            await axios.delete(`/groups/${groupId}`);
            setGroups(prev => prev.filter(group => String(group.id) !== String(groupId)));
            return { success: true };
        } catch (error) {
            console.error('Ошибка при удалении группы:', error);
            showSnackbar({
                message: error.response?.data?.error || 'Ошибка при удалении группы',
                severity: 'error'
            });
            return { success: false, error: error.message };
        }
    };

    return {
        groups,
        teachers,
        loading,
        error,
        getTeacherById,
        getGroupById,
        createGroup,
        updateGroup,
        deleteGroup
    };
}; 