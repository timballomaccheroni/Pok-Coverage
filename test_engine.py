import json

# Load generated data
with open('pokemon_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract JSON chunks
def extract_js_var(var_name):
    prefix = f"window.{var_name} = "
    start = content.find(prefix) + len(prefix)
    end = content.find(";\nwindow.", start)
    if end == -1:
        end = content.rfind(";")
    raw = content[start:end].strip()
    return json.loads(raw)

types_list = extract_js_var('POKEMON_TYPES')
type_names_it = extract_js_var('TYPE_NAMES_IT')
type_colors = extract_js_var('TYPE_COLORS')
type_chart = extract_js_var('TYPE_CHART')
all_pokemon = extract_js_var('ALL_POKEMON')
presets = extract_js_var('PRESET_TEAMS')

print(f"Caricati {len(all_pokemon)} Pokémon e {len(types_list)} tipi.")

# Verify Charizard (Fuoco / Volante)
charizard = next(p for p in all_pokemon if p['id'] == 6)
print(f"Test Charizard: ID={charizard['id']}, Tipi={charizard['types']}")

# Rock vs Fire/Flying = 2 * 2 = 4x
rock_mult = type_chart['rock']['fire'] * type_chart['rock']['flying']
print(f"Roccia vs Charizard: {rock_mult}x (Atteso: 4.0x)")
assert rock_mult == 4.0

# Ground vs Fire/Flying = 2 * 0 = 0x
ground_mult = type_chart['ground']['fire'] * type_chart['ground']['flying']
print(f"Terra vs Charizard: {ground_mult}x (Atteso: 0.0x)")
assert ground_mult == 0.0

# Water vs Fire/Flying = 2 * 1 = 2x
water_mult = type_chart['water']['fire'] * type_chart['water']['flying']
print(f"Acqua vs Charizard: {water_mult}x (Atteso: 2.0x)")
assert water_mult == 2.0

# Grass vs Fire/Flying = 0.5 * 0.5 = 0.25x
grass_mult = type_chart['grass']['fire'] * type_chart['grass']['flying']
print(f"Erba vs Charizard: {grass_mult}x (Atteso: 0.25x)")
assert grass_mult == 0.25

print("\n--- Test superato con successo! ---")
