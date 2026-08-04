# Agent HUB Harness — Orchestrator

## 项目
Agent HUB：新机 Agent 选择性部署中心（PWA）。文档见 `docs/`（00-proposal、01-spec）。

## 触发规则
- 用户在 `agent-deploy-hub` 项目内发起**构建/开发/修改/验收**类请求（SA/FE/BE/QA 角色开工、写代码、改页面、加 agent 内容、跑验证）→ 加载本 orchestrator。
- 单纯读文档/问问题 → 直接回答，不加载。

## 执行模式：混合（流水线 + 生成-验证）
```
[PM]（用户或主代理）
 └─ SA（架构师）   → 维护 spec / 数据模型 / agents.json 内容 / 脚本规范
     │  ├─ FE（前端）→ PWA 页面、交互、脚本生成器前端、PWA 离线
     │  └─ BE（脚本）→ 部署脚本模板（bash+ps1）、导出工具、dry-run/幂等
     └─ QA（验证）  → 每个模块完成后增量验收（spec §7 断言）、安全扫描
```
- **SA → FE/BE**：文档/契约先行（spec 是事实来源）。
- **FE 与 BE 并行**：接口契约 = `data/agents.json` schema + 脚本模板变量约定（见 SA 产出）。
- **QA 增量介入**：每个模块完成即验收，不等全量完成。

## 阶段工作流

### Phase 0：上下文检查
- 读 `docs/01-spec.md`（事实来源）+ `docs/00-proposal.md`（拍板记录）
- 检查 `public/data/agents.json` 是否已存在、`_workspace/` 产物
- 用户是部分修改 → 只重跑受影响角色；新输入 → 先归档 `_workspace_prev/`

### Phase 1：SA 规格维护
- 保持 spec 与实现一致（页面结构、schema、脚本规范、验收断言）
- 产出/维护：`docs/01-spec.md`、`public/data/agents.json` 的内容权威（每个 agent 的安装命令、桌面版引导、配置模板、验证命令必须**真实可执行**——禁止编造安装命令；拿不准去查官方文档/本机验证）
- 输出接口契约：
  - `agents.json` schema（FE 渲染依据）
  - 脚本模板变量集（`{{AGENT_ID}}`、`{{CMD_MAC}}` 等，BE 使用）

### Phase 2：FE 前端
- 单页应用（hash 路由）：目录页 / 详情页 / 工作台 / 导出说明
- 勾选 → 实时拼装脚本文本（bash+ps1 双 tab）
- PWA：manifest + sw（离线缓存）
- 响应式；全部逻辑前端本地，无上传

### Phase 3：BE 脚本
- 部署脚本模板：mac（bash）/ win（powershell）双变体
- 特性：dry-run、幂等、国内镜像提示、Key 交互输入（占位符）
- 导出工具：白名单导出（排除 auth/token/session/cache/history/bak）、**>20MB 不导出**、输出报告

### Phase 4：QA 验收
- 按 spec §7 断言逐条执行；**增量验收**（每模块完成后）
- 安全扫描：仓库/生成脚本 grep 真实密钥格式（sk-、ark-、xxx.xxx token）；>20MB 资产检查
- 脚本验证：在测试目录跑 dry-run + 真跑冒烟
- 发现问题 → 反馈对应角色修正 → 复验

## 数据传递
- 文件级：`docs/`（spec）、`public/data/agents.json`（契约）、`tools/`（脚本）
- `_workspace/` 存放中间产物（页面草图、脚本测试输出），命名 `{phase}_{role}_{artifact}`

## 错误处理
- 某角色产物不合格 → 1 次重试，再失败则跳过并在汇报中注明缺口
- 冲突信息不删，标注来源（官方文档 vs 本机实测 vs 推断）

## 测试场景
- 正常流：新机选择 Claude Code + Codex + PI → 生成 deploy.sh → 测试机跑通 → QA 验收
- 错误流：agents.json 中某 agent 安装命令不可执行 → QA 拦截 → SA 修正 → 复验

## 后继续关键词
「继续开发」「改 XX 页面」「加一个 agent」「跑验收」「重新生成脚本」「更新 spec」「补 XX 内容」等后继续请求沿用本编排器；Phase 0 先看上下文再定执行范围。
