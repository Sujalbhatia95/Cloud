"""Apartment tower, office building, retail frontage, warehouse and plot exteriors."""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import *  # noqa: E402,F403


def _site_materials():
    return dict(
        plaster=noise_material("Plaster", (0.82, 0.8, 0.76), (0.9, 0.89, 0.86), scale=40, roughness=0.75, bump=0.05),
        warm=noise_material("WarmRender", (0.72, 0.6, 0.48), (0.8, 0.68, 0.55), scale=30, roughness=0.75, bump=0.05),
        stone=noise_material("Stone", (0.38, 0.34, 0.3), (0.55, 0.5, 0.45), scale=6, roughness=0.8, bump=0.4),
        asphalt=noise_material("Asphalt", (0.05, 0.05, 0.055), (0.11, 0.11, 0.115), scale=200, roughness=0.85, bump=0.2, detail=8),
        paving=noise_material("Paving", (0.45, 0.42, 0.38), (0.56, 0.53, 0.48), scale=20, roughness=0.75, bump=0.15),
        grass=noise_material("Grass", (0.03, 0.07, 0.015), (0.07, 0.13, 0.03), scale=60, roughness=0.9, bump=0.3, detail=10),
        glass=material("Glass", (0.55, 0.68, 0.75), roughness=0.03, metallic=0.85),
        clearglass=material("ClearGlass", (0.9, 0.95, 0.97), roughness=0.0, transmission=1.0),
        frame=material("Frame", (0.05, 0.05, 0.055), roughness=0.35, metallic=0.8),
        bark=material("Bark", (0.18, 0.12, 0.08), roughness=0.9),
        leaves=[
            noise_material("L1", (0.03, 0.09, 0.02), (0.09, 0.19, 0.04), scale=12, roughness=0.8, bump=0.3),
            noise_material("L2", (0.05, 0.12, 0.02), (0.14, 0.22, 0.05), scale=10, roughness=0.8, bump=0.3),
            noise_material("L3", (0.02, 0.07, 0.03), (0.06, 0.14, 0.05), scale=14, roughness=0.8, bump=0.3),
        ],
        wood=wood_material("Timber", light=(0.5, 0.3, 0.15), dark=(0.28, 0.15, 0.07), scale=4),
        glow=material("Glow", (0.9, 0.7, 0.45), roughness=1, emission=(1.0, 0.74, 0.45), emission_strength=2.5),
    )


def _street(m, y=-14, length=400):
    box("Road", (length * 10, 12, 0.05), (0, y, 0.025), m["asphalt"])
    box("Kerb", (length, 0.3, 0.18), (0, y + 6.15, 0.09), m["stone"])
    box("Footpath", (length, 4, 0.16), (0, y + 8.3, 0.08), m["paving"])
    for i in range(40):
        box("Lane", (2.5, 0.15, 0.01), (-200 + i * 10, y, 0.055), material("Paint", (0.85, 0.85, 0.8), 0.6))


def _treeline(m, y=60, n=30, seed=5):
    rnd = random.Random(seed)
    for i in range(n):
        tree((-90 + i * 6 + rnd.uniform(-2, 2), y + rnd.uniform(-4, 6), 0), rnd.uniform(7, 11), rnd.uniform(2.4, 3.6),
             m["bark"], m["leaves"], seed=100 + i, clusters=10)


