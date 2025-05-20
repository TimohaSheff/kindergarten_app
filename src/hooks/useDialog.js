import { useState, useCallback } from 'react';

export const useDialog = (initialData = null) => {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(initialData);

  const openDialog = useCallback((newData = null) => {
    setData(newData);
    setIsOpen(true);
  }, []);

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setData(initialData);
  }, [initialData]);

  const updateDialogData = useCallback((newData) => {
    setData(prev => ({
      ...prev,
      ...newData
    }));
  }, []);

  return {
    isOpen,
    data,
    openDialog,
    closeDialog,
    updateDialogData,
    setData
  };
}; 