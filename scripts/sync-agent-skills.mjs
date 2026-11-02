import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import path from "node:path";

function parseArguments(argumentsList) {
  const options = { root: process.cwd(), mode: undefined };

  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--root") {
      options.root = argumentsList[++index];
    } else if (argument === "--sync" || argument === "--check") {
      if (options.mode) {
        throw new Error("Choose only one of --sync or --check.");
      }
      options.mode = argument.slice(2);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.root || !options.mode) {
    throw new Error("Use --root [path] and exactly one of --sync or --check.");
  }

  options.root = path.resolve(options.root);
  return options;
}

function listFiles(directory, relativeDirectory = "") {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = path.join(relativeDirectory, entry.name);
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(absolutePath, relativePath));
    } else if (entry.isFile()) {
      files.push(relativePath);
    } else {
      throw new Error(`Unsupported skill entry: ${absolutePath}`);
    }
  }
  return files.sort();
}

function validateSkillMetadata(sourceRoot, relativePath) {
  if (path.basename(relativePath) !== "SKILL.md") {
    return;
  }

  const content = readFileSync(path.join(sourceRoot, relativePath), "utf8");
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content)?.[1];
  const name = frontmatter?.match(/^name:\s*([a-z0-9-]+)\s*$/m)?.[1];
  const hasDescription = /^description:\s*\S/m.test(frontmatter ?? "");
  const skillDirectory = path.basename(path.dirname(relativePath));

  if (!frontmatter || !name || !hasDescription || name !== skillDirectory) {
    throw new Error(`Invalid Agent Skills frontmatter or folder name: ${relativePath}`);
  }
}

function assertMirrorsMatch(sourceRoot, mirrorRoot) {
  const sourceFiles = listFiles(sourceRoot);
  const mirrorFiles = listFiles(mirrorRoot);
  const sourceFileSet = new Set(sourceFiles);
  const mirrorOnlyFiles = mirrorFiles.filter((filePath) => !sourceFileSet.has(filePath));
  if (mirrorOnlyFiles.length > 0) {
    throw new Error(`Claude skill mirror has files absent from .agents/skills: ${mirrorOnlyFiles.join(", ")}`);
  }

  if (sourceFiles.length !== mirrorFiles.length) {
    throw new Error("Claude skill mirror is missing files; run the skills sync command.");
  }

  for (const relativePath of sourceFiles) {
    validateSkillMetadata(sourceRoot, relativePath);
    const sourceContent = readFileSync(path.join(sourceRoot, relativePath));
    const mirrorContent = readFileSync(path.join(mirrorRoot, relativePath));
    if (!sourceContent.equals(mirrorContent)) {
      throw new Error(`Claude skill mirror is out of sync: ${relativePath}`);
    }
  }
}

function syncSkills(root) {
  const sourceRoot = path.join(root, ".agents", "skills");
  const mirrorRoot = path.join(root, ".claude", "skills");
  const sourceFiles = listFiles(sourceRoot);
  if (sourceFiles.length === 0) {
    throw new Error("No canonical skills found in .agents/skills.");
  }

  for (const relativePath of sourceFiles) {
    validateSkillMetadata(sourceRoot, relativePath);
  }

  const sourceFileSet = new Set(sourceFiles);
  const staleFiles = listFiles(mirrorRoot).filter((filePath) => !sourceFileSet.has(filePath));
  if (staleFiles.length > 0) {
    throw new Error(`Remove stale Claude mirror files manually: ${staleFiles.join(", ")}`);
  }

  for (const relativePath of sourceFiles) {
    const sourcePath = path.join(sourceRoot, relativePath);
    const mirrorPath = path.join(mirrorRoot, relativePath);
    mkdirSync(path.dirname(mirrorPath), { recursive: true });
    if (!existsSync(mirrorPath) || !readFileSync(sourcePath).equals(readFileSync(mirrorPath))) {
      copyFileSync(sourcePath, mirrorPath);
    }
  }

  assertMirrorsMatch(sourceRoot, mirrorRoot);
}

try {
  const { root, mode } = parseArguments(process.argv.slice(2));
  const sourceRoot = path.join(root, ".agents", "skills");
  const mirrorRoot = path.join(root, ".claude", "skills");
  if (mode === "sync") {
    syncSkills(root);
  } else {
    if (!existsSync(sourceRoot) || !existsSync(mirrorRoot)) {
      throw new Error("Expected both .agents/skills and .claude/skills directories.");
    }
    assertMirrorsMatch(sourceRoot, mirrorRoot);
  }
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}