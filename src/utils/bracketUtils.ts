import {
  TournamentCategory,
  TournamentCompetitor,
  TournamentMatch,
  TournamentPodium,
  RollOutcomeType
} from '../types';

/**
 * Calculates the next power of 2 for bracket size (e.g. 2, 4, 8, 16, 32).
 */
export function getNextPowerOfTwo(n: number): number {
  if (n <= 2) return 2;
  if (n <= 4) return 4;
  if (n <= 8) return 8;
  if (n <= 16) return 16;
  if (n <= 32) return 32;
  return 64;
}

/**
 * Returns round names depending on the round level and total rounds.
 */
export function getRoundLabel(roundNumber: number, totalRounds: number, isThirdPlace?: boolean): string {
  if (isThirdPlace) return 'Disputa de 3º Lugar 🥉';
  if (roundNumber === totalRounds) return 'Grande Final 🥇🥈';
  if (roundNumber === totalRounds - 1) return 'Semifinais';
  if (roundNumber === totalRounds - 2) return 'Quartas de Final';
  if (roundNumber === totalRounds - 3) return 'Oitavas de Final';
  return `Fase ${roundNumber}`;
}

/**
 * Calculates the standard tournament seeding bracket positions (e.g. 1 vs 8, 4 vs 5, 3 vs 6, 2 vs 7).
 * Follows the official IBJJF / Olympic single-elimination tournament standard where top seeds (1 & 2)
 * are placed in opposite bracket halves, and BYEs are awarded to the highest seeds.
 */
export function getStandardBracketSeedPositions(bracketSize: number): number[] {
  if (bracketSize <= 2) return [1, 2];
  let list = [1, 2];
  while (list.length < bracketSize) {
    const nextList: number[] = [];
    const sum = list.length * 2 + 1;
    for (let i = 0; i < list.length; i += 2) {
      nextList.push(list[i]);
      nextList.push(sum - list[i]);
      if (i + 1 < list.length) {
        nextList.push(sum - list[i + 1]);
        nextList.push(list[i + 1]);
      }
    }
    list = nextList;
  }
  return list;
}

/**
 * Detects whether a tournament bracket has corrupted / empty round 1 matches
 * (e.g. both competitor1 and competitor2 undefined in round 1, which happened in old generator).
 */
export function isBracketCorrupted(matches?: TournamentMatch[]): boolean {
  if (!matches || matches.length === 0) return false;
  const round1 = matches.filter(m => m.round === 1 && !m.isThirdPlaceMatch);
  return round1.some(m => !m.competitor1 && !m.competitor2);
}

/**
 * Checks if a category needs repair or regeneration to official championship standards.
 */
export function repairCategoryBracket(category: TournamentCategory): TournamentCategory {
  if (!isBracketCorrupted(category.matches)) {
    return category;
  }
  const newMatches = generateSingleEliminationBracket(category.id, category.competitors, true);
  return {
    ...category,
    matches: newMatches,
    podium: undefined,
    status: 'BRACKET_READY',
  };
}

/**
 * Generates single-elimination tournament bracket matches from a list of competitors.
 */
