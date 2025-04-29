import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext(null);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export const AccessibilityProvider = ({ children }) => {
  const [isHighContrastMode, setIsHighContrastMode] = useState(false);
  const [isBigFontMode, setIsBigFontMode] = useState(false);

  useEffect(() => {
    // Загружаем сохраненные настройки при инициализации
    const savedHighContrast = localStorage.getItem('highContrastMode') === 'true';
    const savedBigFont = localStorage.getItem('bigFontMode') === 'true';
    setIsHighContrastMode(savedHighContrast);
    setIsBigFontMode(savedBigFont);
  }, []);

  useEffect(() => {
    // Применяем стили для режима высокого контраста
    if (isHighContrastMode) {
      document.body.style.backgroundColor = '#000000';
      document.body.style.color = '#FFFFFF';
    } else {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }

    // Применяем стили для режима крупного шрифта
    if (isBigFontMode) {
      document.documentElement.style.fontSize = '150%';
    } else {
      document.documentElement.style.fontSize = '';
    }

    // Добавляем/удаляем классы для глобальных стилей
    if (isHighContrastMode) {
      document.body.classList.add('high-contrast-mode');
    } else {
      document.body.classList.remove('high-contrast-mode');
    }

    if (isBigFontMode) {
      document.body.classList.add('big-font-mode');
    } else {
      document.body.classList.remove('big-font-mode');
    }
  }, [isHighContrastMode, isBigFontMode]);

  const toggleHighContrastMode = () => {
    const newValue = !isHighContrastMode;
    setIsHighContrastMode(newValue);
    localStorage.setItem('highContrastMode', newValue);
  };

  const toggleBigFontMode = () => {
    const newValue = !isBigFontMode;
    setIsBigFontMode(newValue);
    localStorage.setItem('bigFontMode', newValue);
  };

  return (
    <AccessibilityContext.Provider value={{
      isHighContrastMode,
      isBigFontMode,
      toggleHighContrastMode,
      toggleBigFontMode
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
}; 