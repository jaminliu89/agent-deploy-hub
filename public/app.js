/* ===== Agent HUB · app.js =====
 * 纯前端 SPA：hash 路由 + agents.json 驱动 + 脚本生成器（bash/ps1）
 * 所有脚本在浏览器本地生成，不上传任何数据。
 */
"use strict";

const $ = (sel) => document.querySelector(sel);

/* ---------- 状态 ---------- */
const store = {
  agents: [],
  sel: JSON.parse(localStorage.getItem("agent-hub-sel") || "{}"), // {agentId: {bundleIds:[], subOptions:{}}}
  save() { localStorage.setItem("agent-hub-sel", JSON.stringify(this.sel)); },
};
const ICONS = { pi: "PI", cc: "CC", hermes: "HM", codex: "CX", reasonix: "RX", arkclaw: "AK" };

/* ---------- 数据加载 ---------- */
async function loadData() {
  try {
    const r = await fetch("data/agents.json");
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    store.agents = data.agents;
    store.newbieGuide = data.newbieGuide || null;
    return true;
  } catch (e) {
    store.agents = [];
    console.error("agents.json 加载失败:", e);
    return false;
  }
}

/* ---------- 错误兜底视图 ---------- */
function errorView(msg) {
  return `
    <div class="err-view">
      <div class="err-icon">⚠️</div>
      <h2>页面出错了</h2>
      <p>${esc(msg || "发生了未知错误")}</p>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
        <button class="btn primary" onclick="location.hash='#/'">🏠 回到主页</button>
        <button class="btn" onclick="location.reload()">🔄 刷新重试</button>
      </div>
    </div>`;
}

/* ---------- 路由 ---------- */
const router = {
  go(hash) { location.hash = hash || "#/"; },
  current() {
    const h = location.hash || "#/";
    if (h.startsWith("#/agent/")) return { name: "agent", id: h.slice(8) };
    if (h.startsWith("#/workbench")) return { name: "workbench" };
    if (h.startsWith("#/export")) return { name: "export" };
    return { name: "home" };
  },
};

window.addEventListener("hashchange", render);
window.addEventListener("load", async () => { await loadData(); render(); registerSW(); });

/* ---------- 主渲染 ---------- */
async function render() {
  try {
    if (!store.agents.length && !(await loadData())) {
      $("#view").innerHTML = errorView("数据加载失败：无法获取 agents.json。请检查网络后刷新，或回到主页。");
      return;
    }
    const route = router.current();
    document.querySelectorAll(".navlink").forEach(a =>
      a.classList.toggle("active", a.dataset.route === "#/" + route.name || (route.name === "agent" && a.dataset.route === "#/")));
    const view = $("#view");
    if (route.name === "home") view.innerHTML = homeView();
    else if (route.name === "agent") view.innerHTML = agentView(route.id);
    else if (route.name === "workbench") view.innerHTML = workbenchView();
    else if (route.name === "export") view.innerHTML = exportView();
    else view.innerHTML = errorView("未知的页面地址。");
    bind(view);
  } catch (e) {
    console.error("render 失败:", e);
    $("#view").innerHTML = errorView("页面渲染出错：" + (e && e.message ? e.message : e));
  }
}

