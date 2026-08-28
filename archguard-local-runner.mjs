import { createRequire } from "node:module";
import * as import_archguard_runtime from "./archguard-runtime.mjs";
import { verifyMutationPassFile } from "cli-aimlock/local-runner";
import { recordContextBaseInvalidation } from "./archguard-contextbase-hook.mjs";
const require = createRequire(import.meta.url);
const import_node_crypto = require("node:crypto");
const import_node_fs = require("node:fs");
const import_promises = require("node:fs/promises");
const import_node_path = require("node:path");
const import_parser = require("@babel/parser");
const import_yaml = require("yaml");
const __name = (target, value) =>
  Object.defineProperty(target, "name", { value, configurable: true });
const SNAPSHOT_VERSION = "archguard.block-snapshot/1.0";
const LEDGER_VERSION = "archguard.checkpoint-ledger/1.0";
const MANAGED_DIRECTORY = ".archguard";
const MANAGED_OWNER = "cli-archguard";
const MISSING_SHA256 = (0, import_node_crypto.createHash)("sha256")
  .update("archguard.missing-file/1.0")
  .digest("hex");
function sha256(value) {
  return (0, import_node_crypto.createHash)("sha256")
    .update(value)
    .digest("hex");
}
__name(sha256, "sha256");
function object(value, context) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${context} must be an object`);
  return value;
}
__name(object, "object");
function safeRelativePath(value, context) {
  if (
    typeof value !== "string" ||
    value !== value.normalize("NFC") ||
    (0, import_node_path.isAbsolute)(value) ||
    /^[A-Za-z]:/.test(value) ||
    value.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`${context} is unsafe`);
  }
  return value;
}
__name(safeRelativePath, "safeRelativePath");
function managedRelativePath(value, context) {
  const path = safeRelativePath(value, context);
  const segments = path.split("/");
  if (segments[0] !== MANAGED_DIRECTORY || segments.length < 2) {
    throw new Error(`${context} must be inside ${MANAGED_DIRECTORY}`);
  }
  return { path, segments };
}
__name(managedRelativePath, "managedRelativePath");
function assertInside(root, target, context) {
  const path = (0, import_node_path.relative)(root, target);
  if (
    path === "" ||
    (!(0, import_node_path.isAbsolute)(path) &&
      path !== ".." &&
      !path.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`))
  )
    return;
  throw new Error(`${context} escapes the repository`);
}
__name(assertInside, "assertInside");
function missing(error) {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}
__name(missing, "missing");
function alreadyExists(error) {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}
__name(alreadyExists, "alreadyExists");
async function repositoryRoot(value) {
  if (typeof value !== "string" || value !== value.trim() || !value)
    throw new Error("repositoryRoot is required");
  const explicit = (0, import_node_path.resolve)(value);
  const status = await (0, import_promises.lstat)(explicit);
  if (status.isSymbolicLink() || !status.isDirectory())
    throw new Error("repositoryRoot must be a real directory");
  return (0, import_promises.realpath)(explicit);
}
__name(repositoryRoot, "repositoryRoot");
async function managedTarget(root, value, context, createParents) {
  const managed = managedRelativePath(value, context);
  let current = root;
  for (const segment of managed.segments.slice(0, -1)) {
    current = (0, import_node_path.resolve)(current, segment);
    if (createParents) {
      try {
        await (0, import_promises.mkdir)(current, { mode: 448 });
      } catch (error) {
        if (!alreadyExists(error)) throw error;
      }
    }
    const status = await (0, import_promises.lstat)(current);
    if (status.isSymbolicLink() || !status.isDirectory()) {
      throw new Error(`${context} parent cannot be a symlink or junction`);
    }
    const real = await (0, import_promises.realpath)(current);
    assertInside(root, real, `${context} parent`);
    if (real !== current) {
      throw new Error(`${context} parent must resolve inside the real repository`);
    }
  }
  const target = (0, import_node_path.resolve)(root, ...managed.segments);
  const managedRoot = (0, import_node_path.resolve)(root, MANAGED_DIRECTORY);
  assertInside(managedRoot, target, context);
  return { target, relativePath: managed.path };
}
__name(managedTarget, "managedTarget");
async function managedFile(root, value, context, allowMissing, createParents) {
  const target = await managedTarget(root, value, context, createParents);
  let status;
  try {
    status = await (0, import_promises.lstat)(target.target);
  } catch (error) {
    if (allowMissing && missing(error)) return { ...target, exists: false };
    throw error;
  }
  if (status.isSymbolicLink() || !status.isFile()) {
    throw new Error(`${context} must be a real managed file`);
  }
  const real = await (0, import_promises.realpath)(target.target);
  if (real !== target.target) {
    throw new Error(`${context} cannot be a symlink or junction`);
  }
  return {
    ...target,
    exists: true,
    identity: { device: status.dev, inode: status.ino },
  };
}
__name(managedFile, "managedFile");
async function resolveProjectFile(root, projectPath, allowMissing) {
  const path = safeRelativePath(projectPath, "project path");
  const target = (0, import_node_path.resolve)(root, ...path.split("/"));
  assertInside(root, target, "project path");
  let current = root;
  for (const [index, segment] of path.split("/").entries()) {
    current = (0, import_node_path.resolve)(current, segment);
    let status;
    try {
      status = await (0, import_promises.lstat)(current);
    } catch (error) {
      if (!missing(error) || !allowMissing) throw error;
      const parent = await (0, import_promises.realpath)(
        (0, import_node_path.dirname)(current),
      );
      assertInside(root, parent, "missing project path parent");
      return { target, exists: false };
    }
    if (status.isSymbolicLink())
      throw new Error(`project path cannot contain symlinks: ${path}`);
    if (index < path.split("/").length - 1 && !status.isDirectory()) {
      throw new Error(`project path parent is not a directory: ${path}`);
    }
    if (index === path.split("/").length - 1 && !status.isFile()) {
      throw new Error(`project path is not a regular file: ${path}`);
    }
  }
  return { target, exists: true };
}
__name(resolveProjectFile, "resolveProjectFile");
async function noFollowRead(path) {
  const handle = await (0, import_promises.open)(
    path,
    import_node_fs.constants.O_RDONLY | import_node_fs.constants.O_NOFOLLOW,
  );
  try {
    const status = await handle.stat();
    if (!status.isFile()) throw new Error("file must be regular");
    return handle.readFile();
  } finally {
    await handle.close();
  }
}
__name(noFollowRead, "noFollowRead");
async function contractFromFile(root, contractPath) {
  const resolved = await resolveProjectFile(root, contractPath, false);
  const source = (await noFollowRead(resolved.target)).toString("utf8");
  const contract = (0, import_yaml.parse)(source);
  object(contract, "architecture contract");
  return contract;
}
__name(contractFromFile, "contractFromFile");
async function managedJsonFile(root, path, context) {
  const file = await managedFile(root, path, context, false, false);
  const source = await noFollowRead(file.target);
  let parsed;
  try {
    parsed = JSON.parse(source.toString("utf8"));
  } catch {
    throw new Error(`${context} is not valid JSON`);
  }
  return { parsed, file };
}
__name(managedJsonFile, "managedJsonFile");
async function createManagedFile(root, path, body) {
  const file = await managedFile(root, path, "managed file", true, true);
  if (file.exists) throw new Error("managed file already exists");
  await (0, import_promises.writeFile)(file.target, body, {
    flag: "wx",
    mode: 384,
  });
  return managedFile(root, path, "managed file", false, false);
}
__name(createManagedFile, "createManagedFile");
function sameIdentity(left, right) {
  return left.device === right.device && left.inode === right.inode;
}
__name(sameIdentity, "sameIdentity");
async function replaceManagedFile(root, path, body, expectedIdentity) {
  const current = await managedFile(root, path, "managed file", false, false);
  if (!sameIdentity(current.identity, expectedIdentity)) {
    throw new Error("managed file changed before update");
  }
  const temporaryPath = `${current.relativePath}.${(0, import_node_crypto.randomUUID)()}.tmp`;
  const temporary = await createManagedFile(root, temporaryPath, body);
  try {
    const verified = await managedFile(root, path, "managed file", false, false);
    if (!sameIdentity(verified.identity, expectedIdentity)) {
      throw new Error("managed file changed before replacement");
    }
    await (0, import_promises.rename)(temporary.target, verified.target);
  } catch (error) {
    await (0, import_promises.unlink)(temporary.target);
    throw error;
  }
}
__name(replaceManagedFile, "replaceManagedFile");
async function initializeCheckpointLedger(input) {
  const source = object(input, "ledger input");
  const root = await repositoryRoot(source.repositoryRoot);
  const ledger = {
    schemaVersion: LEDGER_VERSION,
    managedBy: MANAGED_OWNER,
    repositoryRoot: root,
    entries: [],
  };
  const file = await createManagedFile(
    root,
    source.ledgerPath,
    `${JSON.stringify(ledger)}\n`,
  );
  return { schemaVersion: LEDGER_VERSION, path: file.target };
}
__name(initializeCheckpointLedger, "initializeCheckpointLedger");
async function createBlockSnapshot(input) {
  const source = object(input, "snapshot input");
  const root = await repositoryRoot(source.repositoryRoot);
  const path = safeRelativePath(source.targetPath, "targetPath");
  const projectFile = await resolveProjectFile(root, path, true);
  const content = projectFile.exists
    ? await noFollowRead(projectFile.target)
    : null;
  const fileMode = projectFile.exists
    ? (await (0, import_promises.lstat)(projectFile.target)).mode & 511
    : null;
  const snapshot = {
    schemaVersion: SNAPSHOT_VERSION,
    managedBy: MANAGED_OWNER,
    repositoryRoot: root,
    targetPath: path,
    existed: projectFile.exists,
    beforeSha256: content ? sha256(content) : MISSING_SHA256,
    fileMode,
    contentBase64: content ? content.toString("base64") : null,
  };
  const snapshotFile = await createManagedFile(
    root,
    source.snapshotPath,
    `${JSON.stringify(snapshot)}\n`,
  );
  return {
    snapshotPath: snapshotFile.target,
    beforeSha256: snapshot.beforeSha256,
    existed: snapshot.existed,
  };
}
__name(createBlockSnapshot, "createBlockSnapshot");
function astFindings(content, path, contract) {
  const rules =
    contract.rules?.custom?.filter((rule) => rule.engine === "ast") ?? [];
  if (!rules.length) return [];
  let tree;
  try {
    tree = (0, import_parser.parse)(content, {
      sourceType: "unambiguous",
      plugins: [
        "typescript",
        "jsx",
        "decorators",
        "classProperties",
        "importAttributes",
      ],
    });
  } catch (error) {
    return [
      {
        severity: "P1",
        ruleId: "ARCH-AST-PARSE",
        entityRef: path,
        message: error instanceof Error ? error.message : "AST parse failed",
        category: "custom",
        blocking: true,
        evidence: {},
      },
    ];
  }
  const counts = new Map(rules.map((rule) => [rule.id, 0]));
  const visit = __name((node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.type === "string")
      for (const rule of rules) {
        if (node.type === rule.pattern)
          counts.set(rule.id, (counts.get(rule.id) ?? 0) + 1);
      }
    for (const [key, value] of Object.entries(node)) {
      if (key === "loc" || key === "start" || key === "end") continue;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value && typeof value === "object") visit(value);
    }
  }, "visit");
  visit(tree);
  return rules.flatMap((rule) =>
    counts.get(rule.id)
      ? [
          {
            severity: rule.blocking ? "P1" : "P2",
            ruleId: rule.id,
            entityRef: path,
            message: rule.message,
            category: "custom",
            blocking: rule.blocking,
            evidence: { matches: counts.get(rule.id), engine: "ast" },
          },
        ]
      : [],
  );
}
__name(astFindings, "astFindings");
async function restoreSnapshot(root, snapshot) {
  const target = await resolveProjectFile(root, snapshot.targetPath, true);
  if (snapshot.existed) {
    const content = Buffer.from(snapshot.contentBase64, "base64");
    if (
      sha256(content) !== snapshot.beforeSha256 ||
      !Number.isInteger(snapshot.fileMode)
    ) {
      throw new Error("snapshot content authority is invalid");
    }
    await (0, import_promises.mkdir)(
      (0, import_node_path.dirname)(target.target),
      { recursive: true },
    );
    await (0, import_promises.writeFile)(target.target, content, {
      mode: snapshot.fileMode,
    });
  } else if (target.exists) await (0, import_promises.unlink)(target.target);
}
__name(restoreSnapshot, "restoreSnapshot");
async function checkpointLedger(root, path) {
  const authority = await managedJsonFile(root, path, "checkpoint ledger");
  const ledger = object(
    authority.parsed,
    "checkpoint ledger",
  );
  if (
    ledger.schemaVersion !== LEDGER_VERSION ||
    ledger.managedBy !== MANAGED_OWNER ||
    ledger.repositoryRoot !== root ||
    !Array.isArray(ledger.entries)
  ) {
    throw new Error("checkpoint ledger authority is invalid");
  }
  return { ledger, file: authority.file };
}
__name(checkpointLedger, "checkpointLedger");
async function checkpointSnapshot(root, snapshotPath, targetPath) {
  const authority = await managedJsonFile(root, snapshotPath, "block snapshot");
  const snapshot = object(authority.parsed, "block snapshot");
  if (
    snapshot.schemaVersion !== SNAPSHOT_VERSION ||
    snapshot.managedBy !== MANAGED_OWNER ||
    snapshot.repositoryRoot !== root ||
    snapshot.targetPath !== targetPath
  )
    throw new Error("block snapshot authority is invalid");
  return snapshot;
}
__name(checkpointSnapshot, "checkpointSnapshot");
async function checkpointFileAndRollbackUnchecked(input) {
  const source = object(input, "checkpoint input");
  const root = await repositoryRoot(source.repositoryRoot);
  const targetPath = safeRelativePath(source.targetPath, "targetPath");
  const snapshot = await checkpointSnapshot(root, source.snapshotPath, targetPath);
  const projectFile = await resolveProjectFile(root, targetPath, true);
  const content = projectFile.exists
    ? (await noFollowRead(projectFile.target)).toString("utf8")
    : "";
  const contract = await contractFromFile(root, source.contractPath);
  const ledgerAuthority = await checkpointLedger(root, source.ledgerPath);
  const ledger = ledgerAuthority.ledger;
  const missingTargetFindings = snapshot.existed && !projectFile.exists
    ? [{
        severity: "P0",
        ruleId: "ARCH-TARGET-DELETED",
        entityRef: targetPath,
        message: "The checkpoint target was deleted after its snapshot",
        category: "structure",
        blocking: true,
        evidence: { beforeSha256: snapshot.beforeSha256 },
      }]
    : [];
  const trustedFindings = [
    ...missingTargetFindings,
    ...astFindings(content, targetPath, contract),
  ];
  const result = await (0, import_archguard_runtime.runTrustedLocalCheckpoint)({
    schemaVersion: "archguard.skill.request/1.0",
    requestId: `checkpoint-${(0, import_node_crypto.randomUUID)()}`,
    operation: "checkpoint",
    input: {
      contract,
      block: {
        blockId: source.blockId,
        path: targetPath,
        content,
        beforeSha256: snapshot.beforeSha256,
      },
      history: ledger.entries,
    },
  }, trustedFindings);
  if (result.output.checkpoint.rollbackRequired)
    await restoreSnapshot(root, snapshot);
  const updated = {
    schemaVersion: LEDGER_VERSION,
    managedBy: MANAGED_OWNER,
    repositoryRoot: root,
    entries: [...ledger.entries, result.output.ledgerEntry],
  };
  await replaceManagedFile(
    root,
    source.ledgerPath,
    `${JSON.stringify(updated)}\n`,
    ledgerAuthority.file.identity,
  );
  return {
    ...result,
    rollbackCompleted: result.output.checkpoint.rollbackRequired,
  };
}
__name(checkpointFileAndRollbackUnchecked, "checkpointFileAndRollbackUnchecked");
async function checkpointFileAndRollback(input) {
  const source = object(input, "checkpoint input");
  let gate;
  try {
    gate = await verifyMutationPassFile({ repositoryRoot: source.repositoryRoot,
      chainId: source.chainId, targetPath: source.targetPath,
      gatePassPath: source.gatePassPath });
  } catch (error) {
    const root = await repositoryRoot(source.repositoryRoot);
    const targetPath = safeRelativePath(source.targetPath, "targetPath");
    await restoreSnapshot(root, await checkpointSnapshot(root, source.snapshotPath, targetPath));
    throw error;
  }
  const result = await checkpointFileAndRollbackUnchecked(source);
  const contextBaseInvalidation = await recordContextBaseInvalidation(source.repositoryRoot,
    source.targetPath, result.output.checkpoint.status);
  return {
    ...result,
    contextBaseInvalidation,
    gateEvidence: {
      schemaVersion: gate.schemaVersion,
      passId: gate.pass.passId,
      chainId: gate.pass.chainId,
      targetPath: gate.targetPath,
    },
  };
}
__name(checkpointFileAndRollback, "checkpointFileAndRollback");
export {
  MISSING_SHA256,
  SNAPSHOT_VERSION,
  checkpointFileAndRollback,
  createBlockSnapshot,
  initializeCheckpointLedger,
};
