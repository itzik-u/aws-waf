import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import wafRules from '../data/wafRules.json';

/**
 * Recursively find all label keys from nested WAF statements.
 * Handles AndStatement, OrStatement, NotStatement, RateBasedStatement.ScopeDownStatement,
 * plus direct LabelMatchStatement at any level.
 */
function extractAllLabelKeys(statement) {
    if (!statement) return [];
    let results = [];
  
    if (statement.LabelMatchStatement && statement.LabelMatchStatement.Key) {
      console.log('Found LabelMatchStatement:', statement.LabelMatchStatement.Key);
      results.push(statement.LabelMatchStatement.Key);
    }
  
    if (statement.AndStatement && Array.isArray(statement.AndStatement.Statements)) {
      statement.AndStatement.Statements.forEach(st => {
        results = results.concat(extractAllLabelKeys(st));
      });
    }
  
    if (statement.OrStatement && Array.isArray(statement.OrStatement.Statements)) {
      statement.OrStatement.Statements.forEach(st => {
        results = results.concat(extractAllLabelKeys(st));
      });
    }
  
    if (statement.NotStatement && statement.NotStatement.Statement) {
      results = results.concat(extractAllLabelKeys(statement.NotStatement.Statement));
    }
  
    if (statement.RateBasedStatement && statement.RateBasedStatement.ScopeDownStatement) {
      console.log('Diving into RateBasedStatement.ScopeDownStatement...');
      results = results.concat(
        extractAllLabelKeys(statement.RateBasedStatement.ScopeDownStatement)
      );
    }
  
    return results;
  }