/* ---------- 工具 ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const platformPills = (a) => a.platforms.map(p => `<span class="pill ${p === "macos" ? "mac" : "win"}">${p === "macos" ? "macOS" : "Win"}</span>`).join(" ");
const selOf = (id) => (store.sel[id] || { bundles: ["cli"] });

/* ---------- 首页 ---------- */
function homeView() {
  const cards = store.agents.map(a => `
    <div class="agent-card" onclick="location.hash='#/agent/${a.id}'">
      <div class="ac-top">
        <div class="agent-icon ${a.id}">${ICONS[a.id] || "?"}</div>
        <h3>${esc(a.name)}</h3>
      </div>
      <div class="ac-tag">${esc(a.tagline)}</div>
      <div class="ac-foot">
        <span>${platformPills(a)}</span>
        ${a.config.keyPrompt ? `<span class="pill needkey">需 Key</span>` : ""}
      </div>
    </div>`).join("");
  return `
    <section class="hero">
      <h1>新机 Agent 部署中心</h1>
      <p>选择要部署的 AI Coding Agent 与可选配置，一键生成部署脚本。支持 macOS / Windows，全部在本地生成，不上传任何数据。</p>
      <div class="stats">
        <span class="stat"><b>${store.agents.length}</b> 个 Agent</span>
        <span class="stat"><b>${store.agents.filter(a => a.desktop && a.desktop.available).length}</b> 个有桌面版</span>
        <span class="stat">PWA 离线可用 · Cloudflare Pages 托管</span>
      </div>
    </section>
    <div class="searchbox"><input id="search" placeholder="搜索 Agent（名称 / 关键词）..." oninput="filterCards(this.value)"></div>
    <div class="grid" id="grid">${cards}</div>`;
}

function filterCards(q) {
  const s = q.trim().toLowerCase();
  document.querySelectorAll(".agent-card").forEach(c => {
    c.style.display = !s || c.textContent.toLowerCase().includes(s) ? "" : "none";
  });
}

