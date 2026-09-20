import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const failures = [];
const passes = [];

function pass(name) {
  passes.push(name);
  console.log(`PASS  ${name}`);
}

function fail(name, detail) {
  failures.push({ name, detail });
  console.error(`FAIL  ${name}: ${detail}`);
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function requireFile(rel) {
  if (exists(rel)) pass(`required:${rel}`);
  else fail(`required:${rel}`, "missing");
}

const required = [
  "template.json",
  "README.md",
  "AGENTS.md",
  "LICENSE",
  "package.json",
  ".github/workflows/ci.yml",
  ".github/workflows/external-scaffold.yml",
  "scripts/qualify-and-publish.ps1",
  "RELEASE_GATES.md",
  "SUBMISSION_PACKET.md",
  "packages/hardhat/package.json",
  "packages/hardhat/contracts/OracleGuardedSettlement.sol",
  "packages/hardhat/test/OracleGuardedSettlement.test.ts",
  "packages/nextjs/package.json",
  "packages/nextjs/app/page.tsx",
  "packages/nextjs/app/api/health/route.ts",
];
required.forEach(requireFile);

try {
  const manifest = JSON.parse(read("template.json"));
  const cfg = manifest["create-scaffold-hbar"];
  if (!cfg) fail("template:manifest", "missing create-scaffold-hbar object");
  else {
    const frontends = cfg.capabilities?.frontend ?? [];
    const frameworks = cfg.capabilities?.solidityFramework ?? [];
    const managers = cfg.capabilities?.packageManager ?? [];
    if (!frontends.includes("nextjs-app")) fail("template:frontend", "nextjs-app capability missing");
    else pass("template:frontend");
    if (!frameworks.includes("hardhat")) fail("template:hardhat", "hardhat capability missing");
    else pass("template:hardhat");
    if (managers.length !== 1 || managers[0] !== "npm") fail("template:npm-only", `unsupported package-manager capability: ${managers.join(",")}`);
    else pass("template:npm-only");
  }
} catch (error) {
  fail("template:json", String(error));
}

if (/MIT License/.test(read("LICENSE"))) pass("license:MIT");
else fail("license:MIT", "MIT text not found");

for (const needle of ["Supra", "Hedera Consensus Service", "Mirror Node", "testnet", "AGENTS.md"]) {
  if (read("README.md").includes(needle)) pass(`docs:${needle}`);
  else fail(`docs:${needle}`, "README coverage missing");
}

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", ".next", "artifacts", "cache"].includes(entry.name)) continue;
      out.push(...walk(absolute));
    } else {
      out.push(relative);
    }
  }
  return out;
}

const allFiles = walk(root);
const committedEnv = allFiles.filter((file) => /(^|\/)\.env($|\.)/.test(file) && !file.endsWith(".env.example"));
if (committedEnv.length === 0) pass("secrets:no-committed-env");
else fail("secrets:no-committed-env", committedEnv.join(", "));

const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".sol", ".md", ".json", ".yml", ".yaml", ".example"]);
const suspicious = [];
for (const rel of allFiles) {
  const ext = path.extname(rel);
  if (!textExtensions.has(ext) && !rel.endsWith(".env.example")) continue;
  const content = read(rel);
  const secretAssignment = /(PRIVATE_KEY|MNEMONIC|SEED_PHRASE|API_KEY|SECRET)\s*=\s*["']?(?!<|your_|example|changeme|\.\.\.|$)([^\s"']{24,})/gi;
  let match;
  while ((match = secretAssignment.exec(content)) !== null) {
    if (rel.endsWith(".env.example")) continue;
    suspicious.push(`${rel}:${match[1]}`);
  }
}
if (suspicious.length === 0) pass("secrets:static-scan");
else fail("secrets:static-scan", suspicious.join(", "));

if (/Math\.random\s*\(/.test(allFiles.map((rel) => {
  try { return read(rel); } catch { return ""; }
}).join("\n"))) fail("determinism:no-math-random", "Math.random found in source");
else pass("determinism:no-math-random");

const contract = read("packages/hardhat/contracts/OracleGuardedSettlement.sol");
for (const invariant of ["consumedIntents", "maxOracleAge", "evidenceCommitment", "ECDSA.recover", "SettlementExecuted"]) {
  if (contract.includes(invariant)) pass(`contract:${invariant}`);
  else fail(`contract:${invariant}`, "invariant marker missing");
}


const proofScript = read("packages/hardhat/scripts/prove-testnet.ts");
for (const marker of ["/api/v1/contracts/results/", "/api/v1/topics/", "topicSequenceNumber", "settlementEvidenceHash"]) {
  if (proofScript.includes(marker)) pass(`proof:${marker}`);
  else fail(`proof:${marker}`, "proof marker missing");
}

if (failures.length) {
  console.error(`\nSELF_CHECK=FAIL failures=${failures.length} passes=${passes.length}`);
  process.exit(1);
}
console.log(`\nSELF_CHECK=PASS passes=${passes.length}`);
