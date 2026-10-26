"""Living room, bedroom, kitchen and office interiors lit by daylight through large windows."""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from common import *  # noqa: E402,F403


def _room(width=8.0, depth=7.0, height=3.1, floor_mat=None, wall_mat=None, window_wall="north"):
    """Room centred on x, extending from y=0 (camera side) to y=depth; window on the far wall."""
    box("Floor", (width, depth, 0.1), (0, depth / 2, -0.05), floor_mat)
    box("Ceiling", (width, depth, 0.1), (0, depth / 2, height + 0.05), wall_mat)
    box("WallL", (0.15, depth + 2.0, height + 0.2), (-width / 2, depth / 2 - 1.0, height / 2), wall_mat)
    box("WallR", (0.15, depth + 2.0, height + 0.2), (width / 2, depth / 2 - 1.0, height / 2), wall_mat)
    box("WallBack", (width + 0.3, 0.15, height + 0.2), (0, -1.6, height / 2), wall_mat)
    box("FloorExt", (width, 1.8, 0.1), (0, -0.85, -0.05), floor_mat)
    box("CeilExt", (width, 1.8, 0.1), (0, -0.85, height + 0.05), wall_mat)
    # far wall = glazing with frames
    frame = material("WinFrame", (0.06, 0.06, 0.065), 0.35, 0.8)
    glass = material("WinGlass", (0.95, 0.97, 0.98), roughness=0.0, transmission=1.0)
    box("Sill", (width, 0.2, 0.25), (0, depth, 0.125), wall_mat)
    box("Head", (width, 0.2, 0.35), (0, depth, height - 0.175), wall_mat)
    n = 4
    for i in range(n + 1):
        box("Mullion", (0.07, 0.12, height - 0.6), (-width / 2 + i * width / n, depth, height / 2 - 0.05), frame)
    box("Glass", (width, 0.03, height - 0.6), (0, depth, height / 2 - 0.05), glass)
    # outdoor backdrop: greenery and sky
    leaves = [noise_material("OL1", (0.04, 0.12, 0.03), (0.12, 0.24, 0.06), scale=10, roughness=0.8, bump=0.3),
              noise_material("OL2", (0.06, 0.15, 0.04), (0.16, 0.28, 0.08), scale=12, roughness=0.8, bump=0.3)]
    bark = material("Bark", (0.18, 0.12, 0.08), 0.9)
    box("Terrace", (4000, 4000, 0.1), (0, depth + 2000, -0.06), noise_material("Lawn", (0.05, 0.1, 0.02), (0.1, 0.17, 0.04), 60, 0.9, 0.2))
    for i, x in enumerate((-9, -3, 4, 10)):
        tree((x, depth + 9 + (i % 2) * 3, -0.1), 7, 2.4, bark, leaves, seed=i + 3, clusters=16)
    import random as _r
    rr = _r.Random(11)
    for i in range(24):
        tree((-70 + i * 6 + rr.uniform(-2, 2), depth + 34 + rr.uniform(-4, 6), -0.1), rr.uniform(7, 11), rr.uniform(2.4, 3.4), bark, leaves, seed=50 + i, clusters=10)
    return frame


def _fabric(name, color):
    return noise_material(name, tuple(c * 0.9 for c in color), color, scale=300, roughness=0.95, bump=0.05)


def _sofa(x, y, rot=0.0, color=(0.72, 0.66, 0.58)):
    fab = _fabric("Sofa", color)
    c, s = math.cos(rot), math.sin(rot)
    def place(dx, dy, z, size, name):
        box(name, size, (x + dx * c - dy * s, y + dx * s + dy * c, z), fab, bevel=0.07, rotation=(0, 0, rot))
    place(0, 0, 0.22, (2.6, 0.95, 0.38), "SofaBase")
    place(-0.65, -0.05, 0.5, (1.25, 0.85, 0.2), "Cushion")
    place(0.65, -0.05, 0.5, (1.25, 0.85, 0.2), "Cushion")
    place(0, 0.42, 0.72, (2.6, 0.22, 0.7), "SofaBack")
    place(-1.33, 0, 0.45, (0.2, 0.95, 0.55), "Arm")
    place(1.33, 0, 0.45, (0.2, 0.95, 0.55), "Arm")


