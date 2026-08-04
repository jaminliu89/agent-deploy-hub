# 提案：Agent Deploy Hub（新机 Agent 选择性部署中心）

> 版本：v0.1（PM 提案，待确认）
> 日期：2026-08-04
> 作者：PM
> 状态：⏳ 待拍板（文末「开放问题」清单）

---

## 1. 背景与痛点

你（以及同生态用户）的机器上运行着 **6+ 个 AI Coding Agent**，配置分散在各 `~/.xxx` 目录：

| Agent | CLI | 配置目录 | 规模 | 可移植部分 |
|---|---|---|---|---|
| **PI Coding Agent** | `pi` | `~/.pi` | 13M | agent/、skills/ |
| **Claude Code** | `claude` | `~/.claude` | 128M | skills/（200+）、CLAUDE.md、AGENTS.md、plugins/、commands/ |
| **Hermes** | `hermes` | `~/.hermes` | 1.1G | config.yaml、skills/、AGENTS.md |
| **Codex** | `codex` | `~/.codex` | 3.2G | config.toml、AGENTS.md、computer-use/ |
| **Reasonix** | `reasonix` | `~/.reasonix` | 32K | 少量（sessions/projects 为主） |
| **arkclaw** | `openclaw`/autoclaw | `~/.openclaw` + `~/Library/Application Support/autoclaw` | 14M+ | auth、chrome-ext |

**核心痛点：换新机（或系统重装）时，要把这一整套重新装一遍**——装 CLI、配 Key、拷 skills、同步 CLAUDE.md、装插件、配 MCP，每个 agent 一套流程，纯手工 2~4 小时起步，还容易漏。

你已经有的碎片化资产（可复用）：
- 白名单备份思路：`gitee-backup`、`claude-config-backup`、`three-agent-backup-pushall`（都是 .gitignore 白名单 + git 同步）
- 跨 agent 技能同步：`skill-sync-protocol`（`~/.agents/skills` 软链）
- 部署经验：`cloudflare-pages-deploy`、`pwa-deploy-pages`、`dual-remote-release-workflow`
- 上一份成果：Claude 桌面版国内直连教程（同样的"新机配置"场景）

**目标：把「新机部署」从 2-4 小时手工作业，压到 10 分钟勾选式一键部署。**

---

## 2. 产品定义

### 一句话

> 一个 **PWA 跨端 Web 应用**：新机上打开网站 → 勾选要部署的 Agent 和可选配置 → 生成/运行一键部署脚本 → 照着检查清单收尾。

### 三个核心能力

1. **选择性部署**：6+ 个 Agent 任意勾选，每项可细粒度选择「只装 CLI / 装 CLI + 配置 / 装 CLI + 配置 + 插件 + skills」
2. **每 Agent 一个聚焦板块**：简介、安装方式、**桌面版下载引导**（官方链接 + 国内可用的替代路径）、可选配置项、专属部署脚本
3. **一键脚本**：按勾选动态生成 `deploy.sh`（或逐 agent 的 `install-<name>.sh`），新机粘贴运行即装

---

## 3. 用户故事（场景）

| # | 场景 | 用户操作 | 期望结果 |
|---|---|---|---|
| U1 | 新机冷启动 | 打开 PWA → 勾 Claude Code + Codex + Hermes 及各自 skills → 复制汇总脚本 → 终端运行 | 10 分钟内三个 agent 可用 |
| U2 | 只补一个 | 单 agent 板块 → 只勾「CLI + 核心配置」→ 复制单脚本 | 不污染其他 agent |
| U3 | 桌面版选择 | 在 Claude Code 板块看「桌面版」：官方下载链接 + 国内替代方案 + 配置指引 | 不用翻墙也能装桌面版 |
| U4 | 迁移个人配置 | 在本机跑「导出工具」→ 生成个人配置 patch（白名单，无密钥）→ 存 U 盘/私有仓 | 新机部署后个人 skills/偏好一键还原 |
| U5 | 离线查阅 | 网络差时打开 PWA（已访问过）| 内容照常可读（PWA 离线缓存） |
| U6 | 换平台 | 手机/平板浏览指南 | 响应式可用 |

---

## 4. 功能范围

### MVP（v1.0）

