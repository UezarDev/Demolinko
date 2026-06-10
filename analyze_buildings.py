import json
from PIL import Image

def analyze_buildings_sheet(image_path, cell_size=80):
    """
    Analyzes a buildings sprite sheet and calculates the pixel mass for each building.
    Outputs a JSON library mapping rank to building index.
    """
    try:
        img = Image.open(image_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening image: {e}")
        return None

    width, height = img.size
    cols = width // cell_size
    rows = height // cell_size
    
    buildings_data = []

    for row in range(rows):
        for col in range(cols):
            # Define the box for the current building
            left = col * cell_size
            top = row * cell_size
            right = left + cell_size
            bottom = top + cell_size
            
            # Crop to the specific building
            crop = img.crop((left, top, right, bottom))
            
            # Count non-transparent pixels
            # Alpha channel is index 3 in RGBA
            pixels = crop.getdata()
            non_transparent_count = sum(1 for pixel in pixels if pixel[3] > 50)
            
            building_index = row * cols + col
            buildings_data.append({
                "index": building_index,
                "mass": non_transparent_count
            })

    # Sort buildings by mass (ascending)
    # Rank 1 = smallest mass, Rank 16 = largest mass

    buildings_data.sort(key=lambda x: x["mass"])

    # Create a final mapping: Rank (1-indexed) -> Building Index
    # This is the "Library" the game engine will use.
    library = {
        "metadata": {
            "total_buildings": len(buildings_data),
            "cell_size": cell_size,
            "image_source": image_path
        },
        "ranks": [b["index"] for b in buildings_data],
        "mass_data": [b["mass"] for b in buildings_data]
    }

    return library

if __name__ == "__main__":
    # Path to the buildings.png
    IMAGE_PATH = "public/buildings.png"
    OUTPUT_FILE = "building_library.json"
    
    print(f"Analyzing {IMAGE_PATH}...")
    library = analyze_buildings_sheet(IMAGE_PATH)
    
    if library:
        print("Analysis complete. Generating library...")
        with open(OUTPUT_FILE, "w") as np_file:
            json.dump(library, np_file, indent=4)
        print(f"Library saved to {OUTPUT_FILE}. You can now import this JSON into your game.")
    else:
        print(f"Failed to analyze {IMAGE_PATH}.")
