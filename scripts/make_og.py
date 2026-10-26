"""Builds the default social-sharing image (src/app/opengraph-image.jpg) from the hero photo and the logo.
Run: python3 scripts/make_og.py  (needs Pillow)"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
W, H = 1200, 630
PANEL = 470  # ivory panel on the left that carries the logo
IVORY, GOLD = (250, 248, 243), (194, 126, 25)

# Photo fills the right-hand side
hero = Image.open(os.path.join(ROOT, "public/demo/hero.jpg")).convert("RGB")
pw = W - PANEL
scale = max(pw / hero.width, H / hero.height)
hero = hero.resize((round(hero.width * scale), round(hero.height * scale)), Image.LANCZOS)
left = max(0, min((hero.width - pw) // 2, hero.width - pw))
top = (hero.height - H) // 2
hero = hero.crop((left, top, left + pw, top + H))

img = Image.new("RGBA", (W, H), IVORY + (255,))
img.paste(hero, (PANEL, 0))

# Transparent logo, centred on the panel
logo = Image.open(os.path.join(ROOT, "public/brand/logo-transparent.png")).convert("RGBA")
bbox = logo.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
logo = logo.crop(bbox)
lw = PANEL - 110
logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
x, y = (PANEL - lw) // 2, (H - logo.height) // 2 - 20
img.alpha_composite(logo, (x, y))

draw = ImageDraw.Draw(img)
# Gold hairlines: under the logo and along the seam between panel and photo
draw.line([(x, y + logo.height + 34), (x + 120, y + logo.height + 34)], fill=GOLD + (255,), width=3)
draw.line([(PANEL, 0), (PANEL, H)], fill=GOLD + (255,), width=3)

out = os.path.join(ROOT, "src/app/opengraph-image.jpg")
img.convert("RGB").save(out, quality=88, optimize=True)
with open(os.path.join(ROOT, "src/app/opengraph-image.alt.txt"), "w") as f:
    f.write("Shree Krishna Associate logo beside a stock photograph of a contemporary home at dusk")
print("wrote", out)
