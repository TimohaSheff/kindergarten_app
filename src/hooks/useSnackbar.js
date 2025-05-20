import { useSnackbar as useNotistackSnackbar } from 'notistack';

export const useSnackbar = () => {
    const { enqueueSnackbar, closeSnackbar } = useNotistackSnackbar();

    const showSnackbar = ({ message, severity = 'info', autoHideDuration = 6000 }) => {
        enqueueSnackbar(message, {
            variant: severity,
            autoHideDuration
        });
    };

    const hideSnackbar = (key) => {
        closeSnackbar(key);
    };

    const showError = (message) => {
        showSnackbar({ message, severity: 'error' });
    };

    const showSuccess = (message) => {
        showSnackbar({ message, severity: 'success' });
    };

    return {
        showSnackbar,
        hideSnackbar,
        showError,
        showSuccess
    };
}; 