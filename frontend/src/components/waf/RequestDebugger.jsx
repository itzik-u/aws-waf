import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    FormControl,
    FormLabel,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Typography,
    Stack,
    Divider,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Paper,
    Grid,
    Switch,
    IconButton,
    FormControlLabel,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Snackbar,
    Alert,
    Chip,
    Fab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import BugReportIcon from '@mui/icons-material/BugReport';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import SecurityIcon from '@mui/icons-material/Security';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

/**
 * RequestDebugger component for testing AWS WAF rules.
 * This component allows users to:
 * 1. Construct HTTP requests with custom headers, paths, and query parameters
 * 2. Send test requests to an endpoint
 * 3. See which WAF rules would be triggered by the request
 * 4. View detailed information about rule matches
 */
const RequestDebugger = ({ rules = [] }) => {
    const [loading, setLoading] = useState(false);
    const [testResults, setTestResults] = useState(null);
    const [stepMode, setStepMode] = useState(false);
    const [currentRuleIndex, setCurrentRuleIndex] = useState(0);
    const [ruleHistory, setRuleHistory] = useState([]);
    const [triggeredLabels, setTriggeredLabels] = useState(new Set());
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [currentRequestState, setCurrentRequestState] = useState(null);

    // Request configuration state
    const [requestConfig, setRequestConfig] = useState({
        method: 'GET',
        path: '/',
        queryParams: '',
        headers: [{ name: 'User-Agent', value: 'Mozilla/5.0' }],
        body: ''
    });

    // Add useEffect to log when rules are updated
    useEffect(() => {
        console.log('[RequestDebugger] Rules updated:', rules);
    }, [rules]);

    // Add safe access to rules with fallback
    const safeRules = Array.isArray(rules) ? rules : [];

    // Reset rule evaluation state
    const resetRuleEvaluation = () => {
        setCurrentRuleIndex(0);
        setRuleHistory([]);
        setTriggeredLabels(new Set());
        setCurrentRequestState(null);
    };

    // Add a header field
    const addHeader = () => {
        setRequestConfig({
            ...requestConfig,
            headers: [...requestConfig.headers, { name: '', value: '' }]
        });
    };

    // Remove a header field
    const removeHeader = (index) => {
        const newHeaders = [...requestConfig.headers];
        newHeaders.splice(index, 1);
        setRequestConfig({
            ...requestConfig,
            headers: newHeaders
        });
    };

    // Update header field
    const updateHeader = (index, field, value) => {
        const newHeaders = [...requestConfig.headers];
        newHeaders[index][field] = value;
        setRequestConfig({
            ...requestConfig,
            headers: newHeaders
        });
    };

    // Handle form field changes
    const handleChange = (field, value) => {
        setRequestConfig({
            ...requestConfig,
            [field]: value
        });
    };

    // Display a snackbar message
    const showMessage = (message, severity = 'info') => {
        setSnackbar({
            open: true,
            message,
            severity
        });
    };

    // Close snackbar
    const handleCloseSnackbar = () => {
        setSnackbar({
            ...snackbar,
            open: false
        });
    };

    // Simulate sending the request and evaluating against WAF rules
    const testRequest = async () => {
        setLoading(true);

        try {
            // Convert our request config to a format that matches the AWS WAF evaluation format
            const testRequest = {
                uri: requestConfig.path,
                method: requestConfig.method,
                headers: requestConfig.headers.reduce((obj, header) => {
                    if (header.name && header.value) {
                        obj[header.name.toLowerCase()] = [{ value: header.value }];
                    }
                    return obj;
                }, {}),
                queryString: requestConfig.queryParams || '',
                body: requestConfig.body || ''
            };

            if (stepMode) {
                // Reset the rule evaluation state
                resetRuleEvaluation();

                // Initialize the request state to track modifications
                const initialRequestState = {
                    ...testRequest,
                    addedLabels: [],
                    addedHeaders: [],
                    actions: []
                };
                setCurrentRequestState(initialRequestState);

                // Start with the first rule
                const firstRule = safeRules[0];
                if (firstRule) {
                    try {
                        const initialLabels = new Set();
                        const result = simulateRuleEvaluation(testRequest, firstRule, initialLabels);
                        setRuleHistory([{
                            rule: firstRule,
                            result: result,
                            index: 0
                        }]);

                        // Update the request state with any changes from the first rule match
                        if (result && result.matched) {
                            const updatedRequest = updateRequestState(initialRequestState, result, firstRule);
                            setCurrentRequestState(updatedRequest);

                            // Add labels if the rule matched and has labels
                            if (firstRule.RuleLabels && Array.isArray(firstRule.RuleLabels)) {
                                const newLabels = new Set();
                                firstRule.RuleLabels.forEach(label => {
                                    if (label && label.Name) {
                                        newLabels.add(label.Name);
                                    }
                                });
                                setTriggeredLabels(newLabels);
                            }
                        }

                        setCurrentRuleIndex(0);
                    } catch (error) {
                        console.error('Error evaluating first rule:', error);
                        showMessage('Error in step-by-step evaluation: ' + error.message, 'error');
                    }
                } else {
                    showMessage('No rules to evaluate', 'warning');
                }

                showMessage('Step-by-step mode started. Rules will be evaluated one by one.');
            } else {
                // Full mode - evaluate all rules at once
                const { matchedRules, labelsGenerated } = evaluateRulesAgainstRequest(testRequest, safeRules);

                setTestResults({
                    request: testRequest,
                    matchedRules: matchedRules,
                    labelsGenerated: Array.from(labelsGenerated),
                    timestamp: new Date().toISOString()
                });

                showMessage(`Request evaluated. Found ${matchedRules.length} rule matches.`,
                    matchedRules.length > 0 ? 'warning' : 'success');
            }
        } catch (error) {
            console.error('Error testing request:', error);
            showMessage('Failed to evaluate request against rules', 'error');
        } finally {
            setLoading(false);
        }
    };

    // Evaluate rules against a request (client-side simulation)
    const evaluateRulesAgainstRequest = (request, rulesArray) => {
        if (!rulesArray || !Array.isArray(rulesArray) || rulesArray.length === 0) {
            console.warn('[RequestDebugger] No rules to evaluate');
            return { matchedRules: [], labelsGenerated: [] };
        }

        const matchedRules = [];
        const labelsGenerated = new Set();

        // Go through each rule and check if it matches
        rulesArray.forEach(rule => {
            const matchResult = simulateRuleEvaluation(request, rule, new Set());
            if (matchResult.matched) {
                matchedRules.push({
                    rule: rule,
                    result: matchResult
                });
                if (matchResult.labelsGenerated) {
                    matchResult.labelsGenerated.forEach(label => labelsGenerated.add(label));
                }
            }
        });

        return { matchedRules, labelsGenerated };
    };

    // Simulate rule evaluation against a request
    const simulateRuleEvaluation = (request, rule, existingLabels) => {
        if (!rule) {
            console.warn('[RequestDebugger] No rule provided for evaluation');
            return { isMatch: false, labelsGenerated: [], ruleName: 'Unknown' };
        }

        let matched = false;
        let matchDetails = {};
        let actions = [];
        // Initialize labelsGenerated as a Set to collect labels
        const labelsGenerated = new Set();

        // Simple simulation for demonstration purposes
        try {
            if (rule.Statement) {
                // Handle ByteMatchStatement
                if (rule.Statement.ByteMatchStatement) {
                    const byteMatch = rule.Statement.ByteMatchStatement;
                    const matchValue = byteMatch.SearchString;

                    if (byteMatch.FieldToMatch.UriPath && request.uri) {
                        matched = checkStringMatch(
                            request.uri,
                            matchValue,
                            byteMatch.PositionalConstraint
                        );

                        if (matched) {
                            matchDetails = {
                                field: 'UriPath',
                                value: request.uri,
                                constraint: byteMatch.PositionalConstraint,
                                matchValue
                            };
                        }
                    }

                    // Handle AllQueryArguments field type
                    if (!matched && byteMatch.FieldToMatch.AllQueryArguments && request.queryString) {
                        // For AllQueryArguments, we check if any query parameter value contains the search string
                        const queryParams = parseQueryString(request.queryString);

                        // Check each parameter value
                        for (const paramName in queryParams) {
                            const paramValue = queryParams[paramName];

                            if (checkStringMatch(paramValue, matchValue, byteMatch.PositionalConstraint)) {
                                matched = true;
                                matchDetails = {
                                    field: `AllQueryArguments:${paramName}`,
                                    value: paramValue,
                                    constraint: byteMatch.PositionalConstraint,
                                    matchValue
                                };
                                break;
                            }
                        }
                    }

                    if (!matched && byteMatch.FieldToMatch.SingleQueryArgument && request.queryString) {
                        const paramName = byteMatch.FieldToMatch.SingleQueryArgument.Name;
                        const paramValue = getQueryParameterValue(request.queryString, paramName);

                        if (paramValue) {
                            matched = checkStringMatch(
                                paramValue,
                                matchValue,
                                byteMatch.PositionalConstraint
                            );

                            if (matched) {
                                matchDetails = {
                                    field: `QueryParam:${paramName}`,
                                    value: paramValue,
                                    constraint: byteMatch.PositionalConstraint,
                                    matchValue
                                };
                            }
                        }
                    }

                    if (!matched && byteMatch.FieldToMatch.JA3Fingerprint && request.headers['ja3']) {
                        const ja3Value = request.headers['ja3'][0]?.value;

                        if (ja3Value) {
                            matched = checkStringMatch(
                                ja3Value,
                                matchValue,
                                byteMatch.PositionalConstraint
                            );

                            if (matched) {
                                matchDetails = {
                                    field: 'JA3Fingerprint',
                                    value: ja3Value,
                                    constraint: byteMatch.PositionalConstraint,
                                    matchValue
                                };
                            }
                        }
                    }
                }

                // Handle RegexMatchStatement
                if (!matched && rule.Statement.RegexMatchStatement) {
                    const regexMatch = rule.Statement.RegexMatchStatement;
                    const regexPattern = regexMatch.RegexString;

                    if (regexMatch.FieldToMatch.UriPath && request.uri) {
                        matched = new RegExp(regexPattern).test(request.uri);

                        if (matched) {
                            matchDetails = {
                                field: 'UriPath',
                                value: request.uri,
                                regexPattern
                            };
                        }
                    }

                    if (!matched && regexMatch.FieldToMatch.SingleQueryArgument && request.queryString) {
                        const paramName = regexMatch.FieldToMatch.SingleQueryArgument.Name;
                        const paramValue = getQueryParameterValue(request.queryString, paramName);

                        if (paramValue) {
                            matched = new RegExp(regexPattern).test(paramValue);

                            if (matched) {
                                matchDetails = {
                                    field: `QueryParam:${paramName}`,
                                    value: paramValue,
                                    regexPattern
                                };
                            }
                        }
                    }
                }

                // Handle LabelMatchStatement
                if (rule.Statement.LabelMatchStatement) {
                    const key = rule.Statement.LabelMatchStatement.Key;

                    // Check if this label was previously set
                    matched = existingLabels.has(key);

                    if (matched) {
                        matchDetails = {
                            field: 'LabelMatch',
                            labelKey: key
                        };
                    }
                }

                // Simple support for AND statements
                if (rule.Statement.AndStatement) {
                    const statements = rule.Statement.AndStatement.Statements;
                    matched = statements.length > 0;
                    const subResults = [];

                    for (const stmt of statements) {
                        const subRule = { ...rule, Statement: stmt };
                        const subResult = simulateRuleEvaluation(request, subRule, existingLabels);

                        if (!subResult.matched) {
                            matched = false;
                        }

                        subResults.push(subResult);
                    }

                    if (matched) {
                        matchDetails = {
                            operator: 'AND',
                            subResults
                        };
                    }
                }

                // Simple support for OR statements
                if (rule.Statement.OrStatement) {
                    const statements = rule.Statement.OrStatement.Statements;
                    matched = false;
                    const subResults = [];

                    for (const stmt of statements) {
                        const subRule = { ...rule, Statement: stmt };
                        const subResult = simulateRuleEvaluation(request, subRule, existingLabels);

                        if (subResult.matched) {
                            matched = true;
                        }

                        subResults.push(subResult);
                    }

                    if (matched) {
                        matchDetails = {
                            operator: 'OR',
                            subResults
                        };
                    }
                }
            }
        } catch (error) {
            console.error('Error evaluating rule:', error);
            matched = false;
        }

        // If matched, determine what actions are taken
        if (matched) {
            // Check for labels being added
            if (rule.RuleLabels && rule.RuleLabels.length > 0) {
                // Add the rule's labels to the generated labels set
                rule.RuleLabels.forEach(label => {
                    if (label && label.Name) {
                        labelsGenerated.add(label.Name);
                    }
                });

                actions.push({
                    type: 'labels',
                    labels: rule.RuleLabels.map(label => label.Name)
                });
            }

            // Check for custom headers being inserted
            if (rule.Action.Count?.CustomRequestHandling?.InsertHeaders) {
                actions.push({
                    type: 'headers',
                    headers: rule.Action.Count.CustomRequestHandling.InsertHeaders.map(h => ({
                        name: h.Name,
                        value: h.Value
                    }))
                });
            }

            // Check for actions like Block, Allow, Count, etc.
            const actionType = rule?.Action ? Object.keys(rule.Action)[0] : 'Unknown';
            actions.push({
                type: 'action',
                action: actionType
            });

            // Add CAPTCHA if present
            if (rule.Action.CAPTCHA) {
                actions.push({
                    type: 'captcha',
                    config: rule.Action.CAPTCHA
                });
            }

            // Add Challenge if present
            if (rule.Action.Challenge) {
                actions.push({
                    type: 'challenge',
                    config: rule.Action.Challenge
                });
            }
        }

        const result = {
            matched,
            details: matchDetails,
            actions,
            labelsGenerated: Array.from(labelsGenerated)
        };

        return result;
    };

    // Helper function to update the request state based on rule match results
    const updateRequestState = (currentRequest, result, rule) => {
        if (!result.matched) return currentRequest;

        const updatedRequest = { ...currentRequest };

        // Add any labels from the rule
        if (rule.RuleLabels && rule.RuleLabels.length > 0) {
            const newLabels = rule.RuleLabels.map(label => ({
                name: label.Name,
                addedByRule: rule.Name,
                priority: rule.Priority
            }));
            updatedRequest.addedLabels = [...updatedRequest.addedLabels, ...newLabels];
        }

        // Add any headers inserted by the rule
        if (rule.Action.Count?.CustomRequestHandling?.InsertHeaders) {
            const newHeaders = rule.Action.Count.CustomRequestHandling.InsertHeaders.map(header => ({
                name: header.Name,
                value: header.Value,
                addedByRule: rule.Name,
                priority: rule.Priority
            }));
            updatedRequest.addedHeaders = [...updatedRequest.addedHeaders, ...newHeaders];
        }

        // Record the action taken
        const actionType = rule?.Action ? Object.keys(rule.Action)[0] : 'Unknown';
        updatedRequest.actions.push({
            type: actionType,
            rule: rule.Name,
            priority: rule.Priority,
            // Add specific action details
            details: rule.Action[actionType]
        });

        return updatedRequest;
    };

    // Step to the next rule
    const stepToNextRule = () => {
        if (!safeRules || currentRuleIndex >= safeRules.length - 1) {
            showMessage('You have reached the end of the rule set', 'info');
            return;
        }

        const nextIndex = currentRuleIndex + 1;
        const nextRule = safeRules[nextIndex];

        // Convert request config to the format needed for evaluation
        const testRequest = {
            uri: requestConfig.path,
            method: requestConfig.method,
            headers: requestConfig.headers.reduce((obj, header) => {
                if (header.name && header.value) {
                    obj[header.name.toLowerCase()] = [{ value: header.value }];
                }
                return obj;
            }, {}),
            queryString: requestConfig.queryParams || '',
            body: requestConfig.body || ''
        };

        // Evaluate the next rule, using the current set of triggered labels
        const result = simulateRuleEvaluation(testRequest, nextRule, triggeredLabels);

        // Add to history
        setRuleHistory([...ruleHistory, {
            rule: nextRule,
            result,
            index: nextIndex
        }]);

        // Update the request state with any new modifications
        if (result.matched) {
            const updatedRequest = updateRequestState(currentRequestState, result, nextRule);
            setCurrentRequestState(updatedRequest);

            // Add any new labels if the rule matched
            if (nextRule.RuleLabels) {
                const newLabels = new Set(triggeredLabels);
                nextRule.RuleLabels.forEach(label => newLabels.add(label.Name));
                setTriggeredLabels(newLabels);
            }
        }

        setCurrentRuleIndex(nextIndex);
    };

    // Step to the previous rule
    const stepToPreviousRule = () => {
        if (currentRuleIndex <= 0 || ruleHistory.length <= 1) {
            showMessage('You are at the beginning of the rule evaluation', 'info');
            return;
        }

        // Remove the last rule from history
        const newHistory = [...ruleHistory];
        newHistory.pop();

        // Get the last rule in the new history
        const previousEntry = newHistory[newHistory.length - 1];

        // Reset to the previous state
        setRuleHistory(newHistory);
        setCurrentRuleIndex(previousEntry.index);

        // Reset the labels and request state to what they were before
        // We need to recalculate from the beginning
        const newLabels = new Set();
        let newRequestState = {
            uri: requestConfig.path,
            method: requestConfig.method,
            headers: requestConfig.headers.reduce((obj, header) => {
                if (header.name && header.value) {
                    obj[header.name.toLowerCase()] = [{ value: header.value }];
                }
                return obj;
            }, {}),
            queryString: requestConfig.queryParams || '',
            body: requestConfig.body || '',
            addedLabels: [],
            addedHeaders: [],
            actions: []
        };

        // Replay all rules up to the previous one to rebuild the state properly
        for (let i = 0; i < newHistory.length; i++) {
            const historyEntry = newHistory[i];
            if (historyEntry.result.matched) {
                // Add any labels from this rule
                const rule = historyEntry.rule;
                if (rule.RuleLabels) {
                    rule.RuleLabels.forEach(label => {
                        if (label && label.Name) {
                            newLabels.add(label.Name);
                        }
                    });
                }

                // Update the request state
                newRequestState = updateRequestState(newRequestState, historyEntry.result, rule);
            }
        }

        setTriggeredLabels(newLabels);
        setCurrentRequestState(newRequestState);

        showMessage('Moved back to previous rule', 'info');
    };

    // Helper function to get a specific query parameter value
    const getQueryParameterValue = (queryString, paramName) => {
        return parseQueryString(queryString)[paramName];
    };

    // Helper function to parse a query string into a key-value object
    const parseQueryString = (queryString) => {
        if (!queryString) return {};

        const params = {};
        const queryParts = queryString.split('&');

        queryParts.forEach(part => {
            const [name, value] = part.split('=');
            if (name) {
                params[decodeURIComponent(name)] = decodeURIComponent(value || '');
            }
        });

        return params;
    };

    // Helper function to check string matches based on positional constraint
    const checkStringMatch = (value, matchValue, constraint) => {
        if (!value || !matchValue) return false;

        switch (constraint) {
            case 'EXACTLY':
                return value === matchValue;
            case 'STARTS_WITH':
                return value.startsWith(matchValue);
            case 'ENDS_WITH':
                return value.endsWith(matchValue);
            case 'CONTAINS':
                return value.includes(matchValue);
            default:
                return false;
        }
    };

    // Helper function to render a summary of the match details
    const renderMatchSummary = (details) => {
        if (!details) return "Unknown match";

        if (details.field) {
            return `Matched on ${details.field}: "${details.value}"`;
        }

        if (details.operator === 'AND') {
            return "Matched all conditions";
        }

        if (details.operator === 'OR') {
            return "Matched at least one condition";
        }

        return "Complex match";
    };

    // Helper to render actions taken by a rule
    const renderRuleActions = (actions) => {
        if (!actions || actions.length === 0) return null;

        return (
            <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    Actions Taken:
                </Typography>

                {actions.map((action, index) => {
                    switch (action.type) {
                        case 'labels':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Labels Added:</strong>
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, ml: 2 }}>
                                        {action.labels.map(label => (
                                            <Chip
                                                key={label}
                                                label={label}
                                                size="small"
                                                color="info"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                </Box>
                            );

                        case 'headers':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Headers Inserted:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2 }}>
                                        {action.headers.map((header, i) => (
                                            <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace' }}>
                                                {header.name}: {header.value}
                                            </Typography>
                                        ))}
                                    </Box>
                                </Box>
                            );

                        case 'action':
                            let color;
                            switch (action.action) {
                                case 'Block': color = 'error'; break;
                                case 'Allow': color = 'success'; break;
                                case 'Count': color = 'info'; break;
                                case 'CAPTCHA':
                                case 'Challenge': color = 'warning'; break;
                                default: color = 'default';
                            }

                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Request Action:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2 }}>
                                        <Chip
                                            label={action.action}
                                            size="small"
                                            color={color}
                                        />
                                    </Box>
                                </Box>
                            );

                        case 'captcha':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>CAPTCHA Challenge:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2 }}>
                                        <Chip
                                            label="CAPTCHA Required"
                                            size="small"
                                            color="warning"
                                            icon={<VpnKeyIcon fontSize="small" />}
                                        />
                                    </Box>
                                </Box>
                            );

                        case 'challenge':
                            return (
                                <Box key={index} sx={{ mb: 1 }}>
                                    <Typography variant="body2">
                                        <strong>Browser Challenge:</strong>
                                    </Typography>
                                    <Box sx={{ ml: 2 }}>
                                        <Chip
                                            label="Challenge Required"
                                            size="small"
                                            color="warning"
                                            icon={<SecurityIcon fontSize="small" />}
                                        />
                                    </Box>
                                </Box>
                            );

                        default:
                            return null;
                    }
                })}
            </Box>
        );
    };

    // Function to render the current request state with modifications
    const renderCurrentRequest = (request) => {
        if (!request) return null;

        return (
            <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f0f7ff' }}>
                <Typography variant="subtitle1" gutterBottom>
                    <strong>Current Request State</strong>
                </Typography>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Box>
                            <Typography variant="body2" fontWeight="bold" color="primary">
                                Base Request
                            </Typography>
                            <Box sx={{ ml: 2, mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Method:</strong> {request.method}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Path:</strong> {request.uri}
                                </Typography>
                                {request.queryString && (
                                    <Typography variant="body2">
                                        <strong>Query:</strong> {request.queryString}
                                    </Typography>
                                )}
                                <Typography variant="body2" sx={{ mt: 1 }}>
                                    <strong>Original Headers:</strong>
                                </Typography>
                                <Box sx={{ ml: 2, fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                    {Object.entries(request.headers).map(([name, values]) => (
                                        <Typography key={name} variant="body2">
                                            {name}: {values[0].value}
                                        </Typography>
                                    ))}
                                </Box>
                            </Box>
                        </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Box>
                            <Typography variant="body2" fontWeight="bold" color="secondary">
                                Modifications by Rules
                            </Typography>

                            {request.addedLabels.length > 0 && (
                                <Box sx={{ ml: 2, mb: 2 }}>
                                    <Typography variant="body2" color="secondary">
                                        <strong>Labels Added:</strong>
                                    </Typography>
                                    <Table size="small" sx={{ mt: 1 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ py: 1, px: 1 }}>Label</TableCell>
                                                <TableCell sx={{ py: 1, px: 1 }}>Added by Rule</TableCell>
                                                <TableCell sx={{ py: 1, px: 1 }}>Priority</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {request.addedLabels.map((label, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell sx={{ py: 1, px: 1 }}>
                                                        <Chip
                                                            label={label.name}
                                                            size="small"
                                                            color="info"
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>
                                                        <Typography variant="caption" fontWeight="medium">
                                                            {label.addedByRule}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>
                                                        {label.priority}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            )}

                            {request.addedHeaders.length > 0 && (
                                <Box sx={{ ml: 2, mb: 2 }}>
                                    <Typography variant="body2" color="secondary">
                                        <strong>Headers Added:</strong>
                                    </Typography>
                                    <Table size="small" sx={{ mt: 1 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ py: 1, px: 1 }}>Header</TableCell>
                                                <TableCell sx={{ py: 1, px: 1 }}>Value</TableCell>
                                                <TableCell sx={{ py: 1, px: 1 }}>Added by Rule</TableCell>
                                                <TableCell sx={{ py: 1, px: 1 }}>Priority</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {request.addedHeaders.map((header, idx) => (
                                                <TableRow key={idx} hover>
                                                    <TableCell sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>
                                                        {header.name}
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1, px: 1, fontFamily: 'monospace' }}>
                                                        {header.value}
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>
                                                        <Typography variant="caption" fontWeight="medium">
                                                            {header.addedByRule}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell sx={{ py: 1, px: 1 }}>
                                                        {header.priority}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Box>
                            )}

                            {request.actions.length > 0 && (
                                <Box sx={{ ml: 2 }}>
                                    <Typography variant="body2" color="secondary">
                                        <strong>Actions Taken:</strong>
                                    </Typography>
                                    <Table size="small" sx={{ mt: 1 }}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{ py: 1, px: 1 }}>Action</TableCell>
                                                <TableCell sx={{ py: 1, px: 1 }}>Applied by Rule</TableCell>
                                                <TableCell sx={{ py: 1, px: 1 }}>Priority</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {request.actions.map((action, idx) => {
                                                let chipColor;
                                                switch (action.type) {
                                                    case 'Block': chipColor = 'error'; break;
                                                    case 'Allow': chipColor = 'success'; break;
                                                    case 'Count': chipColor = 'info'; break;
                                                    case 'CAPTCHA':
                                                    case 'Challenge': chipColor = 'warning'; break;
                                                    default: chipColor = 'default';
                                                }

                                                return (
                                                    <TableRow key={idx} hover>
                                                        <TableCell sx={{ py: 1, px: 1 }}>
                                                            <Chip
                                                                label={action.type}
                                                                size="small"
                                                                color={chipColor}
                                                            />
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, px: 1 }}>
                                                            <Typography variant="caption" fontWeight="medium">
                                                                {action.rule}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell sx={{ py: 1, px: 1 }}>
                                                            {action.priority}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </Box>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        );
    };

    // Custom Snackbar to prevent prop leaking
    const CustomSnackbar = (props) => {
        const { open, message, severity, onClose, anchorOrigin } = props;

        // Return null when not open to avoid rendering anything
        if (!open) return null;

        // Style for positioning the snackbar based on anchorOrigin
        const getPositionStyle = () => {
            const horizontal = anchorOrigin?.horizontal || 'center';
            const vertical = anchorOrigin?.vertical || 'bottom';

            return {
                position: 'fixed',
                zIndex: 1400,
                left: horizontal === 'left' ? '24px' : horizontal === 'right' ? 'auto' : '50%',
                right: horizontal === 'right' ? '24px' : 'auto',
                bottom: vertical === 'bottom' ? '24px' : 'auto',
                top: vertical === 'top' ? '24px' : 'auto',
                transform: horizontal === 'center' ? 'translateX(-50%)' : 'none',
            };
        };

        // Auto-hide effect
        useEffect(() => {
            if (open) {
                const timer = setTimeout(() => {
                    onClose();
                }, 6000);

                return () => clearTimeout(timer);
            }
        }, [open, onClose]);

        return (
            <Box sx={getPositionStyle()}>
                <Alert
                    severity={severity}
                    onClose={onClose}
                    sx={{
                        boxShadow: '0px 3px 5px -1px rgba(0,0,0,0.2), 0px 6px 10px 0px rgba(0,0,0,0.14), 0px 1px 18px 0px rgba(0,0,0,0.12)',
                        minWidth: '288px',
                        maxWidth: '500px'
                    }}
                >
                    {message}
                </Alert>
            </Box>
        );
    };

    return (
        <Container maxWidth="xl" sx={{ pt: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                WAF Rule Request Debugger
            </Typography>
            <Typography variant="body1" gutterBottom>
                Test requests against WAF rules to see which rules would be triggered.
            </Typography>

            <Stack spacing={3}>
                <Paper elevation={2} sx={{ p: 3 }}>
                    <Typography variant="h6" component="h2" gutterBottom>
                        Request Configuration
                    </Typography>

                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <FormControl fullWidth margin="normal">
                                <InputLabel id="method-label">HTTP Method</InputLabel>
                                <Select
                                    labelId="method-label"
                                    value={requestConfig.method}
                                    onChange={(e) => handleChange('method', e.target.value)}
                                    label="HTTP Method"
                                >
                                    <MenuItem value="GET">GET</MenuItem>
                                    <MenuItem value="POST">POST</MenuItem>
                                    <MenuItem value="PUT">PUT</MenuItem>
                                    <MenuItem value="DELETE">DELETE</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12} md={8}>
                            <FormControl fullWidth margin="normal">
                                <TextField
                                    label="Path"
                                    placeholder="/path/to/resource"
                                    value={requestConfig.path}
                                    onChange={(e) => handleChange('path', e.target.value)}
                                />
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControl fullWidth margin="normal">
                                <TextField
                                    label="Query Parameters"
                                    placeholder="param1=value1&param2=value2"
                                    value={requestConfig.queryParams}
                                    onChange={(e) => handleChange('queryParams', e.target.value)}
                                />
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, mt: 2 }}>
                                <Typography variant="subtitle1">Headers</Typography>
                                <Button
                                    startIcon={<AddIcon />}
                                    variant="outlined"
                                    size="small"
                                    onClick={addHeader}
                                    sx={{ ml: 2 }}
                                >
                                    Add
                                </Button>
                            </Box>

                            {requestConfig.headers.map((header, index) => (
                                <Box key={index} sx={{ display: 'flex', mb: 2 }}>
                                    <TextField
                                        label="Header Name"
                                        placeholder="Header Name"
                                        value={header.name}
                                        onChange={(e) => updateHeader(index, 'name', e.target.value)}
                                        sx={{ width: '40%', mr: 1 }}
                                    />
                                    <TextField
                                        label="Header Value"
                                        placeholder="Header Value"
                                        value={header.value}
                                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                                        sx={{ width: '50%', mr: 1 }}
                                    />
                                    <IconButton
                                        color="error"
                                        onClick={() => removeHeader(index)}
                                        sx={{ mt: 1 }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </Box>
                            ))}
                        </Grid>

                        <Grid item xs={12}>
                            <FormControl fullWidth margin="normal">
                                <TextField
                                    label="Request Body"
                                    placeholder='{"key": "value"}'
                                    value={requestConfig.body}
                                    onChange={(e) => handleChange('body', e.target.value)}
                                    multiline
                                    rows={4}
                                />
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={stepMode}
                                        onChange={() => setStepMode(!stepMode)}
                                    />
                                }
                                label="Step-by-step rule evaluation"
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={testRequest}
                                disabled={loading}
                                fullWidth
                                startIcon={<BugReportIcon />}
                            >
                                {stepMode ? "Start Step-by-Step Evaluation" : "Test Request"}
                            </Button>
                        </Grid>
                    </Grid>
                </Paper>

                {stepMode && ruleHistory.length > 0 ? (
                    <Paper elevation={2} sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6" component="h2">
                                Step-by-Step Evaluation
                            </Typography>
                            <Chip
                                label={`Rule ${currentRuleIndex + 1} of ${safeRules.length}`}
                                color="secondary"
                                sx={{ ml: 2 }}
                            />
                        </Box>

                        {currentRequestState && renderCurrentRequest(currentRequestState)}

                        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8f8f8' }}>
                            <Typography variant="subtitle1" gutterBottom>Current Rule:</Typography>
                            <Typography><strong>Name:</strong> {safeRules[currentRuleIndex]?.Name || 'Unknown'}</Typography>
                            <Typography><strong>Priority:</strong> {safeRules[currentRuleIndex]?.Priority || 'Unknown'}</Typography>
                            <Typography><strong>Action:</strong> {safeRules[currentRuleIndex]?.Action ? Object.keys(safeRules[currentRuleIndex]?.Action)[0] : 'Unknown'}</Typography>

                            {safeRules[currentRuleIndex]?.RuleLabels && (
                                <Typography>
                                    <strong>Labels:</strong> {safeRules[currentRuleIndex]?.RuleLabels.map(l => l.Name).join(', ')}
                                </Typography>
                            )}

                            <Divider sx={{ my: 2 }} />

                            <Typography variant="subtitle1" gutterBottom>Result:</Typography>
                            <Chip
                                label={ruleHistory[ruleHistory.length - 1].result.matched ? "MATCHED" : "NOT MATCHED"}
                                color={ruleHistory[ruleHistory.length - 1].result.matched ? "success" : "default"}
                                sx={{ mb: 1 }}
                            />

                            {ruleHistory[ruleHistory.length - 1].result.matched && (
                                <>
                                    <Paper variant="outlined" sx={{ p: 1, mt: 1, bgcolor: '#fff' }}>
                                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}>
                                            {JSON.stringify(ruleHistory[ruleHistory.length - 1].result.details, null, 2)}
                                        </pre>
                                    </Paper>

                                    {renderRuleActions(ruleHistory[ruleHistory.length - 1].result.actions)}
                                </>
                            )}
                        </Paper>

                        {/* Step-by-step navigation controls */}
                        <Box display="flex" gap={2} mt={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={stepToPreviousRule}
                                disabled={currentRuleIndex <= 0}
                                startIcon={<NavigateNextIcon style={{ transform: 'rotate(180deg)' }} />}
                            >
                                Previous Rule
                            </Button>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={stepToNextRule}
                                disabled={currentRuleIndex >= safeRules.length - 1}
                                endIcon={<NavigateNextIcon />}
                            >
                                Next Rule
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={resetRuleEvaluation}
                                color="secondary"
                            >
                                Reset Evaluation
                            </Button>
                        </Box>

                        {/* Add a section to display active labels */}
                        <Box sx={{ mt: 3, p: 2, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Active Labels:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                {Array.from(triggeredLabels).length > 0 ? (
                                    Array.from(triggeredLabels).map((label, idx) => (
                                        <Chip
                                            key={idx}
                                            label={label}
                                            color="info"
                                            size="small"
                                            variant="outlined"
                                        />
                                    ))
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No labels active yet
                                    </Typography>
                                )}
                            </Box>
                        </Box>

                        {/* Rule history */}
                        <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                            Evaluation History
                        </Typography>
                        <Accordion>
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                            >
                                <Typography>Rule Evaluation History</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Rule</TableCell>
                                            <TableCell>Priority</TableCell>
                                            <TableCell>Result</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {ruleHistory.map((historyItem, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{historyItem.rule.Name || 'Unknown'}</TableCell>
                                                <TableCell>{historyItem.rule.Priority || 'Unknown'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={historyItem.result.matched ? "MATCHED" : "NOT MATCHED"}
                                                        color={historyItem.result.matched ? "success" : "default"}
                                                        size="small"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </AccordionDetails>
                        </Accordion>
                    </Paper>
                ) : (
                    testResults && (
                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" component="h2">
                                    Test Results
                                </Typography>
                                <Chip
                                    label={`${testResults.matchedRules.length} Rules Matched`}
                                    color={testResults.matchedRules.length > 0 ? "error" : "success"}
                                    sx={{ ml: 2 }}
                                />
                            </Box>

                            <Accordion defaultExpanded>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography>Request Details</Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Box sx={{ ml: 2 }}>
                                        <Typography><strong>Method:</strong> {testResults.request.method}</Typography>
                                        <Typography><strong>URI:</strong> {testResults.request.uri}</Typography>
                                        <Typography><strong>Query String:</strong> {testResults.request.queryString || '(none)'}</Typography>
                                        <Typography sx={{ mt: 1 }}><strong>Headers:</strong></Typography>
                                        <Box sx={{ ml: 2 }}>
                                            {Object.entries(testResults.request.headers).map(([name, values]) => (
                                                <Typography key={name} variant="body2">{name}: {values[0].value}</Typography>
                                            ))}
                                        </Box>
                                        {testResults.request.body && (
                                            <>
                                                <Typography sx={{ mt: 1 }}><strong>Body:</strong></Typography>
                                                <Paper variant="outlined" sx={{ p: 1, mt: 0.5, bgcolor: '#f5f5f5' }}>
                                                    <pre style={{ margin: 0, overflowX: 'auto' }}>{testResults.request.body}</pre>
                                                </Paper>
                                            </>
                                        )}
                                    </Box>
                                </AccordionDetails>
                            </Accordion>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="subtitle1" gutterBottom>Matched Rules</Typography>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Rule Name</TableCell>
                                        <TableCell>Priority</TableCell>
                                        <TableCell>Action</TableCell>
                                        <TableCell>Match Details</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {Array.isArray(testResults.matchedRules) && testResults.matchedRules.length > 0 ? (
                                        testResults.matchedRules.map((matchResult, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{matchResult.rule.Name || 'Unknown'}</TableCell>
                                                <TableCell>{matchResult.rule.Priority || 'Unknown'}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={matchResult.rule.Action ? Object.keys(matchResult.rule.Action)[0] : 'Unknown'}
                                                        color={matchResult.rule.Action?.Block ? "error" : "primary"}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Accordion>
                                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                            <Typography>{renderMatchSummary(matchResult.result.details)}</Typography>
                                                        </AccordionSummary>
                                                        <AccordionDetails>
                                                            <Box>
                                                                <Paper variant="outlined" sx={{ p: 1, bgcolor: '#f8f8f8', mb: 2 }}>
                                                                    <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                                                                        {JSON.stringify(matchResult.result.details, null, 2)}
                                                                    </pre>
                                                                </Paper>

                                                                {renderRuleActions(matchResult.result.actions)}
                                                            </Box>
                                                        </AccordionDetails>
                                                    </Accordion>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} sx={{ textAlign: 'center' }}>
                                                No rules were matched by this request.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>

                            {/* Add Labels Generated Section */}
                            <Box sx={{ mt: 4 }}>
                                <Typography variant="subtitle1" gutterBottom>Labels Generated</Typography>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f8f8' }}>
                                    {testResults.labelsGenerated && testResults.labelsGenerated.length > 0 ? (
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {testResults.labelsGenerated.map((label, idx) => (
                                                <Chip
                                                    key={idx}
                                                    label={label}
                                                    color="info"
                                                    size="small"
                                                    sx={{ my: 0.5 }}
                                                />
                                            ))}
                                        </Box>
                                    ) : (
                                        <Typography variant="body2">No labels were generated by this request.</Typography>
                                    )}
                                </Paper>
                            </Box>

                            {/* Add Actions Taken Section */}
                            <Box sx={{ mt: 3 }}>
                                <Typography variant="subtitle1" gutterBottom>Actions Taken</Typography>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f8f8' }}>
                                    {Array.isArray(testResults.matchedRules) && testResults.matchedRules.length > 0 ? (
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Rule</TableCell>
                                                    <TableCell>Action</TableCell>
                                                    <TableCell>Outcome</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {testResults.matchedRules.map((matchResult, idx) => {
                                                    const actionType = matchResult.rule.Action ? Object.keys(matchResult.rule.Action)[0] : 'Unknown';
                                                    let chipColor = 'primary';
                                                    let outcome = 'Counted';

                                                    if (actionType === 'Block') {
                                                        chipColor = 'error';
                                                        outcome = 'Request Blocked';
                                                    } else if (actionType === 'Allow') {
                                                        chipColor = 'success';
                                                        outcome = 'Request Allowed';
                                                    } else if (actionType === 'CAPTCHA' || actionType === 'Challenge') {
                                                        chipColor = 'warning';
                                                        outcome = actionType === 'CAPTCHA' ? 'CAPTCHA Challenge' : 'Browser Challenge';
                                                    }

                                                    return (
                                                        <TableRow key={idx}>
                                                            <TableCell>{matchResult.rule.Name}</TableCell>
                                                            <TableCell>
                                                                <Chip
                                                                    label={actionType}
                                                                    color={chipColor}
                                                                    size="small"
                                                                />
                                                            </TableCell>
                                                            <TableCell>{outcome}</TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <Typography variant="body2">No actions were taken for this request.</Typography>
                                    )}
                                </Paper>
                            </Box>
                        </Paper>
                    )
                )}
            </Stack>

            {/* Add floating Next Rule button when in step mode and not at the end */}
            {stepMode && ruleHistory.length > 0 && currentRuleIndex < safeRules.length - 1 && (
                <Fab
                    color="primary"
                    onClick={stepToNextRule}
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        right: 30,
                        zIndex: 1000,
                        boxShadow: 3
                    }}
                >
                    <NavigateNextIcon />
                </Fab>
            )}

            <CustomSnackbar
                open={snackbar.open}
                message={snackbar.message}
                severity={snackbar.severity}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </Container>
    );
};

export default RequestDebugger; 