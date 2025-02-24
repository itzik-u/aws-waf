// WafLogsService.js
import axios from "axios";

/**
 * Fetch WAF logs from your backend endpoint (e.g. /api/waf-logs).
 * Returns an array of log objects, each with { id, timestamp, log: {...} }.
 */
export async function fetchWafLogs() {
  const res = await axios.get("http://localhost:5000/api/waf-logs");
  return res.data; // your logs array
}
