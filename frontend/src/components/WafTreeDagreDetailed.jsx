import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Container,
  Typography,
  CircularProgress,
  Paper,
  Box
} from "@mui/material";
import ReactFlow, {
  Background,
  Controls,
  useNodesState,
  useEdgesState
} from "reactflow";
import "reactflow/dist/style.css";

import layoutGraph from "./layoutGraph";
import { Handle, Position } from "reactflow";

// ACL Node
function AclNode({ data }) {
  return (
    <Paper
      elevation={4}
      sx={{
        px: 2,
        py: 1,
        borderRadius: 2,
        backgroundColor: "#3b82f6",
        color: "#fff",
        minWidth: 140,
        textAlign: "center"
      }}
    >
      <Typography variant="body2" fontWeight="bold">
        {data.label}
      </Typography>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Paper>
  );
}

// Rule Node
function RuleNode({ data }) {
  const bgColor = data.isSubRule ? "#f59e0b" : "#60a5fa";
  return (
    <Paper
      elevation={3}
      sx={{
        px: 2,
        py: 1,
        borderRadius: 2,
        backgroundColor: bgColor,
        color: "#fff",
        minWidth: 160
      }}
    >
      <Typography variant="body2" fontWeight="bold" whiteSpace="pre-line">
        {data.label}
      </Typography>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </Paper>
  );
}

// Define nodeTypes
const nodeTypes = {
  aclNode: AclNode,
  ruleNode: RuleNode
};

function getAction(rule) {
  if (rule.Action) return Object.keys(rule.Action)[0];
  if (rule.OverrideAction) return Object.keys(rule.OverrideAction)[0];
  return "None";
}

function addSubRuleChain(ruleGroup, parentId, nodes, edges) {
  const sorted = [...(ruleGroup.Rules || [])].sort((a, b) => a.Priority - b.Priority);
  let prevNode = parentId;

  sorted.forEach((subRule, i) => {
    const subAction = getAction(subRule);
    const nodeId = `${parentId}-sub-${i}`;
    const label = `SubRule: ${subRule.Name}\n(Priority: ${subRule.Priority}) | Action: ${subAction}`;

    nodes.push({
      id: nodeId,
      type: "ruleNode",
      data: {
        label,
        isSubRule: true,
        fullRule: subRule
      },
      position: { x: 0, y: 0 }
    });

    edges.push({
      id: `edge-${prevNode}-to-${nodeId}`,
      source: prevNode,
      target: nodeId,
      label: "next",
      animated: true
    });

    if (subRule.RuleGroup) {
      addSubRuleChain(subRule.RuleGroup, nodeId, nodes, edges);
    }

    prevNode = nodeId;
  });
}

function generateFlow(acl) {
  const nodes = [];
  const edges = [];

  const defaultAction = Object.keys(acl.DefaultAction || { None: {} })[0] || "None";
  const aclId = `acl-${acl.Id}`;

  // ACL node
  nodes.push({
    id: aclId,
    type: "aclNode",
    data: {
      label: `ACL: ${acl.Name} | DefaultAction: ${defaultAction}`,
      fullAcl: acl
    },
    position: { x: 0, y: 0 }
  });

  // top-level rules
  const sortedRules = [...(acl.Rules || [])].sort((a, b) => a.Priority - b.Priority);
  let prevNode = aclId;
  sortedRules.forEach((rule, idx) => {
    const ruleAction = getAction(rule);
    const rNodeId = `rule-${acl.Id}-${idx}`;
    const label = `Rule: ${rule.Name} (Priority: ${rule.Priority}) | Action: ${ruleAction}`;

    nodes.push({
      id: rNodeId,
      type: "ruleNode",
      data: {
        label,
        isSubRule: false,
        fullRule: rule
      },
      position: { x: 0, y: 0 }
    });

    edges.push({
      id: `edge-${prevNode}-to-${rNodeId}`,
      source: prevNode,
      target: rNodeId,
      label: "next",
      animated: true
    });

    if (rule.RuleGroup) {
      addSubRuleChain(rule.RuleGroup, rNodeId, nodes, edges);
    }
    prevNode = rNodeId;
  });

  // final default node
  const defId = `acl-${acl.Id}-default`;
  nodes.push({
    id: defId,
    type: "ruleNode",
    data: {
      label: `DefaultAction => ${defaultAction}`,
      isSubRule: false
    },
    position: { x: 0, y: 0 }
  });
  edges.push({
    id: `edge-${prevNode}-to-${defId}`,
    source: prevNode,
    target: defId,
    label: "if no match",
    animated: true
  });

  // auto layout
  const { nodes: laidOutNodes, edges: laidOutEdges } = layoutGraph(nodes, edges, "TB");
  return { nodes: laidOutNodes, edges: laidOutEdges };
}

export default function WafTreeDagreDetailed() {
  const [acls, setAcls] = useState([]);
  const [loading, setLoading] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [anchorPos, setAnchorPos] = useState(null);
  const [selectedData, setSelectedData] = useState(null);

  useEffect(() => {
    axios
      .get("http://localhost:5000/api/waf-acls")
      .then((res) => setAcls(res.data))
      .catch((err) => console.error("Error fetching WAF ACLs:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (acls.length > 0) {
      const { nodes, edges } = generateFlow(acls[0]);
      setNodes(nodes);
      setEdges(edges);
    }
  }, [acls]);

  const onNodeClick = useCallback((evt, node) => {
    setAnchorPos({ mouseX: evt.clientX, mouseY: evt.clientY });
    const r = node.data?.fullRule;
    const a = node.data?.fullAcl;
    if (r) {
      setSelectedData({
        type: "rule",
        name: r.Name,
        priority: r.Priority,
        action: getAction(r)
      });
    } else if (a) {
      setSelectedData({
        type: "acl",
        name: a.Name,
        id: a.Id
      });
    } else {
      setSelectedData({ type: "default" });
    }
  }, []);

  const closePopover = () => {
    setAnchorPos(null);
    setSelectedData(null);
  };

  if (loading) return <CircularProgress />;
  if (!acls.length) return <Typography>No ACLs found</Typography>;

  return (
    <Container sx={{ mt: 4 }}>
      <Typography variant="h4" align="center" gutterBottom>
        AWS WAF DAGRE Flow (Detailed Sub‐Rule Chains)
      </Typography>

      <Paper sx={{ width: "100%", height: "80vh" }} elevation={3}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
        >
          <Background />
          <Controls />
        </ReactFlow>
      </Paper>

      {/* Simple popover on node click */}
      {anchorPos && (
        <Box
          sx={{
            position: "fixed",
            top: anchorPos.mouseY,
            left: anchorPos.mouseX,
            bgcolor: "#fff",
            border: "1px solid #ccc",
            p: 2,
            borderRadius: 1
          }}
          onMouseLeave={closePopover}
        >
          {selectedData?.type === "acl" && (
            <>
              <Typography variant="subtitle1">
                ACL: {selectedData.name}
              </Typography>
              <Typography>ID: {selectedData.id}</Typography>
            </>
          )}
          {selectedData?.type === "rule" && (
            <>
              <Typography variant="subtitle1">
                Rule: {selectedData.name}
              </Typography>
              <Typography>Priority: {selectedData.priority}</Typography>
              <Typography>Action: {selectedData.action}</Typography>
            </>
          )}
          {selectedData?.type === "default" && (
            <Typography>DefaultAction node (no extra info)</Typography>
          )}
        </Box>
      )}
    </Container>
  );
}
