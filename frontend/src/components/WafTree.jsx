import React, { useEffect, useState } from "react";
import { Container, Typography, CircularProgress, Paper } from "@mui/material";
import axios from "axios";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";

/**
 * Utility to figure out the main action label (Block / Allow / Captcha / None)
 * from either `rule.Action` or `rule.OverrideAction`.
 */
function getRuleAction(rule) {
  // If a top-level rule has `Action`, use that
  if (rule.Action) {
    const actionKey = Object.keys(rule.Action)[0]; // e.g. "Block" / "Allow" / "Captcha" ...
    return actionKey;
  }
  // Otherwise check if there's an OverrideAction (like "None")
  if (rule.OverrideAction) {
    const overrideKey = Object.keys(rule.OverrideAction)[0]; // e.g. "None"
    return overrideKey;
  }
  return "None";
}

/**
 * Build up nodes/edges for a single RuleGroup’s sub-rules recursively.
 *
 * @param {Object} ruleGroup - The `RuleGroup` object (with `Rules` array).
 * @param {string} parentId - The node ID we’ll connect from.
 * @param {number} startY - The vertical position to start placing sub-rules.
 * @param {Array} nodes - Existing node array to push onto.
 * @param {Array} edges - Existing edge array to push onto.
 * @returns {number} new Y offset after we place all sub-rules
 */
function addRuleGroupNodes(ruleGroup, parentId, startY, nodes, edges) {
  let yOffset = startY;
  // For each sub-rule in the group:
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

    // Edge from the parent to this sub-rule
    edges.push({
      id: `e-${parentId}-${nodeId}`,
      source: parentId,
      target: nodeId,
      animated: true
    });

    // If this sub-rule also has a nested RuleGroup, recurse:
    if (subRule.RuleGroup) {
      yOffset = addRuleGroupNodes(subRule.RuleGroup, nodeId, yOffset + 100, nodes, edges);
    } else {
      yOffset += 100;
    }
  });

  return yOffset;
}

/**
 * Builds the flow diagram for a single ACL:
 * 1. Create a root ACL node
 * 2. For each top-level rule, add a node
 * 3. If it references a RuleGroup, recursively add sub-rules
 */
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

    // Edge from ACL node to this rule
    edges.push({
      id: `e-acl-rule-${ruleIndex}`,
      source: aclNodeId,
      target: ruleNodeId,
      animated: true
    });

    // If the rule references a nested RuleGroup, add its sub-rules
    if (rule.RuleGroup) {
      yOffset = addRuleGroupNodes(rule.RuleGroup, ruleNodeId, yOffset + 100, nodes, edges);
    } else {
      yOffset += 150;
    }
  });

  return { nodes, edges };
}

const WafTree = () => {
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
        AWS WAF ACL Flow
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
};

export default WafTree;