def apartment(variant=0):
    reset_scene()
    m = _site_materials()
    plane("Ground", (6000, 6000), (0, 0, 0), m["grass"])
    _street(m)
    box("Plaza", (60, 12, 0.14), (0, 0, 0.07), m["paving"])
    floors, fh = 15, 3.15
    W, D = 26, 15
    x0 = 0
    for f in range(floors):
        z = f * fh
        box("Slab", (W + 0.6, D + 0.6, 0.32), (x0, 6, z + fh), m["plaster"], bevel=0.02)
        # recessed glazing band with interior glow on some floors
        box("Core", (W - 1.2, D - 1.2, fh - 0.3), (x0, 6, z + fh / 2), m["glass"])
        lit = random.Random(f * 7 + variant).random() < (0.45 if variant == 1 else 0.25)
        if lit:
            box("Lit", (W - 1.4, 0.05, fh - 0.5), (x0, 6 - (D - 1.2) / 2 - 0.05, z + fh / 2), m["glow"])
        # balconies on alternating bays
        for b in range(4):
            bx = x0 - W / 2 + 3.6 + b * 6.3
            off = 0 if (f + b) % 2 == 0 else 1
            if off:
                continue
            box("Balcony", (4.6, 1.8, 0.22), (bx, 6 - D / 2 - 0.9, z + 0.3), m["plaster"], bevel=0.02)
            box("Rail", (4.6, 0.04, 1.0), (bx, 6 - D / 2 - 1.78, z + 0.9), m["clearglass"])
            box("Fin", (0.25, 1.8, fh - 0.2), (bx + 2.5, 6 - D / 2 - 0.9, z + fh / 2 + 0.1), m["wood"])
    # vertical piers
    for px in (-W / 2, W / 2):
        box("Pier", (0.9, D + 0.8, floors * fh + 0.6), (x0 + px, 6, floors * fh / 2 + 0.3), m["warm"])
    box("Crown", (W + 1.2, D + 1.2, 1.2), (x0, 6, floors * fh + 0.9), m["warm"])
    # lobby
    box("LobbyGlow", (10, 0.05, 2.6), (x0, 6 - D / 2 + 0.3, 1.5), m["glow"])
    box("Canopy", (12, 3.5, 0.25), (x0, -2.8, 3.4), m["plaster"])
    # neighbouring tower for context
    box("Neighbour", (18, 16, 36), (-34, 18, 18), m["warm"])
    for f in range(11):
        box("NbBand", (18.2, 16.2, 0.9), (-34, 18, f * 3.3 + 2.4), m["glass"])
    for i in range(8):
        tree((-22 + i * 6.2, -3.5, 0.14), 6.5, 2.0, m["bark"], m["leaves"], seed=i)
    _treeline(m)
    sun_sky(strength=0.14 if variant == 0 else 0.1, elevation=24 if variant == 0 else 4, rotation=150, sun_energy=2.0 if variant == 0 else 0.7)


def office():
    reset_scene()
    m = _site_materials()
    plane("Ground", (6000, 6000), (0, 0, 0), m["grass"])
    _street(m)
    box("Plaza", (80, 14, 0.14), (0, 1, 0.07), m["paving"])
    floors, fh = 10, 3.8
    W, D = 30, 20
    box("Tower", (W, D, floors * fh), (0, 12, floors * fh / 2), m["glass"])
    for i in range(int(W / 1.5) + 1):
        box("Fin", (0.18, 0.9, floors * fh), (-W / 2 + i * 1.5, 12 - D / 2 - 0.45, floors * fh / 2), m["plaster"])
    for f in range(floors + 1):
        box("Spandrel", (W + 0.4, D + 0.4, 0.5), (0, 12, f * fh), m["plaster"])
    box("GroundGlow", (W - 2, 0.05, 3.2), (0, 12 - D / 2 + 0.6, 1.8), m["glow"])
    box("Entrance", (8, 4, 0.3), (0, 0.5, 4.2), m["plaster"])
    for i in range(7):
        tree((-30 + i * 9, -3.6, 0.14), 6.5, 2.0, m["bark"], m["leaves"], seed=20 + i)
    box("Neighbour", (22, 18, 28), (36, 22, 14), m["warm"])
    _treeline(m, y=80)
    sun_sky(strength=0.14, elevation=30, rotation=120, sun_energy=2.1)


