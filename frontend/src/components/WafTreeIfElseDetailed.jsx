import React, { useEffect, useState } from "react";
import { Container, Typography, CircularProgress, Paper } from "@mui/material";
import axios from "axios";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

import layoutGraph from "./layoutGraph";  // Dagre

function getActionLabel(rule) {
  if (rule.Action) {
    return Object.keys(rule.Action)[0];
  }
  if (rule.OverrideAction) {
    return Object.keys(rule.OverrideAction)[0];
  }
  return "None";
}

function formatActionLabel(action) {
  switch (action) {
    case "Block":
      return "Action: Block (Stop)";
    case "Captcha":
      return "Action: Captcha (Stop)";
    case "Allow":
      return "Action: Allow (Stop)";
    case "None":
      return "Action: None (Continue)";
    default:
      return `Action: ${action}`;
  }
}

/** Sub‐rule chain builder */
function buildSubRuleChain(parentNodeId, ruleGroup, nodes, edges) {
  const sortedSubRules = [...(ruleGroup.Rules || [])].sort((a, b) => a.Priority - b.Priority);

  let currentDiamond = parentNodeId;
  let lastDiamond = null;

  sortedSubRules.forEach((subRule, idx) => {
    const diamondId = `${parentNodeId}-subCheck-${idx}`;
    const actionId = `${parentNodeId}-subAction-${idx}`;
    const subAction = getActionLabel(subRule);
    const diamondLabel = `Check sub‐rule: ${subRule.Name}\nPriority: ${subRule.Priority}`;

    // Diamond node
    nodes.push({
      id: diamondId,
      data: { label: diamondLabel },
      position: { x: 0, y: 0 },
      style: {
        background: "#fbbf24",
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

    // Action node
    const actionLabel = formatActionLabel(subAction);
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

    // If sub-sub-rules exist, chain them
    if (subRule.RuleGroup) {
      const subGroupStartId = `${actionId}-subGroupStart-${idx}`;
      nodes.push({
        id: subGroupStartId,
        data: { label: `SubRules of ${subRule.Name}` },
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
      buildSubRuleChain(subGroupStartId, subRule.RuleGroup, nodes, edges);
    }

    currentDiamond = diamondId;
    lastDiamond = diamondId;
  });

  return lastDiamond;
}

/** For each top-level rule => diamond + action + optional sub-rules. */
function buildTopLevelRuleChain(acl, nodes, edges) {
  const sortedRules = [...(acl.Rules || [])].sort((a, b) => a.Priority - b.Priority);

  const startId = `start-acl-${acl.Id}`;
  nodes.push({
    id: startId,
    data: { label: `Start - ACL: ${acl.Name}` },
    position: { x: 0, y: 0 },
    style: {
      background: "#3b82f6",
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
    const rAction = getActionLabel(rule);

    // Diamond: check rule?
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
    edges.push({
      id: `edge-${currentDiamond}-to-${diamondId}`,
      source: currentDiamond,
      target: diamondId,
      label: "Not Matched => next rule",
      animated: true,
    });

    // Action node if matched
    const actionLabel = formatActionLabel(rAction);
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

    // Sub-rules
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

      const lastSub = buildSubRuleChain(subGroupStartId, rule.RuleGroup, nodes, edges);
      if (lastSub) {
        edges.push({
          id: `edge-${lastSub}-to-next-${index}`,
          source: lastSub,
          target: `ruleCheck-${acl.Id}-${index + 1}`,
          label: "No sub‐rule matched => next top‐level rule",
          animated: true,
        });
      }
    }

    currentDiamond = diamondId;
    lastDiamond = diamondId;
  });

  // final default
  const defaultActionKey = Object.keys(acl.DefaultAction || { None: {} })[0] || "None";
  const defaultId = `defaultAction-${acl.Id}`;
  nodes.push({
    id: defaultId,
    data: { label: `DefaultAction => ${defaultActionKey}` },
    position: { x: 0, y: 0 },
    style: {
      background: "#10b981",
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

function generateFlow(acl) {
  const nodes = [];
  const edges = [];
  buildTopLevelRuleChain(acl, nodes, edges);

  const { nodes: outNodes, edges: outEdges } = layoutGraph(nodes, edges, "TB");
  return { nodes: outNodes, edges: outEdges };
}

export default function WafTreeIfElseDetailed() {
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
        AWS WAF If–Then–Else Flow
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
