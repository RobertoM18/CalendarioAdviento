from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path(__file__).resolve().parent.parent
im = Image.new('RGB', (1200, 630), '#FFFAF7')
d = ImageDraw.Draw(im)
d.rounded_rectangle((30, 30, 1170, 600), radius=20, outline='#E8D7DD', width=2)
d.ellipse((-160, -200, 400, 360), fill='#FAEBEE')
d.ellipse((890, 330, 1390, 830), fill='#F0EAF5')
d.rounded_rectangle((487, 105, 713, 250), radius=6, fill='#F4DAD6', outline='#DAB4B8', width=2)
d.polygon([(487, 105), (713, 105), (600, 200)], fill='#F9E5DF')
d.ellipse((580, 173, 620, 213), fill='#A65D78')
d.text((600, 194), '♥', fill='#FFF5E9', font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 24), anchor='mm')
d.text((600, 330), 'Diciembre contigo', fill='#765262', font=ImageFont.truetype('C:/Windows/Fonts/georgia.ttf', 66), anchor='mm')
d.text((600, 415), 'Un pequeño regalo para una persona muy especial.', fill='#A17D8C', font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 25), anchor='mm')
d.text((600, 520), '15 DÍAS · UN DICIEMBRE PARA GUARDAR SIEMPRE', fill='#A17D8C', font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17), anchor='mm')
im.save(root / 'public' / 'og-cover.png')
print('public/og-cover.png generado: 1200 × 630')
