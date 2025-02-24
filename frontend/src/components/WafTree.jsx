import React, { useEffect, useState } from "react";
import { Container, Typography, CircularProgress, Paper } from "@mui/material";
import axios from "axios";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

/**
 * Utility to figure out the main action label (Block / Allow / Captcha / None)
 */
function getRuleAction(rule) {
  if (rule.Action) {
    return Object.keys(rule.Action)[0]; 
  }
  if (rule.OverrideAction) {
    return Object.keys(rule.OverrideAction)[0]; 
  }
  return "None";
}

/** Recursively add sub‐rule nodes for a RuleGroup. */
function addRuleGroupNodes(ruleGroup, parentId, startY, nodes, edges) {
  let yOffset = startY;
  ruleGroup.Rules?.forEach((subRule, subIndex) => {
    const actionLabel = getRuleAction(subRule);
    const nodeId = `subrule-${ruleGroup.Name}-${subRule.Name}-${subIndex}`;
    nodes.push({
      id: nodeId,
      data: {
        label: `Rule: ${subRule.Name} (Priority: ${subRule.Priority}) | Action: ${actionLabel}`
      },
      position: { x: 550, y: yOffset },
      style: { 
        background: "#4682B4", 
        padding: 10, 
        borderRadius: 10, 
        color: "#fff" 
      }
    });

    edges.push({
      id: `e-${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      animated: true
    });

    if (subRule.RuleGroup) {
      yOffset = addRuleGroupNodes(subRule.RuleGroup, nodeId, yOffset + 100, nodes, edges);
    } else {
      yOffset += 100;
    }
  });
  return yOffset;
}

/** Build a simple top‐down flow (no auto‐layout) for one ACL. */
function generateFlowDiagram(acl) {
  const nodes = [];
  const edges = [];

  // Root ACL node
  const aclNodeId = `acl-${acl.Id}`;
  nodes.push({
    id: aclNodeId,
    data: { label: `ACL: ${acl.Name} | DefaultAction: ${Object.keys(acl.DefaultAction)[0]}` },
    position: { x: 100, y: 50 },
    style: { 
      background: "#4682B4", 
      padding: 10, 
      borderRadius: 10, 
      color: "#fff" 
    }
  });

  let yOffset = 200;
  acl.Rules?.forEach((rule, ruleIndex) => {
    const ruleAction = getRuleAction(rule);
    const ruleNodeId = `rule-${acl.Id}-${ruleIndex}`;

    nodes.push({
      id: ruleNodeId,
      data: {
        label: `Rule: ${rule.Name} (Priority: ${rule.Priority}) | Action: ${ruleAction}`
      },
      position: { x: 100, y: yOffset },
      style: { background: "#87CEEB", padding: 10, borderRadius: 10 }
    });

    edges.push({
      id: `e-acl-rule-${ruleIndex}`,
      source: aclNodeId,
      target: ruleNodeId,
      animated: true
    });

    if (rule.RuleGroup) {
      yOffset = addRuleGroupNodes(rule.RuleGroup, ruleNodeId, yOffset + 100, nodes, edges);
    } else {
      yOffset += 150;
    }
  });

  return { nodes, edges };
}

export default function WafTree() {
  const [wafAcls, setWafAcls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWafAcls = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/waf-acls");
        setWafAcls(response.data);
      } catch (error) {
        console.error("Error fetching WAF ACLs:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWafAcls();
  }, []);

  if (loading) {
    return <CircularProgress />;
  }
  if (!wafAcls?.length) {
    return (
      <Typography variant="h6" color="error">
        No ACLs found
      </Typography>
    );
  }

  return (
    <Container style={{ marginTop: 20 }}>
      <Typography variant="h4" align="center" gutterBottom>
        AWS WAF - Simple Flow
      </Typography>

      {wafAcls.map((acl, index) => {
        const { nodes, edges } = generateFlowDiagram(acl);
        return (
          <Paper key={acl.Id || index} style={{ padding: 10, marginTop: 20, height: 700 }}>
            <Typography variant="h6" gutterBottom>
              ACL Name: {acl.Name}
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
