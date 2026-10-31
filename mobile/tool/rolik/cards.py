#!/usr/bin/env python3
"""Draws the still parts of the BugunBor videos (mobile/tool/rolik): the intro,
section and outro cards, one frame per step (the phone is laid over it by
build.mjs), and the phone masks. Two layouts: yt (1920×1080) and ig (1080×1920).

  cards.py <out dir>     needs Pillow; the font is docs/store/rolik/fonts/Inter.ttf
"""
import json
import os
import sys

from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
FONT = os.path.join(ROOT, 'docs', 'store', 'rolik', 'fonts', 'Inter.ttf')
PLAN = json.load(open(os.path.join(HERE, 'plan.json'), encoding='utf-8'))

NAVY_TOP, NAVY_BOTTOM = (15, 29, 44), (22, 48, 74)
ORANGE, ORANGE_DEEP = (245, 89, 55), (210, 54, 15)
WHITE, MUTED = (255, 255, 255), (184, 196, 208)

# Where the phone (body 672×1417 in the guide videos) sits in each layout.
LAYOUTS = {
    'yt': {'size': (1920, 1080), 'phone': (140, 80, 436, 920), 'radius': 37},
    'ig': {'size': (1080, 1920), 'phone': (204, 180, 672, 1417), 'radius': 57},
}

_fonts = {}


def font(size, weight='Bold'):
    key = (size, weight)
    if key not in _fonts:
        f = ImageFont.truetype(FONT, size)
        f.set_variation_by_name(weight)
        _fonts[key] = f
    return _fonts[key]


def background(size, glow_at):
    """A deep navy gradient with a soft orange glow near [glow_at]."""
    w, h = size
    base = Image.new('RGB', (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        base.putpixel((0, y), tuple(round(a + (b - a) * t) for a, b in zip(NAVY_TOP, NAVY_BOTTOM)))
    img = base.resize((w, h))
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    r = int(min(w, h) * 0.55)
    d.ellipse((glow_at[0] - r, glow_at[1] - r, glow_at[0] + r, glow_at[1] + r), fill=(90, 34, 20))
    glow = glow.filter(ImageFilter.GaussianBlur(int(min(w, h) * 0.18)))
    return Image.blend(img, Image.composite(glow, img, glow.convert('L').point(lambda v: min(255, v * 2))), 0.9).convert('RGBA')


def wrap(text, f, width):
    words, lines, line = text.split(), [], ''
    for word in words:
        probe = f'{line} {word}'.strip()
        if f.getlength(probe) <= width or not line:
            line = probe
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def logo(draw, img, x, y, size, light=True):
    """The orange square with a B and the word BugunBor; returns the width used."""
    r = int(size * 0.3)
    draw.rounded_rectangle((x, y, x + size, y + size), radius=r, fill=ORANGE)
    f = font(int(size * 0.66), 'Black')
    bw = f.getlength('B')
    draw.text((x + (size - bw) / 2, y + size * 0.1), 'B', font=f, fill=WHITE)
    wf = font(int(size * 0.64), 'Bold')
    tx = x + size + int(size * 0.28)
    draw.text((tx, y + size * 0.1), 'Bugun', font=wf, fill=WHITE if light else NAVY_TOP)
    tx2 = tx + wf.getlength('Bugun')
    draw.text((tx2, y + size * 0.1), 'Bor', font=wf, fill=ORANGE)
    return int(tx2 + wf.getlength('Bor') - x)


def badge(draw, x, y, label, name, h=92):
    f_small, f_big = font(22, 'Medium'), font(40, 'Bold')
    w = int(max(f_small.getlength(label), f_big.getlength(name)) + 70)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=20, fill=(0, 0, 0), outline=(120, 120, 120), width=2)
    draw.text((x + 34, y + 12), label, font=f_small, fill=(220, 220, 220))
    draw.text((x + 34, y + 36), name, font=f_big, fill=WHITE)
    return w


def phone_shadow(img, layout):
    x, y, w, h = LAYOUTS[layout]['phone']
    r = LAYOUTS[layout]['radius']
    shadow = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((x - 6, y + 24, x + w + 6, y + h + 40), radius=r + 8, fill=(0, 0, 0, 150))
    shadow = shadow.filter(ImageFilter.GaussianBlur(40))
    img.alpha_composite(shadow)
    # The body itself, so a hairline never shows around the masked phone.
    ImageDraw.Draw(img).rounded_rectangle((x - 2, y - 2, x + w + 2, y + h + 2), radius=r + 2, fill=(14, 20, 28, 255))


def intro(layout):
    w, h = LAYOUTS[layout]['size']
    img = background((w, h), (int(w * 0.85), int(h * 0.15)))
    d = ImageDraw.Draw(img)
    yt = layout == 'yt'
    size = 150 if yt else 130
    lw = int(size * 0.3 + size * 0.64 * 4.6)
    lx = (w - lw) // 2
    ly = int(h * (0.2 if yt else 0.26))
    logo(d, img, lx, ly, size)
    tf = font(64 if yt else 56, 'SemiBold')
    sub = wrap(PLAN['intro']['subtitle'], tf, w - 240)
    y = ly + size + (60 if yt else 70)
    for line in sub:
        d.text(((w - tf.getlength(line)) / 2, y), line, font=tf, fill=WHITE)
        y += int(tf.size * 1.25)
    y += 50 if yt else 70
    bw1 = int(max(font(22, 'Medium').getlength('Yuklab oling'), font(40, 'Bold').getlength('App Store')) + 70)
    bw2 = int(max(font(22, 'Medium').getlength('Yuklab oling'), font(40, 'Bold').getlength('Google Play')) + 70)
    if yt:
        x0 = (w - bw1 - bw2 - 30) // 2
        badge(d, x0, y, 'Yuklab oling', 'App Store')
        badge(d, x0 + bw1 + 30, y, 'Yuklab oling', 'Google Play')
    else:
        badge(d, (w - bw1) // 2, y, 'Yuklab oling', 'App Store')
        badge(d, (w - bw2) // 2, y + 112, 'Yuklab oling', 'Google Play')
    ff = font(30, 'Medium')
    foot = 'Bepul kod · to‘lov joyida · bugunbor.uz'
    d.text(((w - ff.getlength(foot)) / 2, h - (90 if yt else 150)), foot, font=ff, fill=MUTED)
    return img


def outro(layout):
    w, h = LAYOUTS[layout]['size']
    img = background((w, h), (int(w * 0.15), int(h * 0.85)))
    d = ImageDraw.Draw(img)
    yt = layout == 'yt'
    size = 110 if yt else 120
    lw = int(size * 0.3 + size * 0.64 * 4.6)
    ly = int(h * (0.14 if yt else 0.22))
    logo(d, img, (w - lw) // 2, ly, size)
    tf = font(92 if yt else 84, 'Bold')
    lines = ['Bugun bor —', 'ertaga bo‘lmasligi', 'mumkin']
    y = ly + size + (50 if yt else 80)
    for i, line in enumerate(lines):
        d.text(((w - tf.getlength(line)) / 2, y), line, font=tf, fill=ORANGE if i == 1 else WHITE)
        y += int(tf.size * 1.12)
    y += 40 if yt else 60
    bw1 = int(max(font(22, 'Medium').getlength('Yuklab oling'), font(40, 'Bold').getlength('App Store')) + 70)
    bw2 = int(max(font(22, 'Medium').getlength('Yuklab oling'), font(40, 'Bold').getlength('Google Play')) + 70)
    if yt:
        x0 = (w - bw1 - bw2 - 30) // 2
        badge(d, x0, y, 'Yuklab oling', 'App Store')
        badge(d, x0 + bw1 + 30, y, 'Yuklab oling', 'Google Play')
        y += 92
    else:
        badge(d, (w - bw1) // 2, y, 'Yuklab oling', 'App Store')
        badge(d, (w - bw2) // 2, y + 112, 'Yuklab oling', 'Google Play')
        y += 204
    uf = font(40, 'Bold')
    d.text(((w - uf.getlength('bugunbor.uz')) / 2, y + 40), 'bugunbor.uz', font=uf, fill=ORANGE)
    ff = font(30, 'Medium')
    foot = 'Biznes uchun ham bepul · Telegram: @bugunborbot'
    d.text(((w - ff.getlength(foot)) / 2, h - (90 if yt else 150)), foot, font=ff, fill=MUTED)
    return img


def section_card(layout, section):
    w, h = LAYOUTS[layout]['size']
    img = background((w, h), (int(w * 0.85), int(h * 0.2)))
    d = ImageDraw.Draw(img)
    yt = layout == 'yt'
    kf, tf = font(40 if yt else 44, 'SemiBold'), font(110 if yt else 96, 'Bold')
    y = int(h * (0.33 if yt else 0.36))
    d.text(((w - kf.getlength(section['who'])) / 2, y), section['who'], font=kf, fill=ORANGE)
    lines = wrap(section['title'], tf, w - 200)
    y += 70
    for line in lines:
        d.text(((w - tf.getlength(line)) / 2, y), line, font=tf, fill=WHITE)
        y += int(tf.size * 1.12)
    size = 64
    lw = int(size * 0.3 + size * 0.64 * 4.6)
    logo(d, img, (w - lw) // 2, h - (130 if yt else 200), size)
    return img


def cue_frame(layout, section, cue):
    w, h = LAYOUTS[layout]['size']
    yt = layout == 'yt'
    img = background((w, h), (int(w * 0.9), int(h * 0.1)) if yt else (int(w * 0.9), int(h * 0.06)))
    phone_shadow(img, layout)
    d = ImageDraw.Draw(img)
    step = cue.get('step')
    if yt:
        cx = 700
        logo(d, img, cx, 80, 64)
        pf = font(28, 'SemiBold')
        pw = pf.getlength(section['who']) + 44
        d.rounded_rectangle((w - 120 - pw, 92, w - 120, 136), radius=22, fill=ORANGE)
        d.text((w - 120 - pw + 22, 99), section['who'], font=pf, fill=WHITE)
        tf = font(50, 'Bold')
        d.text((cx, 190), section['title'], font=tf, fill=MUTED)
        d.line((cx, 270, cx + 120, 270), fill=ORANGE, width=6)
        cf = font(56, 'SemiBold')
        tx = cx
        y = 330
        if step:
            d.ellipse((cx, y - 4, cx + 88, y + 84), fill=ORANGE)
            nf = font(44, 'Black')
            d.text((cx + (88 - nf.getlength(str(step))) / 2, y + 12), str(step), font=nf, fill=WHITE)
            tx = cx + 120
        for line in wrap(cue['text'], cf, w - tx - 120):
            d.text((tx, y), line, font=cf, fill=WHITE)
            y += int(cf.size * 1.3)
        ff = font(28, 'Medium')
        d.text((cx, h - 100), 'bugunbor.uz · App Store · Google Play', font=ff, fill=MUTED)
    else:
        logo(d, img, 50, 38, 56)
        pf = font(26, 'SemiBold')
        pw = pf.getlength(section['who']) + 44
        d.rounded_rectangle((w - 50 - pw, 44, w - 50, 88), radius=22, fill=ORANGE)
        d.text((w - 50 - pw + 22, 51), section['who'], font=pf, fill=WHITE)
        d.text((50, 112), section['title'], font=font(44, 'Bold'), fill=MUTED)
        cf = font(40, 'SemiBold')
        y = 1640
        tx = 50
        if step:
            d.ellipse((50, y - 2, 126, y + 74), fill=ORANGE)
            nf = font(38, 'Black')
            d.text((50 + (76 - nf.getlength(str(step))) / 2, y + 9), str(step), font=nf, fill=WHITE)
            tx = 150
        for line in wrap(cue['text'], cf, w - tx - 50)[:4]:
            d.text((tx, y), line, font=cf, fill=WHITE)
            y += int(cf.size * 1.3)
    return img


def mask(layout):
    x, y, w, h = LAYOUTS[layout]['phone']
    img = Image.new('L', (w, h), 0)
    ImageDraw.Draw(img).rounded_rectangle((0, 0, w - 1, h - 1), radius=LAYOUTS[layout]['radius'], fill=255)
    return img


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'work', 'frames')
    for layout in LAYOUTS:
        folder = os.path.join(out, layout)
        os.makedirs(folder, exist_ok=True)
        intro(layout).convert('RGB').save(os.path.join(folder, 'intro.png'))
        outro(layout).convert('RGB').save(os.path.join(folder, 'outro.png'))
        mask(layout).save(os.path.join(folder, 'mask.png'))
        sections = PLAN['full'] if layout == 'yt' else PLAN['short']
        count = 0
        for key in sections:
            section = PLAN['sections'][key]
            section_card(layout, section).convert('RGB').save(os.path.join(folder, f'section-{key}.png'))
            for index, cue in enumerate(PLAN['cues'][key]):
                if layout == 'ig' and not cue.get('short'):
                    continue
                cue_frame(layout, section, cue).convert('RGB').save(os.path.join(folder, f'cue-{key}-{index}.png'))
                count += 1
        print(f'{layout}: {count} step frames in {folder}')


if __name__ == '__main__':
    main()
