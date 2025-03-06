import { Box, IconButton, Tooltip, Badge, TextField, Button, Typography } from '@mui/material';
import FitScreenIcon from '@mui/icons-material/FitScreen';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useState } from 'react';

const TopBar = ({ darkTheme, onFullView, searchTerm, setSearchTerm, onWarnings, warningCount, setLoaderPopupOpen, aclDetails }) => {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 50,
        display: 'flex',
        alignItems: 'center',
        px: 2,
        borderBottom: `1px solid ${darkTheme ? '#333' : '#ccc'}`,
        backgroundColor: darkTheme ? '#333' : '#fff',
        zIndex: 1
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        <Tooltip title="Full View">
          <IconButton sx={{ color: darkTheme ? '#fff' : '#444' }} onClick={onFullView}>
            <FitScreenIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export as PNG">
          <IconButton sx={{ color: darkTheme ? '#fff' : '#444' }} >
            <ImageIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Export as PDF">
          <IconButton sx={{ color: darkTheme ? '#fff' : '#444' }}>
            <PictureAsPdfIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title="Search">
          <IconButton
            onClick={() => setShowSearch(!showSearch)}
            sx={{ color: darkTheme ? '#fff' : '#444' }}
          >
            <SearchIcon />
          </IconButton>
        </Tooltip>
        {showSearch && (
          <TextField
            size="small"
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              ml: 1,
              width: 200,
              backgroundColor: darkTheme ? '#555' : '#fff',
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: darkTheme ? '#999' : '#ccc'
                }
              }
            }}
          />
        )}
        <Button variant='contained' style={{ marginLeft: '10px' }} onClick={() => setLoaderPopupOpen(p => !p)}>loading rules</Button>
      </Box>

      <Box sx={{ flexGrow: 1, textAlign: 'center' }}>
        <Typography variant='h6' sx={{ color: darkTheme ? '#fff' : '#444' }}>
          {aclDetails.aclName || ''}
        </Typography>
      </Box>

      <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
      {aclDetails.capacity > 1500 ? (
          <WarningAmberIcon fontSize="small" sx={{ color: 'red' }} />
        ) : aclDetails.capacity > 1300 ? (
          <WarningAmberIcon fontSize="small" sx={{ color: 'orange' }} />
        ) : null}
        <Typography variant="body2" sx={{ color: darkTheme ? '#fff' : '#444', mr: 1, marginLeft: '10px' }}>
          {aclDetails.capacity > 0 ? `WCUs: ${aclDetails.capacity} / 1500` : ''}
        </Typography>
        {warningCount > 0 && (
          <Tooltip title="Show Validation Errors">
            <IconButton sx={{ color: 'red' }} onClick={onWarnings}>
              <Badge badgeContent={warningCount} color="error">
                <WarningAmberIcon />
              </Badge>
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
};
export default TopBar