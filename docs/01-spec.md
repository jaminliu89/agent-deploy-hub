# Agent HUB — 产品规格（Spec）

> 版本：v1.0（拍板后定稿）
> 日期：2026-08-04
> 状态：✅ 已确认（对应 00-proposal.md 的 7 项拍板）

---

## 0. 拍板记录（PM 确认项）

| # | 决策 | 结论 |
|---|---|---|
| 1 | 产品名 | **Agent HUB** |
| 2 | Agent 覆盖 | **6 个全部呈现**（PI / Claude Code / Hermes / Codex / Reasonix / arkclaw），用户**选择性安装或全装** |
| 3 | arkclaw | 板块必须有 **「需订阅火山引擎（Agent/Coding Plan）」** 提示 |
| 4 | 本机导出工具 | 做；**>20MB 的文件一律不内置**，引导用户自行下载或一键下载脚本 |
| 5 | 平台 | **macOS + Windows**（脚本双变体：bash / PowerShell） |
| 6 | 托管 | **Cloudflare Pages** |
| 7 | 桌面版教程 | **引用既有教程**（Claude 桌面版国内直连配置教程） |

---

## 1. 产品目标

新机（macOS/Windows）上，通过一个 PWA 网站：勾选要部署的 Agent 与可选配置 → 生成一键部署脚本 → 运行即装。目标：把新机部署从 2-4 小时手工作业压到 **10 分钟**。

## 2. 用户旅程

```
打开 PWA（离线可用）
  → 首页目录：6 个 Agent 卡片
  → 详情页：读简介 / 看桌面版引导 / 勾选配置 / 生成单脚本
  → 部署工作台：多选 → 汇总 deploy.sh（bash|powershell）→ 下载/复制
  → 新机终端运行 → 按「检查清单」验证
（进阶）本机跑导出工具 → 生成个人配置 patch（白名单、无密钥、>20MB 排除）→ 新机 deploy 时应用
```

## 3. 功能规格

### F1 首页目录
- 6 个 Agent 卡片网格：图标、名称、tagline、平台徽标（macOS/Win）、状态徽标（本机已装/未装——用 localStorage 记录本机探测结果，可选）
- 搜索框（按名称/关键词过滤）
- 顶部「部署工作台」入口 + 全局进度

### F2 Agent 详情页（每 Agent 一个聚焦板块）
每板块包含：
1. **简介**：是什么、适用场景、一句话定位
2. **安装**：
   - 前置要求（node 版本、brew 等）
   - 安装方式（npm / brew / 官方安装器），**macOS + Windows 双 tab 命令**
   - 国内加速提示（npm 镜像、GitHub 镜像）
3. **桌面版/官方下载引导区**：
   - 官方下载链接
   - 大文件（>20MB）列表：仅展示信息 + 引导下载/一键下载脚本，**不内置**
   - 需要网络环境的说明（如 claude.ai）
   - 配置指南引用（Claude Code → 既有国内直连教程）
4. **可选配置项**（checkbox 树）：
   - CLI 本体（默认勾）
   - 核心配置模板（settings/config，**占位符 Key**）
   - Skills / 插件子集（勾选式）
   - CLAUDE.md / AGENTS.md
   - MCP servers（如适用）
5. **一键脚本生成**：按勾选实时生成 `install-<agent>.sh`（mac）或 `install-<agent>.ps1`（win），复制/下载
6. **装后验证**：验证命令列表
7. **特殊提示**（如 arkclaw 的火山订阅）

### F3 部署工作台
- 左侧：6 个 Agent 多选（每项可展开勾子选项）
- 右侧：实时生成汇总 `deploy.sh` / `deploy.ps1`（按依赖排序：前置 → 各 agent → 验证清单）
- 输出检查清单（每 agent 验证命令）
- 下载 / 复制

### F4 本机导出工具（U4）
- 页面给出使用说明 + 下载 `export-agent-config.sh`（mac）/ `.ps1`（win）
- 白名单导出可移植配置 → 生成 `agent-patch/` 目录
- **硬性规则**：
  - 排除：`auth*`、`*token*`、`*.key`、`sessions/`、`cache/`、`history*`、`*.jsonl`（会话）、`*.bak*`
  - **>20MB 的文件不导出**（打印提示"请手动迁移/重新下载"）
  - 输出清单报告（导出文件数、总大小、排除项）

### F5 PWA
- manifest + service worker（静态资源离线缓存）
- 响应式（桌面/移动）
- 安全：脚本生成全部在前端本地完成，无后端、无上传

### F6 安全边界（全站）
- 仓库/站点**永不出现**真实密钥：所有配置模板用 `<YOUR_API_KEY>` 占位符 + 安装时交互输入提示
- 脚本 dry-run 模式（打印将写的路径清单）
- 脚本幂等（重复运行不破坏）

