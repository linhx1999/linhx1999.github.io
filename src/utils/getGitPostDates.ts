import { execFileSync } from "node:child_process";
import { relative, resolve, sep } from "node:path";

interface GitPostDates {
  pubDatetime: Date;
  modDatetime: Date | null;
}

const repoRoot = process.cwd();
const datesCache = new Map<string, GitPostDates>();

const toRepoRelativePath = (filePath: string) =>
  relative(repoRoot, resolve(repoRoot, filePath)).split(sep).join("/");

const parseGitDate = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getGitLogDate = (args: string[]) => {
  try {
    const output = execFileSync("git", args, {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    return parseGitDate(output || null);
  } catch {
    return null;
  }
};

export const getGitPostDates = (filePath: string): GitPostDates => {
  const repoRelativePath = toRepoRelativePath(filePath);
  const cachedDates = datesCache.get(repoRelativePath);

  if (cachedDates) {
    return cachedDates;
  }

  const firstCommitDate = getGitLogDate([
    "log",
    "--follow",
    "--diff-filter=A",
    "--format=%aI",
    "-1",
    "--",
    repoRelativePath,
  ]);

  const lastCommitDate = getGitLogDate([
    "log",
    "--follow",
    "--format=%aI",
    "-1",
    "--",
    repoRelativePath,
  ]);

  const pubDatetime = firstCommitDate ?? lastCommitDate ?? new Date();
  const modDatetime =
    firstCommitDate &&
    lastCommitDate &&
    lastCommitDate.getTime() > firstCommitDate.getTime()
      ? lastCommitDate
      : null;

  const resolvedDates = { pubDatetime, modDatetime };
  datesCache.set(repoRelativePath, resolvedDates);

  return resolvedDates;
};