def _plant(x, y, scale=1.0):
    pot = material("Pot", (0.75, 0.7, 0.64), 0.6)
    leaves = noise_material("PlantLeaf", (0.04, 0.14, 0.04), (0.1, 0.26, 0.07), scale=8, roughness=0.6, bump=0.2)
    cylinder("Pot", 0.22 * scale, 0.5 * scale, (x, y, 0.25 * scale), pot)
    import random
    rnd = random.Random(int(x * 10 + y))
    for i in range(14):
        a = rnd.uniform(0, math.tau)
        h = rnd.uniform(0.6, 1.5) * scale
        box("Leaf", (0.06, 0.28 * scale, 0.02), (x + math.cos(a) * 0.15 * scale, y + math.sin(a) * 0.15 * scale, h), leaves,
            rotation=(math.radians(rnd.uniform(20, 60)), 0, a))
        sphere("LeafBall", 0.16 * scale, (x + math.cos(a) * 0.3 * scale, y + math.sin(a) * 0.3 * scale, h), leaves, scale=(1, 0.5, 0.25))


def _daylight(elevation=28, rotation=180, energy=4.0):
    sun_sky(strength=0.3, elevation=elevation, rotation=rotation, sun_energy=energy * 0.8)
    scene = bpy.context.scene
    scene.view_settings.exposure = 0.6


def living(variant=0):
    reset_scene()
    floor = plank_material("OakFloor")
    walls = noise_material("Walls", (0.86, 0.83, 0.78), (0.9, 0.88, 0.84), scale=50, roughness=0.85, bump=0.02)
    _room(9.0, 7.0, 3.2, floor, walls)
    rug = noise_material("Rug", (0.55, 0.5, 0.44), (0.66, 0.61, 0.55), scale=120, roughness=1.0, bump=0.1)
    box("Rug", (4.2, 3.0, 0.02), (0, 3.6, 0.01), rug)
    _sofa(0, 2.2, 0, color=(0.74, 0.7, 0.63) if variant == 0 else (0.18, 0.24, 0.38))
    marble = noise_material("Marble", (0.84, 0.83, 0.8), (0.95, 0.94, 0.92), scale=4, roughness=0.15, bump=0.0)
    cylinder("CoffeeTable", 0.75, 0.08, (0, 3.9, 0.42), marble)
    cylinder("TableBase", 0.3, 0.38, (0, 3.9, 0.19), material("Brass", (0.75, 0.55, 0.25), 0.3, 1.0))
    accent = _fabric("Accent", (0.62, 0.42, 0.18))
    box("Armchair", (0.9, 0.9, 0.42), (2.4, 4.4, 0.21), accent, bevel=0.1, rotation=(0, 0, math.radians(-30)))
    box("ArmchairBack", (0.9, 0.2, 0.55), (2.75, 4.65, 0.6), accent, bevel=0.08, rotation=(0, 0, math.radians(-30)))
    walnut = wood_material("Walnut", light=(0.32, 0.2, 0.12), dark=(0.18, 0.1, 0.06), scale=3, stretch=10)
    box("Console", (2.6, 0.45, 0.6), (-4.15, 3.6, 0.3), walnut, bevel=0.01, rotation=(0, 0, math.radians(90)))
    art = material("Art", (0.1, 0.16, 0.38), 0.6)
    box("Art", (0.04, 1.6, 1.1), (-4.42, 3.6, 1.8), art)
    box("ArtAccent", (0.05, 0.6, 0.6), (-4.41, 3.9, 1.95), material("ArtGold", (0.75, 0.52, 0.18), 0.4, 0.6))
    _plant(3.6, 6.2, 1.3)
    _plant(-3.7, 6.3, 1.0)
    shade = material("Shade", (0.95, 0.9, 0.8), 0.6, emission=(1.0, 0.8, 0.55), emission_strength=6.0)
    for x in (-1.2, 1.2):
        cylinder("Cord", 0.01, 1.0, (x, 3.9, 2.7), material("Cord", (0.05, 0.05, 0.05), 0.5))
        sphere("Pendant", 0.22, (x, 3.9, 2.15), shade)
    _daylight(elevation=22, rotation=200, energy=4.5)


