import React, { useEffect, useState } from "react";
import { Container, Typography, CircularProgress, Paper } from "@mui/material";
import axios from "axios";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

import layoutGraph from "./layoutGraph";  // Our Dagre helper

/** Return the main action from a rule’s Action / OverrideAction. */
function getActionLabel(rule) {
  if (rule.Action) {
    return Object.keys(rule.Action)[0]; // e.g. "Block", "Allow", "Captcha"
  }
  if (rule.OverrideAction) {
    return Object.keys(rule.OverrideAction)[0]; // e.g. "None"
  }
  return "None";
}

/** Given an action like "Block", return a friendly label to show if it stops or continues. */
function formatActionLabel(action) {
  // If it’s a “stop” action, label it accordingly
  switch (action) {
    case "Block":
      return "Action: Block (Stop)";
    case "Captcha":
      return "Action: Captcha (Stop)";
    case "Allow":
      return "Action: Allow (Stop)"; // if matched, presumably we stop
    case "None":
      return "Action: None (Continue)";
    default:
      return `Action: ${action}`;
  }
}

/**
 * Build a chain of sub‐rules for one RuleGroup (in ascending priority).
 * - For each sub‐rule, create:
 *    - A "diamond" node: "Check sub‐rule: {Name}"
 *    - An action node: "Action: ???"
 *    - "Matched =>" edge from diamond to action
 *    - "Not Matched =>" edge from diamond to next sub‐rule
 */
function buildSubRuleChain(parentNodeId, ruleGroup, nodes, edges) {
  const sortedSubRules = [...(ruleGroup.Rules || [])].sort((a, b) => a.Priority - b.Priority);

  let currentDiamond = parentNodeId;
  let lastDiamond = null;

  sortedSubRules.forEach((subRule, idx) => {
    // Diamond node for sub‐rule check
    const diamondId = `${parentNodeId}-subCheck-${idx}`;
    const subActionId = `${parentNodeId}-subAction-${idx}`;
    const subAction = getActionLabel(subRule);
    const diamondLabel = `Check sub‐rule: ${subRule.Name}\nPriority: ${subRule.Priority}`;

    nodes.push({
      id: diamondId,
      data: { label: diamondLabel },
      position: { x: 0, y: 0 },
      style: {
        background: "#fbbf24", // orange
        padding: 10,
        borderRadius: 8,
      },
    });

    edges.push({
      id: `edge-${currentDiamond}-to-${diamondId}`,
      source: currentDiamond,
      target: diamondId,
      label: "Not Matched => next sub‐rule",
      animated: true,
    });

    // Action node if matched
    const actionLabel = formatActionLabel(subAction);
    nodes.push({
      id: subActionId,
      data: { label: actionLabel },
      position: { x: 0, y: 0 },
      style: {
        background: "#fde047", // yellow
        padding: 10,
        borderRadius: 8,
      },
    });
    edges.push({
      id: `edge-${diamondId}-to-${subActionId}`,
      source: diamondId,
      target: subActionId,
      label: "Matched =>",
      animated: true,
    });

    // If subRule itself has a nested RuleGroup, recursively build that chain
    if (subRule.RuleGroup) {
      const subGroupStartId = `${subActionId}-subGroupStart-${idx}`;
      nodes.push({
        id: subGroupStartId,
        data: { label: `SubRules of ${subRule.Name}` },
        position: { x: 0, y: 0 },
        style: {
          background: "#4ade80", // green
          color: "#fff",
          padding: 10,
          borderRadius: 8,
        },
      });
      edges.push({
        id: `edge-${subActionId}-to-${subGroupStartId}`,
        source: subActionId,
        target: subGroupStartId,
        label: "(Continue) => sub-rules",
        animated: true,
      });
      // Recurse
      buildSubRuleChain(subGroupStartId, subRule.RuleGroup, nodes, edges);
    }

    currentDiamond = diamondId; // for the next sub‐rule’s "Not Matched =>"
    lastDiamond = diamondId;
  });

  return lastDiamond; // the last diamond we made
}

/**
 * Build the full short-circuit chain for each top-level rule.
 * For each rule:
 *   - Diamond: "Check {rule.name}"
 *   - Action node if matched
 *   - If rule has RuleGroup, build sub‐rules
 *   - If not matched, go to the next top-level rule
 */
