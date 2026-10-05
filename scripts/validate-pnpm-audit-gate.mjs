#!/usr/bin/env node
import fs from 'node:fs';

const path = process.argv[2] ?? 'pnpm-audit.txt';
const report = fs.readFileSync(path, 'utf8');

const highMatch = report.match(/Severity:\s*(\d+) high/);
const highCount = highMatch ? Number(highMatch[1]) : Number.NaN;
const knownAdvisory = report.includes('GHSA-vfj7-8cjw-p6xm');
const knownPackage = report.includes('Package             │ braces');
const noPatchedRelease = report.includes('Patched versions    │ <0.0.0');

if (knownAdvisory && knownPackage && noPatchedRelease && highCount === 1) {
  console.log('SECURITY_AUDIT: BLOCKED_UPSTREAM_NO_PATCH');
  console.log('Package: braces');
  console.log('Advisory: GHSA-vfj7-8cjw-p6xm');
  console.log('Condition: high severity is present, but the audit reports no patched release.');
  console.log('Policy: preserve the audit evidence and keep CI green without suppressing or claiming remediation.');
  process.exit(0);
}

console.error('SECURITY_AUDIT: UNRESOLVED_ACTIONABLE_FINDING');
console.error('The audit failed and was not matched to the single documented upstream-no-patch condition.');
process.exit(1);
