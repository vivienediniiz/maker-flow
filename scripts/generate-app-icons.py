"""
Gera os ícones de instalação (iOS "Adicionar à Tela de Início" e PWA/Android)
a partir do logo já existente em app/icon.png (512x512, com transparência).

Uso: python scripts/generate-app-icons.py
"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "app", "icon.png")
BG_COLOR = (11, 9, 20, 255)  # #0B0914

def load_source():
    return Image.open(SOURCE).convert("RGBA")

def paste_centered(canvas: Image.Image, logo: Image.Image, target_ratio: float):
    canvas_size = canvas.size[0]
    target_w = int(canvas_size * target_ratio)
    scale = target_w / logo.size[0]
    target_h = int(logo.size[1] * scale)
    resized = logo.resize((target_w, target_h), Image.LANCZOS)
    offset = ((canvas_size - target_w) // 2, (canvas_size - target_h) // 2)
    canvas.paste(resized, offset, resized)
    return canvas

def make_apple_icon():
    # iOS não preserva transparência: fundo sólido da marca, sem alpha.
    size = 180
    canvas = Image.new("RGBA", (size, size), BG_COLOR)
    logo = load_source()
    paste_centered(canvas, logo, target_ratio=0.72)
    out = canvas.convert("RGB")  # remove o canal alpha de vez
    out_path = os.path.join(ROOT, "app", "apple-icon.png")
    out.save(out_path, "PNG")
    print("gerado:", out_path, out.size, out.mode)

def make_any_icon(size: int):
    # Ícone "any" para PWA/Android: mantém transparência original do logo.
    logo = load_source()
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    paste_centered(canvas, logo, target_ratio=0.9)
    out_path = os.path.join(ROOT, "public", "icons", f"icon-{size}.png")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    canvas.save(out_path, "PNG")
    print("gerado:", out_path, canvas.size, canvas.mode)

def make_maskable_icon(size: int = 512):
    # Ícone maskable: fundo sólido opaco (obrigatório) + logo dentro da
    # área de segurança (~60% do canvas, ~40% de margem total ao redor).
    canvas = Image.new("RGBA", (size, size), BG_COLOR)
    logo = load_source()
    paste_centered(canvas, logo, target_ratio=0.6)
    out = canvas.convert("RGB")
    out_path = os.path.join(ROOT, "public", "icons", f"icon-maskable-{size}.png")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out.save(out_path, "PNG")
    print("gerado:", out_path, out.size, out.mode)

if __name__ == "__main__":
    make_apple_icon()
    make_any_icon(192)
    make_any_icon(512)
    make_maskable_icon(512)
