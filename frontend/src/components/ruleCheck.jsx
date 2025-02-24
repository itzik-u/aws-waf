import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Elk from 'elkjs/lib/elk.bundled.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// --- MUI imports for layout & styling ---
import { Box, Stack, Typography, Button } from '@mui/material';

import appsflyerRules from '../data/appsflyerRules.json';

/**
 * Recursively extracts label keys from nested statements
 * (AndStatement, OrStatement, NotStatement, RateBasedStatement, etc.).
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

/**
 * Use ELK to compute a top-to-bottom layered layout with polyline edges.
 */
async function layoutWithElk(nodes, links) {
  const elk = new Elk();
  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.edgeRouting': 'POLYLINE',
      'elk.spacing.nodeNode': '50',
      'elk.spacing.nodeEdge': '30'
    },
    children: nodes.map(n => ({
      id: n.id,
      width: n.width,
      height: n.height
    })),
    edges: links.map((e, i) => ({
      id: `edge${i}`,
      sources: [e.source],
      targets: [e.target]
    }))
  };

  try {
    return await elk.layout(graph);
  } catch (err) {
    console.error('ELK error:', err);
    // fallback layout
    return {
      children: nodes.map((n, i) => ({
        id: n.id,
        x: (i % 4) * 300,
        y: Math.floor(i / 4) * 200,
        width: n.width,
        height: n.height
      }))
    };
  }
}

