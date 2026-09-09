---
id: "20260910-v1-1-4-bottom-return"
title: "1.1.4 下方返回線"
status: "completed"
owner: "codex"
reviewer: "none"
priority: "medium"
created_by: "codex"
created_at: "2026-09-10"
updated_at: "2026-09-10"
role_priority:
  implementation: "codex"
  review: "claude"
  tests: "claude"
  requirements: "user"
artifacts:
  - path: "src/components/Canvas.tsx"
    type: "file"
  - path: "tests/browser-1.1.1.js"
    type: "test"
  - path: "docs/version-1.1.md"
    type: "file"
  - path: "docs/verification.md"
    type: "test"
---

# Goal

返回線由來源節點下方延伸，水平向左後由下方接入目標節點；每個節點只提供一個返回接點。

# Success Criteria

- 每個節點在返回模式只有一個下方接點，同一接點可作起點或終點。
- 返回線由右往左，從來源底部向下、水平向左，再向上接入目標底部。
- 返回線保持虛線，正向線維持左進右出。

# Current Context

從 `origin/dev` 建立 `fix/1.1.4-bottom-return`。此次為返回線顯示與操作的小幅修正，版本升為 1.1.4，`schemaVersion` 維持 1.1。

# Codex Notes

- React Flow 使用 `ConnectionMode.Loose`，讓單一 bottom source handle 同時接受返回線的起點與終點操作。
- 自訂 return edge 使用垂直、水平及圓角轉折路徑；下繞高度依來源與目標較低者計算。
- 既有連線建立規則繼續限制正向線由左向右、返回線由右向左。

# Claude Notes

本次未呼叫 Claude，未將 Codex 驗證記為 Claude 審查。

# Review Findings

- 實際 Chromium 拖曳確認底部接點可完成右往左返回連接，且錯誤方向仍被阻擋。
- 返回 edge 為虛線並依底部、下繞、水平、上接的順序繪製。

# Test Plan

- `npm test`：17/17 通過。
- `npm run build`：通過。
- `tests/browser-1.1.1.js`：Chromium 操作通過。

# Decisions

- Accepted（使用者）：返回線的起點與終點都在節點下方。
- Accepted（使用者）：每個節點只有一個返回接點。

# Session Summary

1.1.4 下方單點返回線已完成並驗證。

# Open Questions

無。