**A. Agent 目录页**
- 卡片网格：图标、名称、一句话简介、状态徽标（本机已装/未装/桌面版可用）
- 搜索/筛选

**B. Agent 详情页（每 Agent 一个板块，聚焦）**
- 简介与适用场景
- 安装方式（npm / brew / 官方安装器 / 下载引导），带国内加速提示
- **桌面版/官方下载链接区**：官方地址 + 国内替代路径（GitHub 镜像、npm 镜像等）
- **可选配置清单**（checkbox）：
  - CLI 本体
  - 核心配置（settings/config 模板，含占位符 Key）
  - Skills / 插件（可选子集）
  - CLAUDE.md / AGENTS.md
  - MCP servers（如适用）
- **一键脚本生成**：根据勾选生成 `install-<agent>.sh`，可复制/下载
- 装后验证命令

**C. 部署工作台**
- 多选 Agent + 各配置项 → 生成汇总 `deploy.sh`（按依赖排序：先 node/brew 等前置，再各 agent）
- 输出「检查清单」（每 agent 的验证命令）

**D. 配置导出工具（本机侧脚本）**
- 白名单导出各 agent 可移植配置 → 生成个人 patch 包（`agent-patch/`）
- **硬性安全边界：auth.json、API keys、tokens、sessions/cache/history 一律排除**

**E. PWA**
- manifest + service worker 离线缓存
- 响应式（桌面/移动）

### 进阶（v1.x，不在 MVP）

- 云端同步个人配置包（需后端，暂缓）
- 多平台脚本变体（Linux/Windows 部署）
- 部署进度可视化（脚本输出解析）
- 版本更新提醒（agent 新版本）
- 配置差异对比（本机 vs 模板）

---

## 5. 信息架构

```
PWA 单页应用（静态）
├── 首页：Agent 目录（卡片网格）
│     ├── PI Coding Agent ──→ 详情页
│     ├── Claude Code ──────→ 详情页
│     ├── Hermes ───────────→ 详情页
│     ├── Codex ────────────→ 详情页
│     ├── Reasonix ─────────→ 详情页
│     └── arkclaw ──────────→ 详情页
├── 部署工作台（多选 → 汇总脚本）
├── 导出工具页（本机导出指引 + 脚本下载）
└── 关于/FAQ（含国内网络速查）
```

**数据模型**（静态 JSON，仓库内维护）：

```jsonc
// data/agents.json
{
  "id": "claude-code",
  "name": "Claude Code",
  "tagline": "Anthropic 官方终端 AI 编程 Agent",
  "icon": "claude-code",
  "categories": ["coding"],
  "cli": { "install": "npm i -g @anthropic-ai/claude-code", "command": "claude" },
  "desktop": {
    "official": "https://claude.ai/download",
    "chinaNote": "claude.ai 国内需网络环境；替代：让朋友下载 dmg / 见教程",
    "configGuide": "配置国内直连（cc-switch）见 docs/desktop-china.md"
  },
  "configItems": [
    { "id": "cli", "label": "CLI 本体", "checked": true, "script": "..." },
    { "id": "settings", "label": "settings.json 模板（占位符 Key）", "script": "..." },
    { "id": "skills", "label": "核心 skills（可多选子集）", "options": ["backup", "deploy", "writing", "..."] },
    { "id": "claude-md", "label": "CLAUDE.md", "script": "..." }
  ],
  "verify": ["claude --version", "claude 跑一条测试"],
  "prereqs": ["node >= 18"]
}
```

---

## 6. 技术方案

| 项 | 选择 | 理由 |
|---|---|---|
| 形态 | **纯静态 PWA**（MVP 无后端） | 部署本质 = 脚本 + 配置模板；静态托管国内可访问；无运维成本 |
| 技术栈 | 原生 HTML/CSS/JS（或轻量 Vite 脚手架）| 无框架依赖、单文件易维护；PWA 需求简单 |
| 脚本语言 | Bash（macOS 为主），模板引擎拼装 | 部署目标即 macOS；bash 零依赖 |
| 配置传递 | **双轨制**：① 仓库存「通用模板」② 本机「导出工具」生成「个人 patch」 | 模板开箱即用，patch 还原个人偏好；两者都可被 deploy.sh 消费 |
| 托管 | Cloudflare Pages + Gitee Pages 双线（国内优先 Gitee）| 复用你已验证的 pwa-deploy-pages 流程 |
| 源码分发 | GitHub + Gitee 双 remote | 复用 dual-remote-release-workflow |

