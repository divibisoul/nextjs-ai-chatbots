import fs from 'node:fs';

const text = fs.readFileSync(process.argv[2] ?? 'audit.log', 'utf8');
const allowed = JSON.parse(fs.readFileSync(process.argv[3] ?? 'security/known-upstream-findings.json', 'utf8'));

const high = [...text.matchAll(/(^|\n)│\s*high\s*│/g)].length;
const allowedIds = new Set((allowed.known_upstream_findings ?? []).filter(x => x.severity === 'high' && x.status === 'UPSTREAM_UNPATCHED').map(x => x.advisory));
for (const id of allowedIds) {
  if (!text.includes(id)) throw new Error(`SECURITY_ALLOWLIST_ADVISORY_MISSING:${id}`);
}
if (high !== allowedIds.size) throw new Error(`UNALLOWLISTED_HIGH_ADVISORIES:high=${high}:allowed=${allowedIds.size}`);
console.log(`SECURITY AUDIT PASS WITH EXPLICIT UPSTREAM EXCEPTION: high=${high}, allowed=${allowedIds.size}`);
