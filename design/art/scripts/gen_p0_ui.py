#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HuanZhuang P0 骨架资产 · 程序化生成器 v1.0
依据：美术圣经 v0.8 冻结规格 + asset-manifest.md v1.2（P0 #03~#29，27 件）
风格口径：§2.1 色板 / §6.3 图标（4px 描边手绘线性 + 星紫选中态 + 贴纸感）
产出：UI @2x 20 件 + 剪影 @1x 3 件 + 网格校验图 1 件（dev）
运行：python design/art/scripts/gen_p0_ui.py
"""
from PIL import Image, ImageDraw, ImageFilter
import math, os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
UI2X   = os.path.join(ROOT, "assets", "ui", "@2x")
CHAR1X = os.path.join(ROOT, "assets", "char", "@1x")
DEV    = os.path.join(ROOT, "assets", "_dev")
for d in (UI2X, CHAR1X, DEV): os.makedirs(d, exist_ok=True)

# ---- 色板（圣经 §2.1/§2.2 冻结值） ----
MIST   = (243, 239, 249)   # 雾光底 #F3EFF9
ASTER  = (130, 104, 198)  # 星紫 #8268C6
NIGHT  = (58, 51, 88)      # 夜墨 #3A3358
CLOUD  = (220, 226, 242)   # 云蓝 #DCE2F2
ROSE   = (242, 166, 192)   # 珊瑚粉 #F2A6C0
INK    = (46, 42, 69)      # 墨夜 #2E2A45
OK     = (127, 184, 138)  # 成功 #7FB88A
WARN   = (232, 176, 75)
DISABLE= (201, 192, 180)  # 禁用 #C9C0B4
BUTTER = (247, 221, 143)   # 奶油黄（稀有角标）
PURPLEGRAY = (142, 134, 168)  # 紫灰 #8E86A8（阴影基调）

SS = 4  # 超采样倍数

def canvas(w, h):
    return Image.new("RGBA", (w*SS, h*SS), (0,0,0,0))

def save(img, w, h, path):
    img = img.resize((w, h), Image.LANCZOS)
    img.save(path)
    print("✓", os.path.relpath(path, ROOT))

def stroke(dr, pts, color, w, closed=False):
    """圆头圆角折线（手绘线性图标的笔画基元）"""
    if closed: pts = list(pts) + [pts[0]]
    dr.line(pts, fill=color, width=w*SS, joint="curve")
    r = w*SS/2
    for (x, y) in ([pts[0], pts[-1]] if not closed else [pts[0]]):
        dr.ellipse((x-r, y-r, x+r, y+r), fill=color)

def rrect(dr, box, r, fill=None, outline=None, w=0):
    dr.rounded_rectangle([v*SS for v in box], radius=r*SS, fill=fill, outline=outline, width=w*SS if outline else 0)

def soft_shadow(img, box, r, dy=3, alpha=50, blur=6):
    lay = Image.new("RGBA", img.size, (0,0,0,0))
    d = ImageDraw.Draw(lay)
    d.rounded_rectangle([box[0]*SS, (box[1]+dy)*SS, box[2]*SS, (box[3]+dy)*SS], radius=r*SS, fill=PURPLEGRAY+(alpha,))
    lay = lay.filter(ImageFilter.GaussianBlur(blur*SS))
    return Image.alpha_composite(lay, img)

def star_pts(cx, cy, ro, ri, n=5, rot=-90):
    p = []
    for i in range(n*2):
        r = ro if i % 2 == 0 else ri
        a = math.radians(rot + i*180.0/n)
        p.append((cx + r*math.cos(a), cy + r*math.sin(a)))
    return p

# ================= 8 组页签图标（96×96 @2x，4px 逻辑描边 = 8px 文件） =================
def icon(name, draw_fn, path):
    img = canvas(96, 96); dr = ImageDraw.Draw(img)
    draw_fn(dr); save(img, 96, 96, path)

def icon_hair(dr):  # G1 卷发剪影：三缕波浪发丝 + 顶部弧
    for i, x in enumerate((36, 48, 60)):
        pts = [(x + 5*math.sin(math.pi*(y-20)/28), y) for y in range(20, 76, 2)]
        stroke(dr, pts, INK, 8)
    stroke(dr, [(30,30),(34,24),(44,20),(56,22),(64,30)], INK, 8)

def icon_headwear(dr):  # G2 贝雷帽
    dr.ellipse([24*SS,30*SS,72*SS,58*SS], outline=INK, width=8*SS)
    stroke(dr, [(48,16),(48,24)], INK, 8)
    stroke(dr, [(26,52),(34,58),(64,58),(72,50)], INK, 8)

def icon_top(dr):  # G3 小衬衫
    pts = [(30,34),(36,26),(60,26),(66,34),(72,50),(62,50),(58,34),(58,80),(38,80),(38,34),(34,50),(24,50)]
    stroke(dr, pts, INK, 8, closed=True)
    stroke(dr, [(44,26),(48,38),(52,26)], INK, 8)

def icon_btm(dr):  # G4 裙摆
    stroke(dr, [(34,28),(62,28)], INK, 8)
    stroke(dr, [(34,28),(24,78)], INK, 8)
    stroke(dr, [(62,28),(72,78)], INK, 8)
    stroke(dr, [(24,78),(72,78)], INK, 8)
    stroke(dr, [(44,40),(41,68)], INK, 6); stroke(dr, [(52,40),(55,68)], INK, 6)

def icon_out(dr):  # G5 小斗篷
    stroke(dr, [(34,26),(40,32),(56,32),(62,26)], INK, 8)
    pts = [(34,30),(28,44),(24,62),(30,70),(40,66),(48,72),(56,66),(66,70),(72,62),(68,44),(62,30)]
    stroke(dr, pts, INK, 8)
    stroke(dr, [(40,32),(40,42)], INK, 6); stroke(dr, [(56,32),(56,42)], INK, 6)

def icon_leg(dr):  # G6 小皮鞋（侧视短靴）
    pts = [(20,58),(24,44),(38,40),(56,42),(66,44),(68,60),(68,72),(22,72),(20,64)]
    stroke(dr, pts, INK, 8, closed=True)
    stroke(dr, [(40,50),(52,56)], INK, 6); stroke(dr, [(52,50),(40,56)], INK, 6)
    stroke(dr, [(24,72),(68,72)], INK, 8)

def icon_acc(dr):  # G7 项链：U 链 + 吊坠
    dr.arc([30*SS,22*SS,66*SS,58*SS], 0, 180, fill=INK, width=8*SS)
    stroke(dr, [(30,40),(30,24)], INK, 8); stroke(dr, [(66,40),(66,24)], INK, 8)
    dr.ellipse([42*SS,56*SS,54*SS,68*SS], outline=INK, width=8*SS)
    dr.ellipse([46*SS,60*SS,50*SS,64*SS], fill=INK)

def icon_fx(dr):  # G8 星翼：星 + 双翼弧
    stroke(dr, star_pts(48,44,17,7.5), INK, 8, closed=True)
    dr.arc([12*SS,28*SS,44*SS,64*SS], 300, 90, fill=INK, width=8*SS)
    dr.arc([52*SS,28*SS,84*SS,64*SS], 90, 240, fill=INK, width=8*SS)

for gid, fn in [("g1_hair",icon_hair),("g2_headwear",icon_headwear),("g3_top",icon_top),
                ("g4_btm",icon_btm),("g5_out",icon_out),("g6_leg",icon_leg),
                ("g7_acc",icon_acc),("g8_fx",icon_fx)]:
    icon(gid, fn, os.path.join(UI2X, f"HZ_UI_icon_tab_{gid}_a_v001.png"))

# ================= 底部标签栏（1440×192 @2x）与 4 入口图标 =================
img = canvas(1440, 192)
d = ImageDraw.Draw(img)
for y in range(192*SS):  # 雾光→云蓝 极浅纵向过渡（贴纸底）
    t = y/(191*SS)
    c = tuple(int(MIST[i]+(CLOUD[i]-MIST[i])*t) for i in range(3))
    d.line([(0,y),(1440*SS,y)], fill=c+(255,))
mask = Image.new("L", img.size, 0)
dm = ImageDraw.Draw(mask)
dm.rounded_rectangle([0,0,1440*SS-1,192*SS-1], radius=40*SS, fill=255, corners=(True,True,False,False))
img.putalpha(mask)
d = ImageDraw.Draw(img)
d.line([(0,5*SS),(1440*SS,5*SS)], fill=INK+(255,), width=6*SS)
save(img, 1440, 192, os.path.join(UI2X, "HZ_UI_tabbar_bg_a_v001.png"))

def tab_dress(dr):
    stroke(dr, [(40,22),(44,30),(52,30),(56,22)], INK, 8)
    stroke(dr, [(44,30),(42,44),(30,76),(66,76),(54,44),(52,30)], INK, 8)

def tab_room(dr):
    stroke(dr, [(26,46),(48,22),(70,46)], INK, 8)
    rrect(dr, (32,46,64,78), 4, outline=INK, w=8)
    rrect(dr, (43,58,53,78), 2, outline=INK, w=6)

def tab_shop(dr):
    stroke(dr, [(28,36),(68,36)], INK, 8)
    for cx in (38,48,58):
        dr.arc([(cx-5)*SS,30*SS,(cx+5)*SS,42*SS], 0, 180, fill=INK, width=8*SS)
    rrect(dr, (32,42,64,78), 4, outline=INK, w=8)
    rrect(dr, (44,58,56,78), 2, outline=INK, w=6)

def tab_task(dr):
    rrect(dr, (30,22,66,78), 6, outline=INK, w=8)
    rrect(dr, (42,16,54,26), 4, outline=INK, w=6)
    stroke(dr, [(40,54),(46,62),(58,42)], INK, 8)

for nm, fn in [("dress",tab_dress),("room",tab_room),("shop",tab_shop),("task",tab_task)]:
    icon(nm, fn, os.path.join(UI2X, f"HZ_UI_tab_icon_{nm}_a_v001.png"))

# ================= 「转身」按钮 3 态（176×176 @2x，88 逻辑高） =================
def turn_btn(state, path):
    img = canvas(176, 176)
    if state != "press":
        img = soft_shadow(img, (16,14,160,158), 72, dy=4, alpha=45, blur=7)
    d = ImageDraw.Draw(img)
    fill = {"norm": CLOUD, "press": ASTER, "disabled": DISABLE}[state]
    d.ellipse([16*SS,14*SS,160*SS,158*SS], fill=fill+(255,), outline=INK+(255,), width=8*SS)
    off = 3 if state == "press" else 0
    ac = (255,255,255) if state == "press" else (INK if state != "disabled" else PURPLEGRAY)
    d.arc([(54+off)*SS,(54+off)*SS,(122+off)*SS,(122+off)*SS], -30, 190, fill=ac+(255,), width=9*SS)
    for ang, sgn in ((190,1),(-30,-1)):
        a = math.radians(ang)
        x, y = 88+off+34*math.cos(a), 88+off+34*math.sin(a)
        tx, ty = 88+off+24*math.cos(a), 88+off+24*math.sin(a)
        px, py = -(y-(88+off)), (x-(88+off))
        L = math.hypot(px, py); px, py = px/L*9, py/L*9
        d.polygon([(x,y),(tx+px,ty+py),(tx-px,ty-py)], fill=ac+(255,))
    save(img, 176, 176, path)

turn_btn("norm",     os.path.join(UI2X, "HZ_UI_btn_turn_a_norm_v001.png"))
turn_btn("press",    os.path.join(UI2X, "HZ_UI_btn_turn_a_press_v001.png"))
turn_btn("disabled", os.path.join(UI2X, "HZ_UI_btn_turn_a_disabled_v001.png"))

# ================= 衣橱卡片 + 描边 2 态 + 双通道角标 3 =================
img = canvas(208, 208)
img = soft_shadow(img, (6,4,202,200), 26, dy=4, alpha=40, blur=6)
d = ImageDraw.Draw(img)
rrect(d, (6,4,202,200), 26, fill=MIST+(255,), outline=INK+(255,), w=8)
save(img, 208, 208, os.path.join(UI2X, "HZ_UI_card_wardrobe_base_a_v001.png"))

img = canvas(208, 208); d = ImageDraw.Draw(img)
rrect(d, (8,8,200,200), 26, outline=INK+(255,), w=8)
save(img, 208, 208, os.path.join(UI2X, "HZ_UI_card_wardrobe_outline_default_a_v001.png"))

img = canvas(208, 208); d = ImageDraw.Draw(img)
d.rounded_rectangle([4*SS,4*SS,204*SS,204*SS], radius=28*SS, outline=ASTER+(70,), width=14*SS)
rrect(d, (8,8,200,200), 26, outline=ASTER+(255,), w=10)
save(img, 208, 208, os.path.join(UI2X, "HZ_UI_card_wardrobe_outline_selected_a_v001.png"))

def badge(fill, glyph, path):
    img = canvas(64, 64); d = ImageDraw.Draw(img)
    d.ellipse([4*SS,4*SS,60*SS,60*SS], fill=fill+(255,), outline=INK+(255,), width=5*SS)
    glyph(d)
    save(img, 64, 64, path)

badge(OK, lambda d: stroke(d, [(20,34),(28,43),(45,21)], (255,255,255), 7),
      os.path.join(UI2X, "HZ_UI_badge_owned_a_v001.png"))
def _lock(d):
    d.rounded_rectangle([22*SS,30*SS,42*SS,46*SS], radius=3*SS, fill=INK+(255,))
    d.arc([24*SS,16*SS,40*SS,34*SS], 180, 360, fill=INK+(255,), width=5*SS)
badge(DISABLE, _lock, os.path.join(UI2X, "HZ_UI_badge_locked_a_v001.png"))
def _rare(d):
    d.polygon([tuple(v*SS for v in p) for p in star_pts(32,33,13,5.6)], fill=(255,255,255,255))
badge(BUTTER, _rare, os.path.join(UI2X, "HZ_UI_badge_rare_a_v001.png"))

# ================= 星尘货币 icon（贴纸质感：填充 + 柔影） =================
img = canvas(96, 96)
img = soft_shadow(img, (12,12,84,84), 20, dy=3, alpha=55, blur=4)
d = ImageDraw.Draw(img)
d.polygon([tuple(v*SS for v in p) for p in star_pts(48,48,34,14)], fill=ASTER+(255,), outline=INK+(255,), width=9*SS)
d.ellipse([40*SS,38*SS,46*SS,44*SS], fill=(255,255,255,210))
d.polygon([tuple(v*SS for v in p) for p in star_pts(24,72,7,3)], fill=BUTTER+(255,))
d.polygon([tuple(v*SS for v in p) for p in star_pts(76,26,6,2.6)], fill=BUTTER+(255,))
save(img, 96, 96, os.path.join(UI2X, "HZ_UI_icon_currency_star_a_v001.png"))

# ================= 旋转过渡剪影 3 帧（512×1024 @1x，3.5 头身比例） =================
def doll_pts(sx):
    """3.5 头身纸偶剪影（比例按圣经 §4.1：头 257、肩宽 1.4 头高、腿 42%）"""
    c = 256
    P = lambda x, y: (c + (x-c)*sx, y)
    head = []
    for a in range(0, 360, 6):
        head.append(P(c + 110*math.cos(math.radians(a)), 208 + 128*math.sin(math.radians(a))))
    pts = head + [P(226,325), P(180,340), P(160,470), P(178,548),        # 左臂
                  P(226,560), P(286,560),                                  # 腰
                  P(334,548), P(352,470), P(332,340), P(286,325)]          # 右臂
    return pts

def silhouette(sx, path):
    img = canvas(512, 1024); d = ImageDraw.Draw(img)
    d.polygon([(x*SS, y*SS) for x, y in doll_pts(sx)], fill=NIGHT+(215,))
    # 裙摆+双腿（躯干下）
    c = 256
    d.polygon([((c+(x-c)*sx)*SS, y*SS) for x, y in
               [(226,545),(286,545),(296,700),(270,950),(256,950),(256,700),(256,950),(242,950),(216,700)]],
              fill=NIGHT+(215,))
    save(img, 512, 1024, path)

silhouette(0.55, os.path.join(CHAR1X, "HZ_char01_FX_flip_silhouette_f1_v001.png"))
silhouette(0.08, os.path.join(CHAR1X, "HZ_char01_FX_flip_silhouette_f2_v001.png"))
silhouette(0.72, os.path.join(CHAR1X, "HZ_char01_FX_flip_silhouette_f3_v001.png"))

# ================= 基准网格校验图（512×1024，v0.3 校准锚线，dev 件） =================
img = canvas(512, 1024); d = ImageDraw.Draw(img)
ANCHORS = [("CROWN 80",80),("EYE 225",225),("JAW 335",335),("SHLD 365",365),("CHEST 450",450),
           ("WAIST 545",545),("HIP 615",615),("KNEE 795",795),("ANKLE 950",950),("GROUND 980",980)]
for lbl, y in ANCHORS:
    d.line([(0,y*SS),(512*SS,y*SS)], fill=ROSE+(230,), width=2*SS)
    d.text((6*SS,(y-14)*SS), lbl, fill=ROSE+(255,))
for yseg in range(0, 1024, 16):  # 中轴虚线
    d.line([(256*SS,yseg*SS),(256*SS,min(yseg+8,1024)*SS)], fill=ASTER+(220,), width=2*SS)
d.text((270*SS,10*SS), "AXIS x=256", fill=ASTER+(255,))
d.rectangle([0,0,511*SS,1023*SS], outline=INK+(255,), width=2*SS)
save(img, 512, 1024, os.path.join(DEV, "HZ_char01_grid_check_v001.png"))

print("\nP0 程序化件完成：27 件（UI @2x ×20 + 剪影 @1x ×3 + 校验图 ×1）")
