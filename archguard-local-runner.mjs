import { createRequire } from "node:module";
import * as import_archguard_runtime from "./archguard-runtime.mjs";
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
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((part) => !part || part === "." || part === "..")
  ) {
    throw new Error(`${context} is unsafe`);
  }
  return value;
}
__name(safeRelativePath, "safeRelativePath");
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
async function jsonFile(path, context) {
  const source = await noFollowRead((0, import_node_path.resolve)(path));
  let parsed;
  try {
    parsed = JSON.parse(source.toString("utf8"));
  } catch {
    throw new Error(`${context} is not valid JSON`);
  }
  return parsed;
}
__name(jsonFile, "jsonFile");
async function writeAtomic(path, body, mode = 384) {
  const target = (0, import_node_path.resolve)(path);
  await (0, import_promises.mkdir)((0, import_node_path.dirname)(target), {
    recursive: true,
    mode: 448,
  });
  const temporary = `${target}.${(0, import_node_crypto.randomUUID)()}.tmp`;
  await (0, import_promises.writeFile)(temporary, body, { flag: "wx", mode });
  await (0, import_promises.rename)(temporary, target);
}
__name(writeAtomic, "writeAtomic");
async function initializeCheckpointLedger(path) {
  const target = (0, import_node_path.resolve)(path);
  await (0, import_promises.mkdir)((0, import_node_path.dirname)(target), {
    recursive: true,
    mode: 448,
  });
  await (0, import_promises.writeFile)(
    target,
    `${JSON.stringify({ schemaVersion: LEDGER_VERSION, entries: [] })}
`,
    { flag: "wx", mode: 384 },
  );
  return { schemaVersion: LEDGER_VERSION, path: target };
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
    repositoryRoot: root,
    targetPath: path,
    existed: projectFile.exists,
    beforeSha256: content ? sha256(content) : MISSING_SHA256,
    fileMode,
    contentBase64: content ? content.toString("base64") : null,
  };
  const snapshotPath = (0, import_node_path.resolve)(source.snapshotPath);
  await (0, import_promises.mkdir)(
    (0, import_node_path.dirname)(snapshotPath),
    { recursive: true, mode: 448 },
  );
  await (0, import_promises.writeFile)(
    snapshotPath,
    `${JSON.stringify(snapshot)}
`,
    { flag: "wx", mode: 384 },
  );
  return {
    snapshotPath,
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
async function checkpointLedger(path) {
  const ledger = object(
    await jsonFile(path, "checkpoint ledger"),
    "checkpoint ledger",
  );
  if (
    ledger.schemaVersion !== LEDGER_VERSION ||
    !Array.isArray(ledger.entries)
  ) {
    throw new Error("checkpoint ledger authority is invalid");
  }
  return ledger;
}
__name(checkpointLedger, "checkpointLedger");
async function checkpointFileAndRollback(input) {
  const source = object(input, "checkpoint input");
  const root = await repositoryRoot(source.repositoryRoot);
  const snapshot = object(
    await jsonFile(source.snapshotPath, "block snapshot"),
    "block snapshot",
  );
  if (
    snapshot.schemaVersion !== SNAPSHOT_VERSION ||
    snapshot.repositoryRoot !== root ||
    snapshot.targetPath !== source.targetPath
  )
    throw new Error("block snapshot authority is invalid");
  const projectFile = await resolveProjectFile(root, source.targetPath, false);
  const content = (await noFollowRead(projectFile.target)).toString("utf8");
  const contract = await contractFromFile(root, source.contractPath);
  const ledger = await checkpointLedger(source.ledgerPath);
  const result = await (0, import_archguard_runtime.run)({
    schemaVersion: "archguard.skill.request/1.0",
    requestId: `checkpoint-${(0, import_node_crypto.randomUUID)()}`,
    operation: "checkpoint",
    input: {
      contract,
      block: {
        blockId: source.blockId,
        path: source.targetPath,
        content,
        beforeSha256: snapshot.beforeSha256,
        astFindings: astFindings(content, source.targetPath, contract),
      },
      history: ledger.entries,
    },
  });
  if (result.output.checkpoint.rollbackRequired)
    await restoreSnapshot(root, snapshot);
  const updated = {
    schemaVersion: LEDGER_VERSION,
    entries: [...ledger.entries, result.output.ledgerEntry],
  };
  await writeAtomic(
    source.ledgerPath,
    `${JSON.stringify(updated)}
`,
  );
  return {
    ...result,
    rollbackCompleted: result.output.checkpoint.rollbackRequired,
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
