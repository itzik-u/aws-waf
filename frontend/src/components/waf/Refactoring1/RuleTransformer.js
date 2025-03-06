/* RuleTransformer: encapsulates rule transformation logic */
export default class RuleTransformer {
  constructor() {
    this.level = 0;
    this.warnings = [];
    this.links = [];
  }

  transformRules(rulesArray) {

    const sortedRules = [...rulesArray].sort((a, b) => a.Priority - b.Priority);
    const newRules = [];

    sortedRules.forEach((rule, index) => {
      this.warnings = [];
      this.validateRule(rule);
      const labelState = this.labelStatement(rule.Statement, newRules, index);
      const labelScopeDown = rule.Statement?.RateBasedStatement?.ScopeDownStatement ?
        this.labelStatement(rule.Statement.RateBasedStatement.ScopeDownStatement, newRules, index) : [];

      const transformedRule = {
        json: JSON.stringify(rule, null, 2),
        id: index,
        name: rule.Name,
        priority: rule.Priority,
        action: Object.keys(rule.Action)[0],
        ruleLabels: rule.RuleLabels?.map(label => label.Name) || [],
        insertHeaders: rule.Action.Count?.CustomRequestHandling?.InsertHeaders?.map(h => { return { name: h.Name, value: h.Value } }) || [],
        labelState: [...labelState, ...labelScopeDown],
        level: 0,
        warnings: [...this.warnings]
      };

      newRules.push(transformedRule);
    });

    this.calculateLevels(newRules);

    return {
      nodes: newRules,
      links: this.links,
      globalWarnings: this.collectWarnings(newRules)
    };
  }

  calculateLevels(rules) {
    const processed = new Set();

    const dependencyMap = new Map();
    this.links.forEach(link => {
      const sourceId = link.source;
      const targetId = link.target;

      if (!dependencyMap.has(sourceId)) {
        dependencyMap.set(sourceId, []);
      }
      dependencyMap.get(sourceId).push(targetId);
    });

    const calculateRuleLevel = (ruleId) => {
      if (processed.has(ruleId)) return;

      processed.add(ruleId);

      if (!dependencyMap.has(ruleId)) return;

      const dependencies = dependencyMap.get(ruleId);

      dependencies.forEach(depId => {
        if (!processed.has(depId)) {
          calculateRuleLevel(depId);
        }
      });

      const maxDepLevel = Math.max(...dependencies.map(depId => {
        const depRule = rules.find(r => r.id === depId);
        return depRule ? depRule.level : -1;
      }));

      const rule = rules.find(r => r.id === ruleId);
      if (rule) {
        rule.level = maxDepLevel + 1;
      }
    };

    rules.forEach(rule => {
      calculateRuleLevel(rule.id);
    });

    console.log("[RuleTransformer] Calculated levels based on dependency hierarchy");
  }

  validateRule(rule) {
    ['Name', 'Priority', 'Statement', 'Action'].forEach(key => {
      if (rule[key] === undefined) {
        this.warnings.push(`Missing required field: ${key}`);
      }
    });

    if (rule.Name !== rule.VisibilityConfig.MetricName) {
      this.warnings.push(`Name and MetricName do not match`);
    }
  }

  labelStatement(statement, rules, currentIndex) {
    if (!statement) return [];

    if (statement.LabelMatchStatement) {
      return [{
        name: statement.LabelMatchStatement.Key,
        id: this.findParentDependencies(rules, statement.LabelMatchStatement.Key, currentIndex)
      }];
    }

    if (statement.NotStatement?.Statement.LabelMatchStatement) {
      return [{
        logic: 'NOT',
        depend: [{
          name: statement.NotStatement.Statement.LabelMatchStatement.Key,
          id: this.findParentDependencies(rules, statement.NotStatement.Statement.LabelMatchStatement.Key, currentIndex)
        }]
      }];
    }

    const processStatements = (statements, logic) => {
      const labels = statements
        .flatMap(stmt => this.labelStatement(stmt, rules, currentIndex))
        .filter(Boolean);
      return labels.length > 0 ? [{ logic, depend: labels }] : [];
    };

    if (statement.AndStatement) return processStatements(statement.AndStatement.Statements, 'AND');

    if (statement.OrStatement) return processStatements(statement.OrStatement.Statements, 'OR');

    return [];
  }

  findParentDependencies(rules, name, currentIndex) {
    const matchingRules = rules.filter(r => r.ruleLabels?.includes(name));

    if (matchingRules.length === 0) {
      if (!rules.some(r => r.RuleLabels?.some(l => l.Name === name))) {
        this.warnings.push(`Label '${name}' is not defined in any rule`);
      } else {
        this.warnings.push(`Label '${name}' is not defined in any rule with lower priority`);
      }
      return [];
    }

    return matchingRules.map(rule => {
      if (['ALLOW', 'BLOCK'].includes(rule.action)) {
        this.warnings.push(`Label '${name}' is created in a terminal rule (${rule.action}) - this may affect rule evaluation`);
      }
      this.links.push({ source: currentIndex, target: rule.id });
      return rule.name;
    });
  }

  collectWarnings(rules) {
    return rules
      .filter(rule => rule.warnings.length > 0)
      .map(rule => ({ id: rule.id, rule: rule.name, warnings: rule.warnings }));
  }
}