function buildTopLevelRuleChain(acl, nodes, edges) {
  const sortedRules = [...(acl.Rules || [])].sort((a, b) => a.Priority - b.Priority);

  const startId = `start-acl-${acl.Id}`;
  nodes.push({
    id: startId,
    data: { label: `Start - ACL: ${acl.Name}` },
    position: { x: 0, y: 0 },
    style: {
      background: "#3b82f6", // blue
      color: "#fff",
      padding: 10,
      borderRadius: 8,
    },
  });

  let currentDiamond = startId;
  let lastDiamond = null;

  sortedRules.forEach((rule, index) => {
    const diamondId = `ruleCheck-${acl.Id}-${index}`;
    const actionId = `ruleAction-${acl.Id}-${index}`;
    const ruleAction = getActionLabel(rule);

    // Diamond node
    nodes.push({
      id: diamondId,
      data: { label: `Check: ${rule.Name}\nPriority: ${rule.Priority}` },
      position: { x: 0, y: 0 },
      style: {
        background: "#fbbf24",
        padding: 10,
        borderRadius: 8,
      },
    });
    // Edge from previous diamond to this diamond
    edges.push({
      id: `edge-${currentDiamond}-to-${diamondId}`,
      source: currentDiamond,
      target: diamondId,
      label: "Not Matched => next rule",
      animated: true,
    });

    // Action node
    const actionLabel = formatActionLabel(ruleAction);
    nodes.push({
      id: actionId,
      data: { label: actionLabel },
      position: { x: 0, y: 0 },
      style: {
        background: "#fde047",
        padding: 10,
        borderRadius: 8,
      },
    });
    edges.push({
      id: `edge-${diamondId}-to-${actionId}`,
      source: diamondId,
      target: actionId,
      label: "Matched =>",
      animated: true,
    });

    // If rule has a sub-rule group, build chain from the action node
    if (rule.RuleGroup) {
      const subGroupStartId = `${actionId}-subGroupStart`;
      nodes.push({
        id: subGroupStartId,
        data: { label: `SubRules of ${rule.Name}` },
        position: { x: 0, y: 0 },
        style: {
          background: "#4ade80",
          color: "#fff",
          padding: 10,
          borderRadius: 8,
        },
      });
      edges.push({
        id: `edge-${actionId}-to-${subGroupStartId}`,
        source: actionId,
        target: subGroupStartId,
        label: "(Continue) => sub-rules",
        animated: true,
      });

      const lastSubDiamond = buildSubRuleChain(subGroupStartId, rule.RuleGroup, nodes, edges);
      // If no sub‐rule matched, link from the last diamond back to the next top-level rule
      if (lastSubDiamond) {
        edges.push({
          id: `edge-${lastSubDiamond}-to-next-${index}`,
          source: lastSubDiamond,
          target: `ruleCheck-${acl.Id}-${index + 1}`, // next rule diamond
          label: "No sub‐rule matched => next top‐level rule",
          animated: true,
        });
      }
    }

    currentDiamond = diamondId;
    lastDiamond = diamondId;
  });

  // Finally, default action node
  const defaultActionKey = Object.keys(acl.DefaultAction || { None: {} })[0] || "None";
  const defaultId = `defaultAction-${acl.Id}`;
  nodes.push({
    id: defaultId,
    data: { label: `DefaultAction => ${defaultActionKey}` },
    position: { x: 0, y: 0 },
    style: {
      background: "#10b981", // green
      color: "#fff",
      padding: 10,
      borderRadius: 8,
    },
  });
  edges.push({
    id: `edge-${lastDiamond}-to-default`,
    source: lastDiamond,
    target: defaultId,
    label: "Not Matched => default",
    animated: true,
  });
}

/** Master function to build the full graph for one ACL, then run Dagre layout. */
function generateFlow(acl) {
  const nodes = [];
  const edges = [];

  buildTopLevelRuleChain(acl, nodes, edges);

  // Now run Dagre to auto‐layout
  const { nodes: outNodes, edges: outEdges } = layoutGraph(nodes, edges, "TB");
  return { nodes: outNodes, edges: outEdges };
}

export default function WafTreeIfElseAutoLayout() {
  const [acls, setAcls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/waf-acls")
      .then((res) => setAcls(res.data))
      .catch((err) => console.error("Error fetching WAF ACLs:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <CircularProgress />;
  if (!acls?.length) {
    return <Typography variant="h6">No ACLs found</Typography>;
  }

  return (
    <Container style={{ marginTop: 20 }}>
      <Typography variant="h4" align="center" gutterBottom>
        AWS WAF If–Then–Else Flow with Clear Labels
      </Typography>

      {acls.map((acl, idx) => {
        const { nodes, edges } = generateFlow(acl);
        return (
          <Paper key={acl.Id || idx} style={{ height: 1000, marginTop: 40, padding: 10 }}>
            <Typography variant="h6">
              {acl.Name} - Detailed Short‐Circuit Flow
            </Typography>
            <ReactFlow nodes={nodes} edges={edges} fitView>
              <Background />
              <Controls />
            </ReactFlow>
          </Paper>
        );
      })}
    </Container>
  );
}