export function generateSingleEliminationBracket(
  categoryId: string,
  competitors: TournamentCompetitor[],
  includeThirdPlace: boolean = true
): TournamentMatch[] {
  if (!competitors || competitors.length < 2) {
    return [];
  }

  const bracketSize = getNextPowerOfTwo(competitors.length);
  const totalRounds = Math.log2(bracketSize);
  const matches: TournamentMatch[] = [];

  let matchCounter = 1;

  // Initialize all matches round by round so we have target match IDs for next rounds
  const roundMatchesMap: Record<number, TournamentMatch[]> = {};

  for (let r = 1; r <= totalRounds; r++) {
    const numMatchesInRound = bracketSize / Math.pow(2, r);
    roundMatchesMap[r] = [];

    for (let pos = 0; pos < numMatchesInRound; pos++) {
      const matchId = `match-${categoryId}-r${r}-p${pos}-${Date.now().toString(36).slice(-4)}`;
      const newMatch: TournamentMatch = {
        id: matchId,
        round: r,
        roundLabel: getRoundLabel(r, totalRounds),
        matchNumber: matchCounter++,
        bracketPosition: pos,
        status: 'SCHEDULED',
      };
      roundMatchesMap[r].push(newMatch);
    }
  }

  // Link matches to their next round matches
  for (let r = 1; r < totalRounds; r++) {
    const currentRoundMatches = roundMatchesMap[r];
    const nextRoundMatches = roundMatchesMap[r + 1];

    currentRoundMatches.forEach((currMatch, idx) => {
      const nextMatchIdx = Math.floor(idx / 2);
      const nextMatch = nextRoundMatches[nextMatchIdx];
      if (nextMatch) {
        currMatch.nextMatchId = nextMatch.id;
        currMatch.nextMatchSlot = (idx % 2 === 0 ? 1 : 2);
      }
    });
  }

  // Populate Round 1 with competitors using official tournament seeding
  const round1Matches = roundMatchesMap[1];
  const seedPositions = getStandardBracketSeedPositions(bracketSize);

  for (let i = 0; i < round1Matches.length; i++) {
    const match = round1Matches[i];
    const s1 = seedPositions[2 * i];
    const s2 = seedPositions[2 * i + 1];

    const c1 = s1 <= competitors.length ? competitors[s1 - 1] : undefined;
    const c2 = s2 <= competitors.length ? competitors[s2 - 1] : undefined;

    match.competitor1 = c1;
    match.competitor2 = c2;
    match.competitor1Seed = s1;
    match.competitor2Seed = s2;

    // Handle BYE / W.O. if one of the spots is a BYE (Awarded to top seeds per championship standard)
    if (c1 && !c2) {
      match.status = 'COMPLETED';
      match.winnerId = c1.id;
      match.winnerName = c1.name;
      match.notes = 'Avançou por W.O. / BYE (Cabeça de Chave)';
      match.outcomeType = 'POINTS';
      
      // Advance to next match immediately
      if (match.nextMatchId) {
        const nextMatch = roundMatchesMap[2]?.find(m => m.id === match.nextMatchId);
        if (nextMatch) {
          if (match.nextMatchSlot === 1) nextMatch.competitor1 = c1;
          if (match.nextMatchSlot === 2) nextMatch.competitor2 = c1;
        }
      }
    } else if (!c1 && c2) {
      match.status = 'COMPLETED';
      match.winnerId = c2.id;
      match.winnerName = c2.name;
      match.notes = 'Avançou por W.O. / BYE (Cabeça de Chave)';
      match.outcomeType = 'POINTS';
      
      if (match.nextMatchId) {
        const nextMatch = roundMatchesMap[2]?.find(m => m.id === match.nextMatchId);
        if (nextMatch) {
          if (match.nextMatchSlot === 1) nextMatch.competitor1 = c2;
          if (match.nextMatchSlot === 2) nextMatch.competitor2 = c2;
        }
      }
    } else if (c1 && c2) {
      match.status = 'SCHEDULED';
    }
  }

  // Flatten all matches into array
  for (let r = 1; r <= totalRounds; r++) {
    matches.push(...roundMatchesMap[r]);
  }

  // Add 3rd place match if requested and there are at least 4 competitors (2 semifinals)
  if (includeThirdPlace && competitors.length >= 4 && totalRounds >= 2) {
    const thirdPlaceMatch: TournamentMatch = {
      id: `match-${categoryId}-3rd-${Date.now().toString(36).slice(-4)}`,
      round: totalRounds,
      roundLabel: getRoundLabel(totalRounds, totalRounds, true),
      matchNumber: matchCounter++,
      bracketPosition: 999,
      isThirdPlaceMatch: true,
      status: 'SCHEDULED',
    };
    matches.push(thirdPlaceMatch);
  }

  return matches;
}

/**
 * Handles recording the outcome of a match and propagating winners/losers forward in the bracket.
 */
