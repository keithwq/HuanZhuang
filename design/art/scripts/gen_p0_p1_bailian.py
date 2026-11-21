#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HuanZhuang 百炼出图管线 · BODY + starnight P1 部件
通道：阿里云百炼 Token Plan compatible-mode · qwen-image-3.0-pro（用户指定，禁用 ImageGen）
Key：运行时读 ~/.workbuddy/skills/bailian-decision-model/config.json（不硬编码）
管线：生成(品红纯底) → 下载(24h 签名，立即落盘) → 键控去底 → 锚线对位入 1024×2048 → _back 紧裁剪(frame 表) → 缩略图派生 → 体积审计
对位精度：头顶/底缘/中轴由程序保证（缩放平移构造性对齐，偏差 0px）；内部比例(眼线等)以肤色像素质心做启发式核验并写入审计报告。
用法：python design/art/scripts/gen_p0_p1_bailian.py {pilot|body|p1|all}
"""
import json, os, re, sys, time, urllib.request, urllib.error
from PIL import Image, ImageChops, ImageFilter

ROOT   = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
CFG    = os.path.expanduser("~/.workbuddy/skills/bailian-decision-model/config.json")
RAW    = os.path.join(ROOT, "assets", "_dev", "raw")
CHAR2X = os.path.join(ROOT, "assets", "char", "@2x")
THUMB  = os.path.join(ROOT, "assets", "char-thumbs", "@2x")
FRAMES = os.path.join(ROOT, "design", "art", "manifest-frames.json")
for d in (RAW, CHAR2X, THUMB): os.makedirs(d, exist_ok=True)

ENDPOINT = "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions"
MODEL    = "qwen-image-3.0-pro"

STYLE = ("2D扁平手绘贴纸插画风，梦幻童话魔法学院少女向游戏立绘素材；"
         "高明度粉彩配色，柔和圆润有呼吸感的线条，阴影使用紫灰色而非黑色；"
         "单个部件素材图，角色/部件居中完整呈现；纯色品红色(#FF00FF)纯背景；"
         "不要场景不要画框不要文字不要水印，不要写实照片风不要厚涂油画风不要3D渲染感，"
         "不要白色背景不要灰色背景，只允许品红色纯背景。")

BODY_FRONT = (STYLE + "3.5头身Q版可爱少女全身立绘，站姿A姿：正面微侧约15度，双臂自然下垂微张、离开躯干约10度；"
    "头身比例：头部较大，头高约为全身高度的28.6%，肩宽约为1.4个头高，腿长约占全身42%；"
    "表情浅微笑睁眼，大而亮的眼睛，眼睛高光点在右上；浅棕色双马尾素发；"
    "着装：雾光白(#F3EFF9)肩带式小背心加平角打底的基础内衣式连身打底，无任何装饰；"
    "肤色暖白粉调无写实皮肤纹理。角色头顶到脚底完整呈现，上下留少量品红背景边距。")

BODY_BACK = (STYLE + "3.5头身Q版可爱少女的背面全身立绘（180度转身后视角，后脑勺朝向观者），"
    "体态比例与正面完全一致：头高约为全身28.6%，肩宽约1.4头高，腿长42%；"
    "双臂自然下垂微张；浅棕色双马尾从背后垂下遮挡部分背部；"
    "雾光白(#F3EFF9)基础内衣式连身打底，背面视角，后背有细细的系带；无脸。"
    "角色头顶到脚底完整呈现，上下留少量品红背景边距。")

SERIES = ("「星夜学院新生」系列：主色星夜蓝#7B8FD9与铃兰紫#B49FE8，点缀色星光金#F7DD8F；成套纹样为四角小星与月牙刺绣。")

P1 = {
 "HAIR_B": SERIES + STYLE + "长卷发的脑后部分发型素材（背面视角）：深星夜蓝到铃兰紫的两段式同色系渐变，发梢缀2到3颗星光金小星点，柔和大波浪；3.5头身少女头型比例。部件上方为发旋顶端。",
 "HAIR_F": SERIES + STYLE + "同款长卷发的刘海与前层发丝素材（正面视角）：露出额头与眉眼，两侧有垂脸发丝，发色深星夜蓝到铃兰紫渐变；3.5头身少女头型比例。",
 "BK":    SERIES + STYLE + "及膝披风素材（背面视角）：星夜蓝底、下摆与边缘星光金星纹镶边、领口有一对系带；3.5头身少女身形比例，肩部宽度约1.4个头高。",
 "LEG":   SERIES + STYLE + "一双过膝袜加圆头小短靴素材（正面双脚并拢视角）：云珠白#EFEAF4袜身、袜口一道星夜蓝星环；星夜蓝小短靴、靴面金色月牙扣；3.5头身少女腿部比例，鞋底平齐。",
 "BTM":   SERIES + STYLE + "蓬松A字短裙素材：星夜蓝到铃兰紫两段式纱感渐变（画出来的布料渐变，不是光效），腰头一颗星光金小星扣；3.5头身少女腰臀比例。",
 "TOP":   SERIES + STYLE + "短泡泡袖连衣裙素材：胸口一枚星光金月牙刺绣，裙身星夜蓝到铃兰紫两段式渐变，金色细腰带；3.5头身少女肩腰比例。",
 "OUT":   SERIES + STYLE + "及腰针织开衫素材：云珠白#EFEAF4针织底，袖口与门襟一条星紫#8268C6滚边，敞开不系扣；3.5头身少女肩腰比例。",
 "HAND":  SERIES + STYLE + "单支魔法杖素材：细长杖身星夜蓝，顶端一颗大四角星（星光金#F7DD8F）带小环坠；竖直构图。",
 "NECK":  SERIES + STYLE + "项链素材：细银链配一枚水滴形月白吊坠，吊坠上方缀一颗星光金小星；弧形项链构图。",
 "HEAD":  SERIES + STYLE + "小巧发冠素材：细金环上三颗由小到大的星光金四角星；弧形冠形构图。",
 "FACE":  SERIES + STYLE + "化妆贴纸素材一对：左右两枚柔粉色腮红圆晕，每枚上方一粒微小星光金光点；两枚并排对称，间距较近。",
 "FX":    SERIES + STYLE + "星尘前景光点散布素材：5到7粒柔边的四角小星与圆点（星光金与铃兰紫），稀疏散布，柔和朦胧。",
}
BACK_SLOTS = ["HAIR_B","BK","LEG","BTM","TOP","OUT","HAND","NECK","HEAD"]  # 100% 精度: HAIR_B/BK；FACE/FX 不产背面

# 锚线对位表（逻辑 @1×，入画布乘2）：(top_y, bottom_y, x_center)
FIT = {
 "BODY_front": (80, 980, 256), "BODY_back": (80, 980, 256),
 "HAIR_B": (80, 560, 256), "HAIR_F": (80, 365, 256),
 "BK": (345, 795, 256), "LEG": (800, 980, 256),
 "BTM": (540, 755, 256), "TOP": (355, 780, 256), "OUT": (355, 565, 256),
 "HAND": (470, 570, 362), "NECK": (380, 455, 256), "HEAD": (45, 125, 256),
 "FACE": (225, 285, 256), "FX": (80, 980, 256),
}

# 部件名 → 清单冻结文件名（asset-manifest §2，命名审计红线）
PARTNAME = {"HAIR_B":"hair","HAIR_F":"hair","BK":"cape","LEG":"boots","BTM":"skirt",
            "TOP":"dress","OUT":"cardigan","HAND":"wand","NECK":"pendant",
            "HEAD":"tiara","FACE":"blush","FX":"veil"}

def export_quantized(img, path):
    """RGB 256 色量化 + 原始 alpha 保留（色彩保真 ≈5/像素，alpha 零劣化）"""
    q = img.convert("RGB").quantize(method=Image.FASTOCTREE, colors=256).convert("RGB")
    Image.merge("RGBA", (*q.split(), img.getchannel("A"))).save(path, optimize=True)
    return os.path.getsize(path)/1024

def load_key():
    with open(CFG, encoding="utf-8") as f:
        k = json.load(f)["api_key"]
    assert k.startswith("sk-sp-"), "config.json api_key 前缀异常"
    return k

def generate(prompt, retries=2):
    key = load_key()
    body = {"model": MODEL, "messages": [{"role": "user", "content": [{"type": "text", "text": prompt}]}]}
    req = urllib.request.Request(ENDPOINT, data=json.dumps(body).encode("utf-8"),
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    for i in range(retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                out = json.loads(r.read().decode("utf-8"))
            urls = re.findall(r'https?://[^\s"\'\\]+', json.dumps(out.get("output", out)))
            urls = [u for u in urls if ("oss" in u or ".png" in u or "http" in u)][:1]
            if not urls: raise ValueError(f"响应无图 URL：{json.dumps(out)[:300]}")
            return urls[0]
        except Exception as e:
            if i == retries: raise
            print(f"  ! 重试 {i+1}: {e}"); time.sleep(5)

def download(url, path):
    with urllib.request.urlopen(url, timeout=120) as r, open(path, "wb") as f:
        f.write(r.read())

def key_bg(img):
    """角落取中位色自适应键控：品红系→距离键控；白底→距离键控并打风险标"""
    px = [img.convert("RGB").getpixel(c) for c in [(4,4),(img.width-5,4),(4,img.height-5),(img.width-5,img.height-5)]]
    bg = tuple(sorted(p[i] for p in px)[len(px)//2] for i in range(3))
    diff = ImageChops.difference(img.convert("RGB"), Image.new("RGB", img.size, bg))
    proxy = ImageChops.lighter(ImageChops.lighter(diff.getchannel(0), diff.getchannel(1)), diff.getchannel(2))
    lut = [0 if v <= 45 else (255 if v >= 95 else int((v-45)/50*255)) for v in range(256)]
    alpha = proxy.point(lut)
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.2)).point(lambda v: min(255, int(v*1.15)))
    out = img.convert("RGBA"); out.putalpha(alpha)
    is_white = all(v > 235 for v in bg)
    return out, is_white

def fit_canvas(img, name, ss_report):
    fit_key = name[:-5] if name.endswith("_back") and name not in FIT else name
    top, bottom, cx = FIT[fit_key]
    a = img.getchannel("A"); bbox = a.getbbox()
    if not bbox: raise ValueError(f"{name}: 键控后无内容")
    crop = img.crop(bbox)
    th = (bottom - top) * 2
    w = int(crop.width * th / crop.height) or 1
    crop = crop.resize((w, th), Image.LANCZOS)
    canvas = Image.new("RGBA", (1024, 2048), (0, 0, 0, 0))
    x0 = cx*2 - w//2
    canvas.paste(crop, (x0, top*2), crop)
    # 启发式核验：肤色像素质心 vs 眼线（BODY 件）
    note = ""
    if name.startswith("BODY"):
        skin_ys = [y for y in range(0, 2048, 4) for x in range(400, 624, 8)
                   if (lambda p: p[3] > 200 and p[0] > 220 and 180 < p[1] < 245 and p[2] > 190 and p[0]-p[2] > 8)(canvas.getpixel((x, y)))]
        if skin_ys:
            face = sum(skin_ys)/len(skin_ys); note = f" 肤色质心 y={face:.0f}（眼线参考 450±60）"
    ss_report.append((name, canvas, note))
    return canvas

def tight_crop_back(img, slot, frames):
    a = img.getchannel("A"); bbox = a.getbbox()
    frames[slot] = {"x": bbox[0], "y": bbox[1], "w": bbox[2]-bbox[0], "h": bbox[3]-bbox[1]}
    return img.crop(bbox)

def thumb(img, slot):
    a = img.getchannel("A"); bbox = a.getbbox()
    c = img.crop(bbox)
    s = min(208/c.width, 208/c.height)
    c = c.resize((max(1,int(c.width*s)), max(1,int(c.height*s))), Image.LANCZOS)
    box = Image.new("RGBA", (208, 208), (0, 0, 0, 0))
    box.paste(c, ((208-c.width)//2, (208-c.height)//2), c)
    return box

def run_piece(name, prompt, fname, report, do_back=False):
    path = os.path.join(CHAR2X, fname)
    if os.path.exists(path):  # 断点续跑
        print(f"→ 跳过(已产) {name}")
        return Image.open(path).convert("RGBA"), False
    print(f"→ 生成 {name} …"); t0 = time.time()
    url = generate(prompt)
    raw = os.path.join(RAW, fname.replace(".png", "_raw.png"))
    download(url, raw)
    img = Image.open(raw).convert("RGBA")
    keyed, white = key_bg(img)
    final = fit_canvas(keyed, name, report)
    kb = export_quantized(final, path)
    flag = "⚠白底键控" if white else "品红键控"
    print(f"  ✓ {fname} {kb:.0f}KB {flag} {time.time()-t0:.0f}s")
    return final, white

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "pilot"
    report, frames = [], {}
    if os.path.exists(FRAMES):
        frames = json.load(open(FRAMES, encoding="utf-8"))

    if mode in ("pilot", "body", "all", "body_back"):
        if mode != "body_back":
            f, _ = run_piece("BODY_front", BODY_FRONT, "HZ_char01_BODY_base_a_v001.png", report)
        if mode in ("body", "all", "body_back"):
            f2, _ = run_piece("BODY_back", BODY_BACK, "HZ_char01_BODY_base_a_back_v001.png", report)

    if mode in ("p1", "all"):
        backs = []
        for slot, pr in P1.items():
            pn = PARTNAME[slot]
            f_front = f"HZ_char01_{slot}_starnight_{pn}_a_v001.png"
            front, white = run_piece(slot, pr, f_front, report)
            if slot in BACK_SLOTS:
                bp = pr if slot in ("HAIR_B", "BK") else pr + " 背面视角版本，简化细节省略正面纹样。"
                bp += " 视角为180度转身后的背面。"
                f_back = f"HZ_char01_{slot}_starnight_{pn}_a_back_v001.png"
                back, _ = run_piece(slot + "_back", bp, f_back, report)
                if slot not in ("HAIR_B", "BK"):
                    back = tight_crop_back(back, slot, frames)
                export_quantized(back, os.path.join(CHAR2X, f_back))
                backs.append(slot)
            thumb(front, slot).save(os.path.join(THUMB, f"HZ_thumb_{slot}_starnight_{pn}_a_v001.png"))

    if frames:
        json.dump(frames, open(FRAMES, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("\n== 审计 ==")
    for name, img, note in report:
        a = img.getchannel("A"); nz = sum(1 for v in list(a.getdata()) if v > 0)
        print(f"{name:14s} 画布{img.size} 不透明{nz/(1024*2048):.0%}{note}")

if __name__ == "__main__":
    main()
