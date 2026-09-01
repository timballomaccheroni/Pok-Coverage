/**
 * PokéCoverage Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Coverage Engine
  const engine = new CoverageEngine(
    window.POKEMON_TYPES,
    window.TYPE_NAMES_IT,
    window.TYPE_COLORS,
    window.TYPE_CHART,
    window.ALL_POKEMON
  );

  // App State
  let team = [null, null, null, null, null, null];
  let activeSlotIndex = 0;

  // DOM Elements
  const teamGrid = document.getElementById('teamGrid');
  const teamCountBadge = document.getElementById('teamCountBadge');
  const threatList = document.getElementById('threatList');
  const matrixTableBody = document.getElementById('matrixTableBody');
  const offensiveCoverageWrap = document.getElementById('offensiveCoverageWrap');
  const recsGrid = document.getElementById('recsGrid');
  const presetSelect = document.getElementById('presetSelect');
  const btnClearTeam = document.getElementById('btnClearTeam');
  const btnImportExport = document.getElementById('btnImportExport');

  // Recommendation Filters
  const recTypeFilter = document.getElementById('recTypeFilter');
  const recRoleFilter = document.getElementById('recRoleFilter');
  const recGenFilter = document.getElementById('recGenFilter');
  const recSearchInput = document.getElementById('recSearchInput');

  // Search Modal Elements
  const searchModal = document.getElementById('searchModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalTitle = document.getElementById('modalTitle');
  const pokemonSearchInput = document.getElementById('pokemonSearchInput');
  const modalGenFilter = document.getElementById('modalGenFilter');
  const modalTypeFilter = document.getElementById('modalTypeFilter');
  const searchResultsGrid = document.getElementById('searchResultsGrid');

  // Import/Export Modal Elements
  const importExportModal = document.getElementById('importExportModal');
  const importModalCloseBtn = document.getElementById('importModalCloseBtn');
  const importExportTextarea = document.getElementById('importExportTextarea');
  const btnCopyExport = document.getElementById('btnCopyExport');
  const btnLoadImport = document.getElementById('btnLoadImport');

  // Initialize Type Select Options
  function initTypeSelects() {
    window.POKEMON_TYPES.forEach(t => {
      const name = engine.getTypeName(t);
      
      const optRec = document.createElement('option');
      optRec.value = t;
      optRec.textContent = name;
      recTypeFilter.appendChild(optRec);

      const optMod = document.createElement('option');
      optMod.value = t;
      optMod.textContent = name;
      modalTypeFilter.appendChild(optMod);
    });

    // Populate Presets
    (window.PRESET_TEAMS || []).forEach((preset, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `⚡ ${preset.name}`;
      presetSelect.appendChild(opt);
    });
  }

  // Load Saved Team from localStorage or URL Hash
  function loadInitialTeam() {
    try {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        const ids = hash.split(',').map(id => parseInt(id, 10)).filter(id => !isNaN(id));
        if (ids.length > 0) {
          team = [null, null, null, null, null, null];
          ids.slice(0, 6).forEach((id, idx) => {
            const p = window.ALL_POKEMON.find(item => item.id === id);
            if (p) team[idx] = p;
          });
          return;
        }
      }

      const saved = localStorage.getItem('pokecoverage_team');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          team = [null, null, null, null, null, null];
          parsed.slice(0, 6).forEach((item, idx) => {
            if (item && item.id) {
              const p = window.ALL_POKEMON.find(x => x.id === item.id);
              if (p) team[idx] = p;
            }
          });
          return;
        }
      }

      // Default Starter Team (Balanced Popular)
      loadPresetByIndex(0);
    } catch (e) {
      console.warn('Errore nel caricamento del team:', e);
      loadPresetByIndex(0);
    }
  }

  // Save Team
  function saveTeamState() {
    try {
      const valid = team.map(p => p ? { id: p.id, name: p.name } : null);
      localStorage.setItem('pokecoverage_team', JSON.stringify(valid));
      
      const ids = team.filter(p => p !== null).map(p => p.id);
      if (ids.length > 0) {
        window.history.replaceState(null, '', `#${ids.join(',')}`);
      } else {
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (e) {}
  }

  // Render Team Slots
  function renderTeamSlots() {
    teamGrid.innerHTML = '';
    const activeCount = team.filter(p => p !== null).length;
    teamCountBadge.textContent = `${activeCount} / 6 Pokémon`;

    team.forEach((pokemon, index) => {
      const slot = document.createElement('div');
      slot.className = `team-slot ${pokemon ? 'filled' : 'empty'}`;

      if (!pokemon) {
        slot.innerHTML = `
          <div class="empty-slot-content">
            <div class="plus-icon-circle">+</div>
            <div class="empty-slot-text">Slot #${index + 1}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Clicca per inserire</div>
          </div>
        `;
        slot.addEventListener('click', () => openSearchModal(index));
      } else {
        const typeBadges = pokemon.types.map(t => 
          `<span class="type-badge" style="background: ${engine.getTypeColor(t)};">${engine.getTypeName(t)}</span>`
        ).join('');

        slot.innerHTML = `
          <div class="slot-header">
            <span class="slot-number">#${String(pokemon.id).padStart(4, '0')}</span>
            <div class="slot-actions">
              <button class="slot-btn replace-btn" title="Sostituisci Pokémon" data-index="${index}">
                🔍
              </button>
              <button class="slot-btn remove remove-btn" title="Rimuovi Pokémon" data-index="${index}">
                🗑️
              </button>
            </div>
          </div>

          <div class="pokemon-img-wrap">
            <img class="pokemon-img" src="${pokemon.sprite}" alt="${pokemon.name}" loading="lazy" onerror="this.src='${pokemon.thumb}';">
          </div>

          <div class="pokemon-name">${pokemon.name}</div>
          <div class="type-badges-wrap">${typeBadges}</div>

          <div class="card-stats-row">
            <div class="stat-item"><span class="stat-label">BST</span><span class="stat-val" style="color: var(--text-accent);">${pokemon.bst}</span></div>
            <div class="stat-item"><span class="stat-label">ATK</span><span class="stat-val">${pokemon.stats.atk}</span></div>
            <div class="stat-item"><span class="stat-label">DEF</span><span class="stat-val">${pokemon.stats.def}</span></div>
            <div class="stat-item"><span class="stat-label">SPA</span><span class="stat-val">${pokemon.stats.spa}</span></div>
            <div class="stat-item"><span class="stat-label">SPD</span><span class="stat-val">${pokemon.stats.spd}</span></div>
            <div class="stat-item"><span class="stat-label">SPE</span><span class="stat-val">${pokemon.stats.spe}</span></div>
          </div>
        `;

        slot.querySelector('.replace-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          openSearchModal(index);
        });

        slot.querySelector('.remove-btn').addEventListener('click', (e) => {
          e.stopPropagation();
          removePokemon(index);
        });
      }

      teamGrid.appendChild(slot);
    });
  }

  // Render Coverage & Threat Dashboard
  function renderCoverageDashboard() {
    const analysis = engine.analyzeTeam(team);
    const validCount = analysis.memberCount;

    // 1. Render Uncovered Weaknesses & Threat Alerts
    threatList.innerHTML = '';

    if (validCount === 0) {
      threatList.innerHTML = `
        <div class="no-threats-card" style="background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.3); color: #c7d2fe;">
          <div style="font-size: 1.3rem;">ℹ️</div>
          <div style="font-weight: 700;">Squadra Vuota</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">Aggiungi almeno un Pokémon per iniziare l'analisi delle debolezze.</div>
        </div>
      `;
    } else if (analysis.uncoveredWeaknesses.length === 0) {
      threatList.innerHTML = `
        <div class="no-threats-card">
          <div style="font-size: 1.5rem;">🎉</div>
          <div style="font-weight: 700; font-size: 0.95rem;">Nessuna Debolezza Critica Scoperta!</div>
          <div style="font-size: 0.8rem;">La tua squadra ha ottime coperture difensive e resistenze per tutti i tipi minacciosi.</div>
        </div>
      `;
    } else {
      analysis.uncoveredWeaknesses.forEach(entry => {
        const card = document.createElement('div');
        const levelClass = entry.threatLevel.toLowerCase();
        card.className = `threat-card ${levelClass}`;

        const weakMembersHtml = entry.weaknesses.map(w => `
          <div class="mini-thumb-wrap">
            <img class="mini-thumb" src="${w.pokemon.thumb}" alt="${w.pokemon.name}">
            <span>${w.pokemon.name}</span>
            <span class="multiplier-tag">${w.mult}x</span>
          </div>
        `).join('');

        const resCount = entry.resistances.length;
        const immCount = entry.immunities.length;
        const defenseNote = (resCount + immCount === 0) 
          ? `<span style="color: #f87171; font-weight: 700;">Nessun Pokémon resistente o immune nel team!</span>`
          : `Solo ${resCount + immCount} difensore/i (${resCount} resistenze, ${immCount} immunità)`;

        card.innerHTML = `
          <div class="threat-header">
            <div class="threat-title-group">
              <span class="type-badge" style="background: ${entry.color};">${entry.typeName}</span>
              <span class="threat-level-badge">${entry.threatLevel}</span>
            </div>
            <button class="btn btn-sm btn-primary filter-threat-btn" data-type="${entry.type}">
              🛡️ Trova Copertura per ${entry.typeName}
            </button>
          </div>
          
          <div class="threat-details">
            <div><strong>${entry.weaknesses.length} Pokémon vulnerabili:</strong></div>
            <div class="threat-members">${weakMembersHtml}</div>
          </div>

          <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
            ⚠️ <strong>Stato Difensivo:</strong> ${defenseNote}
          </div>
        `;

        card.querySelector('.filter-threat-btn').addEventListener('click', () => {
          recTypeFilter.value = 'all';
          recSearchInput.value = '';
          // Highlight and scroll to recommendations with auto-focus
          document.querySelector('.recommendations-section').scrollIntoView({ behavior: 'smooth' });
          updateRecommendations();
        });

        threatList.appendChild(card);
      });
    }

    // 2. Render Full 18-Type Defense Matrix Table
    matrixTableBody.innerHTML = '';
    window.POKEMON_TYPES.forEach(atkType => {
      const entry = analysis.defenseAnalysis[atkType];
      const tr = document.createElement('tr');

      const weakHtml = entry.weaknesses.length > 0 
        ? `<span class="badge-count badge-weak">${entry.weaknesses.length}</span>` 
        : `<span style="color: var(--text-muted);">-</span>`;

      const resHtml = entry.resistances.length > 0 
        ? `<span class="badge-count badge-res">${entry.resistances.length}</span>` 
        : `<span style="color: var(--text-muted);">-</span>`;

      const immHtml = entry.immunities.length > 0 
        ? `<span class="badge-count badge-imm">${entry.immunities.length}</span>` 
        : `<span style="color: var(--text-muted);">-</span>`;

      let netClass = 'good';
      let netSign = '+';
      const netVal = (entry.resistances.length + 2 * entry.immunities.length) - entry.weaknesses.length;
      if (netVal < 0) {
        netClass = 'bad';
        netSign = '';
      } else if (netVal === 0 && entry.weaknesses.length > 0) {
        netClass = 'warn';
      }

      tr.innerHTML = `
        <td>
          <div class="table-type-col">
            <span class="type-badge" style="background: ${entry.color}; padding: 2px 7px; font-size: 0.68rem;">${entry.typeName}</span>
          </div>
        </td>
        <td>${weakHtml}</td>
        <td>${resHtml}</td>
        <td>${immHtml}</td>
        <td><span class="net-badge ${netClass}">${validCount === 0 ? '-' : (netSign + netVal)}</span></td>
      `;

      matrixTableBody.appendChild(tr);
    });

    // 3. Render Offensive STAB Coverage Pills
    offensiveCoverageWrap.innerHTML = '';
    window.POKEMON_TYPES.forEach(defType => {
      const entry = analysis.offensiveCoverage[defType];
      const pill = document.createElement('div');
      pill.className = `coverage-pill ${entry.isCovered ? 'covered' : 'uncovered'}`;
      
      const icon = entry.isCovered ? '✅' : '❌';
      const stabsInfo = entry.isCovered 
        ? `(${entry.effectiveStabs.map(s => engine.getTypeName(s)).join(', ')})`
        : '';

      pill.innerHTML = `
        <span class="type-badge" style="background: ${entry.color}; padding: 1px 6px; font-size: 0.65rem;">${entry.defendingTypeName}</span>
        <span>${icon} ${entry.isCovered ? 'Coperto' : 'Scoperto'}</span>
        <span style="font-size: 0.7rem; color: var(--text-muted);">${stabsInfo}</span>
      `;

      offensiveCoverageWrap.appendChild(pill);
    });
  }

  // Update and Render Recommendations
  function updateRecommendations() {
    const options = {
      typeFilter: recTypeFilter.value,
      roleFilter: recRoleFilter.value,
      genFilter: parseInt(recGenFilter.value, 10),
      searchQuery: recSearchInput.value.trim(),
      limit: 18
    };

    const recommendations = engine.getSmartRecommendations(team, options);
    recsGrid.innerHTML = '';

    if (recommendations.length === 0) {
      recsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 30px; text-align: center; color: var(--text-muted); background: var(--bg-subtle); border-radius: var(--radius-md);">
          Nessun Pokémon trovato con i filtri selezionati. Prova a modificare i filtri o la ricerca.
        </div>
      `;
      return;
    }

    const activeCount = team.filter(p => p !== null).length;

    recommendations.forEach(rec => {
      const p = rec.pokemon;
      const card = document.createElement('div');
      card.className = 'rec-card';

      const typeBadges = p.types.map(t => 
        `<span class="type-badge" style="background: ${engine.getTypeColor(t)}; font-size: 0.65rem; padding: 2px 7px;">${engine.getTypeName(t)}</span>`
      ).join('');

      const reasonsHtml = rec.reasons.map(r => {
        let typeClass = 'rec-reason-neutral';
        let text = '';
        if (typeof r === 'object' && r !== null) {
          typeClass = `rec-reason-${r.type || 'neutral'}`;
          text = r.text || '';
        } else {
          text = String(r);
        }
        return `
          <div class="rec-reason-item ${typeClass}">
            <span>${text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</span>
          </div>
        `;
      }).join('');

      const sign = rec.score >= 0 ? '+' : '';
      let scoreBadgeText = `⭐ Sinergia ${sign}${rec.score} pt`;
      let badgeStyle = '';

      if (activeCount >= 6 && rec.bestReplacement && rec.bestReplacement.currentMember) {
        scoreBadgeText = `⭐ Sinergia ${sign}${rec.score} pt (sostituisce ${rec.bestReplacement.currentMember.name})`;
      } else if (activeCount < 6) {
        scoreBadgeText = `⭐ Sinergia ${sign}${rec.score} pt`;
      }

      if (rec.score < 0) {
        badgeStyle = 'background: rgba(239, 68, 68, 0.2); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.5);';
      }

      card.innerHTML = `
        <div class="rec-header">
          <div class="rec-avatar-wrap">
            <img class="rec-avatar" src="${p.thumb}" alt="${p.name}" loading="lazy">
          </div>
          <div class="rec-info">
            <div class="rec-score-badge" style="${badgeStyle}">${scoreBadgeText}</div>
            <div class="rec-name">${p.name} <span style="font-size: 0.75rem; color: var(--text-muted);">#${p.id}</span></div>
            <div class="type-badges-wrap" style="justify-content: flex-start; margin-bottom: 2px;">${typeBadges}</div>
            <div class="rec-subinfo">
              <span>BST: <strong>${p.bst}</strong></span>
              <span>•</span>
              <span>${p.role}</span>
              <span>•</span>
              <span>Gen ${p.gen}</span>
            </div>
          </div>
        </div>

        <div class="rec-reasons">
          ${reasonsHtml}
        </div>

        <div class="rec-actions">
          <button class="btn btn-sm btn-primary add-rec-btn" style="width: 100%; justify-content: center;" data-id="${p.id}">
            ➕ Inserisci nella Squadra
          </button>
        </div>
      `;

      card.querySelector('.add-rec-btn').addEventListener('click', () => {
        addPokemonToTeam(p);
      });

      recsGrid.appendChild(card);
    });
  }

  // Replacement Modal Elements
  const replaceModal = document.getElementById('replaceModal');
  const replaceModalCloseBtn = document.getElementById('replaceModalCloseBtn');
  const replaceCandidateBanner = document.getElementById('replaceCandidateBanner');
  const replaceSlotsGrid = document.getElementById('replaceSlotsGrid');

  // Full Refresh of UI
  function refreshUI() {
    renderTeamSlots();
    renderCoverageDashboard();
    updateRecommendations();
    saveTeamState();
  }

  // Smart Add / Replace Pokemon Logic
  function addPokemonToTeam(pokemon) {
    const emptyIdx = team.findIndex(p => p === null);
    if (emptyIdx !== -1) {
      // If there is an empty slot, insert directly into the first empty slot
      team[emptyIdx] = pokemon;
      refreshUI();
    } else {
      // If team is full (6 Pokemon), open the smart replacement selection modal
      openReplaceModal(pokemon);
    }
  }

  // Open Smart Replacement Modal
  function openReplaceModal(candidate) {
    const replacements = engine.evaluateAllReplacements(team, candidate);

    // Render Candidate Header Banner
    const candidateTypeBadges = candidate.types.map(t => 
      `<span class="type-badge" style="background: ${engine.getTypeColor(t)};">${engine.getTypeName(t)}</span>`
    ).join('');

    replaceCandidateBanner.innerHTML = `
      <img class="replace-candidate-thumb" src="${candidate.sprite}" alt="${candidate.name}" onerror="this.src='${candidate.thumb}';">
      <div style="flex: 1;">
        <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-accent); text-transform: uppercase;">
          Nuovo Pokémon da Inserire
        </div>
        <div class="replace-candidate-title">${candidate.name} <span style="font-size: 0.85rem; color: var(--text-muted);">#${candidate.id}</span></div>
        <div class="type-badges-wrap" style="justify-content: flex-start; margin: 4px 0;">${candidateTypeBadges}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">
          BST: <strong>${candidate.bst}</strong> • Ruolo: <strong>${candidate.role}</strong> • Gen ${candidate.gen}
        </div>
      </div>
    `;

    // Render 6 Slots with Delta Impact
    replaceSlotsGrid.innerHTML = '';

    replacements.forEach(r => {
      const card = document.createElement('div');
      card.className = `replace-slot-card ${r.isBestOption ? 'best-option' : ''}`;

      const member = r.currentMember;
      const memberName = member ? member.name : `Slot Vuoto #${r.slotIndex + 1}`;
      const memberThumb = member ? member.thumb : '';
      const memberTypes = member 
        ? member.types.map(t => `<span class="type-badge" style="background: ${engine.getTypeColor(t)}; font-size: 0.6rem; padding: 1px 5px;">${engine.getTypeName(t)}</span>`).join('')
        : '<span style="font-size: 0.7rem; color: var(--text-muted);">Disponibile</span>';

      const deltaSign = r.deltaScore >= 0 ? '+' : '';
      const deltaBadgeHtml = `
        <span class="delta-badge ${r.tagClass}">
          ${deltaSign}${r.deltaScore} pt Sinergia
        </span>
      `;

      const bestOptionTagHtml = r.isBestOption 
        ? `<div class="best-option-tag">${r.recommendationLabel}</div>` 
        : '';

      // Compile impact lines
      const impactLines = [];
      if (r.fixedThreats.length > 0) {
        impactLines.push(`<div style="color: #6ee7b7;">🛡️ <strong>Risolve debolezza:</strong> ${r.fixedThreats.join(', ')}</div>`);
      }
      if (r.gainedOffense.length > 0) {
        impactLines.push(`<div style="color: #93c5fd;">⚔️ <strong>Nuovo STAB efficace:</strong> ${r.gainedOffense.join(', ')}</div>`);
      }
      if (r.introducedThreats.length > 0) {
        impactLines.push(`<div style="color: #fca5a5;">⚠️ <strong>Nuova debolezza:</strong> ${r.introducedThreats.join(', ')}</div>`);
      }
      if (r.lostOffense.length > 0) {
        impactLines.push(`<div style="color: #fca5a5;">❌ <strong>Perde STAB su:</strong> ${r.lostOffense.join(', ')}</div>`);
      }
      if (impactLines.length === 0) {
        impactLines.push(`<div style="color: var(--text-muted);">Sostituzione bilanciata con impatto neutro sulle coperture.</div>`);
      }

      card.innerHTML = `
        ${bestOptionTagHtml}
        <div class="replace-slot-header">
          <img class="replace-slot-thumb" src="${memberThumb || candidate.thumb}" alt="${memberName}" style="${!member ? 'opacity: 0.3;' : ''}">
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.7rem; color: var(--text-muted); font-weight: 700;">Slot #${r.slotIndex + 1}</div>
            <div class="replace-slot-name">${memberName}</div>
            <div class="type-badges-wrap" style="justify-content: flex-start; margin-top: 2px;">${memberTypes}</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 0.75rem; color: var(--text-muted);">Variazione Sinergia:</span>
          ${deltaBadgeHtml}
        </div>

        <div class="replace-impact-list">
          ${impactLines.join('')}
        </div>

        <button class="btn btn-sm ${r.isBestOption ? 'btn-primary' : ''} replace-action-btn" data-slot="${r.slotIndex}">
          ${member ? `Sostituisci ${member.name}` : 'Inserisci in questo Slot'}
        </button>
      `;

      card.querySelector('.replace-action-btn').addEventListener('click', () => {
        team[r.slotIndex] = candidate;
        closeReplaceModal();
        refreshUI();
      });

      replaceSlotsGrid.appendChild(card);
    });

    replaceModal.classList.add('open');
  }

  function closeReplaceModal() {
    replaceModal.classList.remove('open');
  }

  // Remove Pokemon from slot
  function removePokemon(index) {
    team[index] = null;
    refreshUI();
  }

  // Load Preset
  function loadPresetByIndex(idx) {
    const preset = window.PRESET_TEAMS[idx];
    if (!preset) return;
    team = [null, null, null, null, null, null];
    preset.pokemon_ids.forEach((id, i) => {
      const p = window.ALL_POKEMON.find(x => x.id === id);
      if (p && i < 6) team[i] = p;
    });
    refreshUI();
  }

  // Search Modal Logic
  function openSearchModal(slotIndex) {
    activeSlotIndex = slotIndex;
    modalTitle.textContent = `Scegli Pokémon per lo Slot #${slotIndex + 1}`;
    pokemonSearchInput.value = '';
    modalGenFilter.value = '0';
    modalTypeFilter.value = 'all';
    searchModal.classList.add('open');
    renderSearchResults();
    setTimeout(() => pokemonSearchInput.focus(), 50);
  }

  function closeSearchModal() {
    searchModal.classList.remove('open');
  }

  function renderSearchResults() {
    const query = pokemonSearchInput.value.trim().toLowerCase();
    const gen = parseInt(modalGenFilter.value, 10);
    const type = modalTypeFilter.value;

    const filtered = window.ALL_POKEMON.filter(p => {
      if (gen > 0 && p.gen !== gen) return false;
      if (type !== 'all' && !p.types.includes(type)) return false;
      if (query) {
        const matchesName = p.name.toLowerCase().includes(query);
        const matchesId = String(p.id).includes(query);
        const matchesType = p.types.some(t => engine.getTypeName(t).toLowerCase().includes(query));
        if (!matchesName && !matchesId && !matchesType) return false;
      }
      return true;
    }).slice(0, 48);

    searchResultsGrid.innerHTML = '';

    if (filtered.length === 0) {
      searchResultsGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--text-muted);">
          Nessun Pokémon trovato.
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'search-item-card';

      const typeBadges = p.types.map(t => 
        `<span class="type-badge" style="background: ${engine.getTypeColor(t)}; font-size: 0.6rem; padding: 1px 5px;">${engine.getTypeName(t)}</span>`
      ).join('');

      card.innerHTML = `
        <img class="search-item-thumb" src="${p.thumb}" alt="${p.name}" loading="lazy">
        <div class="search-item-name">${p.name}</div>
        <div class="type-badges-wrap" style="gap: 3px; margin-bottom: 2px;">${typeBadges}</div>
        <div style="font-size: 0.7rem; color: var(--text-muted);">BST: ${p.bst}</div>
      `;

      card.addEventListener('click', () => {
        team[activeSlotIndex] = p;
        closeSearchModal();
        refreshUI();
      });

      searchResultsGrid.appendChild(card);
    });
  }

  // Import / Export Logic
  function openImportExportModal() {
    const valid = team.filter(p => p !== null);
    if (valid.length > 0) {
      importExportTextarea.value = valid.map(p => `${p.name}`).join('\n');
    } else {
      importExportTextarea.value = '';
    }
    importExportModal.classList.add('open');
  }

  function closeImportExportModal() {
    importExportModal.classList.remove('open');
  }

  function handleImport() {
    const text = importExportTextarea.value.trim();
    if (!text) return;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const newTeam = [null, null, null, null, null, null];
    let slot = 0;

    lines.forEach(line => {
      if (slot >= 6) return;
      // Extract name (handle Showdown formats like "Garchomp @ Life Orb" or "Garchomp (M)")
      let cleanName = line.split('@')[0].split('(')[0].trim().toLowerCase();
      
      const found = window.ALL_POKEMON.find(p => 
        p.name.toLowerCase() === cleanName ||
        p.name.toLowerCase().replace(/ /g, '') === cleanName.replace(/ /g, '') ||
        cleanName.includes(p.name.toLowerCase())
      );

      if (found) {
        newTeam[slot] = found;
        slot++;
      }
    });

    team = newTeam;
    closeImportExportModal();
    refreshUI();
  }

  // Event Listeners
  presetSelect.addEventListener('change', (e) => {
    if (e.target.value !== '') {
      loadPresetByIndex(parseInt(e.target.value, 10));
      e.target.value = '';
    }
  });

  btnClearTeam.addEventListener('click', () => {
    if (confirm('Sei sicuro di voler svuotare la squadra attuale?')) {
      team = [null, null, null, null, null, null];
      refreshUI();
    }
  });

  btnImportExport.addEventListener('click', openImportExportModal);
  importModalCloseBtn.addEventListener('click', closeImportExportModal);
  modalCloseBtn.addEventListener('click', closeSearchModal);
  if (replaceModalCloseBtn) {
    replaceModalCloseBtn.addEventListener('click', closeReplaceModal);
  }

  btnCopyExport.addEventListener('click', () => {
    importExportTextarea.select();
    document.execCommand('copy');
    alert('Squadra copiata negli appunti!');
  });

  btnLoadImport.addEventListener('click', handleImport);

  // Search Modal Filters
  pokemonSearchInput.addEventListener('input', renderSearchResults);
  modalGenFilter.addEventListener('change', renderSearchResults);
  modalTypeFilter.addEventListener('change', renderSearchResults);

  // Recommendation Filters
  recTypeFilter.addEventListener('change', updateRecommendations);
  recRoleFilter.addEventListener('change', updateRecommendations);
  recGenFilter.addEventListener('change', updateRecommendations);
  recSearchInput.addEventListener('input', updateRecommendations);

  // Close modals on click outside
  [searchModal, importExportModal, replaceModal].forEach(modal => {
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('open');
        }
      });
    }
  });

  // Escape key closes modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchModal.classList.remove('open');
      importExportModal.classList.remove('open');
      if (replaceModal) replaceModal.classList.remove('open');
    }
  });

  // Initialize and Boot
  initTypeSelects();
  loadInitialTeam();
  refreshUI();
});