export function advanceTournamentBracket(
  category: TournamentCategory,
  matchId: string,
  result: {
    winnerId: string;
    winnerName: string;
    outcomeType?: RollOutcomeType;
    submissionTechnique?: string;
    submissionMinute?: number;
    score1?: number;
    score2?: number;
    advantages1?: number;
    advantages2?: number;
    penalties1?: number;
    penalties2?: number;
    notes?: string;
  }
): { updatedCategory: TournamentCategory; finishedTournamentCategory: boolean } {
  const updatedMatches = [...category.matches];
  const matchIndex = updatedMatches.findIndex(m => m.id === matchId);
  if (matchIndex === -1) {
    return { updatedCategory: category, finishedTournamentCategory: false };
  }

  const currentMatch = { ...updatedMatches[matchIndex] };
  const winnerComp = currentMatch.competitor1?.id === result.winnerId 
    ? currentMatch.competitor1 
    : currentMatch.competitor2?.id === result.winnerId 
      ? currentMatch.competitor2 
      : { id: result.winnerId, name: result.winnerName, belt: 'BRANCA' as const, stripes: 0 };

  const loserComp = currentMatch.competitor1?.id === result.winnerId 
    ? currentMatch.competitor2 
    : currentMatch.competitor1;

  // Update current match
  currentMatch.winnerId = result.winnerId;
  currentMatch.winnerName = result.winnerName;
  currentMatch.outcomeType = result.outcomeType || 'POINTS';
  currentMatch.submissionTechnique = result.submissionTechnique;
  currentMatch.submissionMinute = result.submissionMinute;
  currentMatch.score1 = result.score1 ?? 0;
  currentMatch.score2 = result.score2 ?? 0;
  currentMatch.advantages1 = result.advantages1 ?? 0;
  currentMatch.advantages2 = result.advantages2 ?? 0;
  currentMatch.penalties1 = result.penalties1 ?? 0;
  currentMatch.penalties2 = result.penalties2 ?? 0;
  currentMatch.notes = result.notes;
  currentMatch.status = 'COMPLETED';
  updatedMatches[matchIndex] = currentMatch;

  const totalRounds = Math.max(...updatedMatches.filter(m => !m.isThirdPlaceMatch).map(m => m.round), 1);
  const isSemiFinal = currentMatch.round === totalRounds - 1 && !currentMatch.isThirdPlaceMatch;
  const isFinalMatch = currentMatch.round === totalRounds && !currentMatch.isThirdPlaceMatch;
  const isThirdPlaceMatch = currentMatch.isThirdPlaceMatch;

  // Propagate winner to next match
  if (currentMatch.nextMatchId) {
    const nextIdx = updatedMatches.findIndex(m => m.id === currentMatch.nextMatchId);
    if (nextIdx !== -1) {
      const nextMatch = { ...updatedMatches[nextIdx] };
      if (currentMatch.nextMatchSlot === 1) {
        nextMatch.competitor1 = winnerComp;
      } else {
        nextMatch.competitor2 = winnerComp;
      }
      updatedMatches[nextIdx] = nextMatch;
    }
  }

  // If Semifinal, propagate loser to 3rd place match if it exists
  if (isSemiFinal && loserComp) {
    const thirdIdx = updatedMatches.findIndex(m => m.isThirdPlaceMatch);
    if (thirdIdx !== -1) {
      const thirdMatch = { ...updatedMatches[thirdIdx] };
      if (currentMatch.bracketPosition === 0) {
        thirdMatch.competitor1 = loserComp;
      } else {
        thirdMatch.competitor2 = loserComp;
      }
      updatedMatches[thirdIdx] = thirdMatch;
    }
  }

  // Manage Podium
  const updatedPodium: TournamentPodium = { ...(category.podium || {}) };

  if (isFinalMatch) {
    updatedPodium.first = winnerComp;
    if (loserComp) updatedPodium.second = loserComp;
  }

  if (isThirdPlaceMatch) {
    updatedPodium.third = winnerComp;
  }

  // If no 3rd place match was created and final is finished, semifinal losers can be 3rd place
  if (isFinalMatch && !updatedMatches.some(m => m.isThirdPlaceMatch)) {
    const semiMatches = updatedMatches.filter(m => m.round === totalRounds - 1);
    const semiLosers = semiMatches.map(m => 
      m.winnerId === m.competitor1?.id ? m.competitor2 : m.competitor1
    ).filter(Boolean) as TournamentCompetitor[];

    if (semiLosers[0]) updatedPodium.third = semiLosers[0];
    if (semiLosers[1]) updatedPodium.thirdSecond = semiLosers[1];
  }

  // Check if all active matches are completed
  const allMatchesCompleted = updatedMatches
    .filter(m => m.competitor1 && m.competitor2)
    .every(m => m.status === 'COMPLETED');

  const finalIsDone = updatedMatches
    .filter(m => m.round === totalRounds && !m.isThirdPlaceMatch)
    .every(m => m.status === 'COMPLETED');

  const thirdIsDone = !updatedMatches.some(m => m.isThirdPlaceMatch) || 
    updatedMatches.filter(m => m.isThirdPlaceMatch).every(m => m.status === 'COMPLETED');

  const categoryCompleted = finalIsDone && thirdIsDone;

  const updatedCategory: TournamentCategory = {
    ...category,
    matches: updatedMatches,
    podium: updatedPodium,
    status: categoryCompleted ? 'COMPLETED' : 'IN_PROGRESS',
  };

  return {
    updatedCategory,
    finishedTournamentCategory: categoryCompleted,
  };
}
