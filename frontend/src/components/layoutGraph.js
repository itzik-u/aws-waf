import dagre from "dagre";

/** 
 * Approx. node size used for Dagre layout calculations.
 * You can tweak as needed. 
 */
const nodeWidth = 220;
const nodeHeight = 70;

/**
 * Auto-layout the graph using Dagre.
 * @param {Array} nodes
 * @param {Array} edges
 * @param {'TB'|'LR'|'BT'|'RL'} direction - The rankdir (top->bottom, etc)
 */
export default function layoutGraph(nodes, edges, direction = "TB") {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction });

  // Add each node to dagre with a size
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  // Add edges
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Run the layout
  dagre.layout(dagreGraph);

  // Update node positions with the layout results
  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2
    };
  });

  return { nodes, edges };
}
