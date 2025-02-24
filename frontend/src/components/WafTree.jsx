import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import wafRules from '../data/appsflyerRules.json';

/**
 * Recursively find all label keys from nested WAF statements.
 */
function extractAllLabelKeys(statement) {
  if (!statement) return [];
  let results = [];

  if (statement.LabelMatchStatement && statement.LabelMatchStatement.Key) {
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
    results = results.concat(
      extractAllLabelKeys(statement.RateBasedStatement.ScopeDownStatement)
    );
  }

  return results;
}

export default function WafRulesFlow() {
  const svgRef = useRef(null);
  const [selectedNode, setSelectedNode] = useState(null);

  useEffect(() => {
    const data = wafRules.rules || [];

    // Build basic nodes
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

    // Extract needed labels
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

    // Topological layering
    const unassigned = new Set(nodes.map(n => n.id));
    const layers = [];
    let currentLayer = [];

    // Start with zero-incoming-edge
    nodes.forEach(n => {
      if (n.incomingEdges === 0) currentLayer.push(n.id);
    });

    while (currentLayer.length > 0) {
      layers.push(currentLayer);
      const nextLayer = [];
      currentLayer.forEach(nid => {
        unassigned.delete(nid);
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

    if (unassigned.size > 0) {
      layers.push([...unassigned]);
    }

    // Sort each layer by priority
    layers.forEach(layerArr => {
      layerArr.sort((a, b) => nodeById.get(a).priority - nodeById.get(b).priority);
    });

    // Assign x,y
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

    // Draw
    const width = 1600;
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

    // Links
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
      if (d.action === 'Block') return '#FF6B6B';
      if (d.action === 'Count') return '#4CAF50';
      if (d.dependsOn.length > 0) return '#FFA500';
      return '#2196F3';
    };

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
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

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
      .text(d =>
        d.dependsOn.length > 0
          ? `Depends On: ${d.dependsOn.join(', ')}`
          : ''
      );

    function resetHighlights() {
      nodeSelection.select('rect')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2);

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
        .attr('stroke-width', 4);

      // find direct neighbors
      const neighbors = new Set();
      links.forEach(l => {
        if (l.source === node.id) neighbors.add(l.target);
        if (l.target === node.id) neighbors.add(l.source);
      });

      // highlight neighbors
      nodeSelection.filter(d => neighbors.has(d.id))
        .select('rect')
        .attr('stroke', '#FFD700')
        .attr('stroke-width', 4);

      // highlight connecting links
      linkSelection.filter(l =>
        l.source === node.id || l.target === node.id
      )
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 4);
    }
  }, []);

  // Export as PNG
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
          link.download = 'waf_rules_flow.png';
          link.href = imgURI;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          document.body.removeChild(tempDiv);
          URL.revokeObjectURL(url);
        });
    };
  };

  // Export as PDF
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
    pdf.save('waf_rules_flow.pdf');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>AWS WAF Flow</h2>
      <h3>Layered DAG + Basic Topological Layout</h3>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={exportAsPNG}>Export as PNG</button>
        <button onClick={exportAsPDF}>Export as PDF</button>
      </div>
      <svg ref={svgRef}></svg>
    </div>
  );
}