/* ---------- 详情页 ---------- */
function agentView(id) {
  const a = store.agents.find(x => x.id === id);
  if (!a) return errorView("未找到该 Agent。");
  const sel = selOf(id);
  const bundleItems = a.config.bundles.map((b, i) => {
    const checked = sel.bundles.includes(b.id);
    const subs = b.options ? b.options.map(o =>
      `<label title="${esc(o.desc || "")}"><input type="checkbox" data-sub="${b.id}:${o.id}" ${(sel.subOptions || []).includes(o.id) ? "checked" : ""}> ${esc(o.label)}
        ${o.recommended ? `<span class="rec-badge">推荐</span>` : ""}
        <span class="sub-desc">${esc(o.desc || "")}</span></label>`).join("") : "";
    return `
      <div class="bundle-item ${checked ? "checked" : ""}" onclick="toggleBundle('${a.id}','${b.id}', event)">
        <input type="checkbox" ${checked ? "checked" : ""} readonly>
        <div>
          <div class="bi-title">${esc(b.label)} ${b.recommended ? `<span class="rec-badge">推荐</span>` : ""}</div>
          ${b.desc ? `<div class="bi-desc">${esc(b.desc)}</div>` : ""}
          ${b.note ? `<div class="bi-desc">${esc(b.note)}</div>` : ""}
          ${subs ? `<div class="sub-options" onclick="event.stopPropagation()">${subs}</div>` : ""}
        </div>
      </div>`;
  }).join("");

  const methods = a.install.methods.map((m, i) => `
    <h4>${esc(m.name)}</h4>
    <div class="codeblock"><button class="copy-btn" onclick="copyText(this,'${esc(m.cmdMac).replace(/'/g, "\\'")}')">复制</button>
      <pre>${esc(m.cmdMac)}</pre></div>
    ${m.cmdWin && m.cmdWin !== m.cmdMac ? `<div class="codeblock"><button class="copy-btn" onclick="copyText(this,'${esc(m.cmdWin).replace(/'/g, "\\'")}')">复制</button>
      <pre>${esc(m.cmdWin)}</pre></div>` : ""}
    ${m.mirrorNote ? `<p style="font-size:12.5px;color:var(--muted-fg)">🪞 ${esc(m.mirrorNote)}</p>` : ""}`).join("");

  const bigAssets = (a.install.bigAssets || []).map(x => `
    <tr><td>${esc(x.name)}</td><td>${esc(x.size)}</td>
    <td>${x.official ? `<a href="${esc(x.official)}" target="_blank" rel="noopener">官方</a>` : "—"}</td>
    <td style="font-size:12px;color:var(--muted-fg)">${esc(x.note || "")}</td></tr>`).join("");

  const verify = a.verify.map(v => `<li><code class="inline">${esc(v)}</code></li>`).join("");

  const guide = a.desktop && a.desktop.chinaGuideRef ? `<div class="alert alert-ok"><div><div class="t">📖 桌面版配置指南</div>
    <div class="d">${esc(a.desktop.notes || "")} · 引用既有教程：Claude 桌面版国内直连配置</div></div></div>` : "";

  const officialLinks = [
    a.homepage ? ["官网/仓库", a.homepage] : null,
    a.docs ? ["文档", a.docs] : null,
  ].filter(Boolean).map(([t, u]) => `<a class="btn sm" href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} ↗</a>`).join(" ");

  const newbie = store.newbieGuide ? `<div class="alert"><div><div class="t">🆕 新手提示</div><div class="d">${esc(store.newbieGuide)}</div></div></div>` : "";

  return `
    <div class="view-head">
      <div class="back" onclick="history.back()">← 返回目录</div>
      <h1>${esc(a.name)}</h1>
      <p>${esc(a.tagline)}</p>
    </div>

    ${a.specialNote ? `<div class="alert alert-warn"><div><div class="t">⚠ 重要提示</div><div class="d">${esc(a.specialNote)}</div></div></div>` : ""}

    ${newbie}

    ${officialLinks ? `<div class="card" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><h3 style="margin:0;margin-right:6px">官方地址</h3>${officialLinks}</div>` : ""}

    <div class="card"><h3>简介</h3><p style="font-size:14px;color:var(--muted-fg)">${esc(a.description)}</p>
      ${a.verified ? "" : `<p style="font-size:12px;color:var(--warning);margin-top:6px">⚠ 部分安装信息待官方确认（verified:false）</p>`}
    </div>

    <div class="card"><h3>安装</h3>${methods}</div>

    ${(a.install.bigAssets || []).length ? `
    <div class="card"><h3>桌面版 / 大文件下载（不内置，引导下载）</h3>
      <table><tr><th>资产</th><th>大小</th><th>官方链接</th><th>说明</th></tr>${bigAssets}</table></div>` : ""}

    ${a.desktop && a.desktop.available ? `
    <div class="card"><h3>桌面版</h3>
      <p style="font-size:14px;color:var(--muted-fg)">${esc(a.desktop.notes || "")}</p>
      ${a.desktop.official ? `<p style="margin-top:8px"><a class="btn primary" href="${esc(a.desktop.official)}" target="_blank" rel="noopener">官方下载页 ↗</a></p>` : ""}
      ${guide}
    </div>` : ""}

    <div class="card"><h3>选择要部署的配置</h3>${bundleItems}
      <p style="font-size:12px;color:var(--muted-fg);margin-top:8px">密钥一律使用占位符 <code class="inline">&lt;YOUR_API_KEY&gt;</code>，脚本运行时交互输入。</p>
    </div>

    <div class="card"><h3>一键部署脚本</h3>
      <div class="tabs">
        <button class="tab-btn active" onclick="switchTab(this,'bash')">macOS · bash</button>
        <button class="tab-btn" onclick="switchTab(this,'ps1')">Windows · PowerShell</button>
      </div>
      <div class="codeblock"><button class="copy-btn" onclick="copyEl(this,'gen-out')">复制</button><pre id="gen-out"></pre></div>
      <button class="btn sm" onclick="downloadScript('${a.id}')">⬇ 下载脚本</button>
      <button class="btn sm" onclick="copyEl(this,'gen-out')">📋 复制到剪贴板</button>
    </div>

    <div class="card"><h3>装后验证</h3><ul class="checklist">${verify}</ul></div>`;
}

