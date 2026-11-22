# SPEC-0003 证据

- 静态检查： `npx tsc --noEmit` 退出码 0。PASSED
- 运行检查： `npx vitest run tests/unit/mode-switch.spec.ts tests/unit/hud.spec.ts tests/unit/room.spec.ts tests/unit/room-stage.spec.ts tests/unit/room-placement-ui.spec.ts` 退出码 0。5 个文件、60 条通过（mode-switch 9，hud 16，room 14，room-stage 12，placement-ui 9）。PASSED
- 人工验收： NOT PERFORMED
- 视觉： PARTIAL。模式切换在浏览器里看到灰盒房间底和家具页签。氛围光三层真图未到，灰盒层未叠到画面上。没有 ≤300ms 的帧探针。R-07 真机内存未测，不写成通过。