### 一键部署脚本设计（核心）

```
deploy.sh（工作台生成，按勾选拼装）
├── 0. 环境检查（macOS 版本、xcode tools、node/brew）
├── 1. 前置（按需：nvm/node、brew 包、zstd 等）
├── 2. per-agent 块（顺序执行）：
│     install-<agent>.sh 内容：
│     ├── 装 CLI（npm i -g / brew / curl 官方脚本）
│     ├── 写配置（模板 + 占位符；提示交互输入 Key，绝不硬编码）
│     ├── 同步 skills/CLAUDE.md（从仓库模板 clone 或从本地 patch 解包）
│     └── 验证（--version + 冒烟命令）
└── 3. 汇总检查清单输出
```

**安全边界（硬性）**：
- 仓库内**永不出现**真实密钥（auth.json / apiKey / token 一律占位符 + 交互输入）
- 导出工具白名单排除：`auth*`、`*token*`、`*.key`、`sessions/`、`cache/`、`history*`、`*.jsonl`（会话）
- 脚本运行前打印将执行的写操作清单（dry-run 模式）

---

## 7. 里程碑

| 阶段 | 交付物 | 验收 |
|---|---|---|
| **M0** | 本提案 | 用户拍板开放问题 |
| **M1** | Spec（PRD + 技术规格）+ Harness（SA/FE/BE/QA 角色定义） | 评审通过 |
| **M2** | 站点骨架 + agents.json 数据模型 + 3 个 agent 的完整内容 | 本地打开可浏览目录 |
| **M3** | 详情页 + 脚本生成器（单 agent）| 勾选 → 生成可运行 install-<agent>.sh |
| **M4** | 部署工作台 + 导出工具脚本 | 多选 → deploy.sh 在测试机跑通 |
| **M5** | PWA 离线 + 双端上线（Gitee/Cloudflare）+ 文档 | 新机 10 分钟部署验证 |

---

## 8. 风险与对策

| 风险 | 对策 |
|---|---|
| 配置模板漂移（agent 更新改配置格式）| 模板与 agent 版本绑定；验证命令兜底 |
| 脚本在新环境不可复现 | 每个脚本带 dry-run + 幂等（重复跑不破坏）；M4 用测试机验证 |
| 国内网络下载失败 | 所有下载给镜像/替代路径；脚本支持断点续传 |
| 密钥误入库 | 白名单导出 + 提交前自动扫描（grep 常见 key 格式）|
| 产品野心过大 | MVP 只做静态 + 脚本；后端/云同步明确放 v1.x |

---

## 9. 开放问题（请拍板）

1. **产品名**：候选 `Agent Deploy Hub` / `AgentForge` / `新机部署中心` / 你有想法？
2. **首版完整内容做哪几个 agent**：建议先做 **Claude Code + Codex + PI**（配置最重、你最常用），其余 3 个先放「简版卡片」（仅安装引导），同意？
3. **arkclaw 的定位**：本机实际是 `openclaw` CLI + `autoclaw`（Electron 应用）。板块按「arkclaw（OpenClaw 系）」一个入口、里面说明两种形态，可以吗？
4. **配置传递**：MVP 是否要「本机导出工具」（U4）？还是先只做「仓库模板」？我建议**一起做**（导出脚本不难，且是换机刚需）。
5. **平台范围**：只 macOS（你的场景），还是 Linux/Windows 脚本变体也进 MVP？（建议 MVP 只 macOS）
6. **托管**：Gitee Pages 主 + Cloudflare Pages 备，OK？
7. **桌面版下载引导**：Claude 桌面版国内直连配置（上份成果）直接作为 Claude Code 板块的「桌面版配置指南」子页引用，OK？

---

> **PM 结语**：这个项目 90% 的价值在「内容准确」（每个 agent 的真实安装/配置/验证）和「脚本可靠」，而非界面炫技。M1 的 spec 会把这 90% 写成 SA 可执行的任务；harness 会把 SA/FE/BE/QA 四个角色的分工、交付物、验收门槛固定下来。请先对「开放问题」表态，我据此定稿 spec。