def bedroom():
    reset_scene()
    floor = plank_material("OakFloor", light=(0.55, 0.4, 0.25), dark=(0.4, 0.27, 0.16))
    walls = noise_material("Walls", (0.83, 0.79, 0.73), (0.88, 0.85, 0.8), scale=50, roughness=0.85, bump=0.02)
    _room(7.0, 6.0, 3.0, floor, walls)
    walnut = wood_material("Walnut", light=(0.34, 0.21, 0.12), dark=(0.2, 0.11, 0.06), scale=3, stretch=10)
    for i in range(16):
        box("Slat", (0.12, 0.08, 2.4), (-3.4 + 0.08, 0.9 + i * 0.17, 1.2), walnut)
    linen = _fabric("Linen", (0.9, 0.88, 0.84))
    duvet = _fabric("Duvet", (0.62, 0.6, 0.58))
    box("BedBase", (2.2, 2.2, 0.35), (-2.1, 2.2, 0.2), walnut, bevel=0.02, rotation=(0, 0, math.radians(90)))
    box("Mattress", (2.0, 2.05, 0.25), (-2.0, 2.2, 0.5), linen, bevel=0.06, rotation=(0, 0, math.radians(90)))
    box("Duvet", (1.4, 2.12, 0.1), (-1.6, 2.2, 0.66), duvet, bevel=0.05, rotation=(0, 0, math.radians(90)))
    for dy in (-0.5, 0.5):
        box("Pillow", (0.45, 0.8, 0.18), (-2.95, 2.2 + dy, 0.78), linen, bevel=0.08)
    box("Throw", (0.5, 2.15, 0.04), (-1.15, 2.2, 0.73), _fabric("Throw", (0.1, 0.16, 0.38)), bevel=0.02)
    for y in (0.75, 3.65):
        box("Nightstand", (0.5, 0.5, 0.5), (-3.05, y, 0.25), walnut, bevel=0.01)
        cylinder("LampBase", 0.07, 0.35, (-3.05, y, 0.68), material("Brass", (0.75, 0.55, 0.25), 0.3, 1.0))
        cylinder("LampShade", 0.17, 0.25, (-3.05, y, 0.95), material("LampShade", (0.95, 0.9, 0.8), 0.6, emission=(1.0, 0.78, 0.5), emission_strength=4))
    box("Rug", (2.8, 3.4, 0.02), (-1.5, 2.2, 0.01), noise_material("Rug", (0.6, 0.55, 0.48), (0.7, 0.65, 0.58), 120, 1.0, 0.1))
    curtain = _fabric("Curtain", (0.92, 0.9, 0.86))
    for x in (-3.2, 3.2):
        box("Curtain", (0.6, 0.12, 2.7), (x, 5.8, 1.45), curtain)
    _plant(2.8, 5.2, 1.1)
    box("Bench", (1.4, 0.45, 0.45), (0, 2.2, 0.22), _fabric("Bench", (0.62, 0.42, 0.18)), bevel=0.05, rotation=(0, 0, math.radians(90)))
    _daylight(elevation=18, rotation=160, energy=4.0)


def kitchen():
    reset_scene()
    floor = noise_material("Tile", (0.7, 0.68, 0.64), (0.78, 0.76, 0.72), scale=6, roughness=0.3, bump=0.02)
    walls = noise_material("Walls", (0.88, 0.86, 0.82), (0.92, 0.9, 0.87), scale=50, roughness=0.85, bump=0.02)
    _room(8.0, 6.5, 3.0, floor, walls)
    navy = material("Navy", (0.03, 0.06, 0.17), 0.35)
    marble = noise_material("Marble", (0.86, 0.85, 0.82), (0.97, 0.96, 0.94), scale=5, roughness=0.12, bump=0.0)
    oak = wood_material("Oak", light=(0.62, 0.45, 0.28), dark=(0.45, 0.3, 0.18), scale=2.5, stretch=14)
    # run of cabinets along left wall
    box("BaseRun", (0.65, 5.0, 0.88), (-3.6, 3.4, 0.44), navy, bevel=0.005)
    box("Counter", (0.7, 5.05, 0.05), (-3.58, 3.4, 0.905), marble)
    box("Backsplash", (0.03, 5.0, 0.7), (-3.92, 3.4, 1.28), marble)
    box("Uppers", (0.4, 5.0, 0.8), (-3.75, 3.4, 2.25), oak, bevel=0.005)
    for i in range(6):
        box("Door", (0.02, 0.8, 0.8), (-3.27, 1.3 + i * 0.84, 0.44), navy)
        box("Pull", (0.03, 0.18, 0.02), (-3.25, 1.3 + i * 0.84, 0.8), material("Brass", (0.75, 0.55, 0.25), 0.3, 1.0))
    # island
    box("Island", (1.1, 2.8, 0.88), (0.2, 3.1, 0.44), navy, bevel=0.005)
    box("IslandTop", (1.3, 3.0, 0.06), (0.2, 3.1, 0.91), marble)
    for i in range(3):
        y = 2.2 + i * 0.9
        cylinder("StoolSeat", 0.2, 0.06, (1.15, y, 0.72), oak)
        cylinder("StoolLeg", 0.025, 0.7, (1.15, y, 0.36), material("Black", (0.04, 0.04, 0.04), 0.4, 0.8))
    brass = material("Brass", (0.75, 0.55, 0.25), 0.3, 1.0)
    glow = material("Bulb", (1, 0.9, 0.7), 0.5, emission=(1.0, 0.8, 0.55), emission_strength=12)
    for i in range(3):
        y = 2.2 + i * 0.9
        cylinder("PendCord", 0.008, 0.9, (0.2, y, 2.55), brass)
        sphere("PendShade", 0.14, (0.2, y, 2.05), brass, scale=(1, 1, 0.7))
        sphere("PendBulb", 0.06, (0.2, y, 1.98), glow)
    _plant(3.4, 5.9, 1.0)
    box("Bowl", (0.4, 0.4, 0.1), (0.2, 3.4, 0.98), material("Ceramic", (0.9, 0.88, 0.84), 0.3), bevel=0.04)
    for i in range(4):
        sphere("Fruit", 0.06, (0.15 + (i % 2) * 0.1, 3.35 + (i // 2) * 0.1, 1.06), material("Orange", (0.85, 0.4, 0.05), 0.5))
    _daylight(elevation=25, rotation=190, energy=4.0)


def office_interior():
    reset_scene()
    floor = noise_material("Carpet", (0.2, 0.21, 0.24), (0.26, 0.27, 0.3), scale=200, roughness=1.0, bump=0.1)
    walls = noise_material("Walls", (0.88, 0.88, 0.86), (0.92, 0.92, 0.9), scale=50, roughness=0.85, bump=0.02)
    _room(12.0, 9.0, 3.2, floor, walls)
    oak = wood_material("Oak", light=(0.62, 0.45, 0.28), dark=(0.45, 0.3, 0.18), scale=2.5, stretch=14)
    white = material("White", (0.9, 0.9, 0.88), 0.4)
    black = material("Black", (0.05, 0.05, 0.06), 0.4, 0.5)
    for r in range(2):
        for c in range(3):
            x, y = -3.5 + c * 3.5, 3.0 + r * 3.0
            box("Desk", (2.8, 1.4, 0.04), (x, y, 0.74), oak)
            box("DeskLeg", (0.05, 1.2, 0.72), (x - 1.3, y, 0.36), black)
            box("DeskLeg", (0.05, 1.2, 0.72), (x + 1.3, y, 0.36), black)
            for dx in (-0.7, 0.7):
                box("Monitor", (0.6, 0.03, 0.36), (x + dx, y + 0.3, 1.05), black)
                box("Chair", (0.5, 0.5, 0.08), (x + dx, y - 0.65, 0.48), _fabric("ChairFab", (0.1, 0.16, 0.38)), bevel=0.03)
                box("ChairBack", (0.5, 0.06, 0.5), (x + dx, y - 0.9, 0.8), _fabric("ChairFab2", (0.1, 0.16, 0.38)), bevel=0.03)
    for i in range(4):
        box("LightPanel", (2.4, 0.5, 0.03), (-4.5 + i * 3, 4.5, 3.13), material("Panel", (1, 1, 1), 0.5, emission=(1, 0.97, 0.92), emission_strength=6))
    box("MeetingGlass", (0.05, 3.5, 2.6), (5.0, 2.2, 1.3), material("MGlass", (0.95, 0.97, 0.98), 0.0, transmission=1.0))
    _plant(-5.4, 8.2, 1.3)
    _plant(5.4, 8.2, 1.3)
    _daylight(elevation=30, rotation=200, energy=3.5)


if __name__ == "__main__":
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else "/tmp"
    quick = "--quick" in sys.argv
    w, h, s = (800, 533, 32) if quick else (1600, 1067, 64)
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    want = lambda n: only is None or n in only  # noqa: E731
    if want("living"):
        living(0)
        render(os.path.join(out, "living-1.jpg"), camera((-3.6, -0.2, 1.45), (1.2, 5.2, 1.1), lens=20), w, h, s)
        render(os.path.join(out, "living-2.jpg"), camera((3.8, 0.2, 1.3), (-1.0, 4.6, 0.9), lens=22), w, h, s)
        living(1)
        render(os.path.join(out, "living-3.jpg"), camera((0.0, -0.3, 1.5), (0.0, 6.0, 1.2), lens=20), w, h, s)
    if want("bedroom"):
        bedroom()
        render(os.path.join(out, "bedroom-1.jpg"), camera((2.9, 0.2, 1.5), (-2.2, 3.4, 0.8), lens=20), w, h, s)
    if want("kitchen"):
        kitchen()
        render(os.path.join(out, "kitchen-1.jpg"), camera((3.4, 0.1, 1.55), (-1.6, 4.2, 0.9), lens=20), w, h, s)
    if want("officeint"):
        office_interior()
        render(os.path.join(out, "office-2.jpg"), camera((-5.4, 0.1, 1.7), (2.0, 6.0, 1.0), lens=20), w, h, s)
