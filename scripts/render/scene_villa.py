"""Modern villa with pool at golden hour (used for the hero and the demo villa listing)."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import *  # noqa: E402,F403


def build(dusk=False):
    reset_scene()
    plaster = noise_material("Plaster", (0.86, 0.84, 0.8), (0.93, 0.92, 0.89), scale=40, roughness=0.75, bump=0.05)
    stone = noise_material("Stone", (0.42, 0.37, 0.31), (0.62, 0.57, 0.5), scale=6, roughness=0.8, bump=0.4)
    deck = noise_material("Deck", (0.52, 0.46, 0.38), (0.64, 0.58, 0.49), scale=3, roughness=0.6, bump=0.1)
    grass = noise_material("Grass", (0.04, 0.09, 0.02), (0.09, 0.16, 0.04), scale=60, roughness=0.9, bump=0.3, detail=10)
    wood = wood_material("Cladding", light=(0.5, 0.3, 0.15), dark=(0.28, 0.15, 0.07), scale=4)
    glass = material("Glass", (0.9, 0.95, 0.97), roughness=0.0, transmission=1.0, ior=1.45)
    frame = material("Frame", (0.04, 0.04, 0.045), roughness=0.35, metallic=0.8)
    glow_strength = 2.0 if dusk else 0.6
    interior = material("InteriorGlow", (0.9, 0.7, 0.45), roughness=1, emission=(1.0, 0.72, 0.42), emission_strength=glow_strength)
    furniture = material("Furniture", (0.25, 0.2, 0.17), roughness=0.7)
    leaves = noise_material("Leaves", (0.03, 0.09, 0.02), (0.09, 0.19, 0.04), scale=12, roughness=0.8, bump=0.3)
    leaves2 = noise_material("Leaves2", (0.05, 0.12, 0.02), (0.14, 0.22, 0.05), scale=10, roughness=0.8, bump=0.3)
    leaves3 = noise_material("Leaves3", (0.02, 0.07, 0.03), (0.06, 0.14, 0.05), scale=14, roughness=0.8, bump=0.3)
    leafset = [leaves, leaves2, leaves3]
    bark = material("Bark", (0.18, 0.12, 0.08), roughness=0.9)
    pool_tile = material("PoolTile", (0.08, 0.38, 0.5), roughness=0.3)

    # Ground and landscaping
    plane("Lawn", (6000, 6000), (0, 0, 0), grass)
    # Deck built around the pool opening
    box("DeckN", (26, 2.6, 0.12), (1, -1.8, 0.06), deck)
    box("DeckS", (26, 3.0, 0.12), (1, -13.1, 0.06), deck)
    box("DeckW", (6.2, 4.8, 0.12), (-8.9, -9.3, 0.06), deck)
    box("DeckE", (6.2, 4.8, 0.12), (11.3, -9.3, 0.06), deck)
    # Loungers
    lounger = material("Lounger", (0.92, 0.9, 0.86), roughness=0.6)
    for i in range(3):
        box("Lounger", (0.8, 2.0, 0.3), (-8.0 + i * 1.3, -10.0, 0.32), lounger, bevel=0.06)
        box("LoungerBack", (0.8, 0.7, 0.08), (-8.0 + i * 1.3, -9.15, 0.62), lounger, bevel=0.03, rotation=(math.radians(-45), 0, 0))
    # Pool basin + water
    box("PoolBasin", (13.6, 4.6, 1.4), (1.5, -9.3, -0.62), pool_tile)
    box("Water", (13.2, 4.2, 0.1), (1.5, -9.3, 0.02), water_material())
    box("PoolEdge", (14.2, 0.3, 0.16), (1.5, -6.85, 0.13), stone)
    box("PoolEdgeS", (14.2, 0.3, 0.16), (1.5, -11.75, 0.13), stone)

    # Ground floor: glazed pavilion
    box("GF_Back", (16, 0.4, 3.3), (1, 4.3, 1.65), plaster)
    box("GF_SideL", (0.4, 9, 3.3), (-7, 0, 1.65), stone)
    box("GF_SideR", (0.4, 9, 3.3), (9, 0, 1.65), plaster)
    box("InteriorWall", (15.2, 0.1, 3.0), (1, 3.9, 1.5), interior)
    box("Floor", (16, 9, 0.2), (1, 0, 0.1), deck)
    for i in range(8):
        x = -6.0 + i * 2.0
        box("Mullion", (0.08, 0.12, 3.1), (x, -4.4, 1.6), frame)
        box("Pane", (1.92, 0.04, 3.0), (x + 1.0, -4.4, 1.6), glass)
    box("Sofa", (3.2, 1.0, 0.8), (-1.5, 1.5, 0.6), furniture, bevel=0.08)
    box("Table", (1.6, 1.6, 0.4), (3.5, 0.5, 0.45), furniture, bevel=0.04)
    point_light((-1, 0, 2.9), 120 if dusk else 60)
    point_light((4, 0, 2.9), 120 if dusk else 60)

    # Roof slab between floors with deep overhang
    box("Slab1", (18.5, 10.8, 0.35), (1.2, -0.4, 3.45), plaster, bevel=0.02)
    box("Soffit", (17.6, 1.4, 0.04), (1.2, -5.0, 3.26), wood)

    # Upper floor: cantilevered volume
    box("UF_Main", (11, 8.4, 3.0), (4.2, 0.4, 5.12), plaster, bevel=0.02)
    box("UF_Wood", (4.0, 0.12, 3.0), (7.2, -3.86, 5.12), wood)
    box("UF_Ribbon", (6.4, 0.1, 1.5), (1.8, -3.86, 5.2), glass)
    box("UF_RibbonGlow", (6.2, 0.05, 1.4), (1.8, -3.7, 5.2), interior)
    box("UF_RibbonFrame", (6.6, 0.14, 0.08), (1.8, -3.88, 5.98), frame)
    box("Slab2", (12.4, 9.6, 0.3), (4.2, 0.2, 6.75), plaster, bevel=0.02)
    # Terrace with glass balustrade on the left of the upper floor
    box("Balustrade", (5.4, 0.04, 1.0), (-4.2, -4.6, 4.12), glass)
    box("Rail", (5.4, 0.06, 0.05), (-4.2, -4.6, 4.64), frame)

    # Feature stone wall and planters
    box("FeatureWall", (0.6, 6, 2.6), (-10, -3, 1.3), stone)
    box("Planter", (5, 1, 0.6), (-4, -5.6, 0.3), stone)
    for i in range(6):
        sphere("Shrub", 0.45, (-6 + i * 0.85, -5.6, 0.75), leafset[i % 3], scale=(1, 1, 0.8))

    # Trees and distant tree line (breaks the horizon)
    palm((-12, -9, 0), 7.5, bark, leaves2)
    palm((13.5, -4, 0), 8.5, bark, leaves2)
    tree((-15, 6, 0), 7, 2.6, bark, leafset, seed=1)
    tree((15, 9, 0), 6.5, 2.4, bark, leafset, seed=2)
    tree((-21, -1, 0), 6, 2.2, bark, leafset, seed=3)
    import random
    rnd = random.Random(7)
    for i in range(26):
        tree((-60 + i * 4.8 + rnd.uniform(-1, 1), 30 + rnd.uniform(-3, 4), 0), rnd.uniform(6, 10), rnd.uniform(2.2, 3.4), bark, leafset, seed=10 + i, clusters=12)

    sun_sky(strength=0.16 if not dusk else 0.12, elevation=3.0 if dusk else 14, rotation=215, sun_energy=0.6 if dusk else 2.0)


if __name__ == "__main__":
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "/tmp"
    quick = "--quick" in sys.argv
    w, h, s = (800, 533, 24) if quick else (1920, 1080, 64)
    build(dusk=False)
    render(os.path.join(out, "villa-1.jpg"), camera((-13, -21, 2.0), (3.0, -1.0, 3.6), lens=30), w, h, s)
    render(os.path.join(out, "villa-2.jpg"), camera((11.0, -12.4, 1.1), (-3, -3, 2.6), lens=22), w, h, s)
    build(dusk=True)
    render(os.path.join(out, "villa-3.jpg"), camera((-4, -24, 1.7), (2.0, -1, 3.4), lens=32), w, h, s)
    hw, hh = (960, 540) if quick else (2400, 1350)
    render(os.path.join(out, "hero.jpg"), camera((-9, -27, 1.6), (3.5, -1, 3.6), lens=30), hw, hh, s)
