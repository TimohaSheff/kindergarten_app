import { useState, useCallback } from 'react';
import { useDialog } from './useDialog';

export const useDialogForm = (initialData = {}, onSubmit) => {
    const [formData, setFormData] = useState(initialData);
    const [formErrors, setFormErrors] = useState({});
    const { isOpen, data: selectedItem, openDialog, closeDialog } = useDialog();

    const handleOpen = useCallback((item = null) => {
        setFormData(item || initialData);
        setFormErrors({});
        openDialog(item);
    }, [initialData, openDialog]);

    const handleClose = useCallback(() => {
        setFormData(initialData);
        setFormErrors({});
        closeDialog();
    }, [initialData, closeDialog]);

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Очищаем ошибку поля при изменении
        setFormErrors(prev => ({
            ...prev,
            [name]: ''
        }));
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e?.preventDefault();

        try {
            if (onSubmit) {
                const result = await onSubmit(formData, selectedItem);
                if (result?.success) {
                    handleClose();
                } else if (result?.errors) {
                    setFormErrors(result.errors);
                }
            }
        } catch (error) {
            console.error('Error in form submission:', error);
            setFormErrors({
                submit: error.message || 'Произошла ошибка при отправке формы'
            });
        }
    }, [formData, selectedItem, onSubmit, handleClose]);

    return {
        isOpen,
        formData,
        formErrors,
        selectedItem,
        handleOpen,
        handleClose,
        handleChange,
        handleSubmit,
        setFormData,
        setFormErrors
    };
}; 