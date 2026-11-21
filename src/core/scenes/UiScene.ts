/**
 * UiScene · HUD 全部：顶导 / 转身按钮 / 标签栏 / 抽屉宿主（衣柜网格）/ toast（E2 灰盒）
 * 职责红线（hud §2.5）：本场景只做布局与镜像，不持有游戏状态；页内交互归控制器逻辑层。
 */

import Phaser from 'phaser';
import { AppContext } from '../app';
import { bus, type GroupId } from '../bus';
import { DRAWER, FEEDBACK_MS } from '../constants/budget';
import type { SlotId } from '../constants/slots';
import { computeLayout, type HudLayout } from '../../systems/hud/layout';
import { DrawerController, type DrawerTier } from '../../systems/hud/DrawerController';
import { GROUPS, groupById, sortGroupItems, unequipCardsOf } from '../../systems/wardrobe/groups';
import { filterItems } from '../../systems/wardrobe/filter';
import { TryonController } from '../../systems/wardrobe/tryonController';
import { LookPanelModel, validateLookName } from '../../systems/looks/lookPanel';
import { createApplyFlow } from '../../systems/looks/applyFlow';
import { OverlayManager } from '../../systems/hud/OverlayManager';
import { ensureGreyTexture } from '../../systems/paperdoll/greybox';
import type { OutfitKey } from '../constants/slots';
import { clothingById, type ClothingItem } from '../../data/items';

const COLORS = { bg: 0xf3eff9, cloud: 0xdce2f2, aster: 0x8268c6, night: 0x3a3358 };

type Shakeable = Phaser.GameObjects.Text | Phaser.GameObjects.Rectangle;

export class UiScene extends Phaser.Scene {
  private app!: AppContext;
  private layout!: HudLayout;
  private drawer!: DrawerController;
  private ctrl!: TryonController;
  private coinValue = 0;
  private coinText: Phaser.GameObjects.Text | null = null;
  private drawerRect!: Phaser.GameObjects.Rectangle;
  private handleRect!: Phaser.GameObjects.Rectangle;
  private gridLayer: Phaser.GameObjects.Container | null = null;
  private tabLayer: Phaser.GameObjects.Container | null = null;
  private activeGroup: GroupId = 'G3';
  private toastText: Phaser.GameObjects.Text | null = null;
  // E3-S01/S02 造型面板（look overlay）
  private overlayMgr = new OverlayManager();
  private lookPanel!: LookPanelModel;
  private applyLook!: ReturnType<typeof createApplyFlow>;
  private lookLayer: Phaser.GameObjects.Container | null = null;
  private nameInput: HTMLInputElement | null = null;

  constructor() {
    super('UI');
  }

  init(): void {
    this.app = this.game.registry.get('app') as AppContext;
  }

  create(): void {
    this.ctrl = new TryonController(this.app.model, this.app.save);
    this.lookPanel = new LookPanelModel(this.app.save);
    this.applyLook = createApplyFlow(this.app.model, this.app.save);
    this.coinValue = this.app.save.getCoins();

    // 货币栏镜像（hud §6：余额变更事件刷新；重建场景对象时以 coinValue 复原）
    bus.on('coins:changed', (p) => {
      this.coinValue = p.coins;
      this.coinText?.setText(`✦ ${p.coins}`);
    });
    // toast 通道（save 降级一次性提示，local-save §5.1）
    bus.on('save:degraded', () => this.toast('当前浏览器模式无法保存进度'));

    this.relayout();
    this.scale.on('resize', () => this.relayout());

    // QA 钩子（dev-only：动态 import 门控——prod 构建整模块不进产物，R-16）
    if (import.meta.env.DEV) {
      void import('../qa-hook').then(({ installUiQaHook }) =>
        installUiQaHook(this.ctrl, this.app, this.game),
      );
    }
  }

  private relayout(): void {
    this.layout = computeLayout({
      cssW: this.scale.width,
      cssH: this.scale.height,
      safeTop: 0,
      safeBottom: 0,
    });
    this.children.removeAll(true);
    this.coinText = null;
    this.gridLayer = null;
    this.tabLayer = null;
    const L = this.layout;

    // 顶导 88：模式标题 + 货币栏 + 转身按钮
    this.add.rectangle(L.logicalW / 2, L.safeTop + 44, L.logicalW, 88, COLORS.cloud).setOrigin(0.5);
    this.add.text(24, L.safeTop + 44, '更衣室', this.font(44, true)).setOrigin(0, 0.5);
    this.coinText = this.add
      .text(L.logicalW - 200, L.safeTop + 44, `✦ ${this.coinValue}`, this.font(28))
      .setOrigin(0, 0.5)
      .setDepth(10);

    // 转身按钮（paperdoll §2.2 路径 B——§9.3 触控冗余）
    const flipBtn = this.add
      .text(L.logicalW - 24, L.safeTop + 88, '⟲ 转身', this.font(28))
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    flipBtn.on('pointerup', () => {
      const target = this.app.model.getView() === 'front' ? 'back' : 'front';
      bus.emit('view:flipRequest', { target });
    });

    // 顶导「造型」入口（hud §2.3 → openOverlay('look') 单层互斥）
    const lookBtn = this.add
      .text(L.logicalW - 128, L.safeTop + 88, '我的造型', this.font(24))
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    lookBtn.on('pointerup', () => {
      if (!this.overlayMgr.isOpen()) this.renderLookOverlay();
    });

    // 舞台底部边界：顶导下沿 + 舞台高
    const stageBottom = L.safeTop + L.topNavH + L.stageH;

    // 标签栏 96（Sprint 1：换装可用，其余灰态摇头——房间/商店/成就 Sprint 2/3 接入）
    const tabBarY = stageBottom + L.safeBottom + 48;
    const tabs: { label: string; enabled: boolean }[] = [
      { label: '换装', enabled: true },
      { label: '房间', enabled: false },
      { label: '商店', enabled: false },
      { label: '成就', enabled: false },
    ];
    tabs.forEach((t, i) => {
      const x = (i + 0.5) * (L.logicalW / 4);
      const txt = this.add
        .text(x, tabBarY, t.label, this.font(28))
        .setOrigin(0.5)
        .setColor(t.enabled ? '#3a3358' : '#c9c0b4')
        .setInteractive({ useHandCursor: true });
      txt.on('pointerup', () => {
        if (!t.enabled) {
          this.headShake(txt, x, tabBarY); // 误触摇头 200ms（art §8.1 柔性错误）
          this.toast('这一格还在整理中…');
        }
      });
    });

    // 抽屉（两档 45/70，把手拖拽 + 速度吸附）
    this.drawer = new DrawerController(L.stageH, (_tier: DrawerTier, h: number) => {
      this.drawerRect.setSize(L.logicalW, h).setPosition(L.logicalW / 2, stageBottom - h / 2);
      this.renderTabs(stageBottom - h);
      this.renderGrid();
    });
    this.drawerRect = this.add
      .rectangle(L.logicalW / 2, stageBottom - L.drawerDefaultH / 2, L.logicalW, L.drawerDefaultH, COLORS.cloud)
      .setOrigin(0.5);
    this.handleRect = this.add
      .rectangle(L.logicalW / 2, stageBottom - L.drawerDefaultH + DRAWER.handleHeightPx / 2, L.logicalW, DRAWER.handleHeightPx, COLORS.aster)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.attachHandleDrag();

    this.tabLayer = this.add.container(0, 0);
    this.gridLayer = this.add.container(0, 0);
    this.renderTabs(stageBottom - L.drawerDefaultH);
    this.renderGrid();
  }

  private font(px: number, bold = false): Phaser.Types.GameObjects.Text.TextStyle {
    return {
      fontFamily: '"PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif',
      fontSize: `${px}px`,
      color: '#3a3358',
      fontStyle: bold ? 'bold' : 'normal',
    };
  }

  /** 摇头动效（3° 视觉等价横摆 × 200ms，art §8.1；减敏直落） */
  private headShake(obj: Shakeable, x: number, y: number): void {
    if (this.app.reducedMotion()) return;
    this.tweens.add({
      targets: obj,
      x: { from: x - 6, to: x + 6 },
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => obj.setPosition(x, y),
    });
  }

  /** toast / Caption（非弹窗、克制表达，§9.6） */
  private toast(text: string): void {
    this.toastText?.destroy();
    this.toastText = this.add
      .text(this.layout.logicalW / 2, this.layout.safeTop + this.layout.topNavH + 40, text, this.font(24))
      .setOrigin(0.5)
      .setColor('#2e2a45')
      .setBackgroundColor('#dce2f2')
      .setPadding(12, 6, 12, 6)
      .setDepth(99);
    this.time.delayedCall(2400, () => {
      this.toastText?.destroy();
      this.toastText = null;
    });
  }

