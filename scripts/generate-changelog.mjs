#!/usr/bin/env node
/**
 * generate-changelog.mjs
 *
 * 解析当前 Tag 相对于上一个 Tag 的 Conventional Commits，
 * 生成 Keep a Changelog 中文格式的 Release Notes：
 *   1. 写入 release-notes.md（供 GitHub Release body 使用）
 *   2. 幂等地插入 CHANGELOG.md 顶部（版本段已存在则跳过）
 *
 * 用法: node scripts/generate-changelog.mjs <tag>
 * 示例: node scripts/generate-changelog.mjs v0.9.0
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const tag = process.argv[2];
if (!tag) {
  console.error('用法: node scripts/generate-changelog.mjs <tag>');
  process.exit(1);
}

const SEMVER_RE = /^v\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
if (!SEMVER_RE.test(tag)) {
  console.error(`错误: Tag "${tag}" 不符合 SemVer 格式（如 v0.9.0 / v1.0.0-beta.1）`);
  process.exit(1);
}

const version = tag.replace(/^v/, '');

function git(cmd) {
  return execSync(cmd, { encoding: 'utf-8' }).trim();
}

// 1. 找上一个 Tag（按版本号排序，排除当前）
let prevTag = '';
try {
  const tags = git('git tag --sort=-v:refname').split('\n').filter(Boolean);
  prevTag = tags.find((t) => t !== tag && SEMVER_RE.test(t)) || '';
} catch {
  prevTag = '';
}

const range = prevTag ? `${prevTag}..${tag}` : tag;
console.log(`解析提交范围: ${prevTag ? `${prevTag}..${tag}` : `${tag}（首个 Tag，取全部历史）`}`);

// 2. 解析 Conventional Commits
const raw = git(`git log ${range} --pretty=format:'%s|%h|%an'`);
const lines = raw ? raw.split('\n').filter(Boolean) : [];

const groups = { Added: [], Fixed: [], Changed: [], Docs: [], Other: [] };
const CONVENTIONAL_RE = /^(\w+)(\([^)]*\))?(!)?:\s*(.+)$/;

for (const line of lines) {
  const sepIdx = line.indexOf('|');
  const subject = sepIdx === -1 ? line : line.slice(0, sepIdx);
  const hash = sepIdx === -1 ? '' : line.slice(sepIdx + 1).split('|')[0];
  const m = subject.match(CONVENTIONAL_RE);

  let bucket = 'Other';
  let text = subject;
  if (m) {
    const [, type, scope, breaking, desc] = m;
    text = scope ? `${desc}（${scope.slice(1, -1)}）` : desc;
    if (breaking) text = `**破坏性变更** ${text}`;
    if (type === 'feat') bucket = 'Added';
    else if (type === 'fix') bucket = 'Fixed';
    else if (['refactor', 'perf', 'style'].includes(type)) bucket = 'Changed';
    else if (type === 'docs') bucket = 'Docs';
    else bucket = 'Other'; // chore / ci / build / test 等
  }
  groups[bucket].push(hash ? `${text} (\`${hash}\`)` : text);
}

// 3. 生成 Markdown 段（与现有 CHANGELOG.md 风格一致）
const today = new Date().toISOString().slice(0, 10);
const SECTION_TITLES = [
  ['Added', 'Added'],
  ['Fixed', 'Fixed'],
  ['Changed', 'Changed'],
  ['Docs', 'Docs'],
  ['Other', 'Other'],
];

let section = `## [${version}] - ${today}\n`;
let hasContent = false;
for (const [key, title] of SECTION_TITLES) {
  const items = groups[key];
  if (items.length === 0) continue;
  hasContent = true;
  section += `\n### ${title}\n\n`;
  for (const item of items) section += `- ${item}\n`;
}
if (!hasContent) {
  section += `\n### Changed\n\n- 例行版本发布\n`;
}

// 4. 写 release-notes.md（Release body）
const notesHeader = prevTag
  ? `**完整变更**: ${prevTag}...${tag}\n\n`
  : '';
writeFileSync('release-notes.md', notesHeader + section, 'utf-8');
console.log('已生成 release-notes.md');

// 5. 幂等插入 CHANGELOG.md
const CHANGELOG = 'CHANGELOG.md';
if (existsSync(CHANGELOG)) {
  const content = readFileSync(CHANGELOG, 'utf-8');
  if (content.includes(`## [${version}]`)) {
    console.log(`CHANGELOG.md 已包含 [${version}] 段落，跳过插入（幂等）`);
  } else {
    // 插入到第一个 "## [" 之前（即头部说明块之后）
    const idx = content.search(/^## \[/m);
    const next =
      idx === -1
        ? content.trimEnd() + '\n\n' + section
        : content.slice(0, idx) + section + '\n' + content.slice(idx);
    writeFileSync(CHANGELOG, next, 'utf-8');
    console.log(`已将 [${version}] 段落插入 CHANGELOG.md`);
  }
} else {
  console.warn('警告: 未找到 CHANGELOG.md，仅生成 release-notes.md');
}

console.log('\n----- 生成的 Release Notes 预览 -----');
console.log(section);
