import React from 'react';
import { TournamentMatch, RollOutcomeType } from '../../../types';
import { FightScoreboardModal } from './FightScoreboardModal';

export interface TournamentMatchModalProps {
  match: TournamentMatch;
  matchDurationMinutes: number;
  categoryName?: string;
  tournamentTitle?: string;
  onClose: () => void;
  onSaveResult: (result: {
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
  }) => void;
  onNavigateToTimer?: (matchDuration: number, title: string) => void;
}

export const TournamentMatchModal: React.FC<TournamentMatchModalProps> = (props) => {
  return <FightScoreboardModal {...props} />;
};

export { FightScoreboardModal };
