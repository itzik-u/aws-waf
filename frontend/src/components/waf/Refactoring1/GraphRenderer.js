import * as d3 from 'd3';

export default class GraphRenderer {
  constructor(svgElement, darkTheme, diagramWidth, diagramHeight, onNodeClick) {
    this.svgElement = svgElement;
    this.darkTheme = darkTheme;
    this.diagramWidth = diagramWidth;
    this.diagramHeight = diagramHeight;
    this.onNodeClick = onNodeClick;
    this.zoomBehavior = null;
    console.log('[GraphRenderer] Initialized with diagram size:', diagramWidth, diagramHeight);
  }

  // Measure nodes and then set the same dimensions for all nodes.
  measureNodes(nodes) {
    console.log('[GraphRenderer] Measuring nodes:', nodes);
    const measureSvg = d3.select('body')
      .append('svg')
      .attr('width', 0)
      .attr('height', 0)
      .style('position', 'absolute')
      .style('left', '-9999px');

    // Create a group for each node to measure its text.
    const groups = measureSvg.selectAll('g.node-measure')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node-measure');

    groups.each(function (node) {
      const group = d3.select(this);
      const lines = [
        `Name: ${node.name}`,
        `Priority: ${node.priority}`,
        `Action: ${node.action}`,
        `WC tokens: 1200/1500`
      ];
      if (node.generatedLabels && node.generatedLabels.length > 0) {
        lines.push(`Labels: ${node.generatedLabels.join(', ')}`);
      }
      if (node.dependsOn && node.dependsOn.length > 0) {
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
      const padX = 20, padY = 20;
      // Store measured dimensions on each node (not used directly for drawing)
      node.measuredWidth = Math.max(bbox.width + padX, 60);
      node.measuredHeight = Math.max(bbox.height + padY, 40);
      console.log(`[GraphRenderer] Measured node "${node.name}" - width: ${node.measuredWidth}, height: ${node.measuredHeight}`);
    });

    // Determine the maximum width and height across all nodes.
    const maxWidth = d3.max(nodes, d => d.measuredWidth);
    const maxHeight = d3.max(nodes, d => d.measuredHeight);
    console.log('[GraphRenderer] Uniform node dimensions:', maxWidth, maxHeight);

    // Assign the same width and height to every node.
    nodes.forEach(node => {
      node.width = maxWidth;
      node.height = maxHeight;
    });

    measureSvg.remove();
  }

  applyPriorityZLayout(nodes) {
    console.log('[GraphRenderer] Applying priority Z layout.');
    nodes.sort((a, b) => a.priority - b.priority);
    let currentX = 100, currentY = 100, direction = 1;
    const stepX = 180, stepY = 80;

    // Track the previous node's level to detect level increases
    let previousLevel = -1;

    nodes.forEach(node => {
      let nextX = currentX + stepX * direction;
      let nextY = currentY + stepY;
      const levelIncreased = previousLevel !== -1 && node.level > previousLevel;
            // Check if node level increased OR boundary conditions are met
      if (/*nextX + node.width > this.diagramWidth - 50 || nextX < 50 ||*/ levelIncreased) {
        direction = -direction;
        nextX = currentX + stepX * direction;
      }

      currentX = nextX;
      currentY = nextY;
      node.x = currentX;
      node.y = currentY;


      // Update previous level for next iteration
      previousLevel = node.level;

      console.log(`[GraphRenderer] Node "${node.name}" positioned at (${node.x}, ${node.y}), level: ${node.level}`);
    });
  }

  // Recursively highlights nodes related to the clicked node.
  highlightRecursively(node, nodeSel, links, errorNodeIdsLocal, allNodes) {
    console.log('[GraphRenderer] Highlighting recursively for node:', node);
    nodeSel.select('rect')
      .attr('stroke', d => errorNodeIdsLocal.has(d.id) ? 'red' : (this.darkTheme ? '#eee' : '#fff'))
      .attr('stroke-width', d => errorNodeIdsLocal.has(d.id) ? 4 : 2);

    const parentMap = new Map();
    const childMap = new Map();
    links.forEach(l => {
      if (!parentMap.has(l.target)) parentMap.set(l.target, []);
      parentMap.get(l.target).push(l.source);
      if (!childMap.has(l.source)) childMap.set(l.source, []);
      childMap.get(l.source).push(l.target);
    });

    const getRelatedIds = (startId, map) => {
      const result = new Set();
      const queue = [startId];
      while (queue.length) {
        const curr = queue.shift();
        (map.get(curr) || []).forEach(neighbor => {
          if (!result.has(neighbor)) {
            result.add(neighbor);
            queue.push(neighbor);
          }
        });
      }
      return result;
    };

    const ancestors = getRelatedIds(node.id, parentMap);
    const descendants = getRelatedIds(node.id, childMap);
    const highlightIds = new Set([node.id, ...ancestors, ...descendants]);

    nodeSel.filter(d => highlightIds.has(d.id))
      .select('rect')
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 4);
    console.log('[GraphRenderer] Highlight applied for node ids:', [...highlightIds]);
  }

