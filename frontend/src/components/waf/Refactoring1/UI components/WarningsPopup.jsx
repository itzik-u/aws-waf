import React, { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Button, IconButton } from '@mui/material';

const WarningsPopup = ({ darkTheme, warnings, onClose, onSelectNode }) => {
  const [expandedWarnings, setExpandedWarnings] = useState({});

  const containerStyle = {
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
  };

  const headerStyle = {
    display: 'flex',
    borderBottom: `1px solid ${darkTheme ? '#444' : '#ddd'}`,
    padding: '8px',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: darkTheme ? '#444' : '#f5f5f5',
  };

  const toggleWarning = (id) => {
    setExpandedWarnings((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Box sx={containerStyle}>
      <Box sx={headerStyle}>
        <Box sx={{ color: darkTheme ? '#fff' : '#333', fontWeight: 'bold' }}>
          Validation Warnings
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: darkTheme ? '#fff' : '#333' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ p: 2, overflow: 'auto', flex: 1 }}>
        {warnings.length === 0 ? (
          <p style={{ color: darkTheme ? '#ccc' : '#666' }}>No warnings found.</p>
        ) : (
          warnings.map(({ id, rule, warnings }) => {
            const isExpanded = expandedWarnings[id];
            return (
              <Box key={id} sx={{ mb: 2, backgroundColor: darkTheme ? '#1a1a1a' : '#f8f9fa', borderRadius: 1, overflow: 'hidden' }}>
                <Box
                  sx={{
                    p: 1,
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    borderBottom: `1px solid ${darkTheme ? '#333' : '#e0e0e0'}`,
                    '&:hover': {
                      backgroundColor: darkTheme ? '#252525' : '#f0f0f0'
                    }
                  }}
                  onClick={() => toggleWarning(id)}
                >
                  <span style={{ color: darkTheme ? '#e83a3a' : '#dc3545', marginRight: '8px' }}>
                    {isExpanded ? '▼' : '▶'}
                  </span>
                  <span style={{ color: darkTheme ? '#e83a3a' : '#dc3545', fontWeight: 500 }}>
                    {rule}
                  </span>
                  <span style={{ marginLeft: '12px', color: darkTheme ? '#888' : '#666', fontSize: '0.9em' }}>
                    {warnings.length} warning{warnings.length > 1 ? 's' : ''}
                  </span>
                </Box>
                <Box sx={{ display: isExpanded ? 'block' : 'none', p: 1, pl: 3 }}>
                  {warnings.map((warning, i) => (
                    <div key={i} style={{ color: darkTheme ? '#bbb' : '#666', fontFamily: 'monospace', fontSize: '0.9em', whiteSpace: 'pre-wrap', marginBottom: '8px' }}>
                     ⚠️ {warning}.
                    </div>
                  ))}
                  <button onClick={()=>onSelectNode(id)}>view</button>
                </Box>
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
};

export default WarningsPopup;