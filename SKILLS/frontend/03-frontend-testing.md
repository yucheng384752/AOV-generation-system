# Frontend Skill｜前端測試規範（Frontend Testing）

## 目的
確保互動行為在修改後仍保持正確。

## 強制測試範圍
- 關鍵互動流程（submit / click / navigation）
- 狀態切換（loading → success / error）
- 邊界條件（空資料、錯誤資料）

## 測試工具（擇一或多）
- vitest
- @testing-library/react
- ESLint / TypeScript typecheck

## 測試原則
- 測試使用者行為，不測實作細節
- 測試結果必須可重現

## 禁止行為
- 只測 happy path
- 因測試困難而省略測試