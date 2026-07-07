from pathlib import Path
from shutil import copy2

import bpy


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "models" / "low_poly_earth.glb"
STATIC_OUTPUT = ROOT / "models" / "low_poly_earth.glb"

MATERIALS = {
    "earth": (0.14, 0.68, 0.18, 1.0),
    "water": (0.06, 0.34, 0.78, 1.0),
}


def set_principled_material(material, color):
    material.diffuse_color = color
    material.use_nodes = True

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new(type="ShaderNodeOutputMaterial")
    shader = nodes.new(type="ShaderNodeBsdfPrincipled")
    output.location = (220, 0)
    shader.location = (0, 0)

    if "Base Color" in shader.inputs:
        shader.inputs["Base Color"].default_value = color
    if "Metallic" in shader.inputs:
        shader.inputs["Metallic"].default_value = 0.0
    if "Roughness" in shader.inputs:
        shader.inputs["Roughness"].default_value = 0.78
    if "Alpha" in shader.inputs:
        shader.inputs["Alpha"].default_value = color[3]

    links.new(shader.outputs["BSDF"], output.inputs["Surface"])


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)

    for material in bpy.data.materials:
        color = MATERIALS.get(material.name.lower(), material.diffuse_color)
        set_principled_material(material, color)

    bpy.ops.object.select_all(action="DESELECT")
    mesh_objects = [obj for obj in bpy.data.objects if obj.type == "MESH"]
    for obj in mesh_objects:
        obj.select_set(True)
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.hide_render = False

    if mesh_objects:
        bpy.context.view_layer.objects.active = mesh_objects[0]

    bpy.ops.export_scene.gltf(
        filepath=str(OUTPUT),
        export_format="GLB",
        use_selection=True,
        export_materials="EXPORT",
        export_apply=False,
        export_yup=True,
    )

    STATIC_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    copy2(OUTPUT, STATIC_OUTPUT)

    print(f"Exported {len(mesh_objects)} mesh object(s) to {OUTPUT}")
    print(f"Copied static-server model to {STATIC_OUTPUT}")


if __name__ == "__main__":
    main()