def shopfront():
    reset_scene()
    m = _site_materials()
    plane("Ground", (6000, 6000), (0, 0, 0), m["paving"])
    _street(m, y=-10)
    box("Building", (36, 12, 11), (0, 8, 5.5), m["warm"], bevel=0.03)
    for i in range(4):
        x = -13.5 + i * 9
        box("ShopGlass", (7.6, 0.08, 3.6), (x, 1.95, 2.0), m["clearglass"])
        box("ShopGlow", (7.4, 0.05, 3.4), (x, 4.5, 2.0), m["glow"])
        box("ShopFloor", (7.6, 2.6, 0.1), (x, 3.2, 0.2), material("ShopFloor", (0.75, 0.72, 0.68), 0.3))
        box("Shelf", (5, 0.4, 1.6), (x, 4.2, 1.0), m["wood"])
        box("Awning", (8.2, 1.6, 0.12), (x, 1.2, 4.3), material(f"Awning{i}", (0.05, 0.1, 0.32) if i % 2 == 0 else (0.62, 0.42, 0.12), 0.6),
            rotation=(math.radians(-12), 0, 0))
        box("SignBand", (7.6, 0.15, 0.8), (x, 1.9, 4.9), material("Sign", (0.12, 0.12, 0.14), 0.4))
        for f in range(2):
            box("UpperWindow", (2.0, 0.1, 1.8), (x - 2.2, 1.95, 6.5 + f * 3.0), m["glass"])
            box("UpperWindow", (2.0, 0.1, 1.8), (x + 2.2, 1.95, 6.5 + f * 3.0), m["glass"])
        point_light((x, 1.0, 3.9), 80)
    box("Cornice", (36.6, 12.6, 0.5), (0, 8, 11.2), m["plaster"])
    for i in range(5):
        tree((-16 + i * 8, -2.5, 0.16), 5.5, 1.6, m["bark"], m["leaves"], seed=40 + i)
    sun_sky(strength=0.1, elevation=3, rotation=230, sun_energy=0.8)


def warehouse():
    reset_scene()
    m = _site_materials()
    plane("Ground", (6000, 6000), (0, 0, 0), m["grass"])
    box("Yard", (90, 40, 0.1), (0, -6, 0.05), noise_material("Concrete", (0.42, 0.42, 0.41), (0.55, 0.55, 0.53), scale=30, roughness=0.85, bump=0.1))
    clad = material("Cladding", (0.62, 0.65, 0.68), roughness=0.4, metallic=0.6)
    box("Shed", (60, 30, 10), (0, 12, 5), clad)
    roof = material("Roof", (0.3, 0.32, 0.35), roughness=0.5, metallic=0.5)
    box("RoofL", (61, 16, 0.25), (0, 5, 11.6), roof, rotation=(math.radians(10), 0, 0))
    box("RoofR", (61, 16, 0.25), (0, 19, 11.6), roof, rotation=(math.radians(-10), 0, 0))
    for i in range(30):
        box("Rib", (0.12, 0.2, 10), (-29.5 + i * 2, -3.1, 5), material("Rib", (0.55, 0.58, 0.6), 0.4, 0.7))
    for i in range(5):
        x = -20 + i * 10
        box("Door", (5, 0.2, 5.5), (x, -3.2, 2.75), material("Door", (0.08, 0.12, 0.3), 0.5, 0.4))
        box("DockCanopy", (6, 2.5, 0.2), (x, -4.4, 6.2), roof)
    box("Office", (12, 8, 7), (38, 2, 3.5), m["plaster"])
    box("OfficeGlass", (10, 0.1, 2), (38, -2.05, 4.5), m["glass"])
    for i in range(6):
        tree((-40 + i * 16, -24, 0), 6, 2.0, m["bark"], m["leaves"], seed=60 + i)
    _treeline(m, y=70)
    sun_sky(strength=0.14, elevation=20, rotation=140, sun_energy=2.0)


def plot():
    reset_scene()
    m = _site_materials()
    plane("Ground", (6000, 6000), (0, 0, 0), m["grass"])
    soil = noise_material("Soil", (0.32, 0.22, 0.14), (0.45, 0.33, 0.22), scale=25, roughness=0.95, bump=0.3)
    box("Plot", (30, 40, 0.06), (0, 10, 0.03), soil)
    concrete = material("Post", (0.7, 0.68, 0.64), 0.8)
    for i in range(11):
        for (x, y) in ((-15 + i * 3, -10), (-15 + i * 3, 30)):
            box("Post", (0.25, 0.25, 1.4), (x, y, 0.7), concrete)
    for i in range(14):
        for x in (-15, 15):
            box("Post", (0.25, 0.25, 1.4), (x, -10 + i * 3.08, 0.7), concrete)
    wire = material("Wire", (0.2, 0.2, 0.2), 0.5, 0.8)
    for h in (0.5, 0.9, 1.3):
        box("WireS", (30, 0.02, 0.02), (0, -10, h), wire)
        box("WireW", (0.02, 40, 0.02), (-15, 10, h), wire)
        box("WireE", (0.02, 40, 0.02), (15, 10, h), wire)
    box("Gravel", (4, 30, 0.08), (-25, 0, 0.04), noise_material("Gravel", (0.5, 0.48, 0.44), (0.66, 0.63, 0.58), scale=80, roughness=0.9, bump=0.5))
    box("BoardPost", (0.12, 0.12, 2.2), (-13, -11, 1.1), m["wood"])
    box("Board", (2.2, 0.08, 1.2), (-13, -11.06, 2.0), material("Board", (0.92, 0.9, 0.85), 0.6))
    _treeline(m, y=110, n=40, seed=12)
    rnd = random.Random(3)
    for i in range(14):
        tree((rnd.uniform(-60, 60), rnd.uniform(40, 90), 0), rnd.uniform(6, 10), rnd.uniform(2.2, 3.2), m["bark"], m["leaves"], seed=80 + i, clusters=12)
    tree((22, 4, 0), 8, 3.0, m["bark"], m["leaves"], seed=99)
    tree((-22, 22, 0), 7, 2.6, m["bark"], m["leaves"], seed=98)
    sun_sky(strength=0.16, elevation=9, rotation=100, sun_energy=1.8, dust=2.5)


if __name__ == "__main__":
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "/tmp"
    quick = "--quick" in sys.argv
    w, h, s = (800, 533, 24) if quick else (1600, 1067, 64)
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    want = lambda n: only is None or n in only  # noqa: E731
    if want("apartment"):
        apartment(0)
        render(os.path.join(out, "apartment-1.jpg"), camera((-16, -24, 1.7), (2, 6, 18), lens=20), w, h, s)
        render(os.path.join(out, "apartment-2.jpg"), camera((40, -38, 30), (0, 6, 18), lens=32), w, h, s)
        apartment(1)
        render(os.path.join(out, "apartment-3.jpg"), camera((22, -30, 2.0), (-2, 6, 16), lens=22), w, h, s)
    if want("office"):
        office()
        render(os.path.join(out, "office-1.jpg"), camera((-26, -28, 1.7), (2, 10, 15), lens=20), w, h, s)
    if want("shop"):
        shopfront()
        render(os.path.join(out, "shop-1.jpg"), camera((-14, -12, 1.7), (2, 3, 3.5), lens=24), w, h, s)
        render(os.path.join(out, "shop-2.jpg"), camera((6, -9, 1.6), (-4, 3, 2.8), lens=28), w, h, s)
    if want("warehouse"):
        warehouse()
        render(os.path.join(out, "warehouse-1.jpg"), camera((-40, -42, 6), (0, 8, 4), lens=26), w, h, s)
    if want("plot"):
        plot()
        render(os.path.join(out, "plot-1.jpg"), camera((-24, -22, 7.5), (0, 10, 0), lens=26), w, h, s)
        render(os.path.join(out, "plot-2.jpg"), camera((-11, -14, 1.7), (2, 14, 1.0), lens=26), w, h, s)
