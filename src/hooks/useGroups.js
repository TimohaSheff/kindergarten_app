import { useState, useEffect, useCallback } from 'react';
import { groupsApi } from '../api/api';
import { useAuth } from '../contexts/AuthContext';

export const useGroups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isAuthenticated } = useAuth();

  const fetchGroups = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!isAuthenticated || !token) {
        setError('Требуется аутентификация');
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const data = await groupsApi.getGroups();
      
      // Нормализуем данные групп
      const normalizedGroups = data.map(group => {
        if (!group) {
          console.warn('Получены некорректные данные группы');
          return null;
        }
        
        return {
          ...group,
          id: group.group_id,
          group_id: group.group_id,
          children_count: parseInt(group.children_count) || 0,
          name: group.group_name,
          caretakers: group.caretaker_full_name ? 
            group.caretaker_full_name.split(',').map(name => name.trim()) : 
            []
        };
      }).filter(Boolean); // Удаляем null значения
      
      setGroups(normalizedGroups);
      setError(null);
    } catch (err) {
      console.error('Ошибка при загрузке групп:', err);
      if (err.response?.status === 401) {
        setError('Сессия истекла. Пожалуйста, войдите снова.');
      } else {
        setError(err.message || 'Ошибка при загрузке групп');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createGroup = async (groupData) => {
    try {
      if (!isAuthenticated) {
        throw new Error('Требуется аутентификация');
      }
      
      const newGroup = await groupsApi.createGroup(groupData);
      const normalizedGroup = {
        ...newGroup,
        id: newGroup.group_id,
        group_id: newGroup.group_id,
        children_count: 0,
        name: newGroup.group_name,
        caretakers: newGroup.caretaker_full_name ? 
          newGroup.caretaker_full_name.split(',').map(name => name.trim()) : 
          []
      };
      
      setGroups(prev => [...prev, normalizedGroup]);
      return normalizedGroup;
    } catch (err) {
      console.error('Ошибка при создании группы:', err);
      throw new Error(err.response?.data?.message || err.message || 'Ошибка при создании группы');
    }
  };

  const updateGroup = async (groupId, groupData) => {
    try {
      if (!isAuthenticated) {
        throw new Error('Требуется аутентификация');
      }
      
      const updatedGroup = await groupsApi.updateGroup(groupId, groupData);
      const normalizedGroup = {
        ...updatedGroup,
        id: updatedGroup.group_id,
        group_id: updatedGroup.group_id,
        name: updatedGroup.group_name,
        caretakers: updatedGroup.caretaker_full_name ? 
          updatedGroup.caretaker_full_name.split(',').map(name => name.trim()) : 
          []
      };
      
      setGroups(prev => prev.map(group => 
        group.group_id === groupId ? normalizedGroup : group
      ));
      
      return normalizedGroup;
    } catch (err) {
      console.error('Ошибка при обновлении группы:', err);
      throw new Error(err.response?.data?.message || err.message || 'Ошибка при обновлении группы');
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      if (!isAuthenticated) {
        throw new Error('Требуется аутентификация');
      }
      
      await groupsApi.deleteGroup(groupId);
      setGroups(prev => prev.filter(group => group.group_id !== groupId));
    } catch (err) {
      console.error('Ошибка при удалении группы:', err);
      throw new Error(err.response?.data?.message || err.message || 'Ошибка при удалении группы');
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchGroups();
    }
  }, [isAuthenticated, fetchGroups]);

  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    deleteGroup,
    refreshGroups: fetchGroups,
  };
}; 