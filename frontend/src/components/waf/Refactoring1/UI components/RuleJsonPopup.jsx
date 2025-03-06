import React, { useState, useRef } from 'react';
import { Box, IconButton, TextField } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

const RuleJsonPopup = ({ json, darkTheme }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const matchRefs = useRef([]);

  const handleMatchNavigation = (direction) => {
    if (!json || !searchTerm) return;
    const regex = new RegExp(searchTerm, 'gi');
    const matches = json.match(regex) || [];
    if (matches.length === 0) return;
    
    setCurrentMatchIndex(prev => {
      const newIndex = direction === 'NEXT' 
        ? (prev + 1) % matches.length 
        : (prev - 1 + matches.length) % matches.length;
        
      setTimeout(() => {
        const matchElement = matchRefs.current[newIndex];
        if (matchElement) {
          matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      
      return newIndex;
    });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        position: 'sticky',
        top: 0,
        backgroundColor: darkTheme ? '#222' : '#f5f5f5',
        zIndex: 10,
        padding: '5px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        alignItems: 'center'
      }}>
        <TextField
          variant="outlined"
          size='small'
          placeholder="Search in JSON..."
          value={searchTerm}
          onChange={(e) => { 
            setSearchTerm(e.target.value);
            setCurrentMatchIndex(0);
          }}
          sx={{ mr: 1, width: '60%', backgroundColor: darkTheme ? '#555' : '#fff' }}
        />
        <IconButton onClick={() => handleMatchNavigation('PREV')} size="small">
          <ArrowUpwardIcon fontSize="small" />
        </IconButton>
        <IconButton onClick={() => handleMatchNavigation('NEXT')} size="small">
          <ArrowDownwardIcon fontSize="small" />
        </IconButton>
        <span style={{ marginLeft: '8px', fontSize: '0.8em', color: darkTheme ? '#fff' : '#333' }}>
          {(() => {
            const totalMatches = searchTerm ? (json.match(new RegExp(searchTerm, 'gi')) || []).length : 0;
            return totalMatches > 0 ? `${currentMatchIndex + 1} / ${totalMatches}` : '0 / 0';
          })()}
        </span>
      </div>
      <div style={{
        color: darkTheme ? '#fff' : '#333',
        backgroundColor: darkTheme ? '#222' : '#f5f5f5',
        padding: '15px',
        borderRadius: '4px',
        fontFamily: 'monospace',
        fontSize: '13px',
        lineHeight: '1.4',
        flex: 1,
        overflow: 'auto'
      }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word', tabSize: 2 }}>
          {(() => {
            let globalMatchIndex = 0;
            return json.split('\n').map((line, i) => {
              const leadingSpaces = line.match(/^\s*/)[0].length;
              const parts = searchTerm ? line.split(new RegExp(`(${searchTerm})`, 'gi')) : [line];
              
              return (
                <div key={i} style={{ paddingLeft: `${leadingSpaces * 8}px` }}>
                  {parts.map((part, idx) => {
                    if (searchTerm && part.toLowerCase() === searchTerm.toLowerCase()) {
                      const matchIndex = globalMatchIndex++;
                      return (
                        <mark
                          key={idx}
                          ref={el => matchRefs.current[matchIndex] = el}
                          className={matchIndex === currentMatchIndex ? 'current-match' : ''}
                        >
                          {part}
                        </mark>
                      );
                    }
                    return part;
                  })}
                </div>
              );
            });
          })()}
        </pre>
      </div>
    </div>
  );
};

export default RuleJsonPopup;