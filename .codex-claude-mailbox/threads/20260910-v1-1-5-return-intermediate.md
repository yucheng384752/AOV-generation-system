---
id: "20260910-v1-1-5-return-intermediate"
title: "1.1.5 返回線中間節點"
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
  - path: "src/domain/types.ts"
    type: "file"
  - path: "src/domain/schema.ts"
    type: "file"
  - path: "tests/version-1.1.test.ts"
    type: "test"
  - path: "tests/browser-1.1.1.js"
    type: "test"
---

# Goal

允許返回流程在起點與終點之間串接一般節點，呈現下方起訖、中間節點右進左出的路徑。

# Success Criteria

- 起點下方可連到中間節點右側。
- 中間節點左側可連到終點下方，也可繼續串接另一個中間節點右側。
- 匯出與匯入保留每段返回線的接點位置。
- 舊 1.1 檔案保持相容。

# Current Context

從 `origin/dev` 建立 `feat/1.1.5-return-intermediate`。此次為小功能增加，應用程式版本升為 1.1.5，`schemaVersion` 維持 1.1。

# Codex Notes

- return edge 新增可選 `sourceAnchor` 與 `targetAnchor`，舊檔缺少時預設使用底部。
- 中間節點右側為返回入口、左側為返回輸出；各段沿用既有 port 契約、返回原因與 Loop 定義。
- 自訂 edge 依錨點組合繪製直角路徑，沒有增加套件。

# Claude Notes

本次未呼叫 Claude，未將 Codex 驗證記為 Claude 審查。

# Review Findings

- Chromium 實際拖曳通過：`bottom → right` 與 `left → bottom` 均成功。
- JSON 往返保留兩段 edge 的錨點；舊檔仍可載入。

# Test Plan

- `npm test`：18/18 通過。
- `npm run build`：通過。
- `tests/browser-1.1.1.js`：Chromium 操作通過。

# Decisions

- Accepted（使用者）：返回路徑中間可以加入節點。
- 沿用既定規則：起點／終點在下方，中間節點右進左出。

# Session Summary

1.1.5 返回線中間節點已完成並驗證。

# Open Questions

無。
