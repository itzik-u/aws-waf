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
const RequestDebugger = ({ rules }) => {
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
                const firstRule = rules[0];
                if (firstRule) {
                    const result = simulateRuleEvaluation(testRequest, firstRule, new Set());
                    setRuleHistory([{
                        rule: firstRule,
                        result: result,
                        index: 0
                    }]);

                    // Update the request state with any changes from the first rule match
                    if (result.matched) {
                        const updatedRequest = updateRequestState(initialRequestState, result, firstRule);
                        setCurrentRequestState(updatedRequest);

                        // Add labels if the rule matched and has labels
                        if (firstRule.RuleLabels) {
                            const newLabels = new Set();
                            firstRule.RuleLabels.forEach(label => newLabels.add(label.Name));
                            setTriggeredLabels(newLabels);
                        }
                    }

                    setCurrentRuleIndex(0);
                }

                showMessage('Step-by-step mode started. Rules will be evaluated one by one.');
            } else {
                // Full mode - evaluate all rules at once
                const matchedRules = evaluateRulesAgainstRequest(testRequest, rules);

                setTestResults({
                    request: testRequest,
                    matchedRules: matchedRules,
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
    const evaluateRulesAgainstRequest = (request, rules) => {
        if (!rules || !Array.isArray(rules)) return [];

        const matchedRules = [];

        // Go through each rule and check if it matches
        rules.forEach(rule => {
            const matchResult = simulateRuleEvaluation(request, rule, new Set());
            if (matchResult.matched) {
                matchedRules.push({
                    rule: rule,
                    result: matchResult
                });
            }
        });

        return matchedRules;
    };

    // Simulate rule evaluation against a request
    const simulateRuleEvaluation = (request, rule, activeLabels = new Set()) => {
        let matched = false;
        let matchDetails = {};
        let actions = [];

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
                    matched = activeLabels.has(key);

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
                        const subResult = simulateRuleEvaluation(request, subRule);

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
                        const subResult = simulateRuleEvaluation(request, subRule);

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
            const actionType = Object.keys(rule.Action)[0];
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

        return { matched, details: matchDetails, actions };
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
        const actionType = Object.keys(rule.Action)[0];
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
        if (!rules || currentRuleIndex >= rules.length - 1) {
            showMessage('You have reached the end of the rule set', 'info');
            return;
        }

        const nextIndex = currentRuleIndex + 1;
        const nextRule = rules[nextIndex];

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

    // Helper function to extract query parameter value
    const getQueryParameterValue = (queryString, paramName) => {
        const params = new URLSearchParams(queryString);
        return params.get(paramName);
    };

    // Helper function to check string match based on positional constraint
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
                                label={`Rule ${currentRuleIndex + 1} of ${rules.length}`}
                                color="secondary"
                                sx={{ ml: 2 }}
                            />
                        </Box>

                        {currentRequestState && renderCurrentRequest(currentRequestState)}

                        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8f8f8' }}>
                            <Typography variant="subtitle1" gutterBottom>Current Rule:</Typography>
                            <Typography><strong>Name:</strong> {rules[currentRuleIndex].Name}</Typography>
                            <Typography><strong>Priority:</strong> {rules[currentRuleIndex].Priority}</Typography>
                            <Typography><strong>Action:</strong> {Object.keys(rules[currentRuleIndex].Action)[0]}</Typography>

                            {rules[currentRuleIndex].RuleLabels && (
                                <Typography>
                                    <strong>Labels:</strong> {rules[currentRuleIndex].RuleLabels.map(l => l.Name).join(', ')}
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

                        <Typography variant="subtitle1" gutterBottom>Active Labels:</Typography>
                        <Box sx={{ mb: 2 }}>
                            {Array.from(triggeredLabels).length === 0 ? (
                                <Typography variant="body2">No labels have been triggered yet</Typography>
                            ) : (
                                Array.from(triggeredLabels).map(label => (
                                    <Chip key={label} label={label} color="primary" sx={{ m: 0.5 }} />
                                ))
                            )}
                        </Box>

                        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={stepToNextRule}
                                disabled={currentRuleIndex >= rules.length - 1}
                            >
                                Next Rule
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={resetRuleEvaluation}
                            >
                                Reset
                            </Button>
                        </Box>

                        <Divider sx={{ my: 3 }} />

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
                                                <TableCell>{historyItem.rule.Name}</TableCell>
                                                <TableCell>{historyItem.rule.Priority}</TableCell>
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
                            {testResults.matchedRules.length === 0 ? (
                                <Typography>No rules were matched by this request.</Typography>
                            ) : (
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
                                        {testResults.matchedRules.map((matchResult, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{matchResult.rule.Name}</TableCell>
                                                <TableCell>{matchResult.rule.Priority}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={Object.keys(matchResult.rule.Action)[0]}
                                                        color={matchResult.rule.Action.Block ? "error" : "primary"}
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
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </Paper>
                    )
                )}
            </Stack>

            {/* Add floating Next Rule button when in step mode and not at the end */}
            {stepMode && ruleHistory.length > 0 && currentRuleIndex < rules.length - 1 && (
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

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default RequestDebugger; 