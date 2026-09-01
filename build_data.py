import urllib.request
import json
import concurrent.futures
import time
import os

def get_gen(p_id):
    if p_id <= 151: return 1
    if p_id <= 251: return 2
    if p_id <= 386: return 3
    if p_id <= 493: return 4
    if p_id <= 649: return 5
    if p_id <= 721: return 6
    if p_id <= 809: return 7
    if p_id <= 905: return 8
    return 9

def fetch_pokemon(p_id, retries=3):
    url = f"https://pokeapi.co/api/v2/pokemon/{p_id}"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=8) as response:
                d = json.loads(response.read().decode('utf-8'))
                stats = {}
                for s in d['stats']:
                    sname = s['stat']['name']
                    val = s['base_stat']
                    if sname == 'hp': stats['hp'] = val
                    elif sname == 'attack': stats['atk'] = val
                    elif sname == 'defense': stats['def'] = val
                    elif sname == 'special-attack': stats['spa'] = val
                    elif sname == 'special-defense': stats['spd'] = val
                    elif sname == 'speed': stats['spe'] = val
                
                bst = sum(stats.values())
                # Format name nicely (replace hyphens)
                raw_name = d['name']
                name = raw_name.replace('-', ' ').title()
                
                types = [t['type']['name'] for t in d['types']]
                
                # Determine primary competitive/stat role
                role = "Bilanciato"
                if stats.get('spe', 0) >= 95 and (stats.get('atk', 0) >= 100 or stats.get('spa', 0) >= 100):
                    role = "Sweeper Veloce"
                elif stats.get('def', 0) >= 100 and stats.get('hp', 0) >= 80:
                    role = "Wall Fisico"
                elif stats.get('spd', 0) >= 100 and stats.get('hp', 0) >= 80:
                    role = "Wall Speciale"
                elif stats.get('hp', 0) >= 100 and (stats.get('atk', 0) >= 90 or stats.get('def', 0) >= 90):
                    role = "Tank Resistente"
                elif stats.get('atk', 0) >= 115 or stats.get('spa', 0) >= 115:
                    role = "Attaccante Pesante"

                return {
                    'id': p_id,
                    'name': name,
                    'types': types,
                    'stats': stats,
                    'bst': bst,
                    'gen': get_gen(p_id),
                    'role': role,
                    'sprite': f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{p_id}.png",
                    'thumb': f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{p_id}.png"
                }
        except Exception as e:
            time.sleep(0.5 * (attempt + 1))
    return None

def main():
    print("Inizio download dati Pokémon (1-1025)...")
    results = [None] * 1025
    with concurrent.futures.ThreadPoolExecutor(max_workers=40) as executor:
        future_to_id = {executor.submit(fetch_pokemon, i): i for i in range(1, 1026)}
        completed = 0
        for future in concurrent.futures.as_completed(future_to_id):
            p_id = future_to_id[future]
            try:
                data = future.result()
                if data:
                    results[p_id - 1] = data
            except Exception as e:
                print(f"Errore ID {p_id}: {e}")
            completed += 1
            if completed % 100 == 0 or completed == 1025:
                print(f"Progresso: {completed}/1025 completati...")
    
    valid_pokemon = [p for p in results if p is not None]
    print(f"Download completato: {len(valid_pokemon)} Pokémon raccolti.")
    
    # 18 Types definition and Gen 6-9 Type Chart
    type_names_it = {
        'normal': 'Normale',
        'fire': 'Fuoco',
        'water': 'Acqua',
        'grass': 'Erba',
        'electric': 'Elettro',
        'ice': 'Ghiaccio',
        'fighting': 'Lotta',
        'poison': 'Veleno',
        'ground': 'Terra',
        'flying': 'Volante',
        'psychic': 'Psico',
        'bug': 'Coleottero',
        'rock': 'Roccia',
        'ghost': 'Spettro',
        'dragon': 'Drago',
        'steel': 'Acciaio',
        'dark': 'Buio',
        'fairy': 'Folletto'
    }

    type_colors = {
        'normal': '#A8A77A',
        'fire': '#EE8130',
        'water': '#6390F0',
        'grass': '#7AC74C',
        'electric': '#F7D02C',
        'ice': '#96D9D6',
        'fighting': '#C22E28',
        'poison': '#A33EA1',
        'ground': '#E2BF65',
        'flying': '#A98FF3',
        'psychic': '#F95587',
        'bug': '#A6B91A',
        'rock': '#B6A136',
        'ghost': '#735797',
        'dragon': '#6F35FC',
        'steel': '#B7B7CE',
        'dark': '#705746',
        'fairy': '#D685AD'
    }

    # Type effectiveness matrix: TYPE_CHART[attacker][defender] = multiplier
    types_list = [
        'normal', 'fire', 'water', 'grass', 'electric', 'ice',
        'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
        'rock', 'ghost', 'dragon', 'steel', 'dark', 'fairy'
    ]

    type_chart = {
        'normal': {'rock': 0.5, 'ghost': 0, 'steel': 0.5},
        'fire': {'fire': 0.5, 'water': 0.5, 'grass': 2, 'ice': 2, 'bug': 2, 'rock': 0.5, 'dragon': 0.5, 'steel': 2},
        'water': {'fire': 2, 'water': 0.5, 'grass': 0.5, 'ground': 2, 'rock': 2, 'dragon': 0.5},
        'grass': {'fire': 0.5, 'water': 2, 'grass': 0.5, 'poison': 0.5, 'ground': 2, 'flying': 0.5, 'bug': 0.5, 'rock': 2, 'dragon': 0.5, 'steel': 0.5},
        'electric': {'water': 2, 'grass': 0.5, 'electric': 0.5, 'ground': 0, 'flying': 2, 'dragon': 0.5},
        'ice': {'fire': 0.5, 'water': 0.5, 'grass': 2, 'ice': 0.5, 'ground': 2, 'flying': 2, 'dragon': 2, 'steel': 0.5},
        'fighting': {'normal': 2, 'ice': 2, 'poison': 0.5, 'flying': 0.5, 'psychic': 0.5, 'bug': 0.5, 'rock': 2, 'ghost': 0, 'dark': 2, 'steel': 2, 'fairy': 0.5},
        'poison': {'grass': 2, 'poison': 0.5, 'ground': 0.5, 'rock': 0.5, 'ghost': 0.5, 'steel': 0, 'fairy': 2},
        'ground': {'fire': 2, 'grass': 0.5, 'electric': 2, 'poison': 2, 'flying': 0, 'bug': 0.5, 'rock': 2, 'steel': 2},
        'flying': {'grass': 2, 'electric': 0.5, 'fighting': 2, 'bug': 2, 'rock': 0.5, 'steel': 0.5},
        'psychic': {'fighting': 2, 'poison': 2, 'psychic': 0.5, 'dark': 0, 'steel': 0.5},
        'bug': {'fire': 0.5, 'grass': 2, 'fighting': 0.5, 'poison': 0.5, 'flying': 0.5, 'psychic': 2, 'ghost': 0.5, 'steel': 0.5, 'fairy': 0.5},
        'rock': {'fire': 2, 'ice': 2, 'fighting': 0.5, 'ground': 0.5, 'flying': 2, 'bug': 2, 'steel': 0.5},
        'ghost': {'normal': 0, 'psychic': 2, 'ghost': 2, 'dark': 0.5},
        'dragon': {'dragon': 2, 'steel': 0.5, 'fairy': 0},
        'steel': {'fire': 0.5, 'water': 0.5, 'electric': 0.5, 'ice': 2, 'rock': 2, 'steel': 0.5, 'fairy': 2},
        'dark': {'fighting': 0.5, 'psychic': 2, 'ghost': 2, 'dark': 0.5, 'fairy': 0.5},
        'fairy': {'fire': 0.5, 'fighting': 2, 'poison': 0.5, 'dragon': 2, 'dark': 2, 'steel': 0.5}
    }

    # Fill full 18x18 table with 1.0 default
    full_chart = {}
    for atk in types_list:
        full_chart[atk] = {}
        for dfn in types_list:
            full_chart[atk][dfn] = type_chart.get(atk, {}).get(dfn, 1.0)

    # Preset teams
    presets = [
        {
            "name": "Classico Kanto (Gen 1)",
            "description": "Squadra iconica e bilanciata della prima generazione.",
            "pokemon_ids": [6, 9, 3, 25, 94, 143] # Charizard, Blastoise, Venusaur, Pikachu, Gengar, Snorlax
        },
        {
            "name": "Hyper Offense Competitivo",
            "description": "Team ultra aggressivo con elevata velocità e coperture offensive devastanti.",
            "pokemon_ids": [445, 658, 212, 1005, 987, 887] # Garchomp, Greninja, Scizor, Roaring Moon, Flutter Mane, Dragapult
        },
        {
            "name": "Rain Team (Sinergia Pioggia)",
            "description": "Sinergia basata sull'Acqua con coperture ad Elettro ed Erba.",
            "pokemon_ids": [186, 260, 272, 379, 130, 479] # Politoed, Swampert, Ludicolo, Registeel, Gyarados, Rotom-Wash
        },
        {
            "name": "Bulky Balance (Difesa Solida)",
            "description": "Core difensivo roccioso con pivots e rigeneratori.",
            "pokemon_ids": [598, 423, 227, 472, 242, 609] # Ferrothorn, Gastrodon, Skarmory, Gliscor, Blissey, Chandelure
        }
    ]

    out_js = f"""// PokéCoverage Dataset - Auto-generated
window.POKEMON_TYPES = {json.dumps(types_list, indent=2)};
window.TYPE_NAMES_IT = {json.dumps(type_names_it, ensure_ascii=False, indent=2)};
window.TYPE_COLORS = {json.dumps(type_colors, indent=2)};
window.TYPE_CHART = {json.dumps(full_chart, indent=2)};
window.PRESET_TEAMS = {json.dumps(presets, ensure_ascii=False, indent=2)};
window.ALL_POKEMON = {json.dumps(valid_pokemon, ensure_ascii=False, indent=2)};
"""

    out_path = os.path.join(os.path.dirname(__file__), 'pokemon_data.js')
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(out_js)

    print(f"File scritto con successo in: {out_path}")

if __name__ == '__main__':
    main()
