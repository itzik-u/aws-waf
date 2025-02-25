import React, { useState } from "react";
import { styled, useTheme } from "@mui/material/styles";
import {
  Box,
  CssBaseline,
  Toolbar,
  Typography,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider
} from "@mui/material";
import { Link } from "react-router-dom";

import MuiDrawer from "@mui/material/Drawer";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import HomeIcon from "@mui/icons-material/Home";

// Example icons for nav items
import DashboardIcon from "@mui/icons-material/Dashboard";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import DeviceHubIcon from "@mui/icons-material/DeviceHub";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import ShuffleIcon from "@mui/icons-material/Shuffle";

// Your WAF components
import WafTreeDagreDetailed from "./components/WafTreeDagreDetailed";
import WafTreeIfElseDetailed from "./components/WafTreeIfElseDetailed";
import WafTree from "./components/WafTree";
import WafRulesFlow from "./components/WafRulesFlow";
import WAFRuleTree from "./components/ruleCheck";

////////////////////////////////////////////////////////////////////////////////
// CONFIG
////////////////////////////////////////////////////////////////////////////////
const drawerWidth = 240;

////////////////////////////////////////////////////////////////////////////////
// MUI TRANSITIONS
////////////////////////////////////////////////////////////////////////////////
const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen
  }),
  overflowX: "hidden"
});

const closedMixin = (theme) => ({
  transition: theme.transitions.create("width", {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen
  }),
  overflowX: "hidden",
  // ~56px when collapsed
  width: `calc(${theme.spacing(7)} + 1px)`,
  [theme.breakpoints.up("sm")]: {
    // ~64px on larger screens
    width: `calc(${theme.spacing(8)} + 1px)`
  }
});

////////////////////////////////////////////////////////////////////////////////
// STYLED DRAWER
////////////////////////////////////////////////////////////////////////////////
const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open"
})(({ theme, open }) => ({
  width: drawerWidth,
  flexShrink: 0,
  whiteSpace: "nowrap",
  boxSizing: "border-box",
  ...(open && {
    ...openedMixin(theme),
    "& .MuiDrawer-paper": openedMixin(theme)
  }),
  ...(!open && {
    ...closedMixin(theme),
    "& .MuiDrawer-paper": closedMixin(theme)
  })
}));

////////////////////////////////////////////////////////////////////////////////
// MAIN APP
////////////////////////////////////////////////////////////////////////////////
export default function App() {
  const theme = useTheme();

  // Whether the drawer is expanded (hover)
  const [open, setOpen] = useState(false);

  // Which WAF view is active - initialize as null or empty string
  const [view, setView] = useState("");

  // Hover to expand
  const handleMouseEnter = () => setOpen(true);
  // Mouse leave to collapse
  const handleMouseLeave = () => setOpen(false);

  // Decide which component to show
  const renderContent = () => {
    switch (view) {
      case "home":
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="h4">Welcome Home</Typography>
          </Box>
        );
      case "ruleCheck":
        return <WAFRuleTree />;
      case "rulesFlow":
        return <WafRulesFlow />;
      case "dagre":
        return <WafTreeDagreDetailed />;
      case "ifelse":
        return <WafTreeIfElseDetailed />;
      case "simple":
        return <WafTree />;
      default:
        return (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="h4">Select a view from the menu</Typography>
          </Box>
        );
    }
  };

  // Navigation items
  // Note: "home" now has a "link" property, so we can navigate directly
  const navItems = [
    { key: "home", label: "Home", icon: <HomeIcon />, link: "/" },
    { key: "ruleCheck", label: "Rule Check", icon: <DashboardIcon /> },
    { key: "rulesFlow", label: "WafRulesFlow", icon: <AutoGraphIcon /> },
    { key: "dagre", label: "Dagre Detailed", icon: <DeviceHubIcon /> },
    { key: "ifelse", label: "If–Then–Else", icon: <CompareArrowsIcon /> },
    { key: "simple", label: "Simple WafTree", icon: <ShuffleIcon /> }
  ];

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />

      {/* Mini-variant drawer with hover expand */}
      <Drawer
        variant="permanent"
        open={open}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 
          Top bar: user icon aligned with other icons
        */}
        <Toolbar
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            height: theme.spacing(8), // ~64px
            px: 2.5 // match ListItemButton padding
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: open ? "initial" : "center",
              width: "100%"
            }}
          >
            <AccountCircleIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : "auto",
                fontSize: 32 // Increased size
              }}
            />
            {open && (
              <Typography variant="subtitle1" noWrap>
                John Doe
              </Typography>
            )}
          </Box>
        </Toolbar>
        <Divider />

        <List>
          {navItems.map((item) => {
            // If item.link is defined, navigate directly to item.link
            const listItemProps = item.link
              ? { component: Link, to: item.link }
              : {
                onClick: () => setView(item.key),
                selected: view === item.key
              };

            return (
              <ListItemButton
                key={item.key}
                sx={{
                  minHeight: 48,
                  justifyContent: open ? "initial" : "center",
                  px: 2.5
                }}
                {...listItemProps}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : "auto",
                    justifyContent: "center"
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {/* Label only when open */}
                {open && (
                  <ListItemText
                    primary={item.label}
                    sx={{ opacity: open ? 1 : 0 }}
                  />
                )}
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>

      {/* MAIN CONTENT AREA */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // remove p: 2,
          // offset content by mini or full drawer width
          width: `calc(100% - ${open
            ? drawerWidth
            : parseInt(theme.spacing(8), 10) + 1
            }px)`
        }}
      >
        
        
        {renderContent()}
      </Box>
    </Box>
  );
}
