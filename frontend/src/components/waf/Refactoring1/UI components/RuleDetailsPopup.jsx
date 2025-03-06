import React from 'react';
import './RuleDetailsPopup.css';

const RuleDetailsPopup = ({ rule, darkTheme }) => {
  
  const RenderDependentLabel = ({ depend, logic }) => {
    if (!depend) return null;

    return depend.map((item, index) => {
      if (item.logic) {
        // Handle nested logic (NOT, AND, OR)
        return (
          <div key={index} className="logic-group">
            <span className="logic-operator">{item.logic}</span>
            <div className="nested-labels">
              <RenderDependentLabel depend={item.depend} />
            </div>
          </div>
        );
      } else {
        // Handle simple label
        return (
          <span key={item.name} className="label-chip dependent">
            {item.name}
            {item.id.length > 0 && (
              <small className="rule-reference">
                → {item.id.join(', ')}
              </small>
            )}
          </span>
        );
      }
    });
  };
  return (
    <div className="rule-popup-content" style={{ backgroundColor: darkTheme ? '#333' : '#fff', color: darkTheme ? '#fff' : '#333' }}>
      <div className="rule-header">
        <h2>{rule.name}</h2>
        <span className="priority-badge priority-red">
          Priority: {rule.priority}
        </span>
      </div>

      <div className="rule-action">
        <span className={`action-badge ${rule.action.toLowerCase()}`}>
          {rule.action || 'No Action'}
        </span>
      </div>

      {rule.warnings.length > 0 && (
        <section className="info-section">
          <h3>⚠️ Rule Warnings</h3>
          <div className="warnings-container">
            <ul>
              {rule.warnings.map((issue, idx) => (
                <li key={idx} className="warning-item">
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <div className="rule-sections">
        <section className="info-section" style={{ backgroundColor: darkTheme ? '#333' : '#fff' }}>
          <h3>🏷️ Added Labels</h3>
          <div className="labels-container">
            {rule.ruleLabels.length > 0 ? (
              rule.ruleLabels.map(label => (
                <span key={label} className="label-chip added">{label}</span>
              ))
            ) : (
              <p className="no-data">No labels added by this rule</p>
            )}
          </div>
        </section>

        <section className="info-section" style={{ backgroundColor: darkTheme ? '#333' : '#fff' }}>
          <h3>🔗 Dependent Labels</h3>
          <div className="labels-container">
            {rule.labelState.length > 0 ? (
              rule.labelState.map((state, index) => (
                <div key={index} className="logic-container">
                  {state.logic && <span className="main-logic">{state.logic}</span>}
                  <RenderDependentLabel depend={state.depend} />
                </div>
              ))
            ) : (
              <p className="no-data">No label dependencies</p>
            )}
          </div>
        </section>

        <section className="info-section" style={{ backgroundColor: darkTheme ? '#333' : '#fff' }}>
          <h3>📜 Insert Headers </h3>
          <div className="headers-container">
            {rule.insertHeaders.length > 0 ? (
              rule.insertHeaders.map(header => (
                <span key={header.name} className="header-chip">{header.name}={header.value}</span>
              ))
            ) : (
              <p className="no-data">No headers used in this rule</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default RuleDetailsPopup;