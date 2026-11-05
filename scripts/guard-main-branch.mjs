#!/usr/bin/env node
// PreToolUse hook pro Claude Code (matcher "Bash"): zablokuje `git commit`,
// pokud by commit skončil přímo na hlavní větvi (main/master).
//
// Vynucuje pravidlo z AGENTS.md ("Commituj jen do větve úkolu"). Hook čte
// JSON z stdin ({ tool_name, tool_input: { command }, cwd }). Exit 2 = akce
// je zablokovaná a zpráva ze stderr jde agentovi. Cokoli neočekávaného
// (chybný vstup, git není dostupný, detached HEAD) se povolí - hook nesmí
// zablokovat práci kvůli vlastní chybě. Není to sandbox: obejít ho jde
// např. přes skript, který commit provede sám.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const protectedBranches = new Set(["main", "master"]);
// Volby před podpříkazem gitu, které berou hodnotu v dalším tokenu.
const globalOptionsWithValue = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace"]);

function allow() {
  process.exit(0);
}

function parseGitSubcommand(segment) {
  const tokens = segment.trim().split(/\s+/).filter(Boolean);
  let index = 0;
  // Přiřazení proměnných prostředí před příkazem (GIT_AUTHOR_NAME=x git commit).
  while (index < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[index])) {
    index += 1;
  }
  if (tokens[index] !== "git") {
    return null;
  }
  index += 1;
  while (index < tokens.length && tokens[index].startsWith("-")) {
    index += globalOptionsWithValue.has(tokens[index]) ? 2 : 1;
  }
  return tokens[index] ? { name: tokens[index], args: tokens.slice(index + 1) } : null;
}

function createsBranch({ name, args }) {
  if (name === "switch") {
    return args.some((arg) => ["-c", "-C", "--create", "--force-create"].includes(arg));
  }
  if (name === "checkout") {
    return args.some((arg) => arg === "-b" || arg === "-B");
  }
  return false;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return allow();
  }

  const command = payload?.tool_input?.command;
  if (payload?.tool_name !== "Bash" || typeof command !== "string") {
    return allow();
  }

  const subcommands = command
    .split(/&&|\|\||;|\||\r?\n/)
    .map(parseGitSubcommand)
    .filter(Boolean);
  const commitIndex = subcommands.findIndex((subcommand) => subcommand.name === "commit");
  if (commitIndex < 0) {
    return allow();
  }

  // `git switch -c task/... && git commit` - commit skončí na nové větvi.
  const branchIndex = subcommands.findIndex(createsBranch);
  if (branchIndex >= 0 && branchIndex < commitIndex) {
    return allow();
  }

  let branch;
  try {
    branch = execFileSync("git", ["-C", payload.cwd ?? process.cwd(), "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return allow();
  }

  if (!protectedBranches.has(branch)) {
    return allow();
  }

  process.stderr.write(
    `Commit přímo do větve '${branch}' je zakázán (AGENTS.md, "Task branch"). ` +
      "Založ větev úkolu: git switch -c task/T-N-kratky-popis a commituj do ní. " +
      "Do hlavní větve slučuje až člověk po kontrole.\n",
  );
  process.exit(2);
}

main();
