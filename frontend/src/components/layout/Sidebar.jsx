import { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  IconButton,
  useTheme,
  Fade,
} from '@mui/material';
import {
  AccountTree as TreeIcon,
  Menu as MenuIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  ChevronLeft as ChevronLeftIcon,
  BugReport as DebugIcon,
} from '@mui/icons-material';
import { useThemeContext } from '../../context/ThemeContext';

const drawerWidth = 240;

export default function Sidebar({ view, setView }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const { darkTheme, setDarkTheme } = useThemeContext();

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const menuItems = [
    { key: 'tree', label: 'WAF Tree', icon: <TreeIcon /> },
    { key: 'debugger', label: 'Request Debugger', icon: <DebugIcon /> },
    {
      key: 'theme',
      label: darkTheme ? 'Light Mode' : 'Dark Mode',
      icon: darkTheme ? <LightModeIcon /> : <DarkModeIcon />,
      onClick: () => setDarkTheme(!darkTheme),
    },
  ];

  return (
    <Drawer
      variant="permanent"
      open={open}
      sx={{
        width: open ? drawerWidth : theme.spacing(8),
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
        '& .MuiDrawer-paper': {
          width: open ? drawerWidth : theme.spacing(8),
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          bgcolor: darkTheme ? '#1A1A1A' : '#d4d0f5',
          borderRight: '1px solid',
          borderColor: darkTheme ? '#333' : '#e0e0e0',
          boxShadow: darkTheme
            ? '0 4px 12px rgba(0,0,0,0.3)'
            : '0 4px 12px rgba(0,0,0,0.05)',
          overflowX: 'hidden',
        },
      }}
    >
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'flex-end' : 'center',
          py: 0,
          borderBottom: '1px solid',
          borderColor: darkTheme ? '#333' : '#e0e0e0',
          minHeight: '64px',
        }}
      >
        <IconButton
          onClick={toggleDrawer}
          sx={{
            color: darkTheme ? '#9D6FE7' : '#6938AF',
            transform: open ? 'none' : 'rotate(180deg)',
            transition: theme.transitions.create('transform', {
              duration: theme.transitions.duration.shortest,
            }),
            p: 0.5,
          }}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </IconButton>
      </Toolbar>

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.key} disablePadding>
            <ListItemButton
              selected={!item.onClick && view === item.key}
              onClick={item.onClick || (() => setView(item.key))}
              sx={{
                minHeight: 48,
                justifyContent: 'initial',
                px: 2.5,
                '&.Mui-selected': {
                  bgcolor: darkTheme ? '#2D2D2D' : '#f0f0ff',
                  '&:hover': {
                    bgcolor: darkTheme ? '#333' : '#e8e8ff',
                  },
                },
                '&:hover': {
                  bgcolor: darkTheme ? '#252525' : '#f8f8ff',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 2,
                  justifyContent: 'center',
                  color:
                    !item.onClick && view === item.key
                      ? darkTheme
                        ? '#9D6FE7'
                        : '#6938AF'
                      : darkTheme
                        ? '#B0B0B0'
                        : 'inherit',
                }}
              >
                {item.icon}
              </ListItemIcon>

              <Fade in={open} timeout={400} unmountOnExit>
                <ListItemText
                  primary={item.label}
                  nowrap='true'
                  sx={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    '& .MuiTypography-root': {
                      fontWeight:
                        !item.onClick && view === item.key ? 600 : 400,
                      color:
                        !item.onClick && view === item.key
                          ? darkTheme
                            ? '#9D6FE7'
                            : '#6938AF'
                          : darkTheme
                            ? '#E0E0E0'
                            : 'inherit',
                    },
                  }}
                />
              </Fade>
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}