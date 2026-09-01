import json

# Load data and check full simulation
with open('pokemon_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

def extract_js_var(var_name):
    prefix = f"window.{var_name} = "
    start = content.find(prefix) + len(prefix)
    end = content.find(";\nwindow.", start)
    if end == -1:
        end = content.rfind(";")
    raw = content[start:end].strip()
    return json.loads(raw)

types_list = extract_js_var('POKEMON_TYPES')
type_chart = extract_js_var('TYPE_CHART')
all_pokemon = extract_js_var('ALL_POKEMON')

def get_defensive_profile(pokemon):
    profile = {}
    types = pokemon['types']
    for atk in types_list:
        mult = 1.0
        for def_t in types:
            mult *= type_chart[atk].get(def_t, 1.0)
        profile[atk] = mult
    return profile

def analyze_team(team):
    defense = {atk: {'weak': [], 'res': [], 'imm': []} for atk in types_list}
    for p in team:
        prof = get_defensive_profile(p)
        for atk, mult in prof.items():
            if mult >= 2: defense[atk]['weak'].append((p['name'], mult))
            elif mult == 0: defense[atk]['imm'].append((p['name'], mult))
            elif mult <= 0.5: defense[atk]['res'].append((p['name'], mult))
    
    threats = []
    for atk, data in defense.items():
        weak_count = len(data['weak'])
        def_count = len(data['res']) + 2 * len(data['imm'])
        if weak_count >= 2 and def_count == 0:
            threats.append((atk, 'CRITICO', weak_count, def_count))
        elif weak_count > def_count and weak_count >= 2:
            threats.append((atk, 'ALTO', weak_count, def_count))
    return defense, threats

# Test Team: Charizard (6), Talonflame (663), Volcarona (637)
charizard = next(p for p in all_pokemon if p['id'] == 6)
talonflame = next(p for p in all_pokemon if p['id'] == 663)
volcarona = next(p for p in all_pokemon if p['id'] == 637)

team = [charizard, talonflame, volcarona]
defense, threats = analyze_team(team)

print(f"Squadra di test: {[p['name'] for p in team]}")
print("Minacce scoperte rilevate:")
for t in threats:
    print(f" - Tipo: {t[0].upper()}, Gravità: {t[1]}, Deboli: {t[2]}, Difensori: {t[3]}")

rock_threat = next((t for t in threats if t[0] == 'rock'), None)
water_threat = next((t for t in threats if t[0] == 'water'), None)

assert rock_threat is not None, "Roccia deve essere rilevata come minaccia!"
assert rock_threat[1] == 'CRITICO', "Roccia deve essere una minaccia CRITICA!"
assert water_threat is not None, "Acqua deve essere rilevata come minaccia!"

print("\n--- Verifica Algoritmo Raccomandazione ---")
# Swampert (Water/Ground) resists Rock, immune to Electric, hits Rock & Fire supereffectively
swampert = next(p for p in all_pokemon if p['id'] == 260)
swampert_prof = get_defensive_profile(swampert)
print(f"Swampert vs Roccia: {swampert_prof['rock']}x (Resistente)")
print(f"Swampert vs Elettro: {swampert_prof['electric']}x (Immune)")
print(f"Swampert vs Acqua: {swampert_prof['water']}x (Neutro)")

assert swampert_prof['rock'] <= 0.5
assert swampert_prof['electric'] == 0.0

print("\n[OK] Tutti i test di logica e copertura sono superati con successo!")
