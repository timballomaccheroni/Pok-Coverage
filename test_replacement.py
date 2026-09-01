import json

# Test replacement logic simulation
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
    for atk in types_list:
        mult = 1.0
        for def_t in pokemon['types']:
            mult *= type_chart[atk].get(def_t, 1.0)
        profile[atk] = mult
    return profile

def analyze_team(team):
    valid_members = [p for p in team if p is not None]
    defense = {atk: {'weak': [], 'res': [], 'imm': []} for atk in types_list}
    team_stabs = set()
    for p in valid_members:
        for t in p['types']: team_stabs.add(t)
        prof = get_defensive_profile(p)
        for atk, mult in prof.items():
            if mult >= 2: defense[atk]['weak'].append((p['name'], mult))
            elif mult == 0: defense[atk]['imm'].append((p['name'], mult))
            elif mult <= 0.5: defense[atk]['res'].append((p['name'], mult))
    
    threats = []
    for atk, data in defense.items():
        w_cnt = len(data['weak'])
        d_cnt = len(data['res']) + 2 * len(data['imm'])
        if w_cnt >= 2 and d_cnt == 0: threats.append(atk)
        elif w_cnt >= 3 and d_cnt <= 1: threats.append(atk)
        elif w_cnt > d_cnt and w_cnt >= 2: threats.append(atk)
    
    covered_stabs = []
    for def_t in types_list:
        for st in team_stabs:
            if type_chart[st].get(def_t, 1.0) >= 2.0:
                covered_stabs.append(def_t)
                break

    return defense, threats, covered_stabs

def calc_team_synergy(team):
    defense, threats, covered_stabs = analyze_team(team)
    valid_members = [p for p in team if p is not None]
    if not valid_members: return 0
    score = 0
    for atk, data in defense.items():
        score += len(data['res']) * 12
        score += len(data['imm']) * 28
        score -= len(data['weak']) * 15
        if atk in threats: score -= 70
    score += len(covered_stabs) * 18
    score += sum(p['bst'] for p in valid_members) // 15
    return score

# Kanto Team: Charizard (6), Blastoise (9), Venusaur (3), Pikachu (25), Gengar (94), Snorlax (143)
kanto_team = [
    next(p for p in all_pokemon if p['id'] == 6),
    next(p for p in all_pokemon if p['id'] == 9),
    next(p for p in all_pokemon if p['id'] == 3),
    next(p for p in all_pokemon if p['id'] == 25),
    next(p for p in all_pokemon if p['id'] == 94),
    next(p for p in all_pokemon if p['id'] == 143),
]

current_score = calc_team_synergy(kanto_team)
print(f"Punteggio Squadra Kanto Attuale: {current_score} pt")

# Test replacing each slot with Swampert (260)
swampert = next(p for p in all_pokemon if p['id'] == 260)
print(f"\nSimulazione inserimento Swampert ({swampert['name']}):")

for idx, member in enumerate(kanto_team):
    simulated = list(kanto_team)
    simulated[idx] = swampert
    new_score = calc_team_synergy(simulated)
    delta = new_score - current_score
    print(f" - Sostituendo Slot #{idx+1} ({member['name']}, BST {member['bst']}): Delta = {'+' if delta >= 0 else ''}{delta} pt (Nuovo Score: {new_score})")

# Pikachu (BST 320, mono Electric) being replaced by Swampert (BST 535, Water/Ground) should give the highest delta
delta_pikachu = calc_team_synergy([kanto_team[0], kanto_team[1], kanto_team[2], swampert, kanto_team[4], kanto_team[5]]) - current_score
assert delta_pikachu > 0, "Sostituire Pikachu con Swampert deve migliorare la squadra!"

print("\n[OK] Test simulazione sostituzione completato con successo!")
