import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// AWS WAF
import {
  WAFV2Client,
  ListWebACLsCommand,
  GetWebACLCommand,
  GetRuleGroupCommand
} from "@aws-sdk/client-wafv2";

// CloudWatch Logs
import {
  CloudWatchLogsClient,
  FilterLogEventsCommand
} from "@aws-sdk/client-cloudwatch-logs";

dotenv.config();

const app = express();
app.use(cors());

// ============ 1) AWS WAF Client Setup ===============
const wafClient = new WAFV2Client({
  region: process.env.AWS_REGION || "us-east-1",
});

// ============ 2) CloudWatch Logs Client Setup ========
const cwlClient = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || "us-east-1",
});

// ============ 3) Existing code for WAF ACLs ===========

/** Retrieve a list of WebACLs. */
async function listWafAcls() {
  try {
    console.log("🔍 Fetching WAF ACLs...");
    const command = new ListWebACLsCommand({ Scope: "CLOUDFRONT" }); 
    // or "REGIONAL", depending on your usage
    const response = await wafClient.send(command);
    return response.WebACLs || [];
  } catch (error) {
    console.error("❌ Error listing WAF ACLs:", error);
    return [];
  }
}

/** Get full details (rules, rule groups) for a given WebACL. */
async function getAclDetails(aclId, aclName) {
  try {
    const command = new GetWebACLCommand({
      Id: aclId,
      Name: aclName,
      Scope: "CLOUDFRONT"
    });
    const response = await wafClient.send(command);
    return response.WebACL || null;
  } catch (error) {
    console.error(`❌ Error fetching details for ACL ${aclName}:`, error);
    return null;
  }
}

/** Fetch rule group details for sub-rules. */
async function getRuleGroupDetails(ruleGroupArn) {
  try {
    const command = new GetRuleGroupCommand({
      ARN: ruleGroupArn,
      Scope: "CLOUDFRONT"
    });
    const response = await wafClient.send(command);
    return response.RuleGroup || null;
  } catch (error) {
    console.error(`❌ Error fetching RuleGroup ${ruleGroupArn}:`, error);
    return null;
  }
}

/**
 * GET /api/waf-acls
 * - Lists all WebACLs
 * - For each, fetches details, plus references to sub rule groups
 */
app.get("/api/waf-acls", async (req, res) => {
  try {
    console.log("🚀 /api/waf-acls request...");
    const acls = await listWafAcls();
    if (!acls.length) {
      return res.json([]);
    }

    // For each ACL, fetch details & sub-rules
    const detailedAcls = await Promise.all(
      acls.map(async (acl) => {
        const details = await getAclDetails(acl.Id, acl.Name);
        if (!details) return acl;

        // For each top-level rule referencing a rule group, fetch group details
        const rulesWithGroups = await Promise.all(
          details.Rules.map(async (rule) => {
            if (rule.Statement?.RuleGroupReferenceStatement) {
              const rgArn = rule.Statement.RuleGroupReferenceStatement.ARN;
              const rgDetails = await getRuleGroupDetails(rgArn);
              if (rgDetails) {
                rule.RuleGroup = rgDetails;
              }
            }
            return rule;
          })
        );
        details.Rules = rulesWithGroups;
        return details;
      })
    );

    console.log("✅ Final ACL data:", JSON.stringify(detailedAcls, null, 2));
    res.json(detailedAcls);
  } catch (error) {
    console.error("❌ Error in /api/waf-acls:", error);
    res.status(500).json({ error: "Error fetching WAF ACLs" });
  }
});

// ============ 4) New code for WAF logs from CloudWatch ============

/**
 * GET /api/waf-logs
 * - Fetches recent WAF log events from a specified CloudWatch Logs group.
 */
app.get("/api/waf-logs", async (req, res) => {
  try {
    // Name of your WAF log group in CloudWatch (must match what's configured in WAF logging)
    const LOG_GROUP_NAME = process.env.WAF_LOG_GROUP_NAME || "/aws/waf/MyWebACLLogs";

    // Example: last 15 minutes
    const now = Date.now();
    const fifteenMinutesAgo = now - 15 * 60 * 1000;

    const params = {
      logGroupName: LOG_GROUP_NAME,
      startTime: fifteenMinutesAgo,
      endTime: now,
      limit: 50
    };

    const command = new FilterLogEventsCommand(params);
    const response = await cwlClient.send(command);

    // Turn each CloudWatch event into a structured object
    const logs = response.events?.map((evt) => {
      let parsedMessage;
      try {
        parsedMessage = JSON.parse(evt.message);
      } catch (err) {
        parsedMessage = { raw: evt.message };
      }
      return {
        id: evt.eventId,
        timestamp: evt.timestamp,
        log: parsedMessage
      };
    }) || [];

    console.log(`✅ Fetched ${logs.length} log events from CloudWatch`);
    res.json(logs);
  } catch (error) {
    console.error("❌ Error in /api/waf-logs:", error);
    res.status(500).json({ error: "Error fetching WAF logs" });
  }
});

// ============ 5) Start the Server ============

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