/* ---------- 工作台 ---------- */
function workbenchView() {
  const agents = store.agents.map(a => {
    const sel = selOf(a.id);
    const buns = a.config.bundles.map(b =>
      `<label><input type="checkbox" data-wb-bundle="${a.id}:${b.id}" ${sel.bundles.includes(b.id) ? "checked" : ""}> ${esc(b.label)}</label>`).join("");
    return `
      <div class="wb-agent" id="wb-${a.id}">
        <div class="wb-top">
          <input type="checkbox" data-wb-agent="${a.id}" ${sel.bundles.length > 0 ? "checked" : ""}>
          <div class="agent-icon ${a.id}" style="width:30px;height:30px;font-size:12px">${ICONS[a.id]}</div>
          <b>${esc(a.name)}</b>
          ${a.specialNote ? `<span style="font-size:11px;color:var(--warning)">需订阅</span>` : ""}
        </div>
        <div class="wb-bundles">${buns}</div>
      </div>`;
  });

  return `
    <div class="view-head"><h1>部署工作台</h1>
      <p>勾选 Agent 与配置 → 生成汇总部署脚本（bash / PowerShell），在目标新机运行。可全选全部安装。</p>
    </div>
    <div style="margin-bottom:14px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn sm" onclick="wbSelectAll(true)">全选</button>
      <button class="btn sm" onclick="wbSelectAll(false)">全不选</button>
      <span style="font-size:12.5px;color:var(--muted-fg);align-self:center" id="wb-count">已选 0 个</span>
    </div>
    <div class="workbench">
      <div>${agents.join("")}</div>
      <div>
        <div class="card"><h3>汇总脚本 deploy.sh</h3>
          <div class="tabs">
            <button class="tab-btn active" onclick="switchTab(this,'wb-bash')">macOS · bash</button>
            <button class="tab-btn" onclick="switchTab(this,'wb-ps1')">Windows · PowerShell</button>
          </div>
          <div class="codeblock"><button class="copy-btn" onclick="copyEl(this,'wb-out')">复制</button><pre id="wb-out"></pre></div>
          <button class="btn sm" onclick="downloadScript('deploy')">⬇ 下载</button>
          <button class="btn sm" onclick="copyEl(this,'wb-out')">📋 复制</button>
        </div>
        <div class="card"><h3>部署后检查清单</h3><ul class="checklist" id="wb-check"></ul></div>
      </div>
    </div>`;
}

/* ---------- 导出工具页 ---------- */
function exportView() {
  return `
    <div class="view-head"><h1>本机配置导出工具</h1>
      <p>在新机上还原个人 skills / CLAUDE.md / 配置偏好前，先在<b>旧机</b>运行导出工具，生成白名单配置包。</p>
    </div>

    <div class="alert alert-err"><div><div class="t">⛔ 安全边界（硬性）</div>
      <div class="d">自动排除：auth*、*token*、*.key、sessions/、cache/、history*、*.jsonl、*.bak*。<b>超过 20MB 的文件不导出</b>（报告提示手动迁移或重新下载）。导出包不含任何密钥。</div></div></div>

    <div class="card"><h3>macOS</h3>
      <div class="codeblock"><button class="copy-btn" onclick="copyText(this,'curl -fsSL https://agent-hub.example/tools/export-agent-config.sh | bash')">复制</button>
      <pre>curl -fsSL https://agent-hub.example/tools/export-agent-config.sh | bash</pre></div>
      <p style="font-size:12.5px;color:var(--muted-fg)">生成 <code class="inline">agent-patch/</code> 目录 + <code class="inline">export-report.txt</code> 报告。</p>
    </div>

    <div class="card"><h3>Windows</h3>
      <div class="codeblock"><button class="copy-btn" onclick="copyText(this,'irm https://agent-hub.example/tools/export-agent-config.ps1 | iex')">复制</button>
      <pre>irm https://agent-hub.example/tools/export-agent-config.ps1 | iex</pre></div>
    </div>

    <div class="card"><h3>迁移流程</h3>
      <ol style="padding-left:20px;font-size:14px;color:var(--muted-fg)">
        <li>旧机运行导出工具 → 得到 <code class="inline">agent-patch/</code>（无密钥、无大文件）</li>
        <li>用 U 盘 / 私有仓库 / 云盘带到新机（或用双端 git 仓库同步）</li>
        <li>新机部署对应 Agent 后，把 <code class="inline">agent-patch/</code> 解包到对应 <code class="inline">~/.xxx</code> 目录</li>
        <li>重新填入各平台 API Key</li>
      </ol>
    </div>

    <div class="card"><h3>大文件（&gt;20MB）策略</h3>
      <p style="font-size:13.5px;color:var(--muted-fg)">导出工具跳过 &gt;20MB 文件并列入报告。这些通常是模型缓存、会话历史、本地模型——<b>不应该迁移</b>，重新下载/重新生成即可。需要大文件的场景（如 Claude 桌面版 VM 镜像 1.2GB）由 Agent 板块的「一键下载脚本」引导。</p></div>`;
}

