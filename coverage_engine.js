/**
 * PokéCoverage Engine - Core Analysis & Recommendation Logic
 */

class CoverageEngine {
  constructor(typesList, typeNamesIt, typeColors, typeChart, allPokemon) {
    this.typesList = typesList || window.POKEMON_TYPES || [];
    this.typeNamesIt = typeNamesIt || window.TYPE_NAMES_IT || {};
    this.typeColors = typeColors || window.TYPE_COLORS || {};
    this.typeChart = typeChart || window.TYPE_CHART || {};
    this.allPokemon = allPokemon || window.ALL_POKEMON || [];
  }

  // Get localized type name
  getTypeName(type) {
    return this.typeNamesIt[type] || type.charAt(0).toUpperCase() + type.slice(1);
  }

  // Get type color hex
  getTypeColor(type) {
    return this.typeColors[type] || '#777777';
  }

  // Calculate defensive multipliers for a single Pokemon against all 18 types
  getPokemonDefensiveProfile(pokemon) {
    const profile = {};
    const types = pokemon.types || [];
    
    this.typesList.forEach(atkType => {
      let mult = 1.0;
      types.forEach(defType => {
        const factor = this.typeChart[atkType]?.[defType] !== undefined ? this.typeChart[atkType][defType] : 1.0;
        mult *= factor;
      });
      profile[atkType] = mult;
    });

    return profile;
  }

  // Analyze the entire team (up to 6 Pokemon)
  analyzeTeam(team) {
    const validMembers = (team || []).filter(p => p !== null && p !== undefined);
    
    // Defensive type matrix
    const defenseAnalysis = {};
    this.typesList.forEach(atkType => {
      defenseAnalysis[atkType] = {
        type: atkType,
        typeName: this.getTypeName(atkType),
        color: this.getTypeColor(atkType),
        weaknesses: [],    // { pokemon, mult: 2 or 4 }
        resistances: [],   // { pokemon, mult: 0.5 or 0.25 }
        immunities: [],    // { pokemon, mult: 0 }
        neutrals: [],      // { pokemon, mult: 1 }
        weaknessScore: 0,
        defenseScore: 0,
        netDeficit: 0,
        threatLevel: 'SICURO' // SICURO, MODERATO, ALTO, CRITICO
      };
    });

    // Offensive STAB collection
    const teamStabTypes = new Set();

    validMembers.forEach(pokemon => {
      const defProfile = this.getPokemonDefensiveProfile(pokemon);
      (pokemon.types || []).forEach(t => teamStabTypes.add(t));

      this.typesList.forEach(atkType => {
        const mult = defProfile[atkType];
        const entry = defenseAnalysis[atkType];

        if (mult >= 4) {
          entry.weaknesses.push({ pokemon, mult });
          entry.weaknessScore += 2; // 4x counts double
        } else if (mult >= 2) {
          entry.weaknesses.push({ pokemon, mult });
          entry.weaknessScore += 1;
        } else if (mult === 0) {
          entry.immunities.push({ pokemon, mult });
          entry.defenseScore += 2; // Immunity gives strong weight
        } else if (mult <= 0.25) {
          entry.resistances.push({ pokemon, mult });
          entry.defenseScore += 1.5;
        } else if (mult <= 0.5) {
          entry.resistances.push({ pokemon, mult });
          entry.defenseScore += 1;
        } else {
          entry.neutrals.push({ pokemon, mult });
        }
      });
    });

    // Determine threat levels and uncovered weaknesses
    const uncoveredWeaknesses = [];

    this.typesList.forEach(atkType => {
      const entry = defenseAnalysis[atkType];
      const weakCount = entry.weaknesses.length;
      const resCount = entry.resistances.length;
      const immCount = entry.immunities.length;
      const totalDefenders = resCount + immCount;

      entry.netDeficit = entry.weaknessScore - entry.defenseScore;

      if (validMembers.length > 0) {
        if (weakCount >= 2 && totalDefenders === 0) {
          entry.threatLevel = 'CRITICO';
        } else if (weakCount >= 3 && totalDefenders <= 1) {
          entry.threatLevel = 'CRITICO';
        } else if (entry.netDeficit > 0 && weakCount >= 2) {
          entry.threatLevel = 'ALTO';
        } else if (weakCount > totalDefenders && weakCount >= 1) {
          entry.threatLevel = 'MODERATO';
        } else {
          entry.threatLevel = 'SICURO';
        }

        if (entry.threatLevel === 'CRITICO' || entry.threatLevel === 'ALTO' || (weakCount >= 2 && totalDefenders <= 1)) {
          uncoveredWeaknesses.push(entry);
        }
      }
    });

    // Sort uncovered weaknesses by severity
    uncoveredWeaknesses.sort((a, b) => {
      const threatOrder = { 'CRITICO': 3, 'ALTO': 2, 'MODERATO': 1, 'SICURO': 0 };
      if (threatOrder[b.threatLevel] !== threatOrder[a.threatLevel]) {
        return threatOrder[b.threatLevel] - threatOrder[a.threatLevel];
      }
      return b.netDeficit - a.netDeficit;
    });

    // Offensive STAB coverage analysis
    const offensiveCoverage = {};
    const coveredDefendingTypes = [];
    const uncoveredDefendingTypes = [];

    this.typesList.forEach(defType => {
      const effectiveStabs = [];
      teamStabTypes.forEach(stabType => {
        const mult = this.typeChart[stabType]?.[defType];
        if (mult && mult >= 2) {
          effectiveStabs.push(stabType);
        }
      });

      offensiveCoverage[defType] = {
        defendingType: defType,
        defendingTypeName: this.getTypeName(defType),
        color: this.getTypeColor(defType),
        isCovered: effectiveStabs.length > 0,
        effectiveStabs: effectiveStabs
      };

      if (effectiveStabs.length > 0) {
        coveredDefendingTypes.push(offensiveCoverage[defType]);
      } else {
        uncoveredDefendingTypes.push(offensiveCoverage[defType]);
      }
    });

    return {
      memberCount: validMembers.length,
      defenseAnalysis,
      uncoveredWeaknesses,
      teamStabTypes: Array.from(teamStabTypes),
      offensiveCoverage,
      coveredDefendingTypes,
      uncoveredDefendingTypes
    };
  }

