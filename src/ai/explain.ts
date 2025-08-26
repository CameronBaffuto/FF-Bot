import { shortExplanation } from './client';
import { SYSTEM_COACH, lineupUserPrompt, compareUserPrompt, waiverUserPrompt, tradeUserPrompt } from './prompts';

export async function explainLineup(payload: Parameters<typeof lineupUserPrompt>[0]) {
  return shortExplanation(SYSTEM_COACH, lineupUserPrompt(payload));
}
export async function explainCompare(payload: Parameters<typeof compareUserPrompt>[0]) {
  return shortExplanation(SYSTEM_COACH, compareUserPrompt(payload));
}
export async function explainWaiver(payload: Parameters<typeof waiverUserPrompt>[0]) {
  return shortExplanation(SYSTEM_COACH, waiverUserPrompt(payload));
}
export async function explainTrade(payload: Parameters<typeof tradeUserPrompt>[0]) {
  return shortExplanation(SYSTEM_COACH, tradeUserPrompt(payload));
}