/* ---------- 事件绑定 ---------- */
function bind(view) {
  // 详情页：勾选触发脚本重生成
  if (router.current().name === "agent") {
    const id = router.current().id;
    document.querySelectorAll(".bundle-item input, .sub-options input").forEach(i =>
      i.addEventListener("change", () => renderScript(id)));
    renderScript(id);
  }
  if (router.current().name === "workbench") {
    document.querySelectorAll("[data-wb-agent]").forEach(c =>
      c.addEventListener("change", () => { wbSync(); renderWB(); }));
    document.querySelectorAll("[data-wb-bundle]").forEach(c =>
      c.addEventListener("change", () => { wbSync(); renderWB(); }));
    wbSync(); renderWB();
  }
}

/* ---------- 勾选状态 ---------- */
function toggleBundle(agentId, bundleId, ev) {
  ev.stopPropagation();
  const sel = store.sel[agentId] || (store.sel[agentId] = { bundles: ["cli"] });
  const i = sel.bundles.indexOf(bundleId);
  if (i >= 0) sel.bundles.splice(i, 1); else sel.bundles.push(bundleId);
  store.save();
  // 子选项状态
  const box = ev.currentTarget.querySelector("input");
  box.checked = !box.checked;
  ev.currentTarget.classList.toggle("checked", box.checked);
  renderScript(agentId);
}

/* ---------- 工作台同步 ---------- */
function wbSync() {
  store.sel = {};
  document.querySelectorAll("[data-wb-agent]:checked").forEach(c => {
    const id = c.dataset.wbAgent;
    const sel = store.sel[id] = { bundles: ["cli"] };
    document.querySelectorAll(`[data-wb-bundle="${id}:..."]`).forEach(() => {});
    document.querySelectorAll(`[data-wb-bundle^="${id}:"]:checked`).forEach(b => {
      const bid = b.dataset.wbBundle.split(":")[1];
      if (!sel.bundles.includes(bid)) sel.bundles.push(bid);
    });
  });
  store.save();
  const n = document.querySelectorAll("[data-wb-agent]:checked").length;
  const el = $("#wb-count"); if (el) el.textContent = `已选 ${n} 个`;
}

function renderWB() {
  const ids = [...document.querySelectorAll("[data-wb-agent]:checked")].map(c => c.dataset.wbAgent);
  const out = $("#wb-out"); const check = $("#wb-check");
  if (!out) return;
  out.textContent = buildDeployScript(ids, "bash");
  const verifies = ids.flatMap(id => {
    const a = store.agents.find(x => x.id === id);
    return (a ? a.verify : []).map(v => `<li><b>${esc(a.name)}</b>：<code class="inline">${esc(v)}</code></li>`);
  });
  check.innerHTML = verifies.join("") || "<li>未选择任何 Agent</li>";
}

/* ===== 脚本生成器（bash / ps1） ===== */

function selectedBundles(agent) {
  const sel = store.sel[agent.id] || { bundles: ["cli"] };
  return agent.config.bundles.filter(b => sel.bundles.includes(b.id));
}