  // Evaluate and recommend candidate Pokemon to balance the team
  getSmartRecommendations(team, options = {}) {
    const analysis = this.analyzeTeam(team);
    const validMembers = (team || []).filter(p => p !== null && p !== undefined);
    const memberIds = new Set(validMembers.map(p => p.id));
    const uncovered = analysis.uncoveredWeaknesses;

    const {
      minBST = 440,
      genFilter = 0,
      typeFilter = 'all',
      roleFilter = 'all',
      searchQuery = '',
      limit = 20
    } = options;

    if (validMembers.length === 0) {
      // If team is empty, return top tier balanced/sweeper staples
      return this.allPokemon
        .filter(p => p.bst >= 500)
        .slice(0, limit)
        .map(p => ({
          pokemon: p,
          score: p.bst,
          reasons: [
            { type: 'advantage', text: `🌟 **Pokémon Versatile**: Statistiche eccellenti (BST ${p.bst})` },
            { type: 'neutral', text: `🏷️ **Doppio Tipo / Ruolo**: ${p.types.map(t => this.getTypeName(t)).join('/')} (${p.role})` }
          ]
        }));
    }

    const candidates = [];
    const isFullTeam = validMembers.length >= 6;

    this.allPokemon.forEach(candidate => {
      if (memberIds.has(candidate.id)) return;
      if (candidate.bst < minBST && !options.includeAll) return;
      if (genFilter > 0 && candidate.gen !== genFilter) return;
      if (typeFilter !== 'all' && !candidate.types.includes(typeFilter)) return;
      if (roleFilter !== 'all' && candidate.role !== roleFilter) return;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = candidate.name.toLowerCase().includes(q);
        const matchesType = candidate.types.some(t => t.includes(q) || this.getTypeName(t).toLowerCase().includes(q));
        if (!matchesName && !matchesType) return;
      }

      // Evaluate replacement impacts for all slots
      const replacements = this.evaluateAllReplacements(team, candidate);
      let chosenRep = null;

      if (isFullTeam) {
        // Find best replacement among filled slots
        chosenRep = replacements.find(r => r.isBestOption) || replacements[0];
      } else {
        // Find empty slot addition
        chosenRep = replacements.find(r => r.isSlotEmpty) || replacements[0];
      }

      const deltaScore = chosenRep ? chosenRep.deltaScore : 0;
      const reasons = [];

      if (isFullTeam && chosenRep && chosenRep.currentMember) {
        reasons.push({
          type: 'neutral',
          text: `🔄 **Sostituzione consigliata**: Sostituisce **${chosenRep.currentMember.name}**`
        });
        
        if (chosenRep.fixedThreats.length > 0) {
          reasons.push({
            type: 'advantage',
            text: `🛡️ **Risolve debolezze**: Elimina vulnerabilità a ${chosenRep.fixedThreats.join(', ')}.`
          });
        }
        if (chosenRep.gainedOffense.length > 0) {
          reasons.push({
            type: 'advantage',
            text: `⚔️ **Nuova copertura**: Aggiunge STAB efficace su ${chosenRep.gainedOffense.join(', ')}.`
          });
        }
        if (chosenRep.introducedThreats.length > 0) {
          reasons.push({
            type: 'disadvantage',
            text: `⚠️ **Attenzione**: Crea nuova debolezza a ${chosenRep.introducedThreats.join(', ')}.`
          });
        }
        if (chosenRep.lostOffense.length > 0) {
          reasons.push({
            type: 'disadvantage',
            text: `❌ **Perdita offensiva**: Perde STAB su ${chosenRep.lostOffense.join(', ')}.`
          });
        }
      } else if (chosenRep) {
        if (chosenRep.fixedThreats.length > 0) {
          reasons.push({
            type: 'advantage',
            text: `🛡️ **Copre debolezze**: Risolve vulnerabilità a ${chosenRep.fixedThreats.join(', ')}.`
          });
        }
        if (chosenRep.gainedOffense.length > 0) {
          reasons.push({
            type: 'advantage',
            text: `⚔️ **Copertura offensiva**: Colpisce superefficacemente ${chosenRep.gainedOffense.join(', ')}.`
          });
        }
        if (chosenRep.introducedThreats.length > 0) {
          reasons.push({
            type: 'disadvantage',
            text: `⚠️ **Attenzione**: Introduce vulnerabilità a ${chosenRep.introducedThreats.join(', ')}.`
          });
        }
        reasons.push({
          type: 'neutral',
          text: `✨ **Statistiche e ruolo**: BST ${candidate.bst} (${candidate.role}).`
        });
      }

      if (reasons.length === 0) {
        reasons.push({
          type: 'neutral',
          text: `✨ Statistiche bilanciate (${candidate.bst} BST) e ruolo di ${candidate.role}`
        });
      }

      candidates.push({
        pokemon: candidate,
        score: deltaScore,
        bestReplacement: chosenRep,
        reasons
      });
    });

    // Sort by highest delta synergy score
    candidates.sort((a, b) => b.score - a.score);

    return candidates.slice(0, limit);
  }

  // Calculate an absolute overall synergy score for a team
  calculateTeamSynergyScore(team) {
    const validMembers = (team || []).filter(p => p !== null && p !== undefined);
    if (validMembers.length === 0) return 0;

    const analysis = this.analyzeTeam(validMembers);
    let score = 0;

    // Defense & Threat penalties/bonuses
    this.typesList.forEach(t => {
      const entry = analysis.defenseAnalysis[t];
      score += (entry.resistances.length * 12);
      score += (entry.immunities.length * 28);
      score -= (entry.weaknesses.length * 15);
      
      if (entry.threatLevel === 'CRITICO') score -= 90;
      else if (entry.threatLevel === 'ALTO') score -= 50;
      else if (entry.threatLevel === 'MODERATO') score -= 20;
    });

    // Offensive STAB coverage bonus
    score += (analysis.coveredDefendingTypes.length * 18);

    // BST Quality bonus
    const totalBst = validMembers.reduce((acc, p) => acc + (p.bst || 400), 0);
    score += Math.round(totalBst / 15);

    return Math.round(score);
  }

  // Evaluate the impact of replacing each slot in currentTeam with newPokemon
  evaluateAllReplacements(currentTeam, newPokemon) {
    const currentScore = this.calculateTeamSynergyScore(currentTeam);
    const oldAnalysis = this.analyzeTeam(currentTeam);
    const results = [];

    for (let slotIndex = 0; slotIndex < 6; slotIndex++) {
      const currentMember = currentTeam[slotIndex];
      const simulatedTeam = [...currentTeam];
      simulatedTeam[slotIndex] = newPokemon;

      const newScore = this.calculateTeamSynergyScore(simulatedTeam);
      const newAnalysis = this.analyzeTeam(simulatedTeam);
      const deltaScore = newScore - currentScore;

      // Uncovered weaknesses fixed
      const oldThreatTypes = new Set(oldAnalysis.uncoveredWeaknesses.map(u => u.type));
      const newThreatTypes = new Set(newAnalysis.uncoveredWeaknesses.map(u => u.type));

      const fixedThreats = oldAnalysis.uncoveredWeaknesses
        .filter(u => !newThreatTypes.has(u.type))
        .map(u => u.typeName);

      const introducedThreats = newAnalysis.uncoveredWeaknesses
        .filter(u => !oldThreatTypes.has(u.type))
        .map(u => u.typeName);

      // Offensive coverage changes
      const oldCovered = new Set(oldAnalysis.coveredDefendingTypes.map(c => c.defendingType));
      const newCovered = new Set(newAnalysis.coveredDefendingTypes.map(c => c.defendingType));

      const gainedOffense = newAnalysis.coveredDefendingTypes
        .filter(c => !oldCovered.has(c.defendingType))
        .map(c => c.defendingTypeName);

      const lostOffense = oldAnalysis.coveredDefendingTypes
        .filter(c => !newCovered.has(c.defendingType))
        .map(c => c.defendingTypeName);

      let recommendationLabel = 'Neutro';
      let tagClass = 'neutral';

      if (deltaScore >= 60) {
        recommendationLabel = '🌟 Scelta Eccellente';
        tagClass = 'excellent';
      } else if (deltaScore > 15) {
        recommendationLabel = '✅ Scelta Consigliata';
        tagClass = 'good';
      } else if (deltaScore >= -15) {
        recommendationLabel = '⚖️ Bilanciato';
        tagClass = 'neutral';
      } else {
        recommendationLabel = '⚠️ Sconsigliato';
        tagClass = 'bad';
      }

      results.push({
        slotIndex,
        currentMember,
        isSlotEmpty: currentMember === null || currentMember === undefined,
        deltaScore,
        currentScore,
        newScore,
        fixedThreats,
        introducedThreats,
        gainedOffense,
        lostOffense,
        recommendationLabel,
        tagClass
      });
    }

    // Determine the single best slot to replace
    let bestSlot = null;
    let maxDelta = -Infinity;

    // Prioritize empty slots first if any
    const firstEmpty = results.find(r => r.isSlotEmpty);
    if (firstEmpty) {
      firstEmpty.isBestOption = true;
      firstEmpty.recommendationLabel = '🌟 Slot Vuoto Disponibile';
      firstEmpty.tagClass = 'excellent';
    } else {
      results.forEach(r => {
        if (r.deltaScore > maxDelta) {
          maxDelta = r.deltaScore;
          bestSlot = r;
        }
      });
      if (bestSlot) {
        bestSlot.isBestOption = true;
        bestSlot.recommendationLabel = '👑 Sostituzione Più Consigliata';
      }
    }

    return results;
  }
}

// Attach to window
window.CoverageEngine = CoverageEngine;