  // Main function to draw the graph.
  drawGraph(nodes, links, errorNodeIdsLocal) {
    console.log('[GraphRenderer] Drawing graph with', nodes.length, 'nodes and', links.length, 'links.');
    const svg = d3.select(this.svgElement);
    svg.selectAll('*').remove();
    svg.attr('width', this.diagramWidth)
      .attr('height', this.diagramHeight)
      .style('border', '1px solid #ddd')
      .style('background-color', this.darkTheme ? '#222' : '#f5f5f5');

    this._createMarker(svg);
    const gContainer = svg.append('g');
    this.zoomBehavior = d3.zoom()
      .scaleExtent([0.1, 2])
      .on('zoom', e => gContainer.attr('transform', e.transform));
    svg.call(this.zoomBehavior);

    this._drawEdges(gContainer, nodes, links);
    this._drawNodes(gContainer, nodes, links, errorNodeIdsLocal);
    console.log('[GraphRenderer] Graph drawn.');
  }

  // Helper to create arrow markers.
  _createMarker(svg) {
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 12)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', this.darkTheme ? '#bbb' : '#999');
  }

  // Helper to draw edges.
  _drawEdges(gContainer, nodes, links) {
    const edgesLayer = gContainer.append('g').attr('class', 'edges-layer');
    edgesLayer.selectAll('path.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('fill', 'none')
      .attr('stroke', this.darkTheme ? '#bbb' : '#999')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')
      .attr('d', d => {
        const src = nodes.find(n => n.id === d.source);
        const tgt = nodes.find(n => n.id === d.target);
        if (!src || !tgt) return '';
        const sx = src.x + src.width / 2,
          sy = src.y + src.height / 2,
          tx = tgt.x + tgt.width / 2,
          ty = tgt.y + tgt.height / 2;
        return d3.line()([[sx, sy], [tx, ty]]);
      });
  }

  // Helper to draw nodes.
  _drawNodes(gContainer, nodes, links, errorNodeIdsLocal) {
    const nodesLayer = gContainer.append('g').attr('class', 'nodes-layer');
    const nodeSel = nodesLayer.selectAll('g.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .on('click', (evt, d) => {
        evt.stopPropagation();
        this.highlightRecursively(d, nodeSel, links, errorNodeIdsLocal, nodes);
        if (this.onNodeClick) this.onNodeClick(d.id);
      });
    nodeSel.append('rect')
      .attr('width', d => d.width)
      .attr('height', d => d.height)
      .attr('fill', d => this.getNodeColor(d))
      .attr('stroke', d => errorNodeIdsLocal.has(d.id) ? 'red' : (this.darkTheme ? '#eee' : '#fff'))
      .attr('stroke-width', d => errorNodeIdsLocal.has(d.id) ? 4 : 2)
      .attr('rx', 10)
      .attr('ry', 10);

    // Helper: adding text lines to each node.
    const appendTextLine = (group, x, y, text) => {
      group.append('text')
        .attr('x', x)
        .attr('y', y)
        .style('font-size', '12px')
        .attr('fill', '#fff')
        .text(text);
    };

    nodeSel.each(function (d) {
      const group = d3.select(this);
      let nextY = 16, marginX = 10;
      appendTextLine(group, marginX, nextY, `Name: ${d.name}`);
      nextY += 16;
      appendTextLine(group, marginX, nextY, `Priority: ${d.priority}`);
      nextY += 16;
      appendTextLine(group, marginX, nextY, `Action: ${d.action}`);
      nextY += 16;
      if (d.generatedLabels && d.generatedLabels.length > 0) {
        appendTextLine(group, marginX, nextY, `Labels: ${d.generatedLabels.join(', ')}`);
        nextY += 16;
      }
      if (d.dependsOn && d.dependsOn.length > 0) {
        appendTextLine(group, marginX, nextY, `Depends On: ${d.dependsOn.join(', ')}`);
        nextY += 16;
      }
    });
  }

  getNodeColor(d) {
    if (d.action === 'Block') return '#8B0000';
    if (d.action === 'Count') return '#1060A5';
    if (d.dependsOn && d.dependsOn.length > 0) return '#8B7500';
    return '#2F4F4F';
  }
}