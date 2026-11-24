# AGENTS.md — solar-terms-game

二十四节气开放世界 · Capacitor 移动游戏（归档）。

## 命令

```bash
npm install
npm run build          # → www/
npm test
npx cap sync android
```

## 用途与 Target 判定

| 平台 | 需要? | 方式 |
|------|-------|------|
| 移动端 | 需要 | Capacitor Android（`android/`，CI 矩阵 `solar-terms-game`） |
| 智能硬件 | 可选 | 二十四节气农场触屏经营为主，穿戴输入可选（已归档搁置） |

## Harness / Loop

遵循根 `/Users/skat/AGENTS.md`。Done：`npm test` + `npm run build` + `android/` 可 sync。
