import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Groups from '../Groups';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { useGroups } from '../../hooks/useGroups';

// Мокаем хук useGroups
jest.mock('../../hooks/useGroups');

const mockGroups = [
  {
    group_id: 1,
    group_name: 'Младшая группа',
    age_range: '3-4 года',
    caretaker_full_name: 'Иванова А.П.',
    children_count: 15,
    teachers: 'Иванова А.П.'
  }
];

describe('Groups Component', () => {
  const renderGroups = () => {
    return render(
      <BrowserRouter>
        <AuthProvider>
          <Groups />
        </AuthProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    // Очищаем моки перед каждым тестом
    jest.clearAllMocks();
  });

  // Тест 1: Проверка загрузки
  test('отображает индикатор загрузки', () => {
    useGroups.mockReturnValue({
      groups: [],
      loading: true,
      error: null
    });

    renderGroups();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  // Тест 2: Проверка отображения групп
  test('успешно отображает список групп', async () => {
    useGroups.mockReturnValue({
      groups: mockGroups,
      loading: false,
      error: null,
      createGroup: jest.fn(),
      updateGroup: jest.fn(),
      deleteGroup: jest.fn()
    });

    renderGroups();

    expect(await screen.findByText('Младшая группа')).toBeInTheDocument();
    expect(await screen.findByText('Возрастная группа:')).toBeInTheDocument();
    expect(await screen.findByText('3-4 года')).toBeInTheDocument();
    expect(await screen.findByText('Количество детей:')).toBeInTheDocument();
    expect(await screen.findByText('15')).toBeInTheDocument();
  });

  // Тест 3: Проверка отображения ошибки
  test('отображает сообщение об ошибке', () => {
    useGroups.mockReturnValue({
      groups: [],
      loading: false,
      error: 'Ошибка загрузки групп'
    });

    renderGroups();
    expect(screen.getByText('Ошибка загрузки групп')).toBeInTheDocument();
  });

  // Тест 4: Проверка открытия диалога создания группы
  test('открывает диалог создания группы', async () => {
    useGroups.mockReturnValue({
      groups: mockGroups,
      loading: false,
      error: null,
      createGroup: jest.fn()
    });

    renderGroups();

    // Находим и кликаем по кнопке добавления по data-testid
    const addButton = screen.getByTestId('add-group-button');
    fireEvent.click(addButton);

    // Проверяем, что диалог открылся
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/название группы/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/возрастная группа/i)).toBeInTheDocument();
  });

  // Тест 5: Проверка валидации формы
  test('показывает ошибку при пустом названии группы', async () => {
    const mockCreateGroup = jest.fn();
    useGroups.mockReturnValue({
      groups: mockGroups,
      loading: false,
      error: null,
      createGroup: mockCreateGroup
    });

    renderGroups();

    // Открываем диалог создания
    const addButton = screen.getByTestId('add-group-button');
    fireEvent.click(addButton);

    // Пытаемся сохранить пустую форму
    const saveButton = screen.getByTestId('save-group-button');
    fireEvent.click(saveButton);

    // Проверяем появление сообщения об ошибке
    expect(await screen.findByText('Название группы обязательно')).toBeInTheDocument();
    expect(mockCreateGroup).not.toHaveBeenCalled();
  });
}); 