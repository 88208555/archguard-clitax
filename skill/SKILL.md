---
name: archguard
description: '在代码写入期间锁定项目架构合同，并逐块检查技术栈漂移、规则违规与复杂度超限；适用于已有 arch.contract.yaml 或用户明确要求锁定技术栈的多文件修改，不用于只读分析、纯文档、计算工具或单行低风险修改。Lock the architecture contract and check each written code block for stack drift, rule violations, and complexity overages; use for multi-file changes with arch.contract.yaml or an explicit stack-lock request, not read-only analysis, documents, calculators, or one-line low-risk edits. Фиксирует архитектурный контракт и проверяет каждый записанный блок кода на дрейф стека, нарушения и превышение сложности; применяется к многофайловым изменениям с arch.contract.yaml или явным запросом фиксации стека, но не к чтению, документам, калькуляторам и однострочным низкорисковым правкам.'
---

# 架构守卫 / ArchGuard / Архитектурный страж

Package version: v7.0.41

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
- Source line, function, nesting, style, language and AST rules apply only to first-party files. Dependency-manager lockfiles, installed/vendored third-party code and recognized generated output are outside those rules; do not split, trim or roll back them for source complexity. Checkpoint metrics report `inspectionScope` and `complexityChecked: false` explicitly. First-party dependency manifests, dependency/version/integrity/security checks, path safety, snapshots and write authorization remain enforced. This file-scope correction does not require changing the architecture contract.
- 中文：依赖及自动生成锁文件的行数不受第一方源码门禁约束；不能因此回滚依赖更新或要求修改合同。第一方依赖声明和版本、安全检查仍正常执行。Русский: ограничения строк и сложности собственного кода не применяются к сторонним зависимостям и сгенерированным lock-файлам; проверки зависимостей, версий и безопасности сохраняются.
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
- broker 默认读取账号共享凭据文件；显式 `CLITAX_BRAIN_CLIENT_TOKEN_FILE` 使用绝对路径覆盖；macOS/Linux 文件必须为当前 broker 账户所有且权限 `0600`，Windows 文件必须位于受限 `%LOCALAPPDATA%\CLI.Tax\broker` 目录。
- broker 只需要 Brain Client HTTPS、受限身份文件和调用方显式传入的路径，本身不需要完整磁盘访问。若要保证 IDE 无法读取身份文件，必须把 broker 放进独立低权限系统账户或沙箱服务，并只暴露受限 IPC；broker 与 IDE 同账户运行时，`0600` 不能隔离二者，禁止声称令牌已隔离。
- broker 只用 `Authorization: BrainClient …` 发起一次 runtime 请求。HTTP 成功后必须保留响应顶层原始 `feedbackReceiptId`、`feedbackInvocationId` 和 `feedbackEvaluation.digest`，不得生成、猜测、复用或跨调用转移。
- Brain Client 服务端必须严格绑定请求/响应的 `requestId` 和 `schemaVersion`，再根据真实状态、验证结果、服务端耗时与 findings 生成并持久化权威评分、评语和摘要。broker 不得生成分数或评语。
- 同一次 runtime 请求在服务端事务内生成并持久化评价，再返回 `feedbackReceiptId`、`feedbackInvocationId` 和权威摘要；broker 只验证已提交回执，不发起第二次评价写入。`not-reported`、验证不完整、P0/P1 findings、`blocked` 或 `failed` 都不得生成好评。
- 缺少凭证或 ID、身份不匹配、摘要不匹配、响应非法以及任何 HTTP 失败都必须显式失败，不得静默、不重试成重复评价。
- 本地 CLI 不提供手工评分或评语提交命令，人类不得选择技能分数或填写技能评价；日常聊天不属于评价协议。

调用示例：`npx cli-archguard@latest invoke <operation> '<JSON对象>'`。IDE 集成可向 `npx cli-archguard@latest broker` 的 stdin 发送 `{"operation":"capabilities","input":{}}`。

