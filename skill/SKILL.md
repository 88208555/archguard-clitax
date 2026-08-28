---
name: archguard
description: '在代码写入期间锁定项目架构合同，并逐块检查技术栈漂移、规则违规与复杂度超限；适用于已有 arch.contract.yaml 或用户明确要求锁定技术栈的多文件修改，不用于只读分析、纯文档、计算工具或单行低风险修改。Lock the architecture contract and check each written code block for stack drift, rule violations, and complexity overages; use for multi-file changes with arch.contract.yaml or an explicit stack-lock request, not read-only analysis, documents, calculators, or one-line low-risk edits. Фиксирует архитектурный контракт и проверяет каждый записанный блок кода на дрейф стека, нарушения и превышение сложности; применяется к многофайловым изменениям с arch.contract.yaml или явным запросом фиксации стека, но не к чтению, документам, калькуляторам и однострочным низкорисковым правкам.'
---

# 架构守卫 / ArchGuard / Архитектурный страж

Package version: v7.0.28

Endpoint: https://cli.tax/Ag4Ch8Rd2K
Request schema: `archguard.skill.request/1.0`

## 三语能力摘要 / Trilingual capability summary / Трёхъязычное описание

中文：架构守卫只在真实代码写入期间工作。已有架构合同或用户明确要求锁定技术栈的多文件修改才启用；只读分析、纯文档、计算工具和无架构风险的单行修改不启用。每个代码块都必须用同一合同摘要、快照和只追加台账完成检查点；阻断结果必须回滚该块，不能伪报通过。

English: ArchGuard runs only while real code is being written. Activate it for multi-file work under an architecture contract or an explicit stack-lock request; skip read-only analysis, documents, calculator generation, and one-line edits without architecture risk. Every block uses the same contract digest, snapshot, and append-only ledger; a blocked result requires rollback and can never be reported as passed.

Русский: ArchGuard работает только при реальной записи кода. Он включается для многофайловых изменений по архитектурному контракту или при явном запросе фиксации стека; чтение, документы, генерация калькулятора и однострочная правка без архитектурного риска его не запускают. Каждый блок проверяется с тем же дайджестом контракта, снимком и дописываемым журналом; блокировка требует отката и не может считаться прохождением.

## 边界 / Boundary / Границы

ArchGuard supervises code during execution. It does not plan product scope, dispatch agents, merge branches, replace final validation, or implement any model-thinking sandbox.

Use it when a task writes multiple code blocks and either `arch.contract.yaml` exists or the user explicitly asks to lock the technical stack. Skip it for read-only analysis, pure documentation, Calctool generation, merge-only work, and a one-line Lock edit without architecture risk.

## 强制流程 / Required sequence / Обязательная последовательность

1. Call `capabilities` first and use the returned `operationSchemas`.
2. If the project has no contract and this is a new project, call `template-list`, `intake`, then `contract-create` before Blueprint.
3. Before changing an existing contract, call `contract-get`; `contract-update` requires its exact digest, explicit confirmation, actor, and reason.
4. Before each code-block write, run `cli-archguard snapshot ...`. The write itself must carry the Aimlock chainId and signed gate pass. After the block is complete, run `cli-archguard checkpoint ...` with the same snapshot, contract, append-only ledger, chainId, and gate pass.
5. A blocking finding means the block cannot remain: restore that block's snapshot, apply the returned correction, then recheck.
6. Three consecutive blocks with the same blocking rule are a red-light interrupt. Stop mutation and request human direction.
7. At task end call `rules-scan`, `complexity-report`, and `drift-status`; pass the ledger to Validator as process evidence.

## 合同权威 / Contract authority / Полномочия контракта

- The canonical contract is `arch.contract.yaml` with schema `archguard.contract/1.0`.
- A contract locks stack, allowed/forbidden dependencies, rules, and budgets.
- Forbidden dependencies are checked in source imports and in `package.json`, `requirements*.txt`, `pom.xml`, and `Cargo.toml`.
- Never change the contract to make failing code pass. Only an explicitly confirmed versioned `contract-update` may change it.
- Aimlock owns the contract-file snapshot and mutation scope. ArchGuard owns block checkpoints and architecture findings.

## 检查点裁决 / Checkpoint decisions / Решения контрольной точки

- `passed`: the block may remain.
- `blocked`: restore the block snapshot when `rollbackRequired` is true; do not report the worker step green.
- Standard-level findings are report-only by default. Architecture and complexity findings block. A contract may explicitly make standard rules blocking.
- The checkpoint ledger is append-only evidence. Do not fabricate ledger entries or success states.
- Checkpoint history is mandatory. Red drift requires three consecutive blocked checkpoints sharing the same blocking rule; unrelated or non-consecutive findings never trigger it.

## 可信本地执行 / Trusted local execution / Доверенное локальное выполнение

Remote JSON `checkpoint` never accepts caller-supplied `astFindings`. When the contract contains AST rules, a remote checkpoint is blocked with `ARCH-AST-LOCAL-RUNNER-REQUIRED`.

Use the bundled CLI in the repository being checked:

```bash
cli-archguard ledger-init . .archguard/ledger.json
cli-archguard snapshot . src/example.ts .archguard/example.snapshot.json
cli-archguard checkpoint . arch.contract.yaml src/example.ts .archguard/example.snapshot.json .archguard/ledger.json block-1 <chainId> <gatePassPath>
```

中文：本地运行器把每个快照和台账绑定到真实仓库根目录，只接受 `.archguard/` 下不含符号链接或目录联接的相对路径；绝对路径、父级穿越和覆盖非受管文件均被拒绝。

English: The local runner binds every snapshot and ledger to the real repository root and accepts only relative `.archguard/` paths without symlinks or junctions. It refuses absolute or parent-traversing paths and never overwrites an unmanaged file.

Русский: Локальный исполнитель привязывает каждый снимок и журнал к реальному корню репозитория и принимает только относительные пути в `.archguard/` без символических ссылок и соединений каталогов. Абсолютные пути, выход к родителю и перезапись неуправляемых файлов отклоняются.

The runner verifies the Aimlock Ed25519 pass against the real repository before evaluating a block. A missing, forged, expired, wrong-chain, or out-of-scope pass rejects the block and restores its snapshot. It then reads the file and contract without following symlinks, computes AST findings in-process, restores a blocked snapshot, appends its ledger entry, and emits a ContextBase invalidation event when that derived cache is initialized. Missing local evidence is blocked, never treated as an empty AST result.

The local CLI exits with code `0` only when a checkpoint permits the write. A blocked checkpoint that has been rolled back exits with code `2`; an execution error exits with code `1`. Automation must read the JSON evidence and the exit code.

## 操作 / Operations / Операции

`capabilities`, `help`, `intake`, `contract-create`, `contract-get`, `contract-update`, `template-list`, `checkpoint`, `rules-scan`, `complexity-report`, `drift-status`, `ledger-query`.

Built-in templates: React + TypeScript + Vite, Vue 3 + TypeScript + Vite, Next.js, NestJS, FastAPI, Spring Boot, WeChat Mini Program, and Tauri desktop.

## 链路路由 / Chain routing / Маршрутизация цепочки

- Existing code with contract: Aimlock → Blueprint → Swarm → ArchGuard checkpoints → MergeGuard when a merge is requested → Validator.
- Existing code without contract: Aimlock → Blueprint → Swarm → Validator; recommend contract creation without blocking the current task.
- New project: Aimlock → ArchGuard contract-create → Blueprint → Swarm → ArchGuard checkpoints → Validator.

Before handing off, preserve the exact contract digest, checkpoint ledger, full findings, rollback outcome, and drift light. Missing evidence is not success.

## 受限调用与自动评价闭环

- IDE / 智能体必须通过本包 `invoke` 或 JSON-stdin `broker` 调用，不得直接拼装技能 HTTP 请求，也不得读取 BrainClient token。
- broker 从 `CLITAX_BRAIN_CLIENT_TOKEN_FILE` 读取身份；macOS/Linux 文件必须为当前 broker 账户所有且权限 `0600`，Windows 文件必须位于受限 `%LOCALAPPDATA%\CLI.Tax\broker` 目录。
- broker 只需要 Brain Client HTTPS、受限身份文件和调用方显式传入的路径，本身不需要完整磁盘访问。若要保证 IDE 无法读取身份文件，必须把 broker 放进独立低权限系统账户或沙箱服务，并只暴露受限 IPC；broker 与 IDE 同账户运行时，`0600` 不能隔离二者，禁止声称令牌已隔离。
- broker 只用 `Authorization: BrainClient …` 发起一次 runtime 请求。HTTP 成功后必须保留响应顶层原始 `feedbackReceiptId`、`feedbackInvocationId` 和 `feedbackEvaluation.digest`，不得生成、猜测、复用或跨调用转移。
- Brain Client 服务端必须严格绑定请求/响应的 `requestId` 和 `schemaVersion`，再根据真实状态、验证结果、服务端耗时与 findings 生成并持久化权威评分、评语和摘要。broker 不得生成分数或评语。
- 同一次 runtime 请求在服务端事务内生成并持久化评价，再返回 `feedbackReceiptId`、`feedbackInvocationId` 和权威摘要；broker 只验证已提交回执，不发起第二次评价写入。`not-reported`、验证不完整、P0/P1 findings、`blocked` 或 `failed` 都不得生成好评。
- 缺少凭证或 ID、身份不匹配、摘要不匹配、响应非法以及任何 HTTP 失败都必须显式失败，不得静默、不重试成重复评价。
- 本地 CLI 不提供手工评分或评语提交命令，人类不得选择技能分数或填写技能评价；日常聊天不属于评价协议。

调用示例：`npx cli-archguard@latest invoke <operation> '<JSON对象>'`。IDE 集成可向 `npx cli-archguard@latest broker` 的 stdin 发送 `{"operation":"capabilities","input":{}}`。