function buildAgentScript(agent, os) {
  const bash = os === "bash";
  const nl = bash ? "\n" : "\n";
  const L = [];
  if (bash) {
    L.push("#!/usr/bin/env bash");
    L.push("# Agent HUB 生成 · " + agent.name + " 部署脚本（幂等 + dry-run）");
    L.push("set -euo pipefail");
    L.push("DRY=${1:-run}   # 传 --dry-run 只预览不执行");
    L.push("say(){ echo \"[agent-hub] $*\"; }");
    L.push("say_warn(){ echo \"[⚠] $*\" >&2; }");
    L.push("");
    L.push("if [ \"$DRY\" = \"--dry-run\" ]; then say \"【DRY-RUN】将执行以下操作：\"; fi");
    L.push("");
    L.push("run(){ if [ \"$DRY\" = \"--dry-run\" ]; then say \"  ▶ $*\"; else \"$@\"; fi; }");
    L.push("");
    // prereqs
    (agent.install.prereqs || []).forEach(p => {
      L.push(`command -v node >/dev/null || say_warn "缺少前置：${p}"`);
    });
    // install
    const m = agent.install.methods[0];
    L.push("");
    L.push("say \"安装 ${m.name}...\"");
    L.push(`command -v ${(agent.verify[0]||"").split(" ")[0].replace("--version","").trim()} >/dev/null 2>&1 && say "已安装，跳过" || run ${m.cmdMac}`);
    // config blocks
    selectedBundles(agent).forEach(b => {
      if (b.content) {
        L.push("");
        L.push(`say "写入配置：${b.label}（占位符请替换为真实 Key）"`);
        L.push('cat > ~/.config/agent-hub/' + agent.id + '-' + b.id + '.conf << "EOF"');
        L.push(b.content);
        L.push("EOF");
      }
      if (b.id === "cli") {
        L.push("");
        L.push('read -rsp "输入 API Key（将写入配置）：" KEY; echo');
        L.push('if [ -n "$KEY" ]; then run echo "export ' + (agent.config.keyPrompt?.env || "API_KEY") + '=$KEY" >> ~/.config/agent-hub/env; fi');
      }
    });
    // verify
    L.push("");
    L.push("say \"验证安装：\"");
    agent.verify.forEach(v => L.push(`run ${v}`));
    if (agent.specialNote) L.push(`say_warn "${agent.specialNote}"`);
    L.push("");
    L.push('say "完成。若为 dry-run 请去掉 --dry-run 参数正式执行。"');
  } else {
    // PowerShell
    L.push("# Agent HUB 生成 · " + agent.name + " 部署脚本（幂等 + dry-run）");
    L.push("$ErrorActionPreference = 'Stop'");
    L.push("param([switch]$DryRun)");
    L.push('function Say($m){ Write-Host "[agent-hub] $m" }');
    L.push('function Run($cmd){ if($DryRun){ Write-Host "  ▶ $cmd" } else { Invoke-Expression $cmd } }');
    L.push("");
    const m = agent.install.methods[0];
    L.push(`Say "安装 ${m.name}..."`);
    L.push(`Run "${m.cmdWin}"`);
    selectedBundles(agent).forEach(b => {
      if (b.content) {
        L.push(`Say "写入配置：${b.label}（占位符请替换）"`);
        L.push('@\"');
        L.push(b.content);
        L.push('\"@ | Set-Content "$HOME/.config/agent-hub/' + agent.id + '-' + b.id + '.conf"');
      }
    });
    L.push('Say "验证安装："');
    agent.verify.forEach(v => L.push(`Run "${v}"`));
    if (agent.specialNote) L.push(`Write-Host "[⚠] ${agent.specialNote}" -ForegroundColor Yellow`);
  }
  return L.join(nl);
}

