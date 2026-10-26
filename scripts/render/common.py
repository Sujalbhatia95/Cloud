"""
Shared helpers for the original CGI demo imagery (rendered with Blender/Cycles).
These images are created from scratch for this project, so they carry no third-party licence.
Run: python scripts/render/render_all.py  (requires `pip install bpy`)
"""
import math
import bpy
from mathutils import Vector


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    try:
        scene.cycles.denoiser = "OPENIMAGEDENOISE"
    except Exception:
        pass
    scene.cycles.max_bounces = 6
    scene.cycles.diffuse_bounces = 3
    scene.cycles.glossy_bounces = 3
    scene.cycles.transmission_bounces = 6
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except Exception:
        pass
    scene.view_settings.exposure = 0.0
    scene.render.image_settings.file_format = "JPEG"
    scene.render.image_settings.quality = 88
    scene.render.film_transparent = False
    return scene


def material(name, color, roughness=0.5, metallic=0.0, emission=None, emission_strength=0.0,
             transmission=0.0, ior=1.45, alpha=1.0, coat=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*color, 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if transmission:
        bsdf.inputs["Transmission Weight"].default_value = transmission
        bsdf.inputs["IOR"].default_value = ior
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission, 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    if coat:
        bsdf.inputs["Coat Weight"].default_value = coat
    if alpha < 1.0:
        bsdf.inputs["Alpha"].default_value = alpha
    return mat


def noise_material(name, color_a, color_b, scale=8.0, roughness=0.6, bump=0.15, detail=6.0):
    """Procedural surface (plaster, stone, grass, wood-ish) using noise between two colours."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    tex = nt.nodes.new("ShaderNodeTexNoise")
    tex.inputs["Scale"].default_value = scale
    tex.inputs["Detail"].default_value = detail
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*color_a, 1)
    ramp.color_ramp.elements[1].color = (*color_b, 1)
    coord = nt.nodes.new("ShaderNodeTexCoord")
    nt.links.new(coord.outputs["Object"], tex.inputs["Vector"])
    nt.links.new(tex.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    if bump:
        b = nt.nodes.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = bump
        nt.links.new(tex.outputs["Fac"], b.inputs["Height"])
        nt.links.new(b.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def wood_material(name, light=(0.55, 0.36, 0.2), dark=(0.32, 0.18, 0.08), scale=3.0, roughness=0.45, stretch=12.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, stretch, 1.0)
    wave = nt.nodes.new("ShaderNodeTexWave")
    wave.inputs["Scale"].default_value = scale
    wave.inputs["Distortion"].default_value = 6.0
    wave.inputs["Detail"].default_value = 3.0
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = (*dark, 1)
    ramp.color_ramp.elements[1].color = (*light, 1)
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], wave.inputs["Vector"])
    nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    nt.links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def plank_material(name, light=(0.6, 0.43, 0.26), dark=(0.42, 0.28, 0.16), roughness=0.38):
    """Wooden floor planks: brick texture for the plank layout, noise for grain and tone variation."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    coord = nt.nodes.new("ShaderNodeTexCoord")
    brick = nt.nodes.new("ShaderNodeTexBrick")
    brick.offset = 0.37
    brick.inputs["Scale"].default_value = 1.0
    brick.inputs["Brick Width"].default_value = 1.4
    brick.inputs["Row Height"].default_value = 0.19
    brick.inputs["Mortar Size"].default_value = 0.004
    brick.inputs["Color1"].default_value = (*light, 1)
    brick.inputs["Color2"].default_value = (*dark, 1)
    brick.inputs["Mortar"].default_value = (0.12, 0.08, 0.05, 1)
    grain = nt.nodes.new("ShaderNodeTexNoise")
    grain.inputs["Scale"].default_value = 60
    mapping = nt.nodes.new("ShaderNodeMapping")
    mapping.inputs["Scale"].default_value = (1.0, 18.0, 1.0)
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.blend_type = "MULTIPLY"
    mix.inputs["Factor"].default_value = 0.25
    nt.links.new(coord.outputs["Object"], brick.inputs["Vector"])
    nt.links.new(coord.outputs["Object"], mapping.inputs["Vector"])
    nt.links.new(mapping.outputs["Vector"], grain.inputs["Vector"])
    nt.links.new(brick.outputs["Color"], mix.inputs["A"])
    nt.links.new(grain.outputs["Color"], mix.inputs["B"])
    nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = roughness
    return mat


def water_material():
    mat = bpy.data.materials.new("Water")
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (0.35, 0.75, 0.82, 1)
    bsdf.inputs["Roughness"].default_value = 0.03
    bsdf.inputs["Transmission Weight"].default_value = 0.92
    bsdf.inputs["IOR"].default_value = 1.33
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 3.5
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08
    nt.links.new(noise.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return mat


def box(name, size, location, mat=None, bevel=0.0, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel > 0:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.limit_method = "ANGLE"
    if mat:
        obj.data.materials.append(mat)
    return obj


def cylinder(name, radius, depth, location, mat=None, vertices=48, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, location=location, vertices=vertices, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    bpy.ops.object.shade_smooth()
    if mat:
        obj.data.materials.append(mat)
    return obj


def sphere(name, radius, location, mat=None, scale=(1, 1, 1), subdiv=3):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=radius, location=location, subdivisions=subdiv)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.shade_smooth()
    if mat:
        obj.data.materials.append(mat)
    return obj


def plane(name, size, location, mat=None, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_plane_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = (size[0], size[1], 1)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        obj.data.materials.append(mat)
    return obj


def tree(location, height=5.0, crown=1.8, trunk_mat=None, leaf_mats=None, seed=0, clusters=22):
    import random
    rnd = random.Random(seed)
    x, y, z = location
    cylinder("Trunk", 0.13, height * 0.6, (x, y, z + height * 0.3), trunk_mat, vertices=10)
    mats = leaf_mats if isinstance(leaf_mats, (list, tuple)) else [leaf_mats]
    cz = z + height * 0.68
    for i in range(clusters):
        u, v = rnd.uniform(0, math.tau), rnd.uniform(-0.9, 0.9)
        rr = crown * rnd.uniform(0.35, 0.95)
        px = x + math.cos(u) * rr * math.sqrt(1 - v * v)
        py = y + math.sin(u) * rr * math.sqrt(1 - v * v)
        pz = cz + v * crown * 0.75
        s = sphere("Leaves", crown * rnd.uniform(0.28, 0.42), (px, py, pz), mats[i % len(mats)], subdiv=3)
        disp = s.modifiers.new("Displace", "DISPLACE")
        tex = bpy.data.textures.new("LeafNoise", "VORONOI")
        tex.noise_scale = 0.18
        disp.texture = tex
        disp.strength = 0.22


def palm(location, height=6.0, trunk_mat=None, leaf_mat=None, fronds=14):
    """Palm with drooping, segmented fronds."""
    x, y, z = location
    # slightly leaning, tapered trunk made of stacked cylinders
    segs = 10
    for i in range(segs):
        t = i / segs
        r = 0.2 - 0.07 * t
        cylinder("PalmTrunk", r, height / segs * 1.05, (x + 0.25 * t * t, y, z + height * (t + 0.5 / segs)), trunk_mat, vertices=12)
    top = (x + 0.25, y, z + height)
    for i in range(fronds):
        ang = i / fronds * math.tau + (0.2 if i % 2 else 0)
        pitch0 = math.radians(-10 if i % 2 else 15)
        px, py, pz = top
        for j in range(6):
            pitch = pitch0 - math.radians(14) * j
            seg_len = 0.42
            width = 0.55 * (1 - j / 7)
            cx = px + math.cos(ang) * math.cos(pitch) * seg_len / 2
            cy = py + math.sin(ang) * math.cos(pitch) * seg_len / 2
            cz = pz + math.sin(pitch) * seg_len / 2
            box("Frond", (seg_len, width, 0.02), (cx, cy, cz), leaf_mat, rotation=(0, -pitch, ang))
            px = px + math.cos(ang) * math.cos(pitch) * seg_len
            py = py + math.sin(ang) * math.cos(pitch) * seg_len
            pz = pz + math.sin(pitch) * seg_len


def sun_sky(strength=1.0, elevation=12.0, rotation=200.0, sun_light=True, sun_energy=4.0, air=1.0, dust=1.0):
    world = bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    nt = world.node_tree
    bg = nt.nodes.get("Background")
    sky = nt.nodes.new("ShaderNodeTexSky")
    for t in ("NISHITA", "MULTIPLE_SCATTERING", "SINGLE_SCATTERING"):
        try:
            sky.sky_type = t
            break
        except Exception:
            continue
    try:
        sky.sun_elevation = math.radians(elevation)
        sky.sun_rotation = math.radians(rotation)
        sky.air_density = air
        sky.dust_density = dust
    except Exception:
        pass
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"])
    bg.inputs["Strength"].default_value = strength
    if sun_light:
        bpy.ops.object.light_add(type="SUN", rotation=(math.radians(90 - elevation), 0, math.radians(rotation + 90)))
        sun = bpy.context.active_object
        sun.data.energy = sun_energy
        sun.data.angle = math.radians(1.2)
        sun.data.color = (1.0, 0.88, 0.72) if elevation < 20 else (1.0, 0.96, 0.9)
    return world


def camera(location, target, lens=28, name="Camera", shift_y=0.0):
    bpy.ops.object.camera_add(location=location)
    cam = bpy.context.active_object
    cam.name = name
    cam.data.lens = lens
    cam.data.shift_y = shift_y
    direction = Vector(target) - Vector(location)
    cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return cam


def render(path, cam, width=1600, height=1067, samples=None):
    scene = bpy.context.scene
    scene.camera = cam
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.resolution_percentage = 100
    if samples:
        scene.cycles.samples = samples
    scene.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("rendered", path, flush=True)


def area_light(location, size, energy, color=(1.0, 0.85, 0.65), rotation=(0, 0, 0), shape="RECTANGLE", size_y=None):
    bpy.ops.object.light_add(type="AREA", location=location, rotation=rotation)
    l = bpy.context.active_object
    l.data.shape = shape
    l.data.size = size
    if size_y:
        l.data.size_y = size_y
    l.data.energy = energy
    l.data.color = color
    return l


def point_light(location, energy, color=(1.0, 0.8, 0.55), radius=0.1):
    bpy.ops.object.light_add(type="POINT", location=location)
    l = bpy.context.active_object
    l.data.energy = energy
    l.data.color = color
    l.data.shadow_soft_size = radius
    return l
