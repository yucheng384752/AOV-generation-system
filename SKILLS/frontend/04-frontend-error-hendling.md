# Frontend Skill｜錯誤處理與回饋（Frontend Error Handling）

## 目的
避免錯誤被吞沒，確保使用者與開發者都能察覺問題。

## 錯誤處理原則
- 所有錯誤必須被捕捉
- 錯誤必須有 UI 呈現（非僅 console）

## UI 顯示規範
- 使用者可理解的訊息
- 不顯示技術細節（stack trace）

## 記錄規範
- console.error 僅限開發階段
- 不得在正式流程中依賴 console 作為唯一錯誤處理

## 禁止行為
- 靜默失敗
- try/catch 後不處理