const WAFRulesTree = () => {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);
  // For "Track Path" step-by-step
  const [revealedNodes, setRevealedNodes] = useState(new Set());

  useEffect(() => {
    const data = wafRules.rules || [];

    // 1) Build basic node array
    const nodes = data.map((rule, idx) => {
      let action = 'None';
      if (rule.Action) {
        const actionKey = Object.keys(rule.Action)[0];
        action = actionKey;
      }
      const generatedLabels = rule.RuleLabels
        ? rule.RuleLabels.map(l => l.Name)
        : [];

      return {
        id: idx.toString(),
        name: rule.Name,
        priority: rule.Priority,
        action,
        generatedLabels,
        dependsOn: [],
        incomingEdges: 0,
      };
    });

    const nodeById = new Map(nodes.map(n => [n.id, n]));
    const links = [];

    // 2) For each rule, recursively extract all needed labels
    for (let i = 0; i < data.length; i++) {
      const rule = data[i];
      const node = nodes[i];

      const neededLabels = extractAllLabelKeys(rule.Statement);
      neededLabels.forEach(labelKey => {
        nodes.forEach(n => {
          if (n.generatedLabels.includes(labelKey)) {
            node.dependsOn.push(n.id);
            links.push({ source: n.id, target: node.id });
            node.incomingEdges += 1;
          }
        });
      });
    }

    // 3) Topological layering (DAG)
    const unassigned = new Set(nodes.map(n => n.id));
    const layers = [];
    let currentLayer = [];

    // Start with zero-incoming-edge nodes
    nodes.forEach(n => {
      if (n.incomingEdges === 0) {
        currentLayer.push(n.id);
      }
    });

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      const nextLayer = [];
      currentLayer.forEach(nid => {
        unassigned.delete(nid);
        // Decrement incomingEdges for children
        links.forEach(l => {
          if (l.source === nid) {
            const child = nodeById.get(l.target);
            child.incomingEdges -= 1;
            if (child.incomingEdges === 0) {
              nextLayer.push(child.id);
            }
          }
        });
      });
      currentLayer = nextLayer;
    }

    // If something remains, it might be a cycle or leftover
    if (unassigned.size > 0) {
      layers.push([...unassigned]);
    }

    // (Optional) Sort each layer by priority
    layers.forEach(layerArr => {
      layerArr.sort((a, b) => nodeById.get(a).priority - nodeById.get(b).priority);
    });

    // 4) Assign x,y based on layers
    const layerSpacing = 300;
    const nodeSpacing = 120;
    const positions = {};

    layers.forEach((layerNodes, layerIndex) => {
      const offsetY = -(layerNodes.length - 1) * (nodeSpacing / 2);
      layerNodes.forEach((nid, i) => {
        positions[nid] = {
          x: 100 + layerIndex * layerSpacing,
          y: 200 + offsetY + i * nodeSpacing
        };
      });
    });

    // 5) Draw the graph
    const width = 1500;
    const height = 1000;
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .call(d3.zoom()
        .scaleExtent([0.5, 2])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
        })
      );

    const g = svg.append('g');

    // Arrow marker
    g.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 12)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#999');

    // Draw links
    const linkSelection = g.selectAll('line.link')
      .data(links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')
      .attr('x1', d => positions[d.source].x)
      .attr('y1', d => positions[d.source].y)
      .attr('x2', d => positions[d.target].x)
      .attr('y2', d => positions[d.target].y);

    // Node color
    const getNodeColor = (d) => {
      if (d.action === 'Block') return '#FF6B6B';   // red
      if (d.action === 'Count') return '#4CAF50';  // green
      if (d.dependsOn.length > 0) return '#FFA500'; // orange if it depends on another rule
      return '#2196F3';                             // blue otherwise
    };

    // Distinguish if it's truly independent or collector
    const isIndependent = (d) =>
      d.dependsOn.length === 0 && d.generatedLabels.length === 0;
    const isCollector = (d) =>
      d.dependsOn.length > 0 && d.generatedLabels.length === 0;

    // Draw nodes
    const nodeSelection = g.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => {
        const pos = positions[d.id];
        return `translate(${pos.x}, ${pos.y})`;
      })
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d);
        highlightImmediateConnections(d);
      });

    nodeSelection.append('rect')
      .attr('width', 220)
      .attr('height', 100)
      .attr('x', -110)
      .attr('y', -50)
      .attr('rx', 10)
      .attr('ry', 10)
      .attr('fill', getNodeColor)
      .attr('stroke', d => {
        if (isIndependent(d)) return '#ccc';
        if (isCollector(d)) return '#fff';
        return '#fff';
      })
      .attr('stroke-width', d => (isCollector(d) ? 4 : 2))
      .style('stroke-dasharray', d => (isIndependent(d) ? '6,3' : 'none'));

    // Show details in text
    nodeSelection.append('text')
      .attr('x', -100)
      .attr('y', -20)
      .attr('fill', 'white')
      .style('font-size', '12px')
      .text(d => `Name: ${d.name}`);

    nodeSelection.append('text')
      .attr('x', -100)
      .attr('y', 0)
      .attr('fill', 'white')
      .style('font-size', '12px')
      .text(d => `Priority: ${d.priority}`);

    nodeSelection.append('text')
      .attr('x', -100)
      .attr('y', 20)
      .attr('fill', 'white')
      .style('font-size', '12px')
      .text(d => `Action: ${d.action}`);

    nodeSelection.append('text')
      .attr('x', -100)
      .attr('y', 40)
      .attr('fill', 'white')
      .style('font-size', '12px')
      .text(d =>
        d.generatedLabels.length > 0
          ? `Labels: ${d.generatedLabels.join(', ')}`
          : 'Labels: none'
      );

    nodeSelection.append('text')
      .attr('x', -100)
      .attr('y', 60)
      .attr('fill', 'white')
      .style('font-size', '12px')
      .text(d => d.dependsOn.length > 0
        ? `Depends On: ${d.dependsOn.join(', ')}`
        : ''
      );

    // Highlight logic
    function resetHighlights() {
      nodeSelection.select('rect')
        .attr('stroke', d => {
          if (isIndependent(d)) return '#ccc';
          if (isCollector(d)) return '#fff';
          return '#fff';
        })
        .attr('stroke-width', d => (isCollector(d) ? 4 : 2))
        .style('stroke-dasharray', d => (isIndependent(d) ? '6,3' : 'none'));

      linkSelection
        .attr('stroke', '#999')
        .attr('stroke-width', 2);
    }

    function highlightImmediateConnections(node) {
      resetHighlights();

      // highlight the clicked node
      nodeSelection.filter(d => d.id === node.id)
        .select('rect')
        .attr('stroke', '#FFD700')
        .attr('stroke-width', 4)
        .style('stroke-dasharray', 'none');

      // find direct neighbors
      const neighbors = new Set();
      links.forEach(l => {
        if (l.source === node.id) {
          neighbors.add(l.target);
        }
        if (l.target === node.id) {
          neighbors.add(l.source);
        }
      });

      // highlight neighbors
      nodeSelection.filter(d => neighbors.has(d.id))
        .select('rect')
        .attr('stroke', '#FFD700')
        .attr('stroke-width', 4)
        .style('stroke-dasharray', 'none');

      // highlight connecting links
      linkSelection.filter(l =>
        l.source === node.id || l.target === node.id
      )
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 4);
    }

    function showFullPath(node) {
      resetHighlights();

      // BFS in both directions
      const visited = new Set();
      const queue = [node.id];

      while (queue.length > 0) {
        const current = queue.shift();
        if (!visited.has(current)) {
          visited.add(current);
          links.forEach(l => {
            if (l.source === current && !visited.has(l.target)) {
              queue.push(l.target);
            }
            if (l.target === current && !visited.has(l.source)) {
              queue.push(l.source);
            }
          });
        }
      }

      nodeSelection.filter(d => visited.has(d.id))
        .select('rect')
        .attr('stroke', '#00FFFF')
        .attr('stroke-width', 4)
        .style('stroke-dasharray', 'none');

      linkSelection.filter(l =>
        visited.has(l.source) && visited.has(l.target)
      )
      .attr('stroke', '#00FFFF')
      .attr('stroke-width', 4);
    }

    // Step-by-step "Track Path" (forward direction)
    function revealNextLayer() {
      if (!selectedNode) return;

      // if none revealed yet, reveal the selected node
      if (revealedNodes.size === 0) {
        const newSet = new Set([selectedNode.id]);
        setRevealedNodes(newSet);
        resetHighlights();
        highlightRevealed(newSet);
        return;
      }

      // otherwise, reveal children of the currently revealed set
      const toReveal = new Set();
      links.forEach(l => {
        if (revealedNodes.has(l.source) && !revealedNodes.has(l.target)) {
          toReveal.add(l.target);
        }
      });

      if (toReveal.size === 0) return; // no more to reveal

      const updated = new Set([...revealedNodes, ...toReveal]);
      setRevealedNodes(updated);
      resetHighlights();
      highlightRevealed(updated);
    }

    function highlightRevealed(idSet) {
      nodeSelection.filter(d => idSet.has(d.id))
        .select('rect')
        .attr('stroke', '#00FFFF')
        .attr('stroke-width', 4)
        .style('stroke-dasharray', 'none');

      linkSelection.filter(l =>
        idSet.has(l.source) && idSet.has(l.target)
      )
      .attr('stroke', '#00FFFF')
      .attr('stroke-width', 4);
    }

    // Expose these for buttons
    window._resetHighlights = () => {
      resetHighlights();
      setSelectedNode(null);
      setRevealedNodes(new Set());
    };
    window._showFullPath = () => {
      if (selectedNode) {
        showFullPath(selectedNode);
      }
    };
    window._trackPathStep = () => {
      revealNextLayer();
    };

  }, [selectedNode, revealedNodes]);

  // Export to PNG
  const exportAsPNG = async () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgElement);

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.src = url;
    img.onload = async () => {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'fixed';
      tempDiv.style.left = '-9999px';
      document.body.appendChild(tempDiv);

      const tempImg = document.createElement('img');
      tempImg.src = url;
      tempDiv.appendChild(tempImg);

      await new Promise(r => setTimeout(r, 100));

      html2canvas(tempDiv, { useCORS: true, scale: 2 })
        .then(canvas => {
          const imgURI = canvas.toDataURL('image/png');
          const link = document.createElement('a');
          link.download = 'waf_rules_tree.png';
          link.href = imgURI;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          document.body.removeChild(tempDiv);
          URL.revokeObjectURL(url);
        });
    };
  };

  // Export to PDF
  const exportAsPDF = async () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current;
    const rect = svgElement.getBoundingClientRect();

    const canvas = await html2canvas(svgElement, {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      scale: 2
    });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [rect.width, rect.height]
    });
    pdf.addImage(imgData, 'PNG', 0, 0, rect.width, rect.height);
    pdf.save('waf_rules_tree.pdf');
  };

  return (
    <div>
      <h2>AWS WAF Full Project</h2>
      <h3>AWS WAF Rules Visual Tree</h3>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => window._resetHighlights()}>
          Reset Highlights
        </button>
        <button onClick={() => window._trackPathStep()}>
          Track Path (Step)
        </button>
        <button onClick={() => window._showFullPath()}>
          Show Full Path
        </button>
        <button onClick={exportAsPNG}>
          Export as PNG
        </button>
        <button onClick={exportAsPDF}>
          Export as PDF
        </button>
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
};

export default WAFRulesTree;
