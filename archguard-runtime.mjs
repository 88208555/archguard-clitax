import { createHash } from 'node:crypto'

const REQUEST_VERSION = 'archguard.skill.request/1.0'
const RESPONSE_VERSION = 'archguard.skill.response/1.0'
const COMPILER_VERSION = 'v7.0.30'
const CONTRACT_VERSION = 'archguard.contract/1.0'
const LEDGER_VERSION = 'archguard.checkpoint-ledger/1.0'
const SHA256 = /^[0-9a-f]{64}$/
const stringSchema = { type: 'string' }
const booleanSchema = { type: 'boolean' }
const integerSchema = { type: 'integer' }
const stringArraySchema = { type: 'array', items: stringSchema }
const strict = (properties, required = []) => ({ type: 'object', additionalProperties: false, properties, required })

const TEMPLATE_DEFINITIONS = Object.freeze({
  'react-ts-vite': { frontend: { language: 'typescript', framework: 'react-18', scaffold: 'vite', uiLibrary: 'antd-5', styling: 'css-modules', stateManagement: 'zustand', forbiddenDeps: ['jquery', 'moment'] }, backend: null },
  'vue3-ts-vite': { frontend: { language: 'typescript', framework: 'vue-3', scaffold: 'vite', uiLibrary: 'element-plus', styling: 'css-modules', stateManagement: 'pinia', forbiddenDeps: ['jquery', 'moment'] }, backend: null },
  'nextjs-ts': { frontend: { language: 'typescript', framework: 'nextjs-15', scaffold: 'nextjs', uiLibrary: 'antd-5', styling: 'css-modules', stateManagement: 'react-context', forbiddenDeps: ['jquery', 'moment'] }, backend: { language: 'nodejs-20', framework: 'nextjs-route-handlers', orm: 'none', forbiddenDeps: ['request'], patterns: { required: ['schema-validation'], forbidden: ['raw-sql-concat'] } } },
  'node-nestjs': { frontend: null, backend: { language: 'nodejs-20', framework: 'nestjs-10', orm: 'prisma', forbiddenDeps: ['request'], patterns: { required: ['dto-validation', 'global-exception-filter'], forbidden: ['raw-sql-concat'] } } },
  'python-fastapi': { frontend: null, backend: { language: 'python-3.12', framework: 'fastapi', orm: 'sqlalchemy', forbiddenDeps: ['pickle5'], patterns: { required: ['schema-validation'], forbidden: ['raw-sql-concat'] } } },
  'java-spring': { frontend: null, backend: { language: 'java-21', framework: 'spring-boot-3', orm: 'jpa', forbiddenDeps: ['commons-logging'], patterns: { required: ['dto-validation', 'global-exception-handler'], forbidden: ['raw-sql-concat'] } } },
  'wechat-miniprogram': { frontend: { language: 'typescript', framework: 'wechat-miniprogram', scaffold: 'miniprogram', uiLibrary: 'native', styling: 'wxss', stateManagement: 'page-state', forbiddenDeps: ['jquery'] }, backend: null },
  'tauri-react': { frontend: { language: 'typescript', framework: 'react-18', scaffold: 'tauri-2', uiLibrary: 'antd-5', styling: 'css-modules', stateManagement: 'zustand', forbiddenDeps: ['electron', 'jquery'] }, backend: { language: 'rust-2024', framework: 'tauri-2', orm: 'none', forbiddenDeps: [], patterns: { required: ['command-boundary'], forbidden: ['unsafe-without-audit'] } } },
})
const DEFAULT_BUDGETS = Object.freeze({ maxNestingDepth: 4, maxFileLines: 300, maxFunctionLines: 50, animations: 3, transitions: -1, bundleBudgetKB: 500 })
const BUILTIN_RULES = Object.freeze([
  { id: 'no-inline-style', category: 'standard', pattern: /\bstyle\s*=\s*(?:\{\{|["'])/g, message: 'Use the locked styling system instead of inline style.' },
  { id: 'no-hardcoded-color', category: 'standard', pattern: /#[0-9a-f]{3,8}\b|\brgb(?:a)?\s*\(|\bhsl(?:a)?\s*\(/gi, message: 'Use project theme tokens instead of hardcoded colors.' },
  { id: 'no-eval', category: 'security', pattern: /\beval\s*\(|new\s+Function\b/g, message: 'Dynamic code evaluation is forbidden.' },
  { id: 'no-debug', category: 'standard', pattern: /\bdebugger\b|\bconsole\.(?:log|debug)\s*\(/g, message: 'Remove debug statements.' },
  { id: 'no-magic-number', category: 'standard', pattern: /(?:^|[^\w.])(?:[2-9]|[1-9]\d{1,})(?:\.\d+)?(?:[^\w.]|$)/g, message: 'Name repeated or domain-significant numeric values.' },
])
const OPERATIONS = Object.freeze(['capabilities', 'help', 'intake', 'contract-create', 'contract-get', 'contract-update', 'template-list', 'checkpoint', 'rules-scan', 'complexity-report', 'drift-status', 'ledger-query'])

const patternSchema = strict({ required: stringArraySchema, forbidden: stringArraySchema }, ['required', 'forbidden'])
const stackSideSchema = strict({ language: stringSchema, framework: stringSchema, scaffold: stringSchema, uiLibrary: stringSchema, styling: stringSchema, stateManagement: stringSchema, orm: stringSchema, forbiddenDeps: stringArraySchema, patterns: patternSchema }, ['language', 'framework', 'forbiddenDeps'])
const stackSchema = strict({ frontend: { anyOf: [stackSideSchema, { type: 'null' }] }, backend: { anyOf: [stackSideSchema, { type: 'null' }] } }, ['frontend', 'backend'])
const ruleSchema = strict({ id: stringSchema, engine: { enum: ['regex', 'ast'] }, pattern: stringSchema, message: stringSchema, blocking: booleanSchema }, ['id', 'engine', 'pattern', 'message', 'blocking'])
const rulesSchema = strict({ blocking: stringArraySchema, strictStandard: booleanSchema, custom: { type: 'array', items: ruleSchema } }, ['blocking', 'strictStandard', 'custom'])
const budgetSchema = strict(Object.fromEntries(Object.keys(DEFAULT_BUDGETS).map((key) => [key, integerSchema])), Object.keys(DEFAULT_BUDGETS))
const auditSchema = { type: 'object', additionalProperties: { type: 'string' }, minProperties: 1 }
const CONTRACT_SCHEMA = strict({ schemaVersion: { const: CONTRACT_VERSION }, contractId: stringSchema, project: stringSchema, templateId: { enum: Object.keys(TEMPLATE_DEFINITIONS) }, revision: { type: 'integer', minimum: 1 }, stack: stackSchema, rules: rulesSchema, budgets: budgetSchema, audit: auditSchema }, ['schemaVersion', 'contractId', 'project', 'templateId', 'revision', 'stack', 'rules', 'budgets', 'audit'])
const overrideSchema = strict({ stack: stackSchema, rules: rulesSchema, budgets: budgetSchema, audit: auditSchema })
const fileSchema = strict({ path: stringSchema, content: stringSchema }, ['path', 'content'])
const findingSchema = strict({ severity: { enum: ['P0', 'P1', 'P2'] }, ruleId: stringSchema, entityRef: stringSchema, message: stringSchema, category: stringSchema, blocking: booleanSchema, evidence: { type: 'object', additionalProperties: true } }, ['severity', 'ruleId', 'entityRef', 'message', 'category', 'blocking', 'evidence'])
const metricSchema = strict({ path: stringSchema, fileLines: integerSchema, maxNestingDepth: integerSchema, maxFunctionLines: integerSchema, animations: integerSchema, transitions: integerSchema }, ['path', 'fileLines', 'maxNestingDepth', 'maxFunctionLines', 'animations', 'transitions'])
const ledgerEntrySchema = strict({ schemaVersion: { const: LEDGER_VERSION }, checkpointId: stringSchema, blockId: stringSchema, path: stringSchema, contractRevision: integerSchema, beforeSha256: { type: 'string', pattern: SHA256.source }, afterSha256: { type: 'string', pattern: SHA256.source }, status: { enum: ['passed', 'blocked'] }, ruleIds: stringArraySchema, blockingRuleIds: stringArraySchema, rollbackRequired: booleanSchema }, ['schemaVersion', 'checkpointId', 'blockId', 'path', 'contractRevision', 'beforeSha256', 'afterSha256', 'status', 'ruleIds', 'blockingRuleIds', 'rollbackRequired'])
const ledgerSchema = { type: 'array', items: ledgerEntrySchema }
const digestSchema = { type: 'string', pattern: SHA256.source }
const nextSchema = strict({ operation: stringSchema, instruction: stringSchema }, ['operation'])
const driftSchema = strict({ trend: { enum: ['green', 'yellow', 'red'] }, totalBlocks: integerSchema, recentBlocks: integerSchema, blockedBlocks: integerSchema, violationRate: { type: 'number' }, consecutiveBlocks: integerSchema, repeatedRuleIds: stringArraySchema, action: stringSchema }, ['trend', 'totalBlocks', 'recentBlocks', 'blockedBlocks', 'violationRate', 'consecutiveBlocks', 'repeatedRuleIds', 'action'])
const checkpointOutputSchema = strict({ checkpoint: strict({ status: { enum: ['passed', 'blocked'] }, writeAllowed: booleanSchema, rollbackRequired: booleanSchema, findings: { type: 'array', items: findingSchema }, metrics: metricSchema, drift: driftSchema, instruction: stringSchema }, ['status', 'writeAllowed', 'rollbackRequired', 'findings', 'metrics', 'drift', 'instruction']), ledgerEntry: ledgerEntrySchema }, ['checkpoint', 'ledgerEntry'])
const scanInputSchema = strict({ contract: CONTRACT_SCHEMA, files: { type: 'array', minItems: 1, items: fileSchema } }, ['contract', 'files'])
const emptySchema = strict({})
const objectSchemaDescriptor = strict({ type: { const: 'object' }, additionalProperties: booleanSchema, properties: { type: 'object', additionalProperties: true }, required: stringArraySchema }, ['type', 'additionalProperties', 'properties', 'required'])
const schemaPair = strict({ input: objectSchemaDescriptor, output: objectSchemaDescriptor }, ['input', 'output'])
const capabilitiesOutputSchema = strict({ skill: strict({ name: stringSchema, version: stringSchema }, ['name', 'version']), operations: stringArraySchema, operationSchemas: { type: 'object', additionalProperties: schemaPair }, contractSchemaVersion: stringSchema, ledgerSchemaVersion: stringSchema, templates: stringArraySchema, executionBoundary: stringSchema, nextStep: nextSchema }, ['skill', 'operations', 'operationSchemas', 'contractSchemaVersion', 'ledgerSchemaVersion', 'templates', 'executionBoundary', 'nextStep'])
const OPERATION_SCHEMAS = Object.freeze({
  capabilities: { input: emptySchema, output: capabilitiesOutputSchema },
  help: { input: emptySchema, output: capabilitiesOutputSchema },
  intake: { input: strict({ project: stringSchema, detectedFiles: stringArraySchema }, ['project']), output: strict({ project: stringSchema, questions: { type: 'array', items: strict({ id: stringSchema, prompt: stringSchema, required: booleanSchema, options: { type: 'array' } }, ['id', 'prompt', 'required']) }, nextStep: nextSchema }, ['project', 'questions', 'nextStep']) },
  'contract-create': { input: strict({ project: stringSchema, templateId: { enum: Object.keys(TEMPLATE_DEFINITIONS) }, overrides: overrideSchema }, ['project', 'templateId']), output: strict({ contract: CONTRACT_SCHEMA, digest: digestSchema, nextStep: nextSchema }, ['contract', 'digest', 'nextStep']) },
  'contract-get': { input: strict({ contract: CONTRACT_SCHEMA }, ['contract']), output: strict({ contract: CONTRACT_SCHEMA, digest: digestSchema }, ['contract', 'digest']) },
  'contract-update': { input: strict({ contract: CONTRACT_SCHEMA, expectedDigest: digestSchema, patch: overrideSchema, confirmation: { const: 'confirm-architecture-contract-update' }, reason: stringSchema, actor: stringSchema }, ['contract', 'expectedDigest', 'patch', 'confirmation', 'reason', 'actor']), output: strict({ contract: CONTRACT_SCHEMA, digest: digestSchema, audit: auditSchema }, ['contract', 'digest', 'audit']) },
  'template-list': { input: emptySchema, output: strict({ templates: { type: 'array', items: strict({ templateId: stringSchema, stack: stackSchema }, ['templateId', 'stack']) }, nextStep: nextSchema }, ['templates', 'nextStep']) },
  checkpoint: { input: strict({ contract: CONTRACT_SCHEMA, block: strict({ blockId: stringSchema, path: stringSchema, content: stringSchema, beforeSha256: digestSchema }, ['blockId', 'path', 'content', 'beforeSha256']), history: ledgerSchema }, ['contract', 'block', 'history']), output: checkpointOutputSchema },
  'rules-scan': { input: scanInputSchema, output: strict({ findings: { type: 'array', items: findingSchema }, summary: strict({ total: integerSchema, blocking: integerSchema }, ['total', 'blocking']) }, ['findings', 'summary']) },
  'complexity-report': { input: scanInputSchema, output: strict({ metrics: { type: 'array', items: metricSchema }, findings: { type: 'array', items: findingSchema } }, ['metrics', 'findings']) },
  'drift-status': { input: strict({ ledger: ledgerSchema }, ['ledger']), output: strict({ drift: driftSchema }, ['drift']) },
  'ledger-query': { input: strict({ ledger: ledgerSchema, ruleId: stringSchema, status: { enum: ['passed', 'blocked'] } }, ['ledger']), output: strict({ schemaVersion: { const: LEDGER_VERSION }, entries: ledgerSchema, total: integerSchema }, ['schemaVersion', 'entries', 'total']) },
})

function canonicalJson(value) {
  if (value === null || ['string', 'boolean'].includes(typeof value)) return JSON.stringify(value)
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('JSON contains a non-finite number')
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (!value || typeof value !== 'object') throw new Error('Value must be finite JSON')
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`
}
const digest = (value) => createHash('sha256').update(canonicalJson(value)).digest('hex')
const contentDigest = (value) => createHash('sha256').update(value).digest('hex')
function text(value, context) {
  if (typeof value !== 'string' || value !== value.trim() || !value) throw new Error(`${context} is required`)
  return value
}
function record(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${context} must be an object`)
  return value
}
const response = (requestId, status, output, findings = []) => ({ ok: true, schemaVersion: RESPONSE_VERSION, requestId, status, output, findings })
const finding = (severity, ruleId, entityRef, message, category, blocking = true, evidence = {}) => ({ severity, ruleId, entityRef, message, category, blocking, evidence })
const pathSafe = (path) => typeof path === 'string' && path === path.normalize('NFC') && !path.startsWith('/') && !path.includes('\\') && path.split('/').every((part) => part && part !== '.' && part !== '..')

function normalizeCustomRule(value, index) {
  const rule = record(value, `rules.custom[${index}]`)
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(text(rule.id, 'custom rule id')) || !['regex', 'ast'].includes(rule.engine) || typeof rule.pattern !== 'string' || rule.pattern.length > 500 || (rule.engine === 'regex' && /\\[1-9]|\(\?<|\(\?=|\(\?!/.test(rule.pattern)) || (rule.engine === 'ast' && !/^[A-Za-z][A-Za-z0-9]*$/.test(rule.pattern))) throw new Error(`rules.custom[${index}] is unsafe or unsupported`)
  if (rule.engine === 'regex') new RegExp(rule.pattern, 'gu')
  return { id: rule.id, engine: rule.engine, pattern: rule.pattern, message: text(rule.message, 'custom rule message'), blocking: rule.blocking === true }
}
function normalizeContract(value) {
  const source = record(value, 'contract')
  if (source.schemaVersion !== CONTRACT_VERSION || !TEMPLATE_DEFINITIONS[source.templateId] || !Number.isInteger(source.revision) || source.revision < 1 || !source.stack || !source.rules || !source.budgets || !source.audit) throw new Error('architecture contract is invalid')
  const custom = Array.isArray(source.rules.custom) ? source.rules.custom.map(normalizeCustomRule) : []
  const blocking = Array.isArray(source.rules.blocking) ? [...new Set(source.rules.blocking.map((rule) => text(rule, 'blocking rule')))].sort() : []
  const budgets = Object.fromEntries(Object.keys(DEFAULT_BUDGETS).map((key) => {
    const amount = source.budgets[key]
    if (!Number.isInteger(amount) || amount < -1) throw new Error(`contract.budgets.${key} is invalid`)
    return [key, amount]
  }))
  return { schemaVersion: CONTRACT_VERSION, contractId: text(source.contractId, 'contractId'), project: text(source.project, 'project'), templateId: source.templateId, revision: source.revision, stack: source.stack, rules: { blocking, strictStandard: source.rules.strictStandard === true, custom }, budgets, audit: record(source.audit, 'audit') }
}
function baseContract(project, templateId) {
  const stack = TEMPLATE_DEFINITIONS[templateId]
  if (!stack) throw new Error(`Unknown architecture template: ${templateId}`)
  return normalizeContract({ schemaVersion: CONTRACT_VERSION, contractId: `${project}-architecture`, project, templateId, revision: 1, stack, rules: { blocking: ['no-eval', 'no-debug'], strictStandard: false, custom: [] }, budgets: DEFAULT_BUDGETS, audit: { createdBy: 'archguard', reason: 'initial-contract' } })
}
function forbiddenDependencies(contract) {
  return [...new Set([...(contract.stack.frontend?.forbiddenDeps ?? []), ...(contract.stack.backend?.forbiddenDeps ?? [])])]
}
const dependencyKey = (value) => value.toLowerCase().replace(/[._]+/g, '-')
function dependencyMatches(actual, forbidden) {
  const actualParts = actual.split(':')
  return dependencyKey(actual) === dependencyKey(forbidden) || dependencyKey(actualParts.at(-1)) === dependencyKey(forbidden)
}
function manifestDependencies(file) {
  if (/(^|\/)package\.json$/i.test(file.path)) {
    const manifest = record(JSON.parse(file.content), 'package.json')
    return ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'].flatMap((key) => Object.keys(manifest[key] ?? {}))
  }
  if (/(^|\/)requirements(?:-[^/]*)?\.txt$/i.test(file.path)) return file.content.split(/\r?\n/).map((line) => line.replace(/\s+#.*$/, '').trim()).filter((line) => line && !line.startsWith('-')).map((line) => line.split(/[<>=!~\[;\s]/, 1)[0])
  if (/(^|\/)pom\.xml$/i.test(file.path)) return [...file.content.matchAll(/<dependency\b[\s\S]*?<artifactId>\s*([^<\s]+)\s*<\/artifactId>[\s\S]*?<\/dependency>/gi)].map((match) => match[1])
  if (/(^|\/)Cargo\.toml$/.test(file.path)) {
    let dependencySection = false
    return file.content.split(/\r?\n/).flatMap((line) => {
      const section = line.trim().match(/^\[([^\]]+)]$/)
      if (section) dependencySection = /(^|\.)((dev|build)-)?dependencies$/.test(section[1])
      const dependency = dependencySection ? line.match(/^\s*([A-Za-z0-9_-]+)\s*=/)?.[1] : undefined
      return dependency ? [dependency] : []
    })
  }
  return []
}
function dependencyFindings(contract, file) {
  const forbidden = forbiddenDependencies(contract)
  let declared
  try {
    declared = manifestDependencies(file)
  } catch (error) {
    return [finding('P0', 'ARCH-DEPENDENCY-MANIFEST-INVALID', file.path, error instanceof Error ? error.message : 'Dependency manifest is invalid.', 'architecture')]
  }
  const found = new Set()
  for (const dependency of forbidden) {
    const escaped = dependency.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const imported = new RegExp(`(?:from\\s+|require\\(\\s*|import\\(\\s*)["']${escaped}(?:[\\/"'])`).test(file.content)
    if (imported || declared.some((item) => dependencyMatches(item, dependency))) found.add(dependency)
  }
  return [...found].map((dependency) => finding('P0', 'ARCH-FORBIDDEN-DEPENDENCY', file.path, `Dependency ${dependency} is forbidden by the contract.`, 'architecture', true, { dependency }))
}
function languageFindings(contract, file) {
  if (!pathSafe(file.path)) return [finding('P0', 'ARCH-PATH', String(file.path), 'File path is unsafe.', 'architecture')]
  const findings = []
  if (file.path === 'arch.contract.yaml') findings.push(finding('P0', 'ARCH-CONTRACT-MUTATION', file.path, 'The locked architecture contract cannot be changed by checkpoint.', 'architecture'))
  const languages = [contract.stack.frontend?.language, contract.stack.backend?.language].filter(Boolean)
  const extensions = new Set(languages.flatMap((language) => language === 'typescript' ? ['.ts', '.tsx'] : language.startsWith('nodejs') ? ['.js', '.mjs', '.cjs'] : language.startsWith('python') ? ['.py'] : language.startsWith('java') ? ['.java'] : language.startsWith('rust') ? ['.rs'] : []))
  const codeExtension = file.path.match(/\.[A-Za-z0-9]+$/)?.[0]
  if (codeExtension && ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.rs'].includes(codeExtension) && extensions.size && !extensions.has(codeExtension)) findings.push(finding('P0', 'ARCH-LANGUAGE', file.path, `File extension ${codeExtension} is outside the locked languages.`, 'architecture', true, { allowedExtensions: [...extensions] }))
  return findings.concat(dependencyFindings(contract, file))
}
function ruleFindings(contract, file) {
  const findings = []
  for (const rule of BUILTIN_RULES) {
    const matches = [...file.content.matchAll(new RegExp(rule.pattern.source, rule.pattern.flags))]
    if (!matches.length) continue
    const blocking = rule.category === 'security' || contract.rules.strictStandard || contract.rules.blocking.includes(rule.id)
    findings.push(finding(blocking ? 'P1' : 'P2', rule.id, file.path, rule.message, rule.category, blocking, { matches: matches.length }))
  }
  for (const rule of contract.rules.custom) {
    if (rule.engine !== 'regex') continue
    const matches = [...file.content.matchAll(new RegExp(rule.pattern, 'gu'))]
    if (matches.length) findings.push(finding(rule.blocking ? 'P1' : 'P2', rule.id, file.path, rule.message, 'custom', rule.blocking, { matches: matches.length }))
  }
  return findings
}
function complexity(file) {
  const lines = file.content.split(/\r?\n/)
  let depth = 0; let maximumDepth = 0; let functionStart = null; let maximumFunctionLines = 0
  for (const [index, line] of lines.entries()) {
    if (functionStart === null && /\bfunction\b|=>\s*\{|\b(?:public|private|protected)?\s*(?:async\s+)?[A-Za-z_$][\w$]*\s*\([^)]*\)\s*\{/.test(line)) functionStart = { line: index, depth }
    for (const character of line.replace(/(['"`]).*?\1/g, '')) {
      if (character === '{') { depth += 1; maximumDepth = Math.max(maximumDepth, depth) } else if (character === '}') depth = Math.max(0, depth - 1)
    }
    if (functionStart && depth <= functionStart.depth) { maximumFunctionLines = Math.max(maximumFunctionLines, index - functionStart.line + 1); functionStart = null }
  }
  if (functionStart) maximumFunctionLines = Math.max(maximumFunctionLines, lines.length - functionStart.line)
  return { path: file.path, fileLines: lines.length, maxNestingDepth: maximumDepth, maxFunctionLines: maximumFunctionLines, animations: (file.content.match(/@keyframes\b|\banimation(?:-name)?\s*:/g) ?? []).length, transitions: (file.content.match(/\btransition(?:-property)?\s*:/g) ?? []).length }
}
function complexityFindings(contract, metric) {
  const checks = [['maxFileLines', 'fileLines'], ['maxNestingDepth', 'maxNestingDepth'], ['maxFunctionLines', 'maxFunctionLines'], ['animations', 'animations'], ['transitions', 'transitions']]
  return checks.flatMap(([budgetKey, metricKey]) => contract.budgets[budgetKey] >= 0 && metric[metricKey] > contract.budgets[budgetKey] ? [finding('P1', `BUDGET-${budgetKey.toUpperCase()}`, metric.path, `${metricKey} ${metric[metricKey]} exceeds budget ${contract.budgets[budgetKey]}.`, 'complexity', true, { actual: metric[metricKey], budget: contract.budgets[budgetKey] })] : [])
}
function scanFiles(contract, files) {
  if (!Array.isArray(files) || !files.length) throw new Error('files must be non-empty')
  const normalized = files.map((value) => record(value, 'file'))
  const metrics = normalized.map(complexity)
  const findings = normalized.flatMap((file) => [...languageFindings(contract, file), ...ruleFindings(contract, file)]).concat(metrics.flatMap((metric) => complexityFindings(contract, metric)))
  return { findings, metrics }
}
function driftState(ledger) {
  if (!Array.isArray(ledger)) throw new Error('ledger history is required')
  const recent = ledger.slice(-10)
  const trailing = []
  for (let index = recent.length - 1; index >= 0 && recent[index]?.status === 'blocked'; index -= 1) trailing.unshift(recent[index])
  const shared = trailing.length ? trailing.map((entry) => new Set(entry.blockingRuleIds ?? [])).reduce((left, right) => new Set([...left].filter((ruleId) => right.has(ruleId)))) : new Set()
  const repeatedRuleIds = [...shared].sort()
  const consecutiveBlocks = repeatedRuleIds.length ? trailing.length : 0
  const trend = consecutiveBlocks >= 3 ? 'red' : consecutiveBlocks >= 2 ? 'yellow' : 'green'
  const blockedBlocks = recent.filter((entry) => entry.status === 'blocked').length
  return { trend, totalBlocks: ledger.length, recentBlocks: recent.length, blockedBlocks, violationRate: recent.length ? Math.round((blockedBlocks / recent.length) * 1e3) / 10 : 0, consecutiveBlocks, repeatedRuleIds, action: trend === 'red' ? 'interrupt-and-request-human-confirmation' : trend === 'yellow' ? 'warn-and-correct-next-block' : 'continue' }
}
function checkpoint(contract, blockValue, history, trustedAstFindings) {
  const block = record(blockValue, 'checkpoint block')
  if (!Array.isArray(history)) throw new Error('checkpoint history is required')
  if (!pathSafe(block.path) || typeof block.content !== 'string' || !SHA256.test(block.beforeSha256)) throw new Error('checkpoint block is invalid')
  const scan = scanFiles(contract, [{ path: block.path, content: block.content }])
  const astRules = contract.rules.custom.filter((rule) => rule.engine === 'ast')
  if (astRules.length && !Array.isArray(trustedAstFindings)) scan.findings.push(finding('P1', 'ARCH-AST-LOCAL-RUNNER-REQUIRED', block.path, 'AST custom rules require the bundled trusted local checkpoint runner.', 'custom', true, { ruleIds: astRules.map((rule) => rule.id) }))
  if (Array.isArray(trustedAstFindings)) for (const item of trustedAstFindings) scan.findings.push(record(item, 'trusted AST finding'))
  const blocking = scan.findings.filter((item) => item.blocking)
  const entry = { schemaVersion: LEDGER_VERSION, checkpointId: digest({ contract: digest(contract), block, trustedAstFindingsDigest: trustedAstFindings ? digest(trustedAstFindings) : null }), blockId: text(block.blockId, 'blockId'), path: block.path, contractRevision: contract.revision, beforeSha256: block.beforeSha256, afterSha256: contentDigest(block.content), status: blocking.length ? 'blocked' : 'passed', ruleIds: scan.findings.map((item) => item.ruleId).sort(), blockingRuleIds: blocking.map((item) => item.ruleId).sort(), rollbackRequired: blocking.length > 0 }
  const drift = driftState([...history, entry])
  if (drift.trend === 'red') entry.rollbackRequired = true
  return { checkpoint: { status: entry.rollbackRequired ? 'blocked' : 'passed', writeAllowed: !entry.rollbackRequired, rollbackRequired: entry.rollbackRequired, findings: scan.findings, metrics: scan.metrics[0], drift, instruction: drift.trend === 'red' ? 'rollback-block-and-interrupt-aimlock' : entry.rollbackRequired ? 'rollback-block-and-correct' : 'accept-block' }, ledgerEntry: entry }
}
function capabilities() {
  return { skill: { name: 'archguard', version: COMPILER_VERSION }, operations: OPERATIONS, operationSchemas: OPERATION_SCHEMAS, contractSchemaVersion: CONTRACT_VERSION, ledgerSchemaVersion: LEDGER_VERSION, templates: Object.keys(TEMPLATE_DEFINITIONS), executionBoundary: 'AST rules execute only through the bundled trusted local runner; remote JSON cannot supply AST findings.', nextStep: { operation: 'intake', instruction: 'Detect the project stack and lock an architecture contract before code generation.' } }
}
function requestEnvelope(request) {
  if (!request || request.schemaVersion !== REQUEST_VERSION || typeof request.requestId !== 'string' || !OPERATIONS.includes(request.operation) || !request.input || typeof request.input !== 'object' || Array.isArray(request.input)) throw new Error('Invalid ArchGuard request envelope')
  return request
}
function checkpointResponse(requestId, input, trustedAstFindings) {
  if (Object.hasOwn(record(input.block, 'checkpoint block'), 'astFindings')) throw new Error('checkpoint.astFindings is not accepted from JSON callers')
  const output = checkpoint(normalizeContract(input.contract), input.block, input.history, trustedAstFindings)
  return response(requestId, output.checkpoint.status === 'passed' ? 'succeeded' : 'blocked', output, output.checkpoint.findings)
}
async function execute(request, trustedAstFindings) {
  const { requestId, operation, input } = requestEnvelope(request)
  if (operation === 'capabilities' || operation === 'help') return response(requestId, 'succeeded', capabilities())
  if (operation === 'template-list') return response(requestId, 'succeeded', { templates: Object.entries(TEMPLATE_DEFINITIONS).map(([templateId, stack]) => ({ templateId, stack })), nextStep: { operation: 'contract-create' } })
  if (operation === 'intake') return response(requestId, 'succeeded', { questions: [{ id: 'templateId', prompt: 'Which detected stack template must be locked?', required: true, options: Object.keys(TEMPLATE_DEFINITIONS) }, { id: 'strictStandard', prompt: 'Should standard-level findings block writes?', required: true, options: [false, true] }, { id: 'budgets', prompt: 'Confirm file, function, nesting, effect, and bundle budgets.', required: true }], project: text(input.project, 'project'), nextStep: { operation: 'contract-create' } })
  if (operation === 'contract-create') {
    const contract = baseContract(text(input.project, 'project'), text(input.templateId, 'templateId'))
    const merged = input.overrides ? normalizeContract({ ...contract, ...input.overrides, stack: { ...contract.stack, ...(input.overrides.stack ?? {}) }, rules: { ...contract.rules, ...(input.overrides.rules ?? {}) }, budgets: { ...contract.budgets, ...(input.overrides.budgets ?? {}) } }) : contract
    return response(requestId, 'succeeded', { contract: merged, digest: digest(merged), nextStep: { operation: 'checkpoint' } })
  }
  if (operation === 'contract-get') { const contract = normalizeContract(input.contract); return response(requestId, 'succeeded', { contract, digest: digest(contract) }) }
  if (operation === 'contract-update') {
    const contract = normalizeContract(input.contract)
    if (input.expectedDigest !== digest(contract) || input.confirmation !== 'confirm-architecture-contract-update') throw new Error('Contract update authority is invalid')
    const updated = normalizeContract({ ...contract, ...record(input.patch, 'patch'), revision: contract.revision + 1, audit: { updatedBy: text(input.actor, 'actor'), reason: text(input.reason, 'reason'), previousDigest: input.expectedDigest } })
    return response(requestId, 'succeeded', { contract: updated, digest: digest(updated), audit: updated.audit })
  }
  if (operation === 'checkpoint') return checkpointResponse(requestId, input, trustedAstFindings)
  if (operation === 'rules-scan' || operation === 'complexity-report') {
    const scan = scanFiles(normalizeContract(input.contract), input.files)
    const output = operation === 'rules-scan' ? { findings: scan.findings, summary: { total: scan.findings.length, blocking: scan.findings.filter((item) => item.blocking).length } } : { metrics: scan.metrics, findings: scan.findings.filter((item) => item.category === 'complexity') }
    return response(requestId, scan.findings.some((item) => item.blocking) ? 'blocked' : 'succeeded', output, scan.findings)
  }
  if (operation === 'drift-status') return response(requestId, 'succeeded', { drift: driftState(input.ledger) })
  if (!Array.isArray(input.ledger)) throw new Error('ledger is required')
  const entries = input.ledger.filter((entry) => (!input.ruleId || entry.ruleIds?.includes(input.ruleId)) && (!input.status || entry.status === input.status))
  return response(requestId, 'succeeded', { schemaVersion: LEDGER_VERSION, entries, total: entries.length })
}

async function run(request) {
  return execute(request, undefined)
}
async function runTrustedLocalCheckpoint(request, trustedAstFindings) {
  if (request?.operation !== 'checkpoint' || !Array.isArray(trustedAstFindings)) throw new Error('trusted local checkpoint authority is invalid')
  return execute(request, trustedAstFindings.map((item) => record(item, 'trusted AST finding')))
}

export { CONTRACT_VERSION, LEDGER_VERSION, OPERATION_SCHEMAS, TEMPLATE_DEFINITIONS, run, runTrustedLocalCheckpoint }
