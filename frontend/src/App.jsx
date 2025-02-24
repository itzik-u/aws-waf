// App.jsx
import React, { useState } from "react";
import { Container, Box, Button, Typography } from "@mui/material";

// Existing components
import WafTreeDagreDetailed from "./components/WafTreeDagreDetailed";
import WafTreeIfElseDetailed from "./components/WafTreeIfElseDetailed";
import WafTree from "./components/WafTree";
import WafRulesFlow from "./components/WafRulesFlow";
import WAFRuleTree from "./components/ruleCheck";
// The new integrated WAF+Logs DAGRE flow
import WafLogsDagreFlow from "./components/WafLogsDagreFlow";

export default function App() {
  const [view, setView] = useState("dagre");

  return (
   
    <Container sx={{ mt: 3 }} height="100vh" width="100vw">
      <Typography variant="h4" align="center" gutterBottom>
        AWS WAF Full Project
      </Typography>

      {/* Button row */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, justifyContent: "center" }}> 
        <Button
          variant={view === "ruleCheck" ? "contained" : "outlined"}
          onClick={() => setView("ruleCheck")}
        >
          Rule Check
        </Button>
        <Button
          variant={view === "rulesFlow" ? "contained" : "outlined"}
          onClick={() => setView("rulesFlow")}
        >
          WafRulesFlow
        </Button>
        <Button
          variant={view === "dagre" ? "contained" : "outlined"}
          onClick={() => setView("dagre")}
        >
          Dagre Detailed
        </Button>
        <Button
          variant={view === "ifelse" ? "contained" : "outlined"}
          onClick={() => setView("ifelse")}
        >
          If–Then–Else
        </Button>
        <Button
          variant={view === "simple" ? "contained" : "outlined"}
          onClick={() => setView("simple")}
        >
          Simple WafTree
        </Button>
        <Button
          variant={view === "logsFlow" ? "contained" : "outlined"}
          onClick={() => setView("logsFlow")}
        >
          Logs DAGRE Flow
        </Button>
      </Box>

      {/* Render whichever user picks */}
      {view === "ruleCheck" && <WAFRuleTree />}
      {view === "rulesFlow" && <WafRulesFlow />}
      {view === "dagre" && <WafTreeDagreDetailed />}
      {view === "ifelse" && <WafTreeIfElseDetailed />}
      {view === "simple" && <WafTree />}
      {view === "logsFlow" && <WafLogsDagreFlow />}
    </Container>
  );
}
