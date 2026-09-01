# PokéCoverage - Team Builder & Weakness Coverage Analyzer

Un'applicazione moderna, intuitiva e completa per creare squadre di Pokémon (fino a 6 elementi), analizzare istantaneamente le vulnerabilità e le debolezze senza copertura difensiva, e ottenere raccomandazioni intelligenti e calcolate matematicamente per bilanciare il team.

---

## 🌟 Caratteristiche Principali

1. **Gestione Squadra (6 Slot Pokémon)**:
   - Ricerca istantanea con autocompletamento per tutti i **1025 Pokémon (Gen 1-9)**.
   - Schede dettagliate con artwork ufficiale HD, tipi con colori ufficiali, statistiche base (HP, Atk, Def, SpA, SpD, Spe, BST totale) e ruolo competitivo (Sweeper, Wall Fisico, Wall Speciale, Tank, Bilanciato).
   - Squadre preimpostate pronte all'uso (Kanto Classico, Hyper Offense, Rain Team, Bulky Balance).
   - Importazione / Esportazione compatibile con il formato Pokémon Showdown e testo semplice.
   - Salvataggio automatico persistente in `localStorage` e condivisione tramite URL hash.

2. **Analisi delle Debolezze e Minacce Scoperte**:
   - **Rilevamento Minacce Critiche**: individua i tipi attaccanti contro cui la squadra subisce molteplici debolezze (2x/4x) e ha **0 resistenze o immunità**.
   - Livelli di rischio chiari: `CRITICO`, `ALTO`, `MODERATO`, `SICURO`.
   - **Matrice Difensiva Completa (18 Tipi)**: tabella interattiva che mostra per ciascun tipo quanti Pokémon sono deboli, quanti resistenti, quanti immuni e il bilancio netto.
   - **Copertura Offensiva STAB**: visualizza quali tipi difensivi la squadra è in grado di colpire con danno superefficace e quali sono scoperti.

3. **Suggeritore Intelligente di Pokémon**:
   - Algoritmo euristico avanzato che valuta l'intero Pokédex per trovare il partner ideale:
     - 🛡️ **Immunità e Resistenze Chiave**: prioritizza i Pokémon immuni o resistenti alle debolezze critiche della squadra.
     - ⚔️ **Controffensiva STAB**: premia i Pokémon che colpiscono superefficacemente i tipi che minacciano la squadra o che non sono coperti offensivamente.
     - ⚠️ **Controllo Debolezze Condivise**: penalizza i candidati che aggraverebbero vulnerabilità già scoperte.
     - ⭐ **Qualità Competitiva e BST**: premia Pokémon con statistiche solide.
   - Spiegazioni in italiano per ogni candidato (es. *"Immune a Terra (salva 3 compagni vulnerabili) e resiste a Roccia. Colpisce Acqua e Roccia con STAB Erba"*).
   - Filtri avanzati per Tipo, Ruolo, Generazione (Gen 1-9) e Ricerca rapida.
   - Inserimento rapido con 1 clic direttamente nella squadra.

---

## 🚀 Come Avviare l'Applicazione

### Metodo 1: Avvio con Server Locale Python (Consigliato)
Nel terminale, esegui:
```powershell
cd C:\Users\mikia\.gemini\antigravity\scratch\pokemon-team-builder
python run_app.py
```
Il browser si aprirà automaticamente all'indirizzo `http://localhost:8000/index.html`.

### Metodo 2: Apertura Diretta del file HTML
Puoi anche fare doppio clic direttamente su `index.html` o aprirlo con qualsiasi browser moderno (Chrome, Edge, Firefox, Safari).

---

## 📁 Struttura dei File

- `index.html`: Interfaccia utente moderna e reattiva.
- `style.css`: Stili glassmorphism dark mode con palette ufficiale tipi Pokémon.
- `app.js`: Controller dell'applicazione, gestione slot, filtri, eventi e modali.
- `coverage_engine.js`: Motore di calcolo dell'efficacia dei tipi, minacce e algoritmo di raccomandazione.
- `pokemon_data.js`: Dataset completo dei 1025 Pokémon (Gen 1-9), tabella efficacia 18x18 e team preimpostati.
- `run_app.py`: Server web locale automatico con apertura browser.
- `build_data.py`: Script di estrazione e compilazione dati da PokéAPI.
- `test_engine.py` / `test_simulation.py`: Suite di test automatizzati per verificare la correttezza dei calcoli.
