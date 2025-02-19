import express from "express";
import cors from "cors";
import { WAFV2Client, ListWebACLsCommand, GetWebACLCommand, GetRuleGroupCommand } from "@aws-sdk/client-wafv2";

const app = express();
const PORT = 5000;

// AWS WAF Client
const wafClient = new WAFV2Client({
  region: "us-east-1",
});

app.use(cors());

// Function to fetch all Web ACLs
async function listWafAcls() {
  try {
    console.log("🔍 Fetching WAF ACLs from AWS...");
    const command = new ListWebACLsCommand({ Scope: "CLOUDFRONT" });
    const response = await wafClient.send(command);

    console.log("✅ AWS Response for listWebACLs:", JSON.stringify(response, null, 2));
    return response.WebACLs || [];
  } catch (error) {
    console.error("❌ Error fetching WAF ACLs:", error);
    return [];
  }
}

// Function to get details of a specific Web ACL
async function getAclDetails(aclId, aclName) {
  try {
    console.log(`🔍 Fetching details for ACL: ${aclName} (ID: ${aclId})`);
    const command = new GetWebACLCommand({ Id: aclId, Name: aclName, Scope: "CLOUDFRONT" });
    const response = await wafClient.send(command);

    console.log(`✅ Details for ACL ${aclName}:`, JSON.stringify(response, null, 2));
    return response.WebACL || null;
  } catch (error) {
    console.error(`❌ Error fetching details for ACL ${aclName}:`, error);
    return null;
  }
}

// Function to fetch rule group details (fetches sub-rules)
async function getRuleGroupDetails(ruleGroupArn) {
  try {
    console.log(`🔍 Fetching Rule Group Details for ARN: ${ruleGroupArn}`);
    const command = new GetRuleGroupCommand({ ARN: ruleGroupArn, Scope: "CLOUDFRONT" });
    const response = await wafClient.send(command);

    console.log(`✅ Rule Group Details for ${ruleGroupArn}:`, JSON.stringify(response, null, 2));
    return response.RuleGroup || null;
  } catch (error) {
    console.error(`❌ Error fetching Rule Group ${ruleGroupArn}:`, error);
    return null;
  }
}

// API Endpoint: Get WAF ACLs with rules and rule group details
app.get("/api/waf-acls", async (req, res) => {
  try {
    console.log("🚀 API Request: Fetching all WAF ACLs...");
    const acls = await listWafAcls();

    if (acls.length === 0) {
      console.warn("⚠️ No WAF ACLs found.");
      return res.json([]);
    }

    console.log(`📌 Found ${acls.length} ACLs. Fetching details...`);

    const detailedAcls = await Promise.all(
      acls.map(async (acl) => {
        console.log(`🔍 Processing ACL: ${acl.Name} (ID: ${acl.Id})`);
        const details = await getAclDetails(acl.Id, acl.Name);

        if (!details) {
          console.warn(`⚠️ No details found for ACL: ${acl.Name}`);
          return acl;
        }

        // Fetch rule group details for rules referencing a rule group
        const rulesWithGroups = await Promise.all(
          details.Rules.map(async (rule, index) => {
            console.log(`📌 Processing Rule ${index + 1}: ${rule.Name}`);

            if (rule.Statement?.RuleGroupReferenceStatement) {
              const ruleGroupDetails = await getRuleGroupDetails(
                rule.Statement.RuleGroupReferenceStatement.ARN
              );
              if (ruleGroupDetails) {
                rule.RuleGroup = ruleGroupDetails;
              }
            }
            return rule;
          })
        );

        details.Rules = rulesWithGroups;
        return details;
      })
    );

    console.log("✅ Final Processed ACL Data:", JSON.stringify(detailedAcls, null, 2));
    res.json(detailedAcls);
  } catch (error) {
    console.error("❌ Error fetching WAF data:", error);
    res.status(500).json({ error: "Error fetching WAF ACLs" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
