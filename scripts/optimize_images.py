"""Create responsive copies from the existing, already anonymized web images."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'asset/img'
# Large PNG masters stay out of the public asset folder; they are not referenced by any page.
MASTERS = ROOT / 'private-source/masters'

def main():
    sources = {
        'business-students': DEST / 'business-students.webp',
        'business-teacher-training': DEST / 'business-teacher-training.webp',
        'business-visiting-training': DEST / 'business-visiting-training.webp',
        'business-lecture-lms': DEST / 'business-lecture-lms.webp',
        'business-education-events-4-blurred': MASTERS / 'business-education-events-4-blurred.png',
        'expo-hall-1536-faces-blurred': MASTERS / 'expo-hall-1536-faces-blurred.png',
    }
    for stem, source in sources.items():
        with Image.open(source) as image:
            image = image.convert('RGB')
            for width in sorted({min(768, image.width), min(1280, image.width), image.width}):
                result = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
                output = DEST / f'{stem}-{width}.webp'
                result.save(output, 'WEBP', quality=82, method=6)
                print(output.name, output.stat().st_size)

if __name__ == '__main__':
    main()
