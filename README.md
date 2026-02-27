# Roux

Mine and analyze git history to understand how your codebase evolves — find hotspots, hidden coupling, ownership patterns, and team dynamics from commit data alone.

挖掘和分析 git 历史，理解代码库的演变 — 仅凭 commit 数据就能发现热点、隐式耦合、代码所有权和团队协作模式。

Roux provides 18 analyses covering code hotspots, coupling, churn, ownership, and team collaboration. Written in TypeScript, it starts in milliseconds and installs with `npm install`. Based on the analysis methods from [code-maat](https://github.com/adamtornhill/code-maat), with fully compatible output.

Roux 提供 18 种分析，覆盖代码热点、耦合、变动、所有权和团队协作。TypeScript 编写，毫秒级启动，`npm install` 即可使用。基于 [code-maat](https://github.com/adamtornhill/code-maat) 的分析方法，输出兼容。

## Quick Start / 快速开始

```bash
# Analyze the current git repository / 分析当前 git 仓库
npx roux summary
npx roux coupling
npx roux main-dev

# Analyze last year only / 只分析最近一年
npx roux coupling --after 2025-01-01

# Between two releases / 两个版本之间
npx roux coupling --rev v1.0..v2.0

# Date range / 日期范围
npx roux revisions --after 2024-01-01 --before 2025-01-01

# Analyze a specific log file / 分析指定的日志文件
npx roux revisions -l git.log

# Generate a log file first, then analyze / 先生成日志文件，再分析
git log --all --numstat --date=short --pretty=format:'--%h--%ad--%aN--%s' --no-renames > git.log
npx roux hotspot -l git.log
```

## Installation / 安装

```bash
npm install roux
```

Or run directly / 或直接运行:

```bash
npx roux <analysis> [options]
```

## Analyses / 分析类型

Roux supports 18 analyses:

Roux 支持 18 种分析：

| Analysis / 分析        | Description / 说明                                            | Key Output / 关键输出          |
|------------------------|---------------------------------------------------------------|--------------------------------|
| `summary`              | Repository statistics / 仓库统计                              | commits, entities, authors     |
| `revisions`            | Most modified files / 修改最多的文件                          | entity, n-revs                 |
| `authors`              | Author diversity per file / 每个文件的作者多样性              | entity, n-authors, n-revs      |
| `coupling`             | Files that change together / 经常一起修改的文件               | entity, coupled, degree        |
| `soc`                  | Sum of coupling per file / 每个文件的耦合度总和               | entity, soc                    |
| `abs-churn`            | Daily code churn / 每日代码变动量                             | date, added, deleted, commits  |
| `entity-churn`         | Code churn per file / 每个文件的代码变动量                    | entity, added, deleted         |
| `author-churn`         | Code churn per author / 每个作者的代码变动量                  | author, added, deleted         |
| `age`                  | Months since last change / 距最后修改的月数                   | entity, age-months             |
| `entity-ownership`     | Who owns what (by LOC) / 代码所有权（按代码行数）             | entity, author, added, deleted |
| `main-dev`             | Primary developer (by lines added) / 主要开发者（按新增行数） | entity, main-dev, ownership    |
| `main-dev-by-revs`     | Primary developer (by commits) / 主要开发者（按提交次数）     | entity, main-dev, ownership    |
| `refactoring-main-dev` | Top refactorer (by lines deleted) / 主要重构者（按删除行数）  | entity, main-dev, ownership    |
| `entity-effort`        | Effort distribution / 工作量分布                              | entity, author, author-revs    |
| `fragmentation`        | Knowledge fragmentation / 知识碎片化                          | entity, fractal-value          |
| `communication`        | Developer collaboration / 开发者协作关系                      | author, peer, strength         |
| `messages`             | Commit message pattern matching / 提交信息模式匹配            | entity, matches                |
| `identity`             | Raw modification data / 原始修改数据                          | all fields                     |

### When to Use Each Analysis / 各分析使用场景

> Examples below use [code-maat](https://github.com/adamtornhill/code-maat) as sample repo, filtered to 2014–2015.
>
> 以下示例使用 code-maat 仓库，筛选 2014–2015 年的数据。

#### Code Hotspots & Complexity / 代码热点与复杂度

**`summary`** — Quick overview of project scale / 快速了解项目规模
```bash
$ npx roux summary --repo /path/to/repo --after 2014-01-01 --before 2016-01-01
statistic,value
number-of-commits,138
number-of-entities,65
number-of-entities-changed,292
number-of-authors,8
```

**`revisions`** — Find most frequently modified files (hotspots) / 找出修改最频繁的文件（热点）
```bash
$ npx roux revisions --after 2014-01-01 --before 2016-01-01 -n 3 -r 5
entity,n-revs
project.clj,41
src/code_maat/app/app.clj,26
src/code_maat/cmd_line.clj,21
README.md,18
src/code_maat/parsers/hiccup_based_parser.clj,14
```

**`age`** — Find code that hasn't changed in a long time (stable infrastructure or forgotten debt) / 找出长期未修改的代码（可能是稳定的基础设施，也可能是被遗忘的技术债）
```bash
$ npx roux age --after 2014-01-01 --before 2016-01-01 -d 2016-01-01 -n 3 -r 5
entity,age-months
src/code_maat/app/layer_mapper.clj,1
README.md,2
src/code_maat/parsers/git.clj,3
test/code_maat/parsers/git_test.clj,3
.travis.yml,4
```

#### Code Coupling / 代码耦合

**`coupling`** — Find files that often change together (implicit dependencies) / 找出经常一起修改的文件对（隐式依赖）
```bash
$ npx roux coupling --after 2014-01-01 --before 2016-01-01 -m 3 -r 5
entity,coupled,degree,average-revs
src/code_maat/analysis/churn.clj,test/code_maat/analysis/churn_test.clj,80,5
src/code_maat/parsers/git.clj,src/code_maat/parsers/mercurial.clj,80,8
src/code_maat/parsers/git.clj,test/code_maat/parsers/git_test.clj,75,8
src/code_maat/parsers/hiccup_based_parser.clj,test/code_maat/parsers/git_test.clj,54,11
src/code_maat/parsers/mercurial.clj,test/code_maat/parsers/git_test.clj,53,8
```

**`soc`** — Sum of coupling per file. High soc = "God file" that's coupled to too many others, risky to change / 每个文件的耦合度总和。高 soc = God 文件，与过多文件耦合，改动风险大
```bash
$ npx roux soc --after 2014-01-01 --before 2016-01-01 -m 3 -r 5
entity,soc
src/code_maat/app/app.clj,68
test/code_maat/end_to_end/scenario_tests.clj,53
src/code_maat/cmd_line.clj,50
project.clj,43
src/code_maat/parsers/git.clj,34
```

**`messages`** — Match commit message patterns (e.g. "Fix", "Bug") / 按 commit message 匹配模式
```bash
npx roux messages -e "Fix|Bug"
```

#### Code Churn / 代码变动

**`abs-churn`** — Daily code churn, identify development rhythm / 每日代码变动量，识别开发节奏
```bash
npx roux abs-churn --after 2024-06-01
```

**`entity-churn`** — Churn per file, combine with revisions to identify high-risk files / 每个文件的变动量，结合 revisions 识别高风险文件
```bash
npx roux entity-churn -r 20
```

**`author-churn`** — Churn per author / 每个作者的变动量
```bash
npx roux author-churn --rev v1.0..v2.0
```

#### Code Ownership / 代码所有权

**`entity-ownership`** — Who owns which code / 谁拥有哪些代码
```bash
npx roux entity-ownership -r 10
```

**`main-dev`** — Primary developer per file (by lines added). Ownership < 0.5 means no clear owner / 每个文件的主要开发者（按新增行数）。ownership < 0.5 表示没有明确负责人
```bash
$ npx roux main-dev --after 2014-01-01 --before 2016-01-01 -n 3 -r 5
entity,main-dev,added,total-added,ownership
.gitignore,Adam Tornhill,1,1,1.0
.mailmap,Felipe Knorr Kuhn,3,3,1.0
.travis.yml,Andrea Crotti,7,7,1.0
project.clj,Adam Tornhill,54,54,1.0
README.md,Adam Tornhill,105,118,0.89
```

**`main-dev-by-revs`** — Primary developer per file (by commit count) / 按 commit 次数计算的主要开发者
```bash
npx roux main-dev-by-revs -n 3
```

**`refactoring-main-dev`** — Who is doing refactoring (by lines deleted) / 谁在做重构（按删除行数）
```bash
npx roux refactoring-main-dev -r 10
```

#### Team & Collaboration / 团队与协作

**`entity-effort`** — Effort distribution across files / 工作量分布
```bash
npx roux entity-effort -r 10
```

**`fragmentation`** — Knowledge fragmentation level / 知识碎片化程度
```bash
npx roux fragmentation -n 3
```

**`communication`** — Developer collaboration network / 开发者协作网络
```bash
npx roux communication --after 2024-01-01
```

**`identity`** — Raw data export for custom analysis / 原始数据导出，供自定义分析
```bash
npx roux identity -r 10 -o json
```

## CLI Options / 命令行选项

```
roux <analysis> [options]
```

### Input / 输入

| Flag | Description / 说明 | Default / 默认值 |
|------|-------------|---------|
| `-l, --log <file>` | Git log file path / 日志文件路径 | reads current repo / 读取当前仓库 |
| `--repo <path>` | Git repository path / Git 仓库路径 | current directory / 当前目录 |
| `--after <date>` | Only commits after date / 只包含此日期之后的提交 (YYYY-MM-DD) | — |
| `--before <date>` | Only commits before date / 只包含此日期之前的提交 (YYYY-MM-DD) | — |
| `--rev <range>` | Git revision range / Git 版本范围 (e.g. `v1.0..v2.0`) | `--all` |
| `-c, --format <fmt>` | Log format / 日志格式: `git2` or `git` | `git2` |

Roux also reads from stdin / 也支持从标准输入读取:

```bash
cat git.log | npx roux summary
```

### Thresholds / 阈值

| Flag                           | Description / 说明                                                | Default / 默认值 |
|--------------------------------|-------------------------------------------------------------------|------------------|
| `-n, --min-revs <n>`           | Minimum revisions to include entity / 文件最少修改次数            | 5                |
| `-m, --min-shared-revs <n>`    | Minimum shared revisions for coupling / 耦合分析最少共同修改次数  | 5                |
| `-i, --min-coupling <n>`       | Minimum coupling percentage / 最低耦合百分比                      | 30               |
| `-x, --max-coupling <n>`       | Maximum coupling percentage / 最高耦合百分比                      | 100              |
| `-s, --max-changeset-size <n>` | Ignore commits touching more files / 忽略涉及文件数超过此值的提交 | 30               |

### Transforms / 数据变换

| Flag                           | Description / 说明                                                     |
|--------------------------------|------------------------------------------------------------------------|
| `-g, --group <file>`           | Map files to architectural groups (txt/json/md) / 将文件映射到架构分组 |
| `-p, --team-map <file>`        | Map authors to teams (csv/json/md) / 将作者映射到团队                  |
| `-t, --temporal-period <days>` | Sliding window aggregation / 滑动窗口聚合                              |

### Output / 输出

| Flag                             | Description / 说明                                       | Default / 默认值 |
|----------------------------------|----------------------------------------------------------|------------------|
| `-r, --rows <n>`                 | Limit output rows / 限制输出行数                         | unlimited / 不限 |
| `-o, --output-format <fmt>`      | `csv` or `json`                                          | `csv`            |
| `-d, --age-time-now <date>`      | Reference date for age (YYYY-MM-DD) / age 分析的参考日期 | today / 今天     |
| `-e, --expression-to-match <re>` | Regex for messages analysis / messages 分析的正则表达式  | —                |

## Log Formats / 日志格式

### git2 (default / 默认)

The recommended format. Generate with:

推荐格式。生成方式：

```bash
git log --all --numstat --date=short \
  --pretty=format:'--%h--%ad--%aN--%s' --no-renames > git.log
```

Example / 示例:

```
--abc1234--2026-01-15--Alice--Fix parser bug
12	4	src/parser.ts
0	8	src/old-code.ts

--def5678--2026-01-14--Bob--Add feature
45	0	src/feature.ts
```

### git (legacy / 旧版)

Compatible with code-maat's original git format.

兼容 code-maat 原始 git 格式：

```
[abc1234] Alice 2026-01-15 Fix parser bug
12	4	src/parser.ts
0	8	src/old-code.ts
```

Use `-c git` to select this format. / 使用 `-c git` 选择此格式。

## Transforms / 数据变换

### Architectural Grouping / 架构分组 (`-g`)

Group files into logical layers for higher-level analysis.

将文件分组到逻辑层，进行更高层次的分析。

Supports TXT, JSON, and Markdown formats (auto-detected by file extension).

支持 TXT、JSON、Markdown 格式（按文件扩展名自动检测）。

**TXT** (`groups.txt`):
```
src/api     => API Layer
src/ui      => UI Layer
src/models  => Data Layer
```

**JSON** (`groups.json`):
```json
{
  "src/api": "API Layer",
  "src/ui": "UI Layer",
  "^src\\/.*Test.*$": "Tests"
}
```

**Markdown** (`groups.md`):
```markdown
| path | group |
|------|-------|
| src/api | API Layer |
| src/ui | UI Layer |
| ^src\/.*Test.*$ | Tests |
```

Regex patterns are also supported (must start with `^` and end with `$`):

也支持正则表达式（必须以 `^` 开头，以 `$` 结尾）：

```
^src\/.*Test.*$ => Tests
^src\/((?!.*Test.*).).*$ => Production Code
```

```bash
npx roux coupling -l git.log -g groups.json
```

### Team Mapping / 团队映射 (`-p`)

Map individual authors to teams for team-level analysis.

将个人作者映射到团队，进行团队级别的分析。

Supports CSV, JSON, and Markdown formats (auto-detected by file extension).

支持 CSV、JSON、Markdown 格式（按文件扩展名自动检测）。

**CSV** (`teams.csv`):
```csv
author,team
Alice,Backend
Bob,Backend
Charlie,Frontend
```

**JSON** (`teams.json`):
```json
{
  "Alice": "Backend",
  "Bob": "Backend",
  "Charlie": "Frontend"
}
```

**Markdown** (`teams.md`):
```markdown
| author | team |
|--------|------|
| Alice | Backend |
| Bob | Backend |
| Charlie | Frontend |
```

```bash
npx roux communication -l git.log -p teams.json
```

### Temporal Coupling / 时间窗口耦合 (`-t`)

Analyze coupling within sliding time windows.

在滑动时间窗口内分析耦合：

```bash
npx roux coupling -l git.log -t 30    # 30-day windows / 30 天窗口
```

## Programmatic API / 编程接口

```typescript
import { analyze, parseGitLog, generateGitLog } from "roux";

// Analyze a repo directly with time filters / 直接分析 repo，带时间过滤
const result = analyze({
  analysis: "coupling",
  repo: "/path/to/repo",
  after: "2024-01-01",
  before: "2025-01-01",
});
console.log(result); // CSV string

// Or with revision range / 或使用版本范围
const result2 = analyze({
  analysis: "revisions",
  repo: "/path/to/repo",
  rev: "v1.0..v2.0",
  outputFormat: "json",
});

// Or parse a log file manually / 或手动解析日志文件
const log = fs.readFileSync("git.log", "utf-8");
const mods = parseGitLog(log);
const result3 = analyze({ analysis: "summary", input: log });
```

## Development / 开发

```bash
npm install
npm test              # 94 unit tests / 94 个单元测试
bash test/acceptance/run.sh   # 101 acceptance tests (requires code-maat) / 101 个验收测试（需要 code-maat）
```

## License / 许可证

MIT
