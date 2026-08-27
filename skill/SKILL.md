---
name: archguard
description: Lock a project's architecture contract and check each code block for stack drift, rule violations, and complexity overages while code is being written. Use for multi-file code changes when arch.contract.yaml exists or the user asks to lock the stack. Do not use for read-only analysis, pure documents, calculator generation, or one-line low-risk edits.
---

# ArchGuard

Package version: v7.0.19

Endpoint: https://cli.tax/Ag4Ch8Rd2K
Request schema: `archguard.skill.request/1.0`

## Boundary

ArchGuard supervises code during execution. It does not plan product scope, dispatch agents, merge branches, replace final validation, or implement any model-thinking sandbox.

Use it when a task writes multiple code blocks and either `arch.contract.yaml` exists or the user explicitly asks to lock the technical stack. Skip it for read-only analysis, pure documentation, Calctool generation, merge-only work, and a one-line Lock edit without architecture risk.

## Required sequence

1. Call `capabilities` first and use the returned `operationSchemas`.
2. If the project has no contract and this is a new project, call `template-list`, `intake`, then `contract-create` before Blueprint.
3. Before changing an existing contract, call `contract-get`; `contract-update` requires its exact digest, explicit confirmation, actor, and reason.
4. Before each code-block write, create a block snapshot. After the block is complete, call `checkpoint` with the contract, block, and checkpoint history.
5. A blocking finding means the block cannot remain: restore that block's snapshot, apply the returned correction, then recheck.
6. Three consecutive blocks with the same blocking rule are a red-light interrupt. Stop mutation and request human direction.
7. At task end call `rules-scan`, `complexity-report`, and `drift-status`; pass the ledger to Validator as process evidence.

## Contract authority

- The canonical contract is `arch.contract.yaml` with schema `archguard.contract/1.0`.
- A contract locks stack, allowed/forbidden dependencies, rules, and budgets.
- Never change the contract to make failing code pass. Only an explicitly confirmed versioned `contract-update` may change it.
- Aimlock owns the contract-file snapshot and mutation scope. ArchGuard owns block checkpoints and architecture findings.

## Checkpoint decisions

- `passed`: the block may remain.
- `blocked`: restore the block snapshot when `rollbackRequired` is true; do not report the worker step green.
- Standard-level findings are report-only by default. Architecture and complexity findings block. A contract may explicitly make standard rules blocking.
- The checkpoint ledger is append-only evidence. Do not fabricate ledger entries or success states.

## Operations

`capabilities`, `help`, `intake`, `contract-create`, `contract-get`, `contract-update`, `template-list`, `checkpoint`, `rules-scan`, `complexity-report`, `drift-status`, `ledger-query`.

Built-in templates: React + TypeScript + Vite, Vue 3 + TypeScript + Vite, Next.js, NestJS, FastAPI, Spring Boot, WeChat Mini Program, and Tauri desktop.

## Chain routing

- Existing code with contract: Aimlock → Blueprint → Swarm → ArchGuard checkpoints → MergeGuard when a merge is requested → Validator.
- Existing code without contract: Aimlock → Blueprint → Swarm → Validator; recommend contract creation without blocking the current task.
- New project: Aimlock → ArchGuard contract-create → Blueprint → Swarm → ArchGuard checkpoints → Validator.

Before handing off, preserve the exact contract digest, checkpoint ledger, full findings, rollback outcome, and drift light. Missing evidence is not success.

## Automated feedback

Only after a real ArchGuard HTTP call succeeds and returns `feedbackInvocationId`, the IDE may automatically submit an honest score and comment with:

`npx cli-archguard@latest feedback <feedbackInvocationId> <score> <comment...>`

The command requires the member IDE client token file through `CLITAX_BRAIN_CLIENT_TOKEN_FILE`. Humans must not choose or submit ratings.

只有真实响应顶层包含 `feedbackInvocationId` 时才允许回传；会员账号实名入库，禁止伪造、猜测、复用调用编号，禁止让人类选择分数，任何 HTTP 失败都必须视为回传失败。
