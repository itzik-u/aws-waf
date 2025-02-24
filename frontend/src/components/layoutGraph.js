// layoutGraph.js
import dagre from "dagre";

/**
 * nodeWidth/nodeHeight for the Dagre layout.
 */
const nodeWidth = 220;
const nodeHeight = 70;

/**
 * Auto-layout the graph using Dagre.
 * Returns { nodes, edges } with updated node.position = { x, y }.
 */
export default function layoutGraph(nodes, edges, direction = "TB") {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  // For each node, define approximate width/height
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges
  edges.forEach((edge) => {
    if (!edge.id) {
      edge.id = `edge-${edge.source}-${edge.target}-${Math.random()}`;
    }
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout
  dagre.layout(dagreGraph);

  // Update node positions
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
  });

  return { nodes, edges };
}
