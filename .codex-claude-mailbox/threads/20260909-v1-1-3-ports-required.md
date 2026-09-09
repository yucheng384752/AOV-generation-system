---
id: "20260909-v1-1-3-ports-required"
title: "1.1.3 返回接點與必填標示"
status: "completed"
owner: "codex"
reviewer: "none"
priority: "medium"
created_by: "codex"
created_at: "2026-09-09"
updated_at: "2026-09-09"
role_priority:
  implementation: "codex"
  review: "claude"
  tests: "claude"
  requirements: "user"
artifacts:
  - path: "src/components/Canvas.tsx"
    type: "file"
  - path: "src/components/Inspector.tsx"
    type: "file"
  - path: "src/domain/model.ts"
    type: "file"
  - path: "docs/verification.md"
    type: "test"
---

# Goal

返回模式採右進左出，返回虛線在起點與終點附近向下繞行；移除 node 卡片的前一步／下一步文字，並以紅色星號標示必填欄位。

# Success Criteria

- 返回 output 位於左側、return input 位於右側。
- 正向／返回模式只顯示當前可用的接點，返回 edge 使用下繞虛線。
- node 卡片不顯示 port 文字。
- 完整性檢查要求的表單欄位顯示紅色星號及原生 required。

# Current Context

從 origin/dev 建立 `fix/1.1.3-return-ports`；此次是局部互動與顯示調整，版本升為 1.1.3，schemaVersion 維持 1.1。

# Codex Notes

- 共用 TextField 新增 required 參數，在標題附加紅色星號並傳給 input/textarea。
- 必填標示與 completeness 一致：專案、步驟、節點及連接埠名稱；外部引用名稱與位置；返回原因；重複 Loop 的上限、停止條件與超限處理。
- 返回與正向 handle 共用左右位置，透過目前模式切換可見性，避免畫面同時出現兩套接點。
- port 名稱不在卡片中顯示，仍保留於 JSON 與 Inspector；新 Workflow port 預設改為輸入／輸出。

# Claude Notes

本次未呼叫 Claude，未將 Codex 驗證記為 Claude 審查。

# Review Findings

- DOM 與畫面確認 return output 左側、return input 右側，返回 edge 為虛線。
- required 欄位同時具有紅色 `*` 與 HTML required；選填說明沒有標示。

# Test Plan

- `npm test`：17/17 通過。
- `npm run build`：通過。
- Chromium 檢查接點位置、模式可見性、返回虛線、卡片文字與 required 標示。

# Decisions

- Accepted（使用者）：返回右進左出，路徑於起點／終點下繞。
- Accepted（使用者）：卡片不顯示前一步／下一步，由連線顏色與模式判讀。
- Accepted（使用者）：必填欄位標題顯示紅色星號。

# Session Summary

1.1.3 接點、卡片與表單標示已完成並驗證。

# Open Questions

無。
