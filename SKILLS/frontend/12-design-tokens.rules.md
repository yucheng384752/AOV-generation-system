# Frontend Skill｜Design Tokens（基礎視覺規範）

## 目的
確保跨頁面 UI 一致性，降低維護成本。

---

## 強制規則（Must）

- 所有間距必須使用既定 spacing scale
- 不得任意新增字級或顏色
- 色彩需語義化（primary / success / warning / error）

---

## Token 類型

- Spacing：4 / 8 / 12 / 16 / 24 / 32
- Typography：title / section / body / caption
- Color：primary / secondary / error / disabled / background

---

## 禁止行為（Forbidden）

- Magic number（隨意 px）
- 同功能不同顏色
- 為單一頁面新增特例樣式