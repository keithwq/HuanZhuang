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

  constructor() {
    super('UI');
  }

  init(): void {
    this.app = this.game.registry.get('app') as AppContext;
  }

  create(): void {
    this.ctrl = new TryonController(this.app.model, this.app.save);
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
}

const shortName = (name: string): string => (name.length > 8 ? `${name.slice(0, 7)}…` : name);
