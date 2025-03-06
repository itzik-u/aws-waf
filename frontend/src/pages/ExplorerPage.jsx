import { Box } from '@mui/material';
import WAFRuleTree from '../components/waf/WAFRuleTree';
//import WAFRuleTree from '../components/waf/WAFRuleTree1';
import Sidebar from '../components/layout/Sidebar';
import { useThemeContext } from '../context/ThemeContext';
import { useState } from 'react';

export default function ExplorerPage() {
  const [view, setView] = useState('tree');
  const { darkTheme } = useThemeContext();

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
      <Sidebar view={view} setView={setView} />
      {/* The tree will fill all remaining space */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {view === 'tree' && <WAFRuleTree/>}
        {/* If you had other views, you'd conditionally render them here */}
      </Box>
    </Box>
  );
}
