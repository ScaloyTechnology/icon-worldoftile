"""Create transparent web PNGs from the client-supplied logo PDF."""

from pathlib import Path
import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "photos" / "Logo" / "ICON Logo Vertical & Horizontal.pdf"
OUTPUT = ROOT / "public" / "brand"


def export(page_number: int, filename: str) -> None:
    document = fitz.open(SOURCE)
    page = document[page_number]
    pixmap = page.get_pixmap(matrix=fitz.Matrix(4, 4), alpha=False)
    image = Image.frombytes("RGB", (pixmap.width, pixmap.height), pixmap.samples).convert("RGBA")
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, _ = pixels[x, y]
            opacity = 255 - min(red, green, blue)
            pixels[x, y] = (0, 0, 0, opacity if opacity > 10 else 0)
    box = image.getbbox()
    if box:
        image = image.crop(box)
    OUTPUT.mkdir(parents=True, exist_ok=True)
    image.save(OUTPUT / filename, optimize=True)


export(0, "icon-logo-vertical.png")
export(2, "icon-logo-horizontal.png")
