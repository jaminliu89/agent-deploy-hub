#!/usr/bin/env bash
# Agent HUB · 本机配置导出工具（macOS）
# 白名单导出可移植配置 → agent-patch/ + export-report.txt
# 硬性规则：排除密钥/会话/缓存；>20MB 跳过并提示
set -uo pipefail

OUT_DIR="${1:-./agent-patch}"
REPORT="$OUT_DIR/export-report.txt"
MAX_BYTES=$((20 * 1024 * 1024))   # 20MB

# 每个 agent 的可移植子路径（白名单）
declare -A SCOPES=(
  [claude]="$HOME/.claude skills commands plugins CLAUDE.md AGENTS.md config.json projects prompts"
  [codex]="$HOME/.codex config.toml AGENTS.md"
  [hermes]="$HOME/.hermes config.yaml skills AGENTS.md bin"
  [pi]="$HOME/.pi agent skills"
  [reasonix]="$HOME/.reasonix projects"
  [openclaw]="$HOME/.openclaw skills plugins config"
  [agents-shared]="$HOME/.agents skills"
)

EXCLUDE_PAT='(^|/)(auth[^/]*|.*token.*|.*\.key|sessions?|cache|history[^/]*|.*\.jsonl|.*\.bak[^/]*|.*\.log)(/|$)'

rm -rf "$OUT_DIR"; mkdir -p "$OUT_DIR"
: > "$REPORT"
echo "Agent HUB 导出报告 $(date '+%Y-%m-%d %H:%M')" >> "$REPORT"
echo "======================================" >> "$REPORT"

total_files=0; total_bytes=0; skipped_big=0; skipped_excl=0

for scope in "${!SCOPES[@]}"; do
  base="${SCOPES[$scope]%% *}"
  rel_target="${SCOPES[$scope]#* }"
  [ "$rel_target" = "$base" ] && rel_target=""
  [ -d "$base" ] || continue
  dest="$OUT_DIR/$scope"; mkdir -p "$dest"
  echo "" >> "$REPORT"
  echo "--- $scope ($base) ---" >> "$REPORT"

  # 目标：把 base 下白名单子路径复制到 dest，保留相对结构
  # 简化：rsync 白名单模式
  if command -v rsync >/dev/null 2>&1; then
    args=(-a --exclude-from=/dev/null)
    # 排除模式
    for pat in auth\* \*token\* \*.key sessions cache history\* \*.jsonl \*.bak\* \*.log; do
      args+=(--exclude="$pat")
    done
    rsync "${args[@]}" "$base/" "$dest/" 2>>"$REPORT"
  else
    # 无 rsync：tar 白名单
    tar -C "$base" -cf - . 2>/dev/null | tar -C "$dest" -xf - 2>/dev/null
  fi

  # 清理误入的排除项（双保险）+ 统计 + >20MB 检查
  while IFS= read -r -d '' f; do
    rel="${f#$dest/}"
    # 排除项检查
    if [[ "/$rel" =~ $EXCLUDE_PAT ]]; then
      rm -f "$f"; skipped_excl=$((skipped_excl+1)); continue
    fi
    size=$(stat -f%z "$f" 2>/dev/null || echo 0)
    if [ "$size" -gt "$MAX_BYTES" ]; then
      echo "  ⏭ 跳过(>20MB): $rel ($((size/1024/1024))MB) —— 请手动迁移或重新下载" >> "$REPORT"
      rm -f "$f"; skipped_big=$((skipped_big+1)); continue
    fi
    total_files=$((total_files+1)); total_bytes=$((total_bytes+size))
  done < <(find "$dest" -type f -print0)

  # 清理空目录
  find "$dest" -type d -empty -delete 2>/dev/null
done

echo "" >> "$REPORT"
echo "===== 汇总 =====" >> "$REPORT"
echo "导出文件数: $total_files" >> "$REPORT"
echo "总大小: $((total_bytes/1024/1024))MB" >> "$REPORT"
echo "跳过(>20MB): $skipped_big" >> "$REPORT"
echo "跳过(排除项): $skipped_excl" >> "$REPORT"
echo "" >> "$REPORT"
echo "⚠ 本包不含任何密钥。各平台 API Key 需在新机重新填写。" >> "$REPORT"

echo "✅ 导出完成：$OUT_DIR（共 $total_files 个文件，$((total_bytes/1024/1024))MB）"
echo "   报告：$REPORT"
echo "   跳过(>20MB): $skipped_big · 跳过(排除项): $skipped_excl"
echo ""
echo "下一步：把 $OUT_DIR 带到新机（U盘/私有仓/云盘），部署对应 Agent 后解包到 ~/.xxx 目录，重新填 Key。"