## 网络中断与原回执恢复

仅在 TLS 握手前确定尚未发送 HTTP 请求时，broker 才允许最多 3 次连接尝试，并受总超时约束。请求发出后发生断线或响应中断，只用 GET 查询原 requestId 的服务端回执，禁止重发 POST；未取得有效回执时保留不确定状态，不得假定成功或继续依赖步骤。

`npx cli-archguard@latest recover <operation> <requestId>` 可重新查询原调用，不会重做操作或重复计费。链恢复不会跳过人工确认，也不会自动重跑结果不确定的本地命令。代理连接需 Node.js 22.21+ 或 24.5+；不支持的运行时会明确报错。

## 执行完整性共同规则

1. 工程目标、已接受范围和验收项必须持久化；新增需求先路由与合并，不能覆盖原目标。子任务有明确服务目标的理由，执行仅用本链已匹配技能。每次恢复读取 task-resume，核对剩余项、pending请求和continuationNotifications。
2. 默认由主代理完成工作，禁止为了省事创建子代理、把简单查找/改名/少量修改/单条命令/例行检查/汇总交接给多智能体，禁止为达到门槛拆分或夸大任务。启用Aimlock或Swarm模式不是创建授权，管理/运维/安全/协调是主代理职责，不额外创建常驻智能体。只有业务确需独立且实质性的交付、主代理同时有可推进的独立工作、预期收益严格高于上下文传递/协调/验收成本时才派单；复用已有合适负责人，用户禁止委派时不得创建。每次创建前记录业务理由、交付物、验收项、主代理工作、成本收益、精确路径和原负责人；只创建当前需要的最少数量，不预建空闲角色，不递归扩编或重复扫描。规模门槛200行/3文件/跨模块仅为必要条件，不能单独证明值得委派。主代理负责整合和完整验收，不把半成品当完成；预算抱怨不是停止指令。
3. 自报、回复送达和动作完成不等于工程交付验证。reported始终待验收；Swarm接受工程任务时复用Validator校验签名、有效期、计划/产物/任务绑定。无证据、伪造runner或失败检查不得成为绿色完成。
4. 原任务交接前保存检查点并释放旧锁；回程只发持久通知，宿主消费后重新核验基线、快照与写入权限。历史恢复结果不是新授权。技能不能自行唤醒未接入的IDE。
5. 心跳停止仅允许自动回收尚未开工的assigned任务；claimed/running进入执行结果待核对状态，禁止盲目重复执行。已回传、已验收、失败和取消任务不会被自动重派。服务器停滞回收同时保存会员通知，对话界面定期读取展示。
6. 读取预算、截止和续时确认仅在云端沙箱已开启且本任务实际使用 sandbox 时生效。纯本地或权威响应确认的非沙箱执行，在已授权目标和范围内自动持续，不因旧预算过期、文件数或token额度暂停，也不生成扩展或续时确认；宿主可保留budget-read审计。远端状态未知时只读查询原调用，不推定关闭，不要求扩预算；纯本地无需查询云端。仅实际沙箱内预计长任务在预算初始化后、深读前提出一次精确自动续时策略，真实授权后才自动续时；时间、文件数、token和写入权限分别计量，额度/次数耗尽、撤销和完成保留明确停止规则。读取预算不是付费充值，续时由宿主在读取时触发。
7. 云端沙箱开关按调用会员读取；关闭时仅允许当前受审官方源码摘要在受控worker中直接执行，并记录executionIsolation。预算上下文取同一任务成功runtime响应顶层executionContext，包含cloudSandboxEnabled与executionIsolation；仅true且sandbox启用预算，不用模型自报、调用方参数或旧截图代替真实执行状态。纯本地显式使用{executionIsolation:"local"}；已有预算通过budget-context绑定或更新实际环境，保留原用量、期限和授权。未知或修改过的源码明确要求sandbox，不伪造隔离结果；worker直接执行不是OS沙箱。
8. 使用技能前检查官方发布版本并自动升级可管理的安装副本与客户端；配置失败或升级失败停止并报告。通过configure的JSON标准输入导入一次账号凭据，后续项目/分支/任务共享；密钥不进入源码、URL或命令参数。显式环境覆盖必须是绝对路径。网页复制在点击时获取当前凭据，页面仅展示无密钥地址；已撤销密钥没有权限自动获取新密钥，需已认证网页重新同步一次。

