// spamRequests.js
import axios from "axios";

/**
 * Insert your CloudFront, ALB, or any domain behind WAF here.
 * Make sure the WAF is enabled with these managed rule groups:
 *   - AWS-AWSManagedRulesAmazonIpReputationList
 *   - AWS-AWSManagedRulesAnonymousIpList
 *   - AWS-AWSManagedRulesKnownBadInputsRuleSet
 */
const ENDPOINT = "http://d2n11xlssxyldj.cloudfront.net";

/**
 * We'll send 1000 requests with suspicious parameters to try to trigger WAF logs.
 */
async function spamRequests() {
  console.log(`🚀 Sending 1000 suspicious requests to: ${ENDPOINT}`);

  for (let i = 0; i < 110; i++) {
    try {
      // Construct a suspicious query param or path
      // e.g., an attempt at SQL injection or path traversal
      const param = i % 2 === 0
        ? "SELECT * FROM users"      // known-bad input
        : "../../etc/passwd";        // path traversal attempt

      // We can also use random query param to avoid caching
      const url = `${ENDPOINT}?badInput=${encodeURIComponent(param)}&index=${i}`;

      // Optionally add a suspicious header if you want to test the IP Reputation or Anonymous IP sets:
      // e.g. "X-Forwarded-For" from a known Tor exit node or random addresses.
      const randomIp = `201.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
      const headers = {
        "X-Forwarded-For": randomIp, 
      };

      // Attempt a GET
      const res = await axios.get(url, { headers });

      console.log(`#${i} => status: ${res.status}`);
    } catch (err) {
      // For blocked requests, WAF might return 403 or another error
      // We'll just log the error message or code
      console.log(`#${i} => error:`, err.response?.status || err.message);
    }
  }

  console.log("✅ Done sending 1000 requests.");
}

spamRequests();