## 4. 技术规格

| 项 | 决策 |
|---|---|
| 形态 | 纯静态 PWA，单页应用（hash 路由） |
| 技术栈 | 原生 HTML/CSS/JS（无构建步骤，Cloudflare Pages 直发） |
| 数据 | `data/agents.json`（仓库维护，6 个 agent 元数据） |
| 脚本生成 | 前端模板字符串 + agents.json 拼装（bash + powershell 双变体） |
| 资产规则 | **内置资产 ≤20MB**；超限走 `bigAssets` 引导下载 |
| 托管 | Cloudflare Pages（项目根目录即发布目录） |
| 源码 | GitHub 主仓（可选 Gitee 镜像） |

### 目录结构

```
agent-deploy-hub/
├── docs/
│   ├── 00-proposal.md
│   └── 01-spec.md
├── .claude/
│   ├── agents/            # harness：SA / FE / BE / QA
│   └── skills/agent-hub-orchestrator/
├── CLAUDE.md              # harness 指针
├── public/                # Cloudflare Pages 发布目录
│   ├── index.html         # SPA（目录 + 详情 + 工作台 + 导出说明）
│   ├── manifest.webmanifest
│   ├── sw.js
│   ├── styles.css
│   ├── app.js
│   └── data/agents.json
└── tools/                 # 本机侧脚本（仓库内，供下载）
    ├── export-agent-config.sh    # macOS 导出工具
    └── export-agent-config.ps1   # Windows 导出工具
```

## 5. 数据模型（agents.json）

```jsonc
{
  "meta": { "version": 1, "updated": "2026-08-04" },
  "agents": [
    {
      "id": "claude-code",
      "name": "Claude Code",
      "tagline": "Anthropic 官方终端 AI 编程 Agent",
      "icon": "cc",
      "platforms": ["macos", "windows"],
      "category": "coding",
      "description": "…",
      "desktop": {
        "available": true,
        "official": "https://claude.ai/download",
        "notes": "claude.ai 国内需网络环境；dmg 安装器约 6MB",
        "chinaGuideRef": "claude-desktop-china"   // 引用既有教程板块
      },
      "install": {
        "prereqs": ["node >= 18"],
        "methods": [
          { "name": "npm", "cmdMac": "npm i -g @anthropic-ai/claude-code", "cmdWin": "npm i -g @anthropic-ai/claude-code", "mirrorNote": "国内 npm 换淘宝源" }
        ],
        "bigAssets": [
          { "name": "Claude 桌面版安装器", "size": "~6MB", "official": "https://claude.ai/download", "note": "在线安装器，实际下载更大，建议网络窗口内完成" }
        ]
      },
      "config": {
        "keyPrompt": { "service": "智谱 GLM 或 Anthropic", "env": "ANTHROPIC_AUTH_TOKEN", "hint": "国内直连方案见桌面版指南" },
        "bundles": [
          { "id": "cli", "label": "CLI 本体", "default": true },
          { "id": "settings", "label": "settings.json 模板（占位符）", "default": true, "content": "…" },
          { "id": "skills", "label": "核心 skills", "options": [ { "id": "backup", "label": "配置备份" }, … ] },
          { "id": "claude-md", "label": "CLAUDE.md", "default": false }
        ]
      },
      "verify": ["claude --version"],
      "specialNote": null   // 如 arkclaw 的火山订阅提示
    }
  ]
}
```

## 6. 里程碑与验收

| 阶段 | 交付 | 验收 |
|---|---|---|
| M1 | spec + harness | 本文件 + .claude/ 角色定义 |
| M2 | 骨架 + agents.json（6 个 agent 完整内容）| 本地打开首页可见 6 卡片，详情可浏览 |
| M3 | 详情页 + 脚本生成器 | 勾选 → 生成可运行脚本（mac+win） |
| M4 | 工作台 + 导出工具脚本 | 多选生成 deploy 脚本；export 工具在本机跑通、20MB 规则生效 |
| M5 | PWA 离线 + Cloudflare Pages 上线 | 新机 10 分钟部署验证 |

## 7. 验收断言（QA 用）

- [ ] 6 个 agent 卡片齐全，详情页字段完整
- [ ] 每个详情页「桌面版引导区」存在，>20MB 资产无内置文件
- [ ] arkclaw 板块包含火山订阅提示
- [ ] 生成的脚本 mac/win 双变体，含 dry-run 与幂等
- [ ] 全站搜索不到真实密钥（grep 占位符检测）
- [ ] export 工具运行后输出报告，无 auth/token/session/cache，无 >20MB 文件
- [ ] PWA 离线可浏览（服务已访问后断网仍可打开）
- [ ] Cloudflare Pages 部署成功，HTTPS 可访问