  private attachHandleDrag(): void {
    const h = this.handleRect;
    let startH = 0;
    let startT = 0;
    h.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.drawer.beginDrag();
      startH = this.drawer.current().height;
      startT = p.event.timeStamp;
    });
    h.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!p.isDown) return;
      const delta = startH - (p.y - p.downY); // 上拉为增
      this.drawer.dragTo(startH + delta);
    });
    h.on('pointerup', (p: Phaser.Input.Pointer) => {
      const dt = Math.max(1, p.event.timeStamp - startT);
      const dy = -(p.y - p.downY);
      this.drawer.endDrag(Math.abs(dy) / dt, dy > 0);
    });
  }

  /** 页签条：G1~G8 横排点按路径（GAP-4 分组；横向滑动路径 Sprint 2 手势区接入） */
  private renderTabs(drawerTopY: number): void {
    const layer = this.tabLayer;
    if (!layer) return;
    layer.removeAll(true);
    const L = this.layout;
    const tabY = drawerTopY + DRAWER.handleHeightPx + 24;
    const gap = (L.logicalW - 24 * 2) / GROUPS.length;
    GROUPS.forEach((g, i) => {
      const active = g.id === this.activeGroup;
      const txt = this.add
        .text(24 + gap * (i + 0.5), tabY, g.name, this.font(24))
        .setOrigin(0.5)
        .setColor(active ? '#ffffff' : '#3a3358')
        .setBackgroundColor(active ? '#8268c6' : 'rgba(0,0,0,0)')
        .setPadding(8, 2, 8, 2)
        .setInteractive({ useHandCursor: true });
      txt.on('pointerup', () => {
        this.activeGroup = g.id;
        bus.emit('wardrobe:tabChange', { groupId: g.id }); // onTabChange(组 ID)——GAP-4 注记
        this.renderTabs(drawerTopY);
        this.renderGrid();
      });
      layer.add(txt);
    });
  }

  /** 物品网格：卸下卡 + 已拥有卡片（组内次序 ux-spec §2.1；104×104 卡片，§6.2） */
  private renderGrid(): void {
    if (!this.gridLayer) return;
    const gridLayer = this.gridLayer;
    gridLayer.removeAll(true);
    const L = this.layout;
    const g = groupById(this.activeGroup);
    const drawerH = this.drawer.current().height;
    const drawerTopY = L.safeTop + L.topNavH + L.stageH - drawerH;
    const top = drawerTopY + DRAWER.handleHeightPx + 56;

    // 连衣裙穿着期 BTM 页签持续 Caption（wardrobe §2.3：非阻塞提示，非弹窗——
    // 首启默认 TOP 即连衣裙（starnight_dress）场景下常显，P5-EL-S1c 语义复核补齐项）
    if (this.activeGroup === 'G4' && this.app.model.isBtmOccluded()) {
      gridLayer.add(
        this.add
          .text(L.logicalW / 2, top - 18, '当前被连衣裙遮蔽，可先换好下装', this.font(22))
          .setOrigin(0.5)
          .setColor('#2e2a45'),
      );
    }

    // 卸下卡（混组每槽一张 + Caption 标注，wardrobe §2.1 修订段）
    const unequipCards = unequipCardsOf(g.id).map((c) => ({
      kind: 'unequip' as const,
      label: `卸下·${c.label}`,
      slot: (c.key === 'HAND_L' || c.key === 'HAND_R' ? 'HAND' : c.key) as SlotId,
    }));

    // 已拥有物品（D3-05：衣柜 = 已拥有全集；单选标签 OR 语义）
    const groupSlots = new Set<string>(g.keys.map((k) => (k === 'HAND_L' || k === 'HAND_R' ? 'HAND' : k)));
    const ownedIds = [...this.app.save.getOwned()];
    const owned = filterItems(
      ownedIds.map((id) => clothingById(id)).filter((c): c is ClothingItem => c !== undefined && groupSlots.has(c.slot)),
      { owned: ownedIds, activeTag: this.ctrl.activeTag },
    );
    const sorted = sortGroupItems(owned.map((c) => ({ ...c, worn: this.ctrl.isWorn(c) })));

    const all: { kind: 'unequip'; label: string; slot: SlotId }[] | { kind: 'item'; item: ClothingItem; label: string }[] = [];
    void all;
    const entries: Array<
      | { kind: 'unequip'; label: string; slot: SlotId }
      | { kind: 'item'; item: ClothingItem; label: string }
    > = [
      ...unequipCards,
      ...sorted.map((c) => ({ kind: 'item' as const, item: c, label: c.name })),
    ];

    const cols = 4;
    const cardW = 104;
    const gapX = 16;
    const startX = 24 + cardW / 2;
    const maxRows = Math.max(1, Math.floor((drawerH - DRAWER.handleHeightPx - 70) / (cardW + gapX)));
    entries.slice(0, cols * maxRows).forEach((entry, i) => {
      const cx = startX + (i % cols) * (cardW + gapX);
      const cy = top + Math.floor(i / cols) * (cardW + gapX) + cardW / 2;
      const rect = this.add
        .rectangle(cx, cy, cardW, cardW, COLORS.bg, 1)
        .setStrokeStyle(2, COLORS.night);
      gridLayer.add(rect);
      const label = this.add
        .text(cx, cy, entry.kind === 'unequip' ? entry.label : shortName(entry.label), this.font(20))
        .setOrigin(0.5)
        .setColor('#2e2a45');
      gridLayer.add(label);

      if (entry.kind === 'unequip') {
        rect.setInteractive({ useHandCursor: true });
        rect.on('pointerup', () => this.ctrl.tapUnequip(entry.slot));
        return;
      }
      // 穿着角标：星紫粗描边（角标差异承载状态，§9.2）
      if (this.ctrl.isWorn(entry.item)) rect.setStrokeStyle(4, COLORS.aster);
      rect.setInteractive({ useHandCursor: true });
      label.setInteractive({ useHandCursor: true });
      const tap = (): void => {
        const ev = this.ctrl.tapCard(entry.item);
        if (ev.type === 'lightFeedback') this.headShake(rect, cx, cy); // 当前穿着：轻反馈 100ms 量级
        if (ev.type === 'btmOccludedCaption') this.toast('当前被连衣裙遮蔽'); // 非阻塞 Caption（wardrobe §2.3）
        this.renderGrid();
      };
      rect.on('pointerup', tap);
      label.on('pointerup', tap);
    });
    void FEEDBACK_MS;
  }

  // ---------------------------------------------------------------- E3 造型面板覆盖层

  /** 打开造型面板（hud §6 openOverlay('look')——单层互斥） */
  private renderLookOverlay(): void {
    if (this.overlayMgr.openOverlay('look') === null) return;
    const L = this.layout;
    this.closeNameInput();
    this.lookLayer = this.add.container(0, 0).setDepth(50);
    const layer = this.lookLayer!;

    // 遮罩（hud §5.4：吸收触控；点按空白处关闭）
    const mask = this.add.rectangle(L.logicalW / 2, L.logicalH / 2, L.logicalW, L.logicalH, 0x2e2a45, 0.45)
      .setInteractive({ useHandCursor: true });
    layer.add(mask);
    mask.on('pointerup', () => this.closeLookOverlay());

    // 关闭按钮
    const closeBtn = this.add
      .text(24, L.safeTop + L.topNavH + 24, '✕', this.font(32))
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeLookOverlay());
    layer.add(closeBtn);

    this.renderLookCards();
  }

  /** 面板内容（标题/n9/满位 Caption/九宫格）——保存/删除/重命名后可独立刷新 */
  private renderLookCards(): void {
    const layer = this.lookLayer;
    if (!layer) return;
    const L = this.layout;

    // 标题 + n/9 副标（look-save §2.1）
    layer.add(this.add.text(L.logicalW / 2, L.safeTop + L.topNavH + 24, '我的造型', this.font(36, true)).setOrigin(0.5));
    layer.add(
      this.add.text(L.logicalW - 24, L.safeTop + L.topNavH + 26, `${this.lookPanel.usedCount()}/9`, this.font(24))
        .setOrigin(1, 0),
    );

    // 满位 Caption（look-save §2.6：非弹窗、非红光）
    if (this.lookPanel.isFull()) {
      layer.add(
        this.add
          .text(L.logicalW / 2, L.safeTop + L.topNavH + 66, '造型已满，删除一个腾出位置', this.font(24))
          .setOrigin(0.5)
          .setColor('#2e2a45'),
      );
    }

    // 3×3 九宫格（卡片 208×208，look-save §4 公式）
    const cardW = 208;
    const gap = 16;
    const startX = 24 + cardW / 2;
    const gridTop = L.safeTop + L.topNavH + 110;
    this.lookPanel.slots().forEach((slot) => {
      const col = slot.index % 3;
      const row = Math.floor(slot.index / 3);
      const cx = startX + col * (cardW + gap);
      const cy = gridTop + row * (cardW + gap) + cardW / 2;
      if (slot.look === null) {
        this.renderVacantCard(layer, cx, cy);
      } else {
        this.renderLookCard(layer, cx, cy, slot.look.id);
      }
    });
  }

  /** 空位卡：虚线意象描边 + 保存当前造型入口（look-save §2.1） */
  private renderVacantCard(layer: Phaser.GameObjects.Container, cx: number, cy: number): void {
    const cardW = 208;
    const rect = this.add.rectangle(cx, cy, cardW, cardW, COLORS.bg, 0.6).setStrokeStyle(3, COLORS.aster, 0.7);
    layer.add(rect);
    const label = this.add
      .text(cx, cy, '保存当前造型', this.font(24))
      .setOrigin(0.5)
      .setColor('#2e2a45');
    layer.add(label);
    rect.setInteractive({ useHandCursor: true });
    label.setInteractive({ useHandCursor: true });
    const openNaming = (): void => this.openNamingInput(cx, cy);
    rect.on('pointerup', openNaming);
    label.on('pointerup', openNaming);
  }

  /** 占用位卡：实时迷你渲染（0.4 缩放正面合成，look-save §2.4）+ 名称 + 操作条 */
  private renderLookCard(layer: Phaser.GameObjects.Container, cx: number, cy: number, lookId: string): void {
    const L = this.layout;
    const look = this.app.save.getLooks().find((l) => l.id === lookId)!;
    const cardW = 208;
    const rect = this.add.rectangle(cx, cy, cardW, cardW, COLORS.cloud, 1).setStrokeStyle(2, COLORS.night, 0.8);
    layer.add(rect);
    rect.setInteractive({ useHandCursor: true });

    // 实时迷你渲染：look.outfit 正面合成 0.4 缩放，卡片上半区裁剪（look-save §4）
    const mini = this.add.container(cx, cy - cardW / 2 + 8);
    const miniMask = this.make.graphics({}, false);
    miniMask.fillStyle(0xffffff, 1);
    miniMask.fillRect(cx - cardW / 2, cy - cardW / 2, cardW, cardW * 0.72); // 名称/操作条占下方 ~1/4
    mini.setMask(miniMask.createGeometryMask());
    const view = 'front';
    for (const r of this.app.model.renderItems()) {
      // 以 look.outfit 的值合成（当前模型视图仅用于层序表——合成值取快照）
      const itemId = look.outfit[r.key as OutfitKey];
      let texKey: string;
      if (r.key === 'BODY') {
        texKey = `gz_BODY_${view}`;
      } else if (itemId === null) {
        continue;
      } else {
        texKey = ensureGreyTexture(this, itemId, view);
      }
      const img = this.add.image(0, 0, texKey).setOrigin(0.5, 0);
      img.setScale(0.4); // 512×1024 → 208×416 裁剪上半区（look-save §4 取整档 0.4）
      mini.add(img);
    }
    layer.add(mini);

    // 名称（Body 层级常显——§9.5）+ 操作条三按钮（§9.3 显式按钮，≥44×44 触控区）
    layer.add(
      this.add.text(cx, cy + cardW / 2 - 56, shortName(look.name), this.font(24)).setOrigin(0.5, 1).setColor('#2e2a45'),
    );
    const mkBtn = (dx: number, text: string, onTap: () => void): void => {
      const btn = this.add
        .text(cx + dx, cy + cardW / 2 - 18, text, this.font(22))
        .setOrigin(0.5, 1)
        .setBackgroundColor('#dce2f2')
        .setPadding(10, 4, 10, 4)
        .setInteractive({ useHandCursor: true });
      btn.on('pointerup', onTap);
      layer.add(btn);
    };
    mkBtn(-70, '回穿', () => {
      const r = this.applyLook(lookId); // 原子全槽 + 单次焕新（E3-S02）
      if (r.ok) {
        this.closeLookOverlay();
        this.renderGrid(); // wardrobe 穿着角标刷新（look-save §2.5 联动）
      }
    });
    mkBtn(0, '重命名', () => this.openNamingInput(cx, cy - 24, lookId));
    mkBtn(70, '删除', () => {
      // 行内二次确认（look-save §2.6：[确认删除？][取消]，不叠弹窗）
      if (!this.lookPanel.isDeletePending(lookId)) {
        this.lookPanel.requestDelete(lookId);
        this.refreshLookCards();
        return;
      }
      this.lookPanel.confirmDelete();
      this.refreshLookCards();
    });
    void L;
  }

  /** 覆盖层内九宫格刷新（行内确认/删除后重绘；遮罩与 mgr 状态不动） */
  private refreshLookCards(): void {
    if (!this.lookLayer || !this.overlayMgr.isOpen()) return;
    this.lookLayer.removeAll(true);
    this.renderLookCards();
  }

  private closeLookOverlayLayers(): void {
    this.lookLayer?.destroy(true);
    this.lookLayer = null;
  }

  /** 关闭造型面板 */
  private closeLookOverlay(): void {
    this.lookPanel.cancelDelete();
    this.closeNameInput();
    this.closeLookOverlayLayers();
    this.overlayMgr.closeOverlay();
  }

  /** DOM 命名输入（灰盒阶段实现；软键盘避让属 E5 真机项） */
  private openNamingInput(cx: number, cy: number, renameId?: string): void {
    this.closeNameInput();
    const input = document.createElement('input');
    input.type = 'text';
    input.value = renameId ? this.app.save.getLooks().find((l) => l.id === renameId)!.name : this.lookPanel.defaultName();
    input.maxLength = 8 * 2; // 浏览器以 UTF-16 计——中文按 2 位（look-save §2.3 16 字符位口径）
    input.setAttribute('style',
      `position:fixed;left:${cx - 90}px;top:${cy - 60}px;width:180px;padding:10px;border-radius:12px;` +
      `border:3px solid #8268C6;font-size:20px;background:#F3EFF9;color:#3A3358;z-index:10;text-align:center;`);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.commitNaming(renameId);
      if (e.key === 'Escape') this.closeNameInput();
    });
    input.addEventListener('blur', () => {
      // 灰盒简化：失焦即提交（取消路径走 Esc——look-save §2.3 [取消]=关闭无变化）
      this.commitNaming(renameId);
    });
    document.getElementById('game')!.appendChild(input);
    this.nameInput = input;
    setTimeout(() => input.focus(), 0);
  }

  private commitNaming(renameId?: string): void {
    const input = this.nameInput;
    if (!input) return;
    const raw = input.value;
    this.closeNameInput();
    const v = validateLookName(raw);
    if (renameId) {
      if (v.ok) this.lookPanel.rename(renameId, raw);
    } else {
      const r = this.lookPanel.saveCurrent(raw, this.app.model.getOutfitSnapshot()); // 完整 13 槽深拷贝（§2.2）
      if ('error' in r) this.toast('造型已满，删除一个腾出位置');
      else this.toast('已保存');
    }
    this.refreshLookOverlay();
  }

  private closeNameInput(): void {
    if (this.nameInput) {
      const el = this.nameInput;
      this.nameInput = null; // 先置空防 blur 递归
      el.remove();
    }
  }

  /** 覆盖层整体刷新（保存/重命名后——重建含遮罩的整层；openOverlay 已在开态直接放行刷新） */
  private refreshLookOverlay(): void {
    if (!this.overlayMgr.isOpen()) return;
    this.closeLookOverlayLayers();
    this.lookLayer = this.add.container(0, 0).setDepth(50);
    const L = this.layout;
    const mask = this.add.rectangle(L.logicalW / 2, L.logicalH / 2, L.logicalW, L.logicalH, 0x2e2a45, 0.45)
      .setInteractive({ useHandCursor: true });
    mask.on('pointerup', () => this.closeLookOverlay());
    this.lookLayer!.add(mask);
    const closeBtn = this.add
      .text(24, L.safeTop + L.topNavH + 24, '✕', this.font(32))
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    closeBtn.on('pointerup', () => this.closeLookOverlay());
    this.lookLayer!.add(closeBtn);
    this.renderLookCards();
  }
}

const shortName = (name: string): string => (name.length > 8 ? `${name.slice(0, 7)}…` : name);
