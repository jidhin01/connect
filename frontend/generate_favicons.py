from PIL import Image
import os

def generate_favicons(source_path, output_dir):
    """
    Generates favicons for various devices and browsers from a source image.
    """
    if not os.path.exists(source_path):
        print(f"Error: Source image not found at {source_path}")
        return

    img = Image.open(source_path)
    
    # Ensure output directory exists
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # 1. favicon.ico (Multiple sizes in one file)
    # Standard sizes for ico: 16x16, 32x32, 48x48
    img.save(os.path.join(output_dir, 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48)])
    print("Generated favicon.ico")

    # 2. PNG Favicons for modern browsers
    sizes_png = {
        'favicon-16x16.png': (16, 16),
        'favicon-32x32.png': (32, 32),
    }

    for name, size in sizes_png.items():
        resized_img = img.resize(size, Image.Resampling.LANCZOS)
        resized_img.save(os.path.join(output_dir, name))
        print(f"Generated {name}")

    # 3. Apple Touch Icon (iOS)
    # Standard size: 180x180
    apple_icon = img.resize((180, 180), Image.Resampling.LANCZOS)
    apple_icon.save(os.path.join(output_dir, 'apple-touch-icon.png'))
    print("Generated apple-touch-icon.png")

    # 4. Android Chrome Icons
    # Standard sizes: 192x192, 512x512
    android_sizes = {
        'android-chrome-192x192.png': (192, 192),
        'android-chrome-512x512.png': (512, 512)
    }

    for name, size in android_sizes.items():
        resized_img = img.resize(size, Image.Resampling.LANCZOS)
        resized_img.save(os.path.join(output_dir, name))
        print(f"Generated {name}")

    print("Favicon generation complete!")

if __name__ == "__main__":
    # Adjust paths as needed
    SOURCE_IMAGE = 'public/image.png' # Assumes running from frontend root
    OUTPUT_DIR = 'public'
    
    generate_favicons(SOURCE_IMAGE, OUTPUT_DIR)
