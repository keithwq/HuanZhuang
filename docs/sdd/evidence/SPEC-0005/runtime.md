# SPEC-0005 证据

- 静态检查： `npx tsc --noEmit` 退出码 0。PASSED
- 运行检查： `npx vitest run tests/unit/shop.spec.ts tests/unit/daily.spec.ts tests/unit/hud.spec.ts tests/unit/mode-switch.spec.ts` 退出码 0。4 个文件、54 条通过（shop 14，daily 15，hud 16，mode-switch 9）。AC-01 至 AC-04 在 `tests/unit/shop.spec.ts`。M2 单测覆盖试穿计数、领取 150、购买、入柜。PASSED
- 人工验收： NOT PERFORMED
- 浏览器： BLOCKED。竖屏画布的底部页签没有进入这次截图，没有点开商店、详情和购入。
