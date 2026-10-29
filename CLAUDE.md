# Agent HUB

新机 Agent 选择性部署中心（PWA · macOS/Windows · Cloudflare Pages）。

## Harness：Agent HUB 开发编排

**目标：** 在 `docs/`（spec）约束下，由 SA/FE/BE/QA 四个角色流水线开发；每个 agent 的内容（安装命令/桌面版引导/配置/验证）必须真实可执行，不得编造。

**触发：** 在本项目内发起构建/开发/修改/验收类请求（写代码、改页面、加 agent、跑验证、角色开工）时，使用 `agent-hub-orchestrator` 技能。单纯问问题直接回答。

**关键约束（spec §4/§6）：**
- 纯静态 PWA，无构建步骤，`public/` 直接发 Cloudflare Pages
- >20MB 资产不内置，走 `bigAssets` 引导下载
- 密钥永不入库（占位符 + 交互输入）
- 12 个 agent：PI / Claude Code / Hermes / Codex / Reasonix / arkclaw / WorkBuddy AI / OpenCode / Kiro / Cursor / OpenDesign / Grok Build
- 脚本双平台：bash（macOS）+ PowerShell（Windows）

**变更历史：**
| 日期 | 变更 | 对象 | 原因 |
|------|------|------|------|
| 2026-10-29 | 新增 6 个 agent（WorkBuddy AI/OpenCode/Kiro/Cursor/OpenDesign/Grok Build） | agents.json/app.js/styles.css | 用户要求增加；WorkBuddy 国际版部署经验（v2/update API）实测写入 |
| 2026-08-04 | 初始构建（spec + harness + 角色定义） | 全部 | 用户拍板提案后开工 M1 |
