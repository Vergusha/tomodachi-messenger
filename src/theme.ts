import { createTheme, PaletteMode } from '@mui/material/styles';

// Create a theme instance based on mode (light/dark)
export const createAppTheme = (mode: PaletteMode = 'light') => createTheme({
  palette: {
    mode,
    primary: {
      main: mode === 'light' ? '#724C9D' : '#9356A0',
      light: mode === 'light' ? '#9356A0' : '#B56CC4',
      dark: mode === 'light' ? '#2C1B47' : '#2C1B47',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: mode === 'light' ? '#DCCAE9' : '#4A2C6D',
      light: mode === 'light' ? '#F2EBFA' : '#6E40A0',
      dark: mode === 'light' ? '#9356A0' : '#371F52',
      contrastText: mode === 'light' ? '#0B0205' : '#FFFFFF',
    },
    background: {
      default: mode === 'light' ? '#F5F5F7' : '#121212',
      paper: mode === 'light' ? '#FFFFFF' : '#1E1E1E',
    },
    text: {
      primary: mode === 'light' ? '#0B0205' : '#E0E0E0',
      secondary: mode === 'light' ? '#2C1B47' : '#A89DB8',
    },
    error: {
      main: '#FF5252',
    },
    success: {
      main: '#4CAF50',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
        elevation1: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
        },
        elevation2: {
          boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.08)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'transform 0.2s ease, background-color 0.2s ease',
          '&:hover': {
            transform: 'scale(1.05)',
          },
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          border: `2px solid ${mode === 'light' ? '#FFFFFF' : '#2D2D2D'}`,
        },
      },
    },
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
});

// Default theme is light mode
const theme = createAppTheme('dark');

export default theme;