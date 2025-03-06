// theme.js or similar
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
    typography: {
        fontFamily: "'Poppins', sans-serif",
        // Optional: customize specific variants
        h1: {
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
        },
        h2: {
            fontFamily: "'Poppins', sans-serif",
            fontWeight: 600,
        },
        body1: {
            fontFamily: "'Poppins', sans-serif",
        },
        button: {
            fontFamily: "'Poppins', sans-serif",
        }
    },
    components: {
        MuiCssBaseline: {
            styleOverrides: {
                body: {
                    fontFamily: "'Poppins', sans-serif",
                }
            }
        }
    }
});

export default theme;