function buildDeployScript(ids, os) {
  const agents = store.agents.filter(a => ids.includes(a.id));
  if (!agents.length) return "# 未选择任何 Agent。返回目录勾选后重新生成。";
  const bash = os === "bash";
  const L = [];
  if (bash) {
    L.push("#!/usr/bin/env bash");
    L.push("# Agent HUB · 汇总部署脚本（" + agents.map(a => a.name).join(" + ") + "）");
    L.push("# 用法: ./deploy.sh       正式执行");
    L.push("#       ./deploy.sh --dry-run  仅预览");
    L.push("set -euo pipefail");
    L.push("DRY=${1:-run}");
    L.push('say(){ echo "[agent-hub] $*"; }');
    L.push("");
    L.push("# 0. 环境检查");
    L.push('command -v node >/dev/null 2>&1 || { echo "请先安装 Node.js >= 18"; exit 1; }');
    L.push('command -v git >/dev/null 2>&1 || say "提示：部分 Agent 需要 git";');
    L.push("");
    agents.forEach(a => {
      L.push("echo \"===== " + a.name + " =====");
      L.push(buildAgentScript(a, "bash").split("\n").map(l => l.startsWith("#") || l.startsWith("say") ? l : "#   " + l).join("\n"));
    });
    L.push("");
    L.push("echo \"===== 部署完成 · 验证清单 =====");
    agents.forEach(a => a.verify.forEach(v => L.push("echo \"  " + a.name + ": " + v + "\"")));
  } else {
    L.push("# Agent HUB · 汇总部署脚本（PowerShell）");
    L.push("$ErrorActionPreference = 'Stop'");
    agents.forEach(a => {
      L.push("Write-Host \"===== " + a.name + " =====");
      L.push(buildAgentScript(a, "ps1"));
    });
    L.push("Write-Host \"===== 部署完成 · 验证清单 =====");
    agents.forEach(a => a.verify.forEach(v => L.push(`Write-Host "  ${a.name}: ${v}"`)));
  }
  return L.join("\n");
}

/* ---------- 脚本渲染 ---------- */
function renderScript(agentId) {
  const out = $("#gen-out");
  if (!out) return;
  const a = store.agents.find(x => x.id === agentId);
  if (!a) return;
  const activeTab = document.querySelector("#gen-out").closest(".card").querySelector(".tab-btn.active");
  const os = activeTab && activeTab.textContent.includes("Windows") ? "ps1" : "bash";
  out.textContent = buildAgentScript(a, os);
}

function switchTab(btn, target) {
  btn.parentElement.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  // 重新生成当前所在视图的脚本
  const r = router.current();
  if (r.name === "agent") renderScript(r.id);
  else if (r.name === "workbench") {
    const ids = [...document.querySelectorAll("[data-wb-agent]:checked")].map(c => c.dataset.wbAgent);
    $("#wb-out").textContent = buildDeployScript(ids, target === "wb-ps1" ? "ps1" : "bash");
  }
}

/* ---------- 复制 / 下载 ---------- */
function copyText(btn, text) {
  navigator.clipboard.writeText(text).then(() => flash(btn)).catch(() => {
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove(); flash(btn);
  });
}
function copyEl(btn, id) { copyText(btn, document.getElementById(id).textContent); }
function flash(btn) { const o = btn.textContent; btn.textContent = "已复制 ✓"; btn.classList.add("copied"); setTimeout(() => { btn.textContent = o; btn.classList.remove("copied"); }, 1400); }

function downloadScript(name) {
  const el = document.getElementById(name === "deploy" ? "wb-out" : "gen-out");
  if (!el) return;
  const blob = new Blob([el.textContent], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name === "deploy" ? "deploy.sh" : `install-${name}.sh`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function wbSelectAll(on) {
  document.querySelectorAll("[data-wb-agent]").forEach(c => { c.checked = on; });
  document.querySelectorAll("[data-wb-bundle]").forEach(c => { c.checked = on; });
  wbSync(); renderWB();
}

/* ---------- PWA ---------- */
function registerSW() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}
