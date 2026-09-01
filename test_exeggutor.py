import json

with open('pokemon_data.js', 'r', encoding='utf-8') as f:
    content = f.read()

def extract_js_var(var_name):
    prefix = f"window.{var_name} = "
    start = content.find(prefix) + len(prefix)
    end = content.find(";\nwindow.", start)
    if end == -1: end = content.rfind(";")
    return json.loads(content[start:end].strip())

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
    valid_members = [p for p in team if p is not None]
    if not valid_members: return 0
    defense, threats, covered_stabs = analyze_team(valid_members)
    score = 0
    for atk, data in defense.items():
        score += len(data['res']) * 12
        score += len(data['imm']) * 28
        score -= len(data['weak']) * 15
        if atk in threats: score -= 70
    score += len(covered_stabs) * 18
    score += sum(p['bst'] for p in valid_members) // 15
    return score

# Kanto team
kanto_team = [
    next(p for p in all_pokemon if p['id'] == 6),   # Charizard
    next(p for p in all_pokemon if p['id'] == 9),   # Blastoise
    next(p for p in all_pokemon if p['id'] == 3),   # Venusaur
    next(p for p in all_pokemon if p['id'] == 25),  # Pikachu
    next(p for p in all_pokemon if p['id'] == 94),  # Gengar
    next(p for p in all_pokemon if p['id'] == 143), # Snorlax
]

curr_score = calc_team_synergy(kanto_team)
print(f"Squadra Base: {curr_score} pt")

# Evaluate Exeggutor (103)
exeggutor = next(p for p in all_pokemon if p['id'] == 103)
print(f"\nValutazione Exeggutor ({exeggutor['name']}, Tipi: {exeggutor['types']}, BST: {exeggutor['bst']}):")
deltas = []
for i, member in enumerate(kanto_team):
    sim = list(kanto_team)
    sim[i] = exeggutor
    sc = calc_team_synergy(sim)
    d = sc - curr_score
    deltas.append((d, member['name'], i))
    print(f" - Sostituendo {member['name']}: {d:+d} pt (Nuovo Score: {sc})")

best_delta, best_member, best_slot = max(deltas, key=lambda x: x[0])
print(f"\n=> Sostituzione Migliore per Exeggutor: Sostituisce {best_member} con Delta = {best_delta:+d} pt")
