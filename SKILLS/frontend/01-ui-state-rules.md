# Frontend Skill｜UI 狀態規範（UI State Rules）

## 目的
確保所有互動式畫面都有明確、可預期的使用者回饋，避免靜默失敗。

## 強制 UI 狀態
每一個互動畫面或元件，必須定義以下狀態（依需求）：
- loading
- success
- empty
- error
- disabled（若可操作）

## UI 行為規範
- loading 時：
  - 禁止重複觸發相同行為
  - 必須有視覺回饋（spinner / skeleton）
- error 時：
  - 必須顯示可理解的錯誤訊息
  - 必須提供可回復行為（retry / reset）

## 禁止行為
- 點擊後無任何回饋
- 錯誤被 console.log 但 UI 無顯示
- 使用 alert 作為主要錯誤呈現方式

## 驗證方式
- 人工操作檢查所有狀態
- 或以 UI 測試驗證狀態切換