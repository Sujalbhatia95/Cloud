"""Builds the default social-sharing image (src/app/opengraph-image.jpg) from the hero render and the logo.
Run: python3 scripts/render/make_og.py  (needs Pillow)"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
W, H = 1200, 630

hero = Image.open(os.path.join(ROOT, "public/demo/hero.jpg")).convert("RGB")
scale = max(W / hero.width, H / hero.height)
hero = hero.resize((round(hero.width * scale), round(hero.height * scale)), Image.LANCZOS)
left = max(0, min((hero.width - W) // 2 + 120, hero.width - W))
hero = hero.crop((left, (hero.height - H) // 2, left + W, (hero.height - H) // 2 + H))

# Navy gradient from the left so the logo panel reads clearly
overlay = Image.new("RGBA", (W, H))
draw = ImageDraw.Draw(overlay)
for x in range(W):
    a = int(max(0, 235 - x * 0.42))
    draw.line([(x, 0), (x, H)], fill=(7, 15, 51, a))
img = Image.alpha_composite(hero.convert("RGBA"), overlay)

logo = Image.open(os.path.join(ROOT, "public/brand/logo.png")).convert("RGBA")
lw = 330
logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
pad = 34
card = Image.new("RGBA", (lw + pad * 2, logo.height + pad * 2), (255, 255, 255, 255))
shadow = Image.new("RGBA", (card.width + 40, card.height + 40), (0, 0, 0, 0))
ImageDraw.Draw(shadow).rounded_rectangle([20, 24, card.width + 20, card.height + 24], 10, fill=(0, 0, 0, 110))
shadow = shadow.filter(ImageFilter.GaussianBlur(14))
x, y = 90, (H - card.height) // 2
img.alpha_composite(shadow, (x - 20, y - 20))
mask = Image.new("L", card.size, 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, card.width - 1, card.height - 1], 10, fill=255)
card.paste(logo, (pad, pad), logo)
img.paste(card, (x, y), mask)
# Gold hairline accent under the card
ImageDraw.Draw(img).line([(x, y + card.height + 26), (x + 120, y + card.height + 26)], fill=(194, 126, 25, 255), width=3)

out = os.path.join(ROOT, "src/app/opengraph-image.jpg")
img.convert("RGB").save(out, quality=88, optimize=True)
with open(os.path.join(ROOT, "src/app/opengraph-image.alt.txt"), "w") as f:
    f.write("Shree Krishna Associate logo over an illustrative render of a contemporary home")
print("wrote", out)