const WAFRuleTree = () => {
  const svgRef = useRef(null);

  // Node panel + theme toggle
  const [selectedNode, setSelectedNode] = useState(null);
  const [darkTheme, setDarkTheme] = useState(false);

  useEffect(() => {
    const data = appsflyerRules.LibRules || [];
    console.log('Loaded appsflyer rules:', data);

    // 1) Build nodes
    const nodes = data.map((rule, idx) => {
      let action = 'None';
      if (rule.Action) {
        const actionKey = Object.keys(rule.Action)[0];
        action = actionKey;
      }

      let generatedLabels = [];
      if (rule.RuleLabels && Array.isArray(rule.RuleLabels)) {
        generatedLabels = rule.RuleLabels.map(l => l.Name);
      }

      return {
        id: idx.toString(),
        name: rule.Name,
        priority: rule.Priority,
        action,
        generatedLabels,
        dependsOn: [],
        rawRule: rule,
        width: 0,
        height: 0
      };
    });

    // 2) Build links by matching label references
    const links = [];
    nodes.forEach(node => {
      const neededLabels = extractAllLabelKeys(node.rawRule.Statement);
      neededLabels.forEach(labelKey => {
        nodes.forEach(n => {
          if (n.id !== node.id && n.generatedLabels.includes(labelKey)) {
            node.dependsOn.push(n.id);
            links.push({ source: n.id, target: node.id });
          }
        });
      });
    });

    // 3) Measure each node's text to set width/height
    measureNodes(nodes);

    // 4) ELK layout
    (async () => {
      const layoutGraph = await layoutWithElk(nodes, links);
      layoutGraph.children?.forEach(child => {
        const nd = nodes.find(n => n.id === child.id);
        if (nd && child.x != null && child.y != null) {
          nd.x = child.x;
          nd.y = child.y;
        }
      });
      layoutGraph.edges?.forEach((e, i) => {
        const link = links[i];
        link.points = [];
        e.sections?.forEach(section => {
          link.points.push(section.startPoint);
          if (section.bendPoints) {
            link.points.push(...section.bendPoints);
          }
          link.points.push(section.endPoint);
        });
      });

      drawGraph(nodes, links);
    })();

    // eslint-disable-next-line
  }, [darkTheme]);

  // measure each node
  function measureNodes(nodes) {
    const measureSvg = d3.select('body')
      .append('svg')
      .attr('width', 0)
      .attr('height', 0)
      .style('position', 'absolute')
      .style('left', '-9999px');

    nodes.forEach(node => {
      const group = measureSvg.append('g');
      let lines = [];
      lines.push(`Name: ${node.name}`);
      lines.push(`Priority: ${node.priority}`);
      lines.push(`Action: ${node.action}`);
      if (node.generatedLabels.length > 0) {
        lines.push(`Labels: ${node.generatedLabels.join(', ')}`);
      }
      if (node.dependsOn.length > 0) {
        lines.push(`Depends On: ${node.dependsOn.join(', ')}`);
      }

      let yPos = 0;
      lines.forEach(textLine => {
        group.append('text')
          .attr('x', 0)
          .attr('y', yPos)
          .style('font-size', '12px')
          .text(textLine);
        yPos += 16;
      });

      const bbox = group.node().getBBox();
      const padX = 20;
      const padY = 20;
      node.width = Math.max(bbox.width + padX, 60);
      node.height = Math.max(bbox.height + padY, 40);

      group.remove();
    });

    measureSvg.remove();
  }

  function drawGraph(nodes, links) {
    const width = 1200;
    const height = 1200;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 2])
      .on('zoom', (event) => {
        gContainer.attr('transform', event.transform);
      });
    svg.call(zoomBehavior);

    const gContainer = svg.append('g');

    // edges behind, nodes on top
    const edgesLayer = gContainer.append('g').attr('class', 'edges-layer');
    const nodesLayer = gContainer.append('g').attr('class', 'nodes-layer');

    edgesLayer.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 12)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', darkTheme ? '#bbb' : '#999');

    const linkSel = edgesLayer.selectAll('path.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', darkTheme ? '#bbb' : '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')
      .attr('d', d => {
        if (!d.points) {
          // fallback
          const sx = nodes.find(n => n.id === d.source)?.x || 0;
          const sy = nodes.find(n => n.id === d.source)?.y || 0;
          const tx = nodes.find(n => n.id === d.target)?.x || 0;
          const ty = nodes.find(n => n.id === d.target)?.y || 0;
          return d3.line()([[sx, sy], [tx, ty]]);
        }
        const lineGen = d3.line()
          .x(p => p.x)
          .y(p => p.y)
          .curve(d3.curveLinear);
        return lineGen(d.points);
      });

    // Node color logic
    function getNodeColor(d) {
      // "formal" palette
      if (d.action === 'Block') return '#8B0000';   // dark red
      if (d.action === 'Count') return '#006400';   // dark green
      if (d.dependsOn.length > 0) return '#8B7500'; // dark goldenrod
      return '#2F4F4F';                              // dark slate gray
    }

    function highlightParentsAndChildren(node) {
      nodeSel.select('rect')
        .attr('stroke', darkTheme ? '#eee' : '#fff')
        .attr('stroke-width', 2);

      linkSel
        .attr('stroke', darkTheme ? '#bbb' : '#999')
        .attr('stroke-width', 2);

      // highlight the clicked node
      nodeSel.filter(d => d.id === node.id)
        .select('rect')
        .attr('stroke', '#FFD700')
        .attr('stroke-width', 4);

      const parents = new Set();
      const children = new Set();
      links.forEach(l => {
        if (l.target === node.id) parents.add(l.source);
        if (l.source === node.id) children.add(l.target);
      });

      nodeSel.filter(d => parents.has(d.id) || children.has(d.id))
        .select('rect')
        .attr('stroke', '#FFD700')
        .attr('stroke-width', 4);

      linkSel.filter(l =>
        (l.target === node.id && parents.has(l.source)) ||
        (l.source === node.id && children.has(l.target))
      )
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 4);
    }

    const nodeSel = nodesLayer.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .on('click', (event, d) => {
        event.stopPropagation();
        highlightParentsAndChildren(d);
        setSelectedNode(d);
      });

    nodeSel.append('rect')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('fill', getNodeColor)
      .attr('stroke', darkTheme ? '#eee' : '#fff')
      .attr('stroke-width', 2)
      .attr('rx', 10)
      .attr('ry', 10);

    // Add text lines
    nodeSel.each(function(d) {
      const group = d3.select(this);
      let lines = [];
      lines.push(`Name: ${d.name}`);
      lines.push(`Priority: ${d.priority}`);
      lines.push(`Action: ${d.action}`);
      if (d.generatedLabels.length > 0) {
        lines.push(`Labels: ${d.generatedLabels.join(', ')}`);
      }
      if (d.dependsOn.length > 0) {
        lines.push(`Depends On: ${d.dependsOn.join(', ')}`);
      }

      const marginX = 10;
      let nextY = 16;
      lines.forEach(textLine => {
        group.append('text')
          .attr('x', marginX)
          .attr('y', nextY)
          .attr('fill', '#fff')
          .style('font-size', '12px')
          .text(textLine);
        nextY += 16;
      });
    });

    // Auto-zoom
    setTimeout(() => {
      const bounds = gContainer.node().getBBox();
      const fullWidth = bounds.width;
      const fullHeight = bounds.height;
      const midX = bounds.x + fullWidth / 2;
      const midY = bounds.y + fullHeight / 2;
    
      const scale = Math.min(
        width / (fullWidth * 1.2),
        height / (fullHeight * 1.2),
        2
      );
      const translate = [
        width / 2 - scale * midX,
        height /3 - scale * midY
      ];

      svg.transition()
        .duration(750)
        .call(
          zoomBehavior.transform,
          d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
        );
    }, 0);
  }

  // Toggle theme
  function toggleTheme() {
    setDarkTheme(!darkTheme);
  }

  // Close panel
  function closePanel() {
    setSelectedNode(null);
  }

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
          link.download = 'appsflyer_rules_tree_elk.png';
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
    const rect = svgRef.current.getBoundingClientRect();

    const canvas = await html2canvas(svgRef.current, {
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
    pdf.save('appsflyer_rules_tree_elk.pdf');
  };

  return (
    <Box
      sx={{
        position: 'relative',
        minHeight: '100vh',
        backgroundColor: darkTheme ? '#121212' : '#ffffff',
        color: darkTheme ? '#eeeeee' : '#000000',
        transition: 'background-color 0.3s ease, color 0.3s ease',
        pb: 4,
        px: 2,
        pt: 2
      }}
    >
      <Typography variant="h5" gutterBottom>
        Appsflyer Full Project (ELK Layout)
      </Typography>
      <Typography variant="subtitle1" gutterBottom sx={{ mb: 2 }}>
        Dark Theme Toggle + Exports
      </Typography>

      {/* Button bar, centered */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} justifyContent="center">
        <Button variant="contained" onClick={toggleTheme}>
          {darkTheme ? 'Light Theme' : 'Dark Theme'}
        </Button>
        <Button variant="outlined" onClick={exportAsPNG}>
          Export as PNG
        </Button>
        <Button variant="outlined" onClick={exportAsPDF}>
          Export as PDF
        </Button>
      </Stack>

      {/* Side panel for details */}
      {selectedNode && (
        <Box
          sx={{
            position: 'absolute',
            right: '10px',
            top: '120px',
            width: '300px',
            maxHeight: '70vh',
            overflowY: 'auto',
            backgroundColor: darkTheme ? '#333' : '#f9f9f9',
            color: darkTheme ? '#eee' : '#000',
            border: '1px solid #ccc',
            borderRadius: 2,
            p: 2,
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            zIndex: 999
          }}
        >
          <Button
            onClick={closePanel}
            sx={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '16px',
              cursor: 'pointer',
              float: 'right',
              color: darkTheme ? '#fff' : '#000'
            }}
          >
            X
          </Button>
          <Typography variant="h6" gutterBottom>
            Rule Full Details
          </Typography>
          <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
            {JSON.stringify(selectedNode.rawRule, null, 2)}
          </Box>
        </Box>
      )}

      {/* The SVG for D3 rendering */}
      <svg ref={svgRef} />
    </Box>
  );
};

export default WAFRuleTree;
