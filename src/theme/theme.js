import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#6366F1',
      light: '#818CF8',
      dark: '#4F46E5',
      contrastText: '#fff',
    },
    secondary: {
      main: '#EC4899',
      light: '#F472B6',
      dark: '#DB2777',
      contrastText: '#fff',
    },
    background: {
      default: '#F9FAFB',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1E293B',
      secondary: '#64748B',
    },
    divider: 'rgba(99, 102, 241, 0.12)',
    action: {
      hover: 'rgba(99, 102, 241, 0.04)',
      selected: 'rgba(99, 102, 241, 0.08)',
      disabled: 'rgba(99, 102, 241, 0.26)',
      disabledBackground: 'rgba(99, 102, 241, 0.12)',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        contained: {
          backgroundColor: '#6366F1',
          '&:hover': {
            backgroundColor: '#4F46E5',
          },
        },
        outlined: {
          borderColor: '#6366F1',
          '&:hover': {
            backgroundColor: 'rgba(99, 102, 241, 0.04)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          border: '1px solid #E2E8F0',
          '&:hover': {
            borderColor: '#6366F1',
          },
          transition: 'border-color 0.2s ease',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          border: '1px solid #E2E8F0',
          '&:hover': {
            borderColor: '#6366F1',
          },
          transition: 'border-color 0.2s ease',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#E2E8F0',
              borderWidth: '1px',
            },
            '&:hover fieldset': {
              borderColor: '#6366F1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366F1',
              borderWidth: '1px',
            },
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          '&.MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#E2E8F0',
              borderWidth: '1px',
            },
            '&:hover fieldset': {
              borderColor: '#6366F1',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#6366F1',
              borderWidth: '1px',
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          '&.MuiChip-colorPrimary': {
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            color: '#6366F1',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          boxShadow: 'none',
          borderBottom: '1px solid #E2E8F0',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#FFFFFF',
          borderRight: '1px solid #E2E8F0',
        },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      color: '#1E293B',
    },
    h2: {
      fontWeight: 600,
      color: '#1E293B',
    },
    h3: {
      fontWeight: 600,
      color: '#1E293B',
    },
    h4: {
      fontWeight: 600,
      color: '#1E293B',
    },
    h5: {
      fontWeight: 600,
      color: '#1E293B',
    },
    h6: {
      fontWeight: 600,
      color: '#1E293B',
    },
    subtitle1: {
      color: '#475569',
      fontWeight: 500,
    },
    subtitle2: {
      color: '#64748B',
      fontWeight: 500,
    },
    body1: {
      color: '#334155',
    },
    body2: {
      color: '#475569',
    },
    button: {
      fontWeight: 600,
    },
  },
});

export default theme; 