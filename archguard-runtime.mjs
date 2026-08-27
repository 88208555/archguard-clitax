import { createHash } from "node:crypto";
const __name = (target, value) =>
  Object.defineProperty(target, "name", { value, configurable: true });
const REQUEST_VERSION = "archguard.skill.request/1.0";
const RESPONSE_VERSION = "archguard.skill.response/1.0";
const COMPILER_VERSION = "v7.0.19";
const CONTRACT_VERSION = "archguard.contract/1.0";
const LEDGER_VERSION = "archguard.checkpoint-ledger/1.0";
const SHA256 = /^[0-9a-f]{64}$/;
const TEMPLATE_DEFINITIONS = Object.freeze({
  "react-ts-vite": {
    frontend: {
      language: "typescript",
      framework: "react-18",
      scaffold: "vite",
      uiLibrary: "antd-5",
      styling: "css-modules",
      stateManagement: "zustand",
      forbiddenDeps: ["jquery", "moment"],
    },
    backend: null,
  },
  "vue3-ts-vite": {
    frontend: {
      language: "typescript",
      framework: "vue-3",
      scaffold: "vite",
      uiLibrary: "element-plus",
      styling: "css-modules",
      stateManagement: "pinia",
      forbiddenDeps: ["jquery", "moment"],
    },
    backend: null,
  },
  "nextjs-ts": {
    frontend: {
      language: "typescript",
      framework: "nextjs-15",
      scaffold: "nextjs",
      uiLibrary: "antd-5",
      styling: "css-modules",
      stateManagement: "react-context",
      forbiddenDeps: ["jquery", "moment"],
    },
    backend: {
      language: "nodejs-20",
      framework: "nextjs-route-handlers",
      orm: "none",
      forbiddenDeps: ["request"],
      patterns: {
        required: ["schema-validation"],
        forbidden: ["raw-sql-concat"],
      },
    },
  },
  "node-nestjs": {
    frontend: null,
    backend: {
      language: "nodejs-20",
      framework: "nestjs-10",
      orm: "prisma",
      forbiddenDeps: ["request"],
      patterns: {
        required: ["dto-validation", "global-exception-filter"],
        forbidden: ["raw-sql-concat"],
      },
    },
  },
  "python-fastapi": {
    frontend: null,
    backend: {
      language: "python-3.12",
      framework: "fastapi",
      orm: "sqlalchemy",
      forbiddenDeps: ["pickle5"],
      patterns: {
        required: ["schema-validation"],
        forbidden: ["raw-sql-concat"],
      },
    },
  },
  "java-spring": {
    frontend: null,
    backend: {
      language: "java-21",
      framework: "spring-boot-3",
      orm: "jpa",
      forbiddenDeps: ["commons-logging"],
      patterns: {
        required: ["dto-validation", "global-exception-handler"],
        forbidden: ["raw-sql-concat"],
      },
    },
  },
  "wechat-miniprogram": {
    frontend: {
      language: "typescript",
      framework: "wechat-miniprogram",
      scaffold: "miniprogram",
      uiLibrary: "native",
      styling: "wxss",
      stateManagement: "page-state",
      forbiddenDeps: ["jquery"],
    },
    backend: null,
  },
  "tauri-react": {
    frontend: {
      language: "typescript",
      framework: "react-18",
      scaffold: "tauri-2",
      uiLibrary: "antd-5",
      styling: "css-modules",
      stateManagement: "zustand",
      forbiddenDeps: ["electron", "jquery"],
    },
    backend: {
      language: "rust-2024",
      framework: "tauri-2",
      orm: "none",
      forbiddenDeps: [],
      patterns: {
        required: ["command-boundary"],
        forbidden: ["unsafe-without-audit"],
      },
    },
  },
});
const DEFAULT_BUDGETS = Object.freeze({
  maxNestingDepth: 4,
  maxFileLines: 300,
  maxFunctionLines: 50,
  animations: 3,
  transitions: -1,
  bundleBudgetKB: 500,
});
const BUILTIN_RULES = Object.freeze([
  {
    id: "no-inline-style",
    category: "standard",
    pattern: /\bstyle\s*=\s*(?:\{\{|["'])/g,
    message: "Use the locked styling system instead of inline style.",
  },
  {
    id: "no-hardcoded-color",
    category: "standard",
    pattern: /#[0-9a-f]{3,8}\b|\brgb(?:a)?\s*\(|\bhsl(?:a)?\s*\(/gi,
    message: "Use project theme tokens instead of hardcoded colors.",
  },
  {
    id: "no-eval",
    category: "security",
    pattern: /\beval\s*\(|new\s+Function\b/g,
    message: "Dynamic code evaluation is forbidden.",
  },
  {
    id: "no-debug",
    category: "standard",
    pattern: /\bdebugger\b|\bconsole\.(?:log|debug)\s*\(/g,
    message: "Remove debug statements.",
  },
  {
    id: "no-magic-number",
    category: "standard",
    pattern: /(?:^|[^\w.])(?:[2-9]|[1-9]\d{1,})(?:\.\d+)?(?:[^\w.]|$)/g,
    message: "Name repeated or domain-significant numeric values.",
  },
]);
const OPERATIONS = Object.freeze([
  "capabilities",
  "help",
  "intake",
  "contract-create",
  "contract-get",
  "contract-update",
  "template-list",
  "checkpoint",
  "rules-scan",
  "complexity-report",
  "drift-status",
  "ledger-query",
]);
function objectSchema(properties, required = []) {
  return { type: "object", additionalProperties: false, properties, required };
}
__name(objectSchema, "objectSchema");
const ANY_OBJECT = { type: "object" };
const CONTRACT_SCHEMA = { type: "object", description: CONTRACT_VERSION };
const FILE_SCHEMA = objectSchema(
  { path: { type: "string" }, content: { type: "string" } },
  ["path", "content"],
);
const LEDGER_SCHEMA = { type: "array", items: { type: "object" } };
const OPERATION_SCHEMAS = Object.freeze({
  capabilities: objectSchema({}, []),
  help: objectSchema({}, []),
  intake: objectSchema(
    {
      project: { type: "string" },
      detectedFiles: { type: "array", items: { type: "string" } },
    },
    ["project"],
  ),
  "template-list": objectSchema({}, []),
  "contract-create": objectSchema(
    {
      project: { type: "string" },
      templateId: { type: "string" },
      overrides: ANY_OBJECT,
    },
    ["project", "templateId"],
  ),
  "contract-get": objectSchema({ contract: CONTRACT_SCHEMA }, ["contract"]),
  "contract-update": objectSchema(
    {
      contract: CONTRACT_SCHEMA,
      expectedDigest: { type: "string", pattern: SHA256.source },
      patch: ANY_OBJECT,
      confirmation: { const: "confirm-architecture-contract-update" },
      reason: { type: "string" },
      actor: { type: "string" },
    },
    ["contract", "expectedDigest", "patch", "confirmation", "reason", "actor"],
  ),
  checkpoint: objectSchema(
    {
      contract: CONTRACT_SCHEMA,
      block: objectSchema(
        {
          blockId: { type: "string" },
          path: { type: "string" },
          content: { type: "string" },
          beforeSha256: { type: "string", pattern: SHA256.source },
          astFindings: { type: "array", items: { type: "object" } },
        },
        ["blockId", "path", "content", "beforeSha256"],
      ),
      history: LEDGER_SCHEMA,
    },
    ["contract", "block", "history"],
  ),
  "rules-scan": objectSchema(
    {
      contract: CONTRACT_SCHEMA,
      files: { type: "array", minItems: 1, items: FILE_SCHEMA },
    },
    ["contract", "files"],
  ),
  "complexity-report": objectSchema(
    {
      contract: CONTRACT_SCHEMA,
      files: { type: "array", minItems: 1, items: FILE_SCHEMA },
    },
    ["contract", "files"],
  ),
  "drift-status": objectSchema({ ledger: LEDGER_SCHEMA }, ["ledger"]),
  "ledger-query": objectSchema(
    {
      ledger: LEDGER_SCHEMA,
      ruleId: { type: "string" },
      status: { enum: ["passed", "blocked"] },
    },
    ["ledger"],
  ),
});
function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value))
      throw new Error("JSON contains a non-finite number");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!value || typeof value !== "object")
    throw new Error("Value must be finite JSON");
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
    .join(",")}}`;
}
__name(canonicalJson, "canonicalJson");
function digest(value) {
  return (0, createHash)("sha256").update(canonicalJson(value)).digest("hex");
}
__name(digest, "digest");
function contentDigest(value) {
  return (0, createHash)("sha256").update(value).digest("hex");
}
__name(contentDigest, "contentDigest");
function text(value, context) {
  if (typeof value !== "string" || value !== value.trim() || !value)
    throw new Error(`${context} is required`);
  return value;
}
__name(text, "text");
function record(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${context} must be an object`);
  return value;
}
__name(record, "record");
function response(requestId, status, output, findings = []) {
  return {
    ok: true,
    schemaVersion: RESPONSE_VERSION,
    requestId,
    status,
    output,
    findings,
  };
}
__name(response, "response");
function finding(
  severity,
  ruleId,
  entityRef,
  message,
  category,
  blocking = true,
  evidence = {},
) {
  return { severity, ruleId, entityRef, message, category, blocking, evidence };
}
__name(finding, "finding");
function pathSafe(path) {
  return (
    typeof path === "string" &&
    path === path.normalize("NFC") &&
    !path.startsWith("/") &&
    !path.includes("\\") &&
    path.split("/").every((part) => part && part !== "." && part !== "..")
  );
}
__name(pathSafe, "pathSafe");
function normalizeCustomRule(value, index) {
  const rule = record(value, `rules.custom[${index}]`);
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text(rule.id, "custom rule id")) ||
    !["regex", "ast"].includes(rule.engine) ||
    typeof rule.pattern !== "string" ||
    rule.pattern.length > 500 ||
    (rule.engine === "regex" &&
      /\\[1-9]|\(\?<|\(\?=|\(\?!/.test(rule.pattern)) ||
    (rule.engine === "ast" && !/^[A-Za-z][A-Za-z0-9]*$/.test(rule.pattern))
  ) {
    throw new Error(`rules.custom[${index}] is unsafe or unsupported`);
  }
  if (rule.engine === "regex") new RegExp(rule.pattern, "gu");
  return {
    id: rule.id,
    engine: rule.engine,
    pattern: rule.pattern,
    message: text(rule.message, "custom rule message"),
    blocking: rule.blocking === true,
  };
}
__name(normalizeCustomRule, "normalizeCustomRule");
function normalizeContract(value) {
  const source = record(value, "contract");
  const template = TEMPLATE_DEFINITIONS[source.templateId];
  if (
    source.schemaVersion !== CONTRACT_VERSION ||
    !template ||
    !Number.isInteger(source.revision) ||
    source.revision < 1 ||
    !source.stack ||
    !source.rules ||
    !source.budgets ||
    !source.audit
  ) {
    throw new Error("architecture contract is invalid");
  }
  const custom = Array.isArray(source.rules.custom)
    ? source.rules.custom.map(normalizeCustomRule)
    : [];
  const blocking = Array.isArray(source.rules.blocking)
    ? [
        ...new Set(
          source.rules.blocking.map((rule) => text(rule, "blocking rule")),
        ),
      ].sort()
    : [];
  const budgets = Object.fromEntries(
    Object.keys(DEFAULT_BUDGETS).map((key) => {
      const amount = source.budgets[key];
      if (!Number.isInteger(amount) || amount < -1)
        throw new Error(`contract.budgets.${key} is invalid`);
      return [key, amount];
    }),
  );
  return {
    schemaVersion: CONTRACT_VERSION,
    contractId: text(source.contractId, "contractId"),
    project: text(source.project, "project"),
    templateId: source.templateId,
    revision: source.revision,
    stack: source.stack,
    rules: {
      blocking,
      strictStandard: source.rules.strictStandard === true,
      custom,
    },
    budgets,
    audit: source.audit,
  };
}
__name(normalizeContract, "normalizeContract");
function baseContract(project, templateId) {
  const template = TEMPLATE_DEFINITIONS[templateId];
  if (!template)
    throw new Error(`Unknown architecture template: ${templateId}`);
  return normalizeContract({
    schemaVersion: CONTRACT_VERSION,
    contractId: `${project}-architecture`,
    project,
    templateId,
    revision: 1,
    stack: template,
    rules: {
      blocking: ["no-eval", "no-debug"],
      strictStandard: false,
      custom: [],
    },
    budgets: DEFAULT_BUDGETS,
    audit: { createdBy: "archguard", reason: "initial-contract" },
  });
}
__name(baseContract, "baseContract");
function languageFindings(contract, file) {
  const findings = [];
  if (!pathSafe(file.path))
    return [
      finding(
        "P0",
        "ARCH-PATH",
        String(file.path),
        "File path is unsafe.",
        "architecture",
      ),
    ];
  if (file.path === "arch.contract.yaml")
    findings.push(
      finding(
        "P0",
        "ARCH-CONTRACT-MUTATION",
        file.path,
        "The locked architecture contract cannot be changed by checkpoint.",
        "architecture",
      ),
    );
  const languages = [
    contract.stack.frontend?.language,
    contract.stack.backend?.language,
  ].filter(Boolean);
  const extensions = new Set(
    languages.flatMap((language) =>
      language === "typescript"
        ? [".ts", ".tsx"]
        : language.startsWith("nodejs")
          ? [".js", ".mjs", ".cjs"]
          : language.startsWith("python")
            ? [".py"]
            : language.startsWith("java")
              ? [".java"]
              : language.startsWith("rust")
                ? [".rs"]
                : [],
    ),
  );
  const codeExtension = file.path.match(/\.[A-Za-z0-9]+$/)?.[0];
  if (
    codeExtension &&
    [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".rs"].includes(
      codeExtension,
    ) &&
    extensions.size &&
    !extensions.has(codeExtension)
  )
    findings.push(
      finding(
        "P0",
        "ARCH-LANGUAGE",
        file.path,
        `File extension ${codeExtension} is outside the locked languages.`,
        "architecture",
        true,
        { allowedExtensions: [...extensions] },
      ),
    );
  const forbidden = [
    ...(contract.stack.frontend?.forbiddenDeps ?? []),
    ...(contract.stack.backend?.forbiddenDeps ?? []),
  ];
  for (const dependency of forbidden) {
    const escaped = dependency.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (
      new RegExp(
        `(?:from\\s+|require\\(\\s*|import\\(\\s*)["']${escaped}(?:[\\/"'])`,
      ).test(file.content)
    ) {
      findings.push(
        finding(
          "P0",
          "ARCH-FORBIDDEN-DEPENDENCY",
          file.path,
          `Dependency ${dependency} is forbidden by the contract.`,
          "architecture",
          true,
          { dependency },
        ),
      );
    }
  }
  return findings;
}
__name(languageFindings, "languageFindings");
function ruleFindings(contract, file) {
  const findings = [];
  for (const rule of BUILTIN_RULES) {
    const matches = [
      ...file.content.matchAll(
        new RegExp(rule.pattern.source, rule.pattern.flags),
      ),
    ];
    if (!matches.length) continue;
    const blocking =
      rule.category === "security" ||
      contract.rules.strictStandard ||
      contract.rules.blocking.includes(rule.id);
    findings.push(
      finding(
        blocking ? "P1" : "P2",
        rule.id,
        file.path,
        rule.message,
        rule.category,
        blocking,
        { matches: matches.length },
      ),
    );
  }
  for (const rule of contract.rules.custom) {
    if (rule.engine !== "regex") continue;
    const matches = [...file.content.matchAll(new RegExp(rule.pattern, "gu"))];
    if (matches.length)
      findings.push(
        finding(
          rule.blocking ? "P1" : "P2",
          rule.id,
          file.path,
          rule.message,
          "custom",
          rule.blocking,
          { matches: matches.length },
        ),
      );
  }
  return findings;
}
__name(ruleFindings, "ruleFindings");
function complexity(file) {
  const lines = file.content.split(/\r?\n/);
  let depth = 0;
  let maximumDepth = 0;
  let functionStart = null;
  let maximumFunctionLines = 0;
  for (const [index, line] of lines.entries()) {
    if (
      functionStart === null &&
      /\bfunction\b|=>\s*\{|\b(?:public|private|protected)?\s*(?:async\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/.test(
        line,
      )
    )
      functionStart = { line: index, depth };
    for (const character of line.replace(/(['"`]).*?\1/g, "")) {
      if (character === "{") {
        depth += 1;
        maximumDepth = Math.max(maximumDepth, depth);
      } else if (character === "}") depth = Math.max(0, depth - 1);
    }
    if (functionStart && depth <= functionStart.depth) {
      maximumFunctionLines = Math.max(
        maximumFunctionLines,
        index - functionStart.line + 1,
      );
      functionStart = null;
    }
  }
  if (functionStart)
    maximumFunctionLines = Math.max(
      maximumFunctionLines,
      lines.length - functionStart.line,
    );
  return {
    path: file.path,
    fileLines: lines.length,
    maxNestingDepth: maximumDepth,
    maxFunctionLines: maximumFunctionLines,
    animations: (
      file.content.match(/@keyframes\b|\banimation(?:-name)?\s*:/g) ?? []
    ).length,
    transitions: (file.content.match(/\btransition(?:-property)?\s*:/g) ?? [])
      .length,
  };
}
__name(complexity, "complexity");
function complexityFindings(contract, metric) {
  const checks = [
    ["maxFileLines", "fileLines"],
    ["maxNestingDepth", "maxNestingDepth"],
    ["maxFunctionLines", "maxFunctionLines"],
    ["animations", "animations"],
    ["transitions", "transitions"],
  ];
  return checks.flatMap(([budgetKey, metricKey]) =>
    contract.budgets[budgetKey] >= 0 &&
    metric[metricKey] > contract.budgets[budgetKey]
      ? [
          finding(
            "P1",
            `BUDGET-${budgetKey.toUpperCase()}`,
            metric.path,
            `${metricKey} ${metric[metricKey]} exceeds budget ${contract.budgets[budgetKey]}.`,
            "complexity",
            true,
            { actual: metric[metricKey], budget: contract.budgets[budgetKey] },
          ),
        ]
      : [],
  );
}
__name(complexityFindings, "complexityFindings");
function scanFiles(contract, files) {
  if (!Array.isArray(files) || !files.length)
    throw new Error("files must be non-empty");
  const metrics = files.map((file) => complexity(record(file, "file")));
  const findings = files
    .flatMap((file) => [
      ...languageFindings(contract, file),
      ...ruleFindings(contract, file),
    ])
    .concat(metrics.flatMap((metric) => complexityFindings(contract, metric)));
  return { findings, metrics };
}
__name(scanFiles, "scanFiles");
function driftState(ledger) {
  if (!Array.isArray(ledger)) throw new Error("ledger must be an array");
  const recent = ledger.slice(-10);
  const ruleCounts = new Map();
  for (const entry of recent)
    for (const ruleId of entry.ruleIds ?? [])
      ruleCounts.set(ruleId, (ruleCounts.get(ruleId) ?? 0) + 1);
  const repeated = [...ruleCounts.entries()]
    .filter(([, count]) => count >= 3)
    .map(([ruleId]) => ruleId)
    .sort();
  const blocked = recent.filter((entry) => entry.status === "blocked").length;
  const trend = repeated.length
    ? "red"
    : recent.length >= 3 && blocked / recent.length >= 0.34
      ? "yellow"
      : "green";
  return {
    trend,
    totalBlocks: ledger.length,
    recentBlocks: recent.length,
    blockedBlocks: blocked,
    violationRate: recent.length
      ? Math.round((blocked / recent.length) * 1e3) / 10
      : 0,
    repeatedRuleIds: repeated,
    action:
      trend === "red"
        ? "interrupt-and-request-human-confirmation"
        : trend === "yellow"
          ? "warn-and-correct-next-block"
          : "continue",
  };
}
__name(driftState, "driftState");
function checkpoint(contract, block, history) {
  if (
    !pathSafe(block.path) ||
    typeof block.content !== "string" ||
    !SHA256.test(block.beforeSha256)
  )
    throw new Error("checkpoint block is invalid");
  const scan = scanFiles(contract, [
    { path: block.path, content: block.content },
  ]);
  const astRules = contract.rules.custom.filter(
    (rule) => rule.engine === "ast",
  );
  if (astRules.length && !Array.isArray(block.astFindings)) {
    scan.findings.push(
      finding(
        "P1",
        "ARCH-AST-LOCAL-RUNNER-REQUIRED",
        block.path,
        "AST custom rules require the bundled local checkpoint runner.",
        "custom",
        true,
        { ruleIds: astRules.map((rule) => rule.id) },
      ),
    );
  } else if (Array.isArray(block.astFindings)) {
    for (const item of block.astFindings)
      scan.findings.push(record(item, "AST finding"));
  }
  const blocking = scan.findings.filter((item) => item.blocking);
  const entry = {
    schemaVersion: LEDGER_VERSION,
    checkpointId: digest({ contract: digest(contract), block }),
    blockId: text(block.blockId, "blockId"),
    path: block.path,
    contractRevision: contract.revision,
    beforeSha256: block.beforeSha256,
    afterSha256: contentDigest(block.content),
    status: blocking.length ? "blocked" : "passed",
    ruleIds: scan.findings.map((item) => item.ruleId).sort(),
    rollbackRequired: blocking.length > 0,
  };
  const drift = driftState([...history, entry]);
  if (drift.trend === "red") entry.rollbackRequired = true;
  return {
    checkpoint: {
      status: entry.rollbackRequired ? "blocked" : "passed",
      writeAllowed: !entry.rollbackRequired,
      rollbackRequired: entry.rollbackRequired,
      findings: scan.findings,
      metrics: scan.metrics[0],
      drift,
      instruction:
        drift.trend === "red"
          ? "rollback-block-and-interrupt-aimlock"
          : entry.rollbackRequired
            ? "rollback-block-and-correct"
            : "accept-block",
    },
    ledgerEntry: entry,
  };
}
__name(checkpoint, "checkpoint");
function capabilities() {
  return {
    skill: { name: "archguard", version: COMPILER_VERSION },
    operations: OPERATIONS,
    operationSchemas: Object.fromEntries(
      OPERATIONS.map((name) => [
        name,
        { input: OPERATION_SCHEMAS[name], output: { type: "object" } },
      ]),
    ),
    contractSchemaVersion: CONTRACT_VERSION,
    ledgerSchemaVersion: LEDGER_VERSION,
    templates: Object.keys(TEMPLATE_DEFINITIONS),
    nextStep: {
      operation: "intake",
      instruction:
        "Detect the project stack and lock an architecture contract before code generation.",
    },
  };
}
__name(capabilities, "capabilities");
async function run(request) {
  if (
    !request ||
    request.schemaVersion !== REQUEST_VERSION ||
    typeof request.requestId !== "string" ||
    !OPERATIONS.includes(request.operation) ||
    !request.input ||
    typeof request.input !== "object"
  ) {
    throw new Error("Invalid ArchGuard request envelope");
  }
  const { requestId, operation, input } = request;
  if (operation === "capabilities" || operation === "help")
    return response(requestId, "succeeded", capabilities());
  if (operation === "template-list")
    return response(requestId, "succeeded", {
      templates: Object.entries(TEMPLATE_DEFINITIONS).map(
        ([templateId, stack]) => ({ templateId, stack }),
      ),
      nextStep: { operation: "contract-create" },
    });
  if (operation === "intake")
    return response(requestId, "succeeded", {
      questions: [
        {
          id: "templateId",
          prompt: "Which detected stack template must be locked?",
          required: true,
          options: Object.keys(TEMPLATE_DEFINITIONS),
        },
        {
          id: "strictStandard",
          prompt: "Should standard-level findings block writes?",
          required: true,
          options: [false, true],
        },
        {
          id: "budgets",
          prompt:
            "Confirm file, function, nesting, effect, and bundle budgets.",
          required: true,
        },
      ],
      project: text(input.project, "project"),
      nextStep: { operation: "contract-create" },
    });
  if (operation === "contract-create") {
    const contract = baseContract(
      text(input.project, "project"),
      text(input.templateId, "templateId"),
    );
    const merged = input.overrides
      ? normalizeContract({
          ...contract,
          ...input.overrides,
          stack: { ...contract.stack, ...(input.overrides.stack ?? {}) },
          rules: { ...contract.rules, ...(input.overrides.rules ?? {}) },
          budgets: { ...contract.budgets, ...(input.overrides.budgets ?? {}) },
        })
      : contract;
    return response(requestId, "succeeded", {
      contract: merged,
      digest: digest(merged),
      nextStep: { operation: "checkpoint" },
    });
  }
  if (operation === "contract-get") {
    const contract = normalizeContract(input.contract);
    return response(requestId, "succeeded", {
      contract,
      digest: digest(contract),
    });
  }
  if (operation === "contract-update") {
    const contract = normalizeContract(input.contract);
    if (
      input.expectedDigest !== digest(contract) ||
      input.confirmation !== "confirm-architecture-contract-update"
    )
      throw new Error("Contract update authority is invalid");
    const updated = normalizeContract({
      ...contract,
      ...record(input.patch, "patch"),
      revision: contract.revision + 1,
      audit: {
        updatedBy: text(input.actor, "actor"),
        reason: text(input.reason, "reason"),
        previousDigest: input.expectedDigest,
      },
    });
    return response(requestId, "succeeded", {
      contract: updated,
      digest: digest(updated),
      audit: updated.audit,
    });
  }
  if (operation === "checkpoint") {
    const contract = normalizeContract(input.contract);
    const output = checkpoint(contract, input.block, input.history ?? []);
    return response(
      requestId,
      output.checkpoint.status === "passed" ? "succeeded" : "blocked",
      output,
      output.checkpoint.findings,
    );
  }
  if (operation === "rules-scan" || operation === "complexity-report") {
    const contract = normalizeContract(input.contract);
    const scan = scanFiles(contract, input.files);
    const output =
      operation === "rules-scan"
        ? {
            findings: scan.findings,
            summary: {
              total: scan.findings.length,
              blocking: scan.findings.filter((item) => item.blocking).length,
            },
          }
        : {
            metrics: scan.metrics,
            findings: scan.findings.filter(
              (item) => item.category === "complexity",
            ),
          };
    return response(
      requestId,
      scan.findings.some((item) => item.blocking) ? "blocked" : "succeeded",
      output,
      scan.findings,
    );
  }
  if (operation === "drift-status")
    return response(requestId, "succeeded", {
      drift: driftState(input.ledger),
    });
  const entries = input.ledger.filter(
    (entry) =>
      (!input.ruleId || entry.ruleIds?.includes(input.ruleId)) &&
      (!input.status || entry.status === input.status),
  );
  return response(requestId, "succeeded", {
    schemaVersion: LEDGER_VERSION,
    entries,
    total: entries.length,
  });
}
__name(run, "run");
export {
  CONTRACT_VERSION,
  LEDGER_VERSION,
  OPERATION_SCHEMAS,
  TEMPLATE_DEFINITIONS,
  run,
};