English: keep simple work with the main agent. Delegate only substantial independent business deliverables when benefits exceed coordination costs; use the fewest needed agents, never create idle management agents. Enabling Aimlock does not authorize delegation. Finish all authorized work; a cost complaint is not a stop request. Preserve the original goal; verify execution evidence; resume from durable checkpoints; never replay uncertain side effects. Read budgets and bounded renewal approvals apply only when cloud sandboxing is enabled and actually used for this task. Local or confirmed non-sandbox work continues within its authorized scope without budget prompts; unknown remote state requires a read-only query, never an assumed opt-out or an extension request. Reuse account credentials and check managed skill updates before use; revoked credentials require an authenticated refresh.

Русский: сохраняйте исходную цель, проверяйте доказательства выполнения и возобновляйте работу из сохранённой точки. Не повторяйте операции с неизвестным результатом. Бюджет чтения и ограниченное разрешение на продление действуют только при включённой облачной песочнице, фактически используемой этой задачей. Локальная работа и подтверждённое выполнение без песочницы продолжаются в разрешённых пределах без запросов бюджета; неизвестное удалённое состояние требует запроса только для чтения, а не предположения об отключении или запроса расширения. Ключи учётной записи используются повторно, обновления навыков проверяются перед вызовом.

## 账号共享凭据与自动更新

在已登录的能力市场复制安装入口，将内容粘贴给 IDE。页面只展示原地址，剪贴板会携带当前账号凭据。IDE 将四字段凭据 JSON 经标准输入交给 `npx cli-aimlock@latest configure`；不要放到命令参数、项目文件或日志中。一次配置供同一操作系统账号的所有项目、分支和任务使用，八个技能共享同一文件。

默认位置：macOS 为 `~/Library/Application Support/CLI.Tax/broker/credential.json`，Linux 为 `~/.local/share/CLI.Tax/broker/credential.json`，Windows 为 `%LOCALAPPDATA%\CLI.Tax\broker\credential.json`。显式 `CLITAX_BRAIN_CLIENT_TOKEN_FILE` 仍按绝对路径覆盖默认位置；迁移旧 IDE 配置时移除其过时覆盖，再使用账号共享文件。macOS/Linux 校验当前账号所有权和0600权限；Windows校验仅当前账号与SYSTEM可访问的ACL。

每次新技能调用先查询官方发布版本，精确版本下载并校验身份后自动使用；更新已托管的当前项目与账号技能目录，失败恢复旧目录，禁止覆盖 Git 跟踪源码或未托管内容。升级返回 `upgrade.reloadRequired` 和说明路径时，IDE 应读取更新后的 SKILL.md、核对本任务合同再继续。install/check同样自动更新，不需要每次人工发升级指令。查询不确定调用的原回执不升级、不重发操作。

升级不会清除账号凭据；各调用重新读取共享文件，因此重新同步一次密钥后所有任务使用新值。已撤销或失效的密钥不能为自己取得新权限，必须从已认证网页重新同步一次。两个不同操作系统账号不共享私密文件。

English: configure once using JSON stdin; all tasks under the same OS account reuse the credential. Each new invocation checks and updates the official package and managed documentation. Reload updated instructions when indicated. Revoked keys require a fresh authenticated copy.

Русский: настройте ключ один раз через JSON stdin для всех задач пользователя ОС. Перед новым вызовом пакет и управляемые инструкции обновляются автоматически. Отозванный ключ требует повторной синхронизации с авторизованной страницы.
