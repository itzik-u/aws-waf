import { Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { ThemeProvider } from './context/ThemeContext';
import theme from './theme';
import HomePage from './pages/HomePage';
import ExplorerPage from './pages/ExplorerPage';

export default function App() {
  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <ThemeProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/app" element={<ExplorerPage />} />
        </Routes>
      </ThemeProvider>
    </MuiThemeProvider>
  );
}
