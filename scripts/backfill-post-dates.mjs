import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc.js";
import timezone from "dayjs/plugin/timezone.js";

dayjs.extend(utc);
dayjs.extend(timezone);

const repoRoot = process.cwd();
const blogRoot = resolve(repoRoot, "src/data/blog");
const siteTimezone = "Asia/Shanghai";
const writeMode = process.argv.includes("--write");

const printLine = message => {
  process.stdout.write(`${message}\n`);
};

const toRepoRelativePath = filePath =>
  relative(repoRoot, filePath).split(sep).join("/");

const parseGitDate = value => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getGitLogDate = (filePath, args) => {
  try {
    const output = execFileSync(
      "git",
      [...args, "--", toRepoRelativePath(filePath)],
      {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    ).trim();

    return parseGitDate(output || null);
  } catch {
    return null;
  }
};

const getGitPostDates = filePath => {
  const firstCommitDate = getGitLogDate(filePath, [
    "log",
    "--follow",
    "--diff-filter=A",
    "--format=%aI",
    "-1",
  ]);
  const lastCommitDate = getGitLogDate(filePath, [
    "log",
    "--follow",
    "--format=%aI",
    "-1",
  ]);
  const fallbackDate = new Date();

  return {
    pubDatetime: firstCommitDate ?? lastCommitDate ?? fallbackDate,
    modDatetime:
      firstCommitDate &&
      lastCommitDate &&
      lastCommitDate.getTime() > firstCommitDate.getTime()
        ? lastCommitDate
        : null,
  };
};

const listMarkdownFiles = directory =>
  readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      return listMarkdownFiles(fullPath);
    }

    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      return [];
    }

    return [fullPath];
  });

const getFrontmatterRange = content => {
  const newline = content.includes("\r\n") ? "\r\n" : "\n";
  const delimiter = `---${newline}`;

  if (!content.startsWith(delimiter)) {
    return null;
  }

  const endOffset = content.indexOf(`${newline}---${newline}`, delimiter.length);

  if (endOffset === -1) {
    return null;
  }

  return {
    newline,
    start: delimiter.length,
    end: endOffset,
    after: endOffset + `${newline}---${newline}`.length,
  };
};

const formatDate = value =>
  dayjs(value).tz(siteTimezone).format("YYYY-MM-DDTHH:mm:ssZ");

const updateFrontmatter = (content, dates) => {
  const range = getFrontmatterRange(content);

  if (!range) {
    return null;
  }

  const frontmatter = content.slice(range.start, range.end);
  const lines = frontmatter.split(range.newline);
  const hasPubDatetime = lines.some(line => line.startsWith("pubDatetime:"));
  const hasModDatetime = lines.some(line => line.startsWith("modDatetime:"));
  const insertIndex = lines.findIndex(line =>
    /^(draft|featured|tags|author|timezone|canonicalURL|hideEditPost|ogImage):/.test(
      line
    )
  );
  const additions = [];

  if (!hasPubDatetime) {
    additions.push(`pubDatetime: ${formatDate(dates.pubDatetime)}`);
  }

  if (!hasModDatetime && dates.modDatetime) {
    additions.push(`modDatetime: ${formatDate(dates.modDatetime)}`);
  }

  if (additions.length === 0) {
    return null;
  }

  const targetIndex = insertIndex === -1 ? lines.length : insertIndex;
  lines.splice(targetIndex, 0, ...additions);

  return {
    content: `${content.slice(0, range.start)}${lines.join(range.newline)}${content.slice(range.end)}`,
    additions,
  };
};

const files = listMarkdownFiles(blogRoot).filter(
  filePath => relative(blogRoot, filePath) !== "example.md"
);

let changedFiles = 0;

for (const filePath of files) {
  const content = readFileSync(filePath, "utf8");
  const updated = updateFrontmatter(content, getGitPostDates(filePath));

  if (!updated) {
    continue;
  }

  changedFiles += 1;
  const relativePath = toRepoRelativePath(filePath);
  printLine(`${writeMode ? "update" : "plan"} ${relativePath}`);
  printLine(`  ${updated.additions.join(", ")}`);

  if (writeMode) {
    writeFileSync(filePath, updated.content);
  }
}

if (changedFiles === 0) {
  printLine("没有需要回填时间的文章。");
} else if (!writeMode) {
  printLine("以上为 dry-run 结果；追加 --write 才会写回文件。");
}
