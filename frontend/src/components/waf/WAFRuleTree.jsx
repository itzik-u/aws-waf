import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Box } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import RuleTransformer from './Refactoring1/RuleTransformer';
import GraphRenderer from './Refactoring1/GraphRenderer';
import TopBar from './Refactoring1/UI components/Topbar';
import RulePopup from './Refactoring1/UI components/RulePopup';
import RulesLoaderPopup from './Refactoring1/UI components/RulesLoaderPopup';
import WarningsPopup from './Refactoring1/UI components/WarningsPopup';
import GraphContainer from './Refactoring1/UI components/GraphContainer';

// קומפוננטת WAFRuleTree - מנהלת את עץ החוקים, הטעינה, הציור והפופ-אפים
export default function WAFRuleTree({ initialRules = null, onRulesChanged = null }) {
  const { darkTheme } = useThemeContext();
  const svgRef = useRef(null);

  const [selectedNode, setSelectedNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [graphData, setGraphData] = useState(null);
  const [rulesData, setRulesData] = useState(initialRules);
  const [aclDetails, setAclDetails] = useState({});

  const [loaderPopupOpen, setLoaderPopupOpen] = useState(!initialRules);
  const [rulePopupOpen, setRulePopupOpen] = useState(false);
  const [warningsPopupOpen, setWarningsPopupOpen] = useState(false);

  // קביעת מימדי הדיאגרמה
  const diagramWidth = 1700;
  const diagramHeight = 500;
  // פונקציה לבניית נתוני הגרף המאוגדים מתוך נתוני החוקים הגולמיים
  const buildGraphData = useCallback(() => {
    if (!rulesData) return null;
    const transformer = new RuleTransformer();
    const aggregatedData = transformer.transformRules(rulesData);

    // סינון לפי מחרוזת החיפוש
    const lower = searchTerm.trim().toLowerCase();
    let filteredNodes = aggregatedData.nodes;
    if (lower) {
      filteredNodes = aggregatedData.nodes.filter(n =>
        n.name.toLowerCase().includes(lower) ||
        n.ruleLabels.join(' ').toLowerCase().includes(lower) ||
        n.ruleState.join(' ').toLowerCase().includes(lower)
      );
      console.log('[WAFRuleTree] Filtered nodes based on search term:', lower, filteredNodes);
    }
    const filteredIds = new Set(filteredNodes.map(n => n.id));
    const filteredLinks = aggregatedData.links.filter(
      link => filteredIds.has(link.source) && filteredIds.has(link.target)
    );

    const finalData = {
      ...aggregatedData,
      nodes: filteredNodes,
      links: filteredLinks
    };
    console.log('[WAFRuleTree] Aggregated graph data:', finalData);
    return finalData;
  }, [rulesData, searchTerm]);

  // פונקציה משותפת לציור הגרף, המכילה את כל הלוגיקה של מדידת צמתים, סידור וציור
  const renderGraph = (aggregatedData) => {
    console.log('[WAFRuleTree] Drawing graph with aggregated data.');
    const graphRenderer = new GraphRenderer(
      svgRef.current,
      darkTheme,
      diagramWidth,
      diagramHeight,
      (node) => handleNodeClick(node)
    );
    graphRenderer.measureNodes(aggregatedData.nodes);
    graphRenderer.applyPriorityZLayout(aggregatedData.nodes);
    // שולחים סט ריק עבור מזהי צמתים עם שגיאות (ניתן לעדכן לפי הצורך)
    graphRenderer.drawGraph(aggregatedData.nodes, aggregatedData.links, new Set());
  };

  // useEffect שמחשב את נתוני הגרף המאוגדים ומצייר את הגרף כאשר נתוני החוקים או מחרוזת החיפוש משתנים
  useEffect(() => {
    if (loaderPopupOpen) return;
    const aggregatedData = buildGraphData();
    if (!aggregatedData) return;
    setGraphData(aggregatedData);
    renderGraph(aggregatedData);
  }, [buildGraphData, loaderPopupOpen, darkTheme]);

  // טיפול בלחיצה על צומת - מעדכן את הצומת הנבחר ומציג את פופ-אפ פרטי החוק
  const handleNodeClick = (node) => {
    setSelectedNode(node);
    setRulePopupOpen(true);
    setWarningsPopupOpen(false);
  };

  // Handle rules changes and notify parent component
  const handleRulesDataChange = useCallback((newRules) => {
    setRulesData(newRules);
    // Notify parent component about the updated rules
    if (onRulesChanged && typeof onRulesChanged === 'function') {
      onRulesChanged(newRules);
    }
  }, [onRulesChanged]);

  // Update rulesData if initialRules changes
  useEffect(() => {
    if (initialRules && initialRules.length > 0) {
      handleRulesDataChange(initialRules);
      setLoaderPopupOpen(false);
    }
  }, [initialRules, handleRulesDataChange]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* מיכל הגרף שבו יוצג ה-SVG */}
      <GraphContainer ref={svgRef} />
      {/* סרגל כלים עליון */}
      <TopBar
        darkTheme={darkTheme}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        setLoaderPopupOpen={setLoaderPopupOpen}
        aclDetails={aclDetails}
        warningCount={graphData ? graphData.globalWarnings.length : 0}
        onFullView={() => {
          const aggregatedData = buildGraphData();
          if (aggregatedData) {
            setGraphData(aggregatedData);
            renderGraph(aggregatedData);
          }
        }}
        onWarnings={() => {
          setWarningsPopupOpen(true);
          setRulePopupOpen(false);
        }}
      />
      {/* פופ-אפ טעינת נתונים */}
      {loaderPopupOpen && (
        <RulesLoaderPopup
          open={loaderPopupOpen}
          onRulesReceived={(data) => {
            const newRules = data.rules || data;
            handleRulesDataChange(newRules);
            setAclDetails({ aclName: data.Name || 'local json', capacity: data.Capacity || 0 });
            setLoaderPopupOpen(false);
          }}
          onClose={() => { setLoaderPopupOpen(false) }}
        />
      )}
      {/* פופ-אפ פרטי חוק */}
      {rulePopupOpen && (
        <RulePopup
          darkTheme={darkTheme}
          selectedNode={graphData.nodes[selectedNode]}
          onClose={() => { setRulePopupOpen(false) }}
        />
      )}
      {/* פופ-אפ אזהרות גלובליות */}
      {warningsPopupOpen && (
        <WarningsPopup
          darkTheme={darkTheme}
          warnings={graphData ? graphData.globalWarnings : []}
          onClose={() => { setWarningsPopupOpen(false) }}
          onSelectNode={handleNodeClick}
        />
      )}
    </Box>
  );
}