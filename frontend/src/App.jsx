import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Button,
  IconButton,
  Stack
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";

// Existing components
import WafTreeDagreDetailed from "./components/WafTreeDagreDetailed";
import WafTreeIfElseDetailed from "./components/WafTreeIfElseDetailed";
import WafTree from "./components/WafTree";
import WafRulesFlow from "./components/WafRulesFlow";
import WAFRuleTree from "./components/ruleCheck";

export default function App() {
  const [view, setView] = useState("dagre");

  // Helper to render the chosen component
  const renderContent = () => {
    switch (view) {
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
        return <WafTreeDagreDetailed />;
    }
  };

  return (
    <>
      {/* Top AppBar with fixed position */}
      <AppBar position="sticky">
        <Toolbar>
          {/* Back to Home icon (uses React Router Link) */}
          <IconButton
            component={Link}
            to="/"
            color="inherit"
            sx={{ mr: 2 }}
          >
            <HomeIcon />
          </IconButton>

          {/* Title */}
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            AWS WAF Full Project
          </Typography>

          {/* Button row for toggles */}
          <Stack direction="row" spacing={1}>
            <Button
              variant={view === "ruleCheck" ? "contained" : "outlined"}
              color="inherit"
              onClick={() => setView("ruleCheck")}
            >
              Rule Check
            </Button>
            <Button
              variant={view === "rulesFlow" ? "contained" : "outlined"}
              color="inherit"
              onClick={() => setView("rulesFlow")}
            >
              WafRulesFlow
            </Button>
            <Button
              variant={view === "dagre" ? "contained" : "outlined"}
              color="inherit"
              onClick={() => setView("dagre")}
            >
              Dagre Detailed
            </Button>
            <Button
              variant={view === "ifelse" ? "contained" : "outlined"}
              color="inherit"
              onClick={() => setView("ifelse")}
            >
              If–Then–Else
            </Button>
            <Button
              variant={view === "simple" ? "contained" : "outlined"}
              color="inherit"
              onClick={() => setView("simple")}
            >
              Simple WafTree
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main content area */}
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }} padding={0}>
        {renderContent()}
      </Container>
    </>
  );
}
