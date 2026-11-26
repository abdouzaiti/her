export type TelegramPhase =
  | 'CLOSED_WITH_RIBBON'
  | 'UNTIE_IN_PROGRESS'
  | 'RIBBON_LOOSE'
  | 'RIBBON_REMOVED'
  | 'ENVELOPE_OPENING'
  | 'ENVELOPE_OPEN'
  | 'LETTER_EXTRACTION'
  | 'LETTER_UNFOLDED';

export type RibbonSide = 'left' | 'right';

export interface LetterConfig {
  recipientName: string;
  telegramHeader: string;
  postmarkCity: string;
  postmarkDate: string;
  dispatchNumber: string;
  envelopeMonogram: string;
  recipientLine: string;
  paragraphs: string[];
  closing: string;
  signature: string;
}
