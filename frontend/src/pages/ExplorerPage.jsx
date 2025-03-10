import { Box } from '@mui/material';
import WAFRuleTree from '../components/waf/WAFRuleTree';
//import WAFRuleTree from '../components/waf/WAFRuleTree1';
import Sidebar from '../components/layout/Sidebar';
import { useThemeContext } from '../context/ThemeContext';
import { useState, useEffect } from 'react';
import RequestDebugger from '../components/waf/RequestDebugger';
import appsflyerRules from '../data/appsflyerRules.json';

export default function ExplorerPage() {
  const [view, setView] = useState('tree');
  const { darkTheme } = useThemeContext();
  const [rules, setRules] = useState([]);

  useEffect(() => {
    // Load rules from the JSON file
    if (appsflyerRules && appsflyerRules.Rules) {
      setRules(appsflyerRules.Rules);
    }
  }, []);

  // Handler for rule changes from WAFRuleTree
  const handleRulesChanged = (newRules) => {
    console.log('Rules updated in ExplorerPage:', newRules);
    setRules(newRules);
  };

  return (
    <Box sx={{ display: 'flex', width: '100%', height: '100vh' }}>
      <Sidebar view={view} setView={setView} />
      <Box sx={{ flex: 1, overflow: 'auto', p: 0 }}>
        {view === 'tree' && <WAFRuleTree initialRules={rules} onRulesChanged={handleRulesChanged} />}
        {view === 'debugger' && <RequestDebugger rules={rules} />}
      </Box>
    </Box>
  );
}
