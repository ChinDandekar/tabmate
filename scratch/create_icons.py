import os
from PIL import Image, ImageDraw

def create_icon(size, filename):
    # Create olive green base
    img = Image.new('RGB', (size, size), color='#4A6741')
    draw = ImageDraw.Draw(img)
    
    # Draw simple elegant letter 'T' in off-white (Libre Baskerville style)
    # T is centered
    font_size = int(size * 0.6)
    
    # Draw simple serif 'T' shape using polygons
    # Stem: center column
    cw = int(size * 0.12)
    stem_left = (size - cw) // 2
    stem_right = stem_left + cw
    stem_top = int(size * 0.28)
    stem_bottom = int(size * 0.72)
    
    # Crossbar: top bar
    bar_h = int(size * 0.12)
    bar_left = int(size * 0.25)
    bar_right = int(size * 0.75)
    bar_top = stem_top - bar_h
    bar_bottom = stem_top
    
    # Draw Crossbar
    draw.rectangle([bar_left, bar_top, bar_right, bar_bottom], fill='#FDFAF4')
    # Draw Stem
    draw.rectangle([stem_left, stem_top, stem_right, stem_bottom], fill='#FDFAF4')
    
    # Serifs at base
    serif_w = int(size * 0.22)
    serif_h = int(size * 0.06)
    s_left = (size - serif_w) // 2
    s_right = s_left + serif_w
    draw.rectangle([s_left, stem_bottom, s_right, stem_bottom + serif_h], fill='#FDFAF4')
    
    # Make directory if not exists
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    img.save(filename)
    print(f"Created {filename} at {size}x{size}")

create_icon(192, 'icons/icon-192.png')
create_icon(512, 'icons/icon-512.png')
