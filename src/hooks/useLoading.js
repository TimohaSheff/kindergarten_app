import { useState, useCallback } from 'react';

export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [error, setError] = useState(null);

  const startLoading = useCallback(() => {
    setIsLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const setLoadingError = useCallback((error) => {
    const errorMessage = error?.message || error || 'Произошла ошибка';
    setError(errorMessage);
    setIsLoading(false);
  }, []);

  const withLoading = useCallback(async (callback) => {
    try {
      startLoading();
      await callback();
    } catch (error) {
      setLoadingError(error);
      throw error;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading, setLoadingError]);

  return {
    isLoading,
    error,
    startLoading,
    stopLoading,
    setError: setLoadingError,
    withLoading
  };
};

export default useLoading; 