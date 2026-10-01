// Runs Lighthouse (mobile defaults: emulated phone, throttled network and CPU) three times
// against a running site, keeps the median run and checks it against the brief's quality bar.
//
//   npm run lighthouse                         # http://localhost:8080, the container's default port
//   npm run lighthouse -- http://localhost:8081
//
// Needs Google Chrome installed. Writes every run's JSON to .lighthouse/ (in the repository root)
// and the median run to .lighthouse/median.json. Exits with 1 if any category scores below 95 or
// the layout shifts. Lighthouse is pinned, so scores stay comparable between runs.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const LIGHTHOUSE = 'lighthouse@13.5.0';

const url = process.argv[2] ?? 'http://localhost:8080';
const RUNS = 3;
const MIN_SCORE = 95;
const MAX_CLS = 0.01;
const out = fileURLToPath(new URL('../.lighthouse', import.meta.url));
mkdirSync(out, { recursive: true });

const runs = [];
for (let i = 1; i <= RUNS; i++) {
  const path = `${out}/run-${i}.json`;
  console.log(`Lighthouse run ${i} of ${RUNS} against ${url}`);
  execFileSync(
    'npx',
    ['-y', LIGHTHOUSE, url, '--output=json', `--output-path=${path}`, '--quiet', '--chrome-flags=--headless=new'],
    { stdio: 'inherit' },
  );
  const report = JSON.parse(readFileSync(path, 'utf8'));
  if (report.runtimeError) throw new Error(`Lighthouse failed: ${report.runtimeError.message}`);
  runs.push({ path, report });
}

const score = (report, id) => Math.round(report.categories[id].score * 100);
const total = (report) => ['performance', 'accessibility', 'best-practices', 'seo'].reduce((sum, id) => sum + score(report, id), 0);
// The median by performance score, then by the sum of all four.
const sorted = [...runs].sort((a, b) => score(a.report, 'performance') - score(b.report, 'performance') || total(a.report) - total(b.report));
const median = sorted[Math.floor(sorted.length / 2)];
copyFileSync(median.path, `${out}/median.json`);

const { report } = median;
const audit = (id) => report.audits[id];
const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
const failures = [];

console.log(`\nMedian of ${RUNS} runs (.lighthouse/${median.path.split("/").pop()}), ${report.lighthouseVersion}, ${report.configSettings.formFactor}:`);
for (const id of categories) {
  const value = score(report, id);
  console.log(`  ${report.categories[id].title.padEnd(16)} ${value}${value < MIN_SCORE ? '  < 95' : ''}`);
  if (value < MIN_SCORE) failures.push(`${id} ${value}`);
}
console.log(`  All runs (perf/a11y/bp/seo): ${runs.map((run) => categories.map((id) => score(run.report, id)).join('/')).join(', ')}`);

const cls = audit('cumulative-layout-shift').numericValue;
console.log(`\n  Cumulative layout shift   ${cls.toFixed(3)}${cls > MAX_CLS ? '  > 0.01' : ''}`);
if (cls > MAX_CLS) failures.push(`CLS ${cls}`);
console.log(`  First contentful paint    ${(audit('first-contentful-paint').numericValue / 1000).toFixed(2)} s`);
console.log(`  Largest contentful paint  ${(audit('largest-contentful-paint').numericValue / 1000).toFixed(2)} s`);
console.log(`  Total blocking time       ${Math.round(audit('total-blocking-time').numericValue)} ms`);
console.log(`  Total transfer size       ${(audit('total-byte-weight').numericValue / 1024).toFixed(1)} KB`);

// Transfer size per resource type, from the network log.
const requests = audit('network-requests').details.items;
const byType = {};
for (const request of requests) byType[request.resourceType] = (byType[request.resourceType] ?? 0) + request.transferSize;
console.log(`  By type                   ${Object.entries(byType).map(([type, bytes]) => `${type} ${(bytes / 1024).toFixed(1)} KB`).join(', ')}`);
const origins = [...new Set(requests.map((request) => new URL(request.url).origin))];
console.log(`  Origins requested         ${origins.join(', ')}`);

if (failures.length) {
  console.error(`\nBelow the quality bar: ${failures.join(', ')}`);
  process.exit(1);
}
console.log('\nAll four categories at 95 or above, no layout shift.');
