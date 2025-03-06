import React, { useState } from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RuleDetailsPopup from './RuleDetailsPopup';
import RuleJsonPopup from './RuleJsonPopup';

const RulePopup = ({ selectedNode, darkTheme, onClose }) => {
  const [viewMode, setViewMode] = useState('details');

  const styles = {
    container: {
      position: 'fixed',
      bottom: 20,
      right: 20,
      width: 350,
      height: '60vh',
      backgroundColor: darkTheme ? '#333' : '#fff',
      borderRadius: 2,
      boxShadow: '0 2px 10px rgba(0,0,0,0.3)',
      border: `1px solid ${darkTheme ? '#444' : '#ddd'}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      zIndex: 1100,
    },
    header: {
      display: 'flex',
      borderBottom: `1px solid ${darkTheme ? '#444' : '#ddd'}`,
      backgroundColor: darkTheme ? '#444' : '#f5f5f5',
      padding: '8px',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    tabButton: (active) => ({
      color: darkTheme ? '#fff' : '#333',
      background: 'none',
      border: 'none',
      padding: '5px 10px',
      cursor: 'pointer',
      fontWeight: active ? 'bold' : 'normal',
      borderBottom: active ? `2px solid ${darkTheme ? '#fff' : '#333'}` : 'none'
    })
  };

  return (
    <Box sx={styles.container}>
      <Box sx={styles.header}>
        <div>
          <button 
            style={styles.tabButton(viewMode === 'details')} 
            onClick={() => setViewMode('details')}
            >  Details
          </button>
          <button 
            style={styles.tabButton(viewMode === 'json')} 
            onClick={() => setViewMode('json')}
            >  JSON
          </button>
        </div>
        <IconButton 
          onClick={onClose} 
          size="small" 
          sx={{ color: darkTheme ? '#fff' : '#333' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ overflow: 'auto', flex: 1, p: 2, padding:'8px', backgroundColor: darkTheme ? '#333' : '#fff' }}>
        {viewMode === 'details' ? (
          <RuleDetailsPopup rule={selectedNode} darkTheme={darkTheme} />
        ) : (
          <RuleJsonPopup   json={selectedNode.json}   darkTheme={darkTheme} />
        )}
      </Box>
    </Box>
  );
};

export default RulePopup;