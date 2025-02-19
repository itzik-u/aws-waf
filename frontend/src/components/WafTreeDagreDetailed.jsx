import React, { useEffect, useState } from "react";
import { Container, Typography, CircularProgress, Paper } from "@mui/material";
import axios from "axios";
import ReactFlow, { Background, Controls } from "reactflow";
import "reactflow/dist/style.css";
import layoutGraph from "./layoutGraph"; // a helper using the 'dagre' library

/**
 * getAction(rule):
 *   Return the action label from either rule.Action or rule.OverrideAction.
 */
function getAction(rule) {
  if (rule.Action) {
    return Object.keys(rule.Action)[0]; // e.g. "Block" / "Allow" / "Captcha"
  }
  if (rule.OverrideAction) {
    return Object.keys(rule.OverrideAction)[0]; // e.g. "None"
  }
  return "None";
}

/**
 * addSubRuleChain(ruleGroup, parentId, allNodes, allEdges):
 *   Convert the sub-rules in 'ruleGroup' into a chain of nodes:
 *     sub-rule(0) -> sub-rule(1) -> sub-rule(2)...
 *   Each sub-rule is displayed with "Rule: subRule.Name (Priority) | Action: ???"
 *   If sub-rule i matches, it short-circuits with its Action. If not matched, go to sub-rule i+1.
 */
function addSubRuleChain(ruleGroup, parentId, allNodes, allEdges) {
  // Sort sub-rules by priority
  const sortedSubRules = [...(ruleGroup.Rules || [])].sort(
    (a, b) => a.Priority - b.Priority
  );

  let prevNodeId = parentId;
  sortedSubRules.forEach((subRule, index) => {
    const subRuleAction = getAction(subRule);
    const subRuleId = `${parentId}-subrule-${index}`;

    const labelText = `SubRule: ${subRule.Name} (Priority: ${subRule.Priority}) | Action: ${subRuleAction}`;
    allNodes.push({
      id: subRuleId,
      data: { label: labelText },
      position: { x: 0, y: 0 }, // Dagre will auto‐layout
      style: {
        background: "#f59e0b",
        padding: 10,
        borderRadius: 8,
        color: "#fff",
      },
    });

    allEdges.push({
      id: `edge-${prevNodeId}-${subRuleId}`,
      source: prevNodeId,
      target: subRuleId,
      animated: true,
      label: "next",
    });

    // If subRule references another nested RuleGroup, recurse:
    if (subRule.RuleGroup) {
      // We'll chain from this subRule node to the sub-sub-rule chain
      addSubRuleChain(subRule.RuleGroup, subRuleId, allNodes, allEdges);
    }

    prevNodeId = subRuleId;
  });
}

/**
 * generateFlowDiagram(acl):
 *   Builds a DAGRE-friendly graph of the ACL’s top-level rules,
 *   then each RuleGroup as a chain of sub-rules. 
 */
function generateFlowDiagram(acl) {
  const nodes = [];
  const edges = [];

  const aclNodeId = `acl-${acl.Id}`;
  const defaultAction = Object.keys(acl.DefaultAction || { None: {} })[0];

  // Root ACL node
  nodes.push({
    id: aclNodeId,
    data: {
      label: `ACL: ${acl.Name} | DefaultAction: ${defaultAction}`,
    },
    position: { x: 0, y: 0 },
    style: {
      background: "#3b82f6",
      padding: 10,
      borderRadius: 8,
      color: "#fff",
    },
  });

  // Sort top-level rules by Priority
  const sortedRules = [...(acl.Rules || [])].sort((a, b) => a.Priority - b.Priority);

  let prevTopLevelId = aclNodeId;
  sortedRules.forEach((rule, index) => {
    const ruleId = `rule-${acl.Id}-${index}`;
    const ruleAction = getAction(rule);

    // Node for the top-level rule
    nodes.push({
      id: ruleId,
      data: {
        label: `Rule: ${rule.Name} (Priority: ${rule.Priority}) | Action: ${ruleAction}`,
      },
      position: { x: 0, y: 0 },
      style: {
        background: "#60a5fa",
        padding: 10,
        borderRadius: 8,
      },
    });

    edges.push({
      id: `edge-${prevTopLevelId}-${ruleId}`,
      source: prevTopLevelId,
      target: ruleId,
      animated: true,
      label: "next",
    });

    // If there is a sub-rule group, we create a chain for them:
    if (rule.RuleGroup) {
      addSubRuleChain(rule.RuleGroup, ruleId, nodes, edges);
    }

    prevTopLevelId = ruleId;
  });

  // Finally, a node for the ACL’s default action (only if you want it in the chain):
  const defaultNodeId = `acl-${acl.Id}-defaultAction`;
  nodes.push({
    id: defaultNodeId,
    data: { label: `DefaultAction => ${defaultAction}` },
    position: { x: 0, y: 0 },
    style: {
      background: "#10b981",
      padding: 10,
      borderRadius: 8,
      color: "#fff",
    },
  });
  edges.push({
    id: `edge-default-${prevTopLevelId}-${defaultNodeId}`,
    source: prevTopLevelId,
    target: defaultNodeId,
    animated: true,
    label: "if no match",
  });

  // Run the Dagre auto‐layout to position everything
  const { nodes: laidOutNodes, edges: laidOutEdges } = layoutGraph(nodes, edges, "TB");
  return { nodes: laidOutNodes, edges: laidOutEdges };
}

export default function WafTreeDagreDetailed() {
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
  if (!acls.length) return <Typography>No ACLs found</Typography>;

  return (
    <Container style={{ marginTop: 30 }}>
      <Typography variant="h4" align="center" gutterBottom>
        AWS WAF DAGRE Flow (Detailed Sub‐Rule Chains)
      </Typography>

      {acls.map((acl, idx) => {
        const { nodes, edges } = generateFlowDiagram(acl);
        return (
          <Paper key={acl.Id || idx} style={{ height: 700, marginTop: 30, padding: 10 }}>
            <Typography variant="h6">{acl.Name} - Detailed Flow</Typography>
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
