# Frontend Skill｜元件邊界與分層（Component Boundary）

## 目的
避免元件職責混亂，提升可讀性與可維護性。

## 元件分類
- Page Component
  - 負責資料組裝與流程控制
- UI Component
  - 純視覺與互動，不含商業邏輯
- Utility / Hook
  - 狀態、資料處理、共用邏輯

## 強制規則
- Page Component 不得直接處理複雜 UI 細節
- UI Component 不得直接呼叫 API
- Hook 必須與 UI 解耦

## 建議限制
- 單一 component 行數不超過合理範圍（建議 < 300 行）
- props 超過 5 個需重新檢視設計

## 禁止行為
- 巨型 component（God Component）
- UI 與資料處理混寫