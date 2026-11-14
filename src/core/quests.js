import { QUESTS } from '../data/quests.js';
import { DIALOGUES, NPCS } from '../data/dialogues.js';

/**
 * Auftragslogik (Spec §10). Der Auftragsstand eines Helden ist ein `QuestLog`; `talkTo` liest nur,
 * `acceptQuest` und `questEvent` ändern ihn.
 * @typedef {Record<string, { state: 'active'|'done', step: number, progress: number }>} QuestLog
 * @typedef {{ type: 'talk', npc: string } | { type: 'reach', place: string } | { type: 'kill', enemyType: string }
 *   | { type: 'collect', thing: string } | { type: 'boss', bossId: string }} QuestEvent
 */

const isDone = (log, id) => log[id]?.state === 'done';
const currentStep = (log, id) => (log[id]?.state === 'active' ? QUESTS[id].steps[log[id].step] : null);

/** Kann der Auftrag angenommen werden (noch nicht im Log, alle Voraussetzungen erledigt)? */
function offerable(log, id) {
  return !log[id] && QUESTS[id].requires.every((r) => isDone(log, r));
}

/**
 * Was eine Person zeigt: „!“ (neuer Auftrag), „?“ (Gesprächsschritt fällig) oder nichts.
 * @param {QuestLog} log
 * @param {string} npcId
 * @returns {'offer'|'turnIn'|'none'}
 */
export function npcState(log, npcId) {
  for (const id of Object.keys(log)) {
    const s = currentStep(log, id);
    if (s?.type === 'talk' && s.target === npcId) return 'turnIn';
  }
  return Object.values(QUESTS).some((q) => q.giver === npcId && offerable(log, q.id)) ? 'offer' : 'none';
}

/**
 * Gespräch mit einer Person, ohne den Log zu ändern. Vorrang: fälliger Gesprächsschritt, neues Angebot, Erinnerung,
 * Spruch (`idleIndex` wählt ihn).
 * @param {QuestLog} log
 * @param {string} npcId
 * @param {number} [idleIndex]
 * @returns {{ speaker: string, lines: string[], offer?: string, autoAccept?: boolean, completes?: string, advances?: string }}
 */
export function talkTo(log, npcId, idleIndex = 0) {
  const d = DIALOGUES[npcId], speaker = NPCS[npcId]?.name ?? npcId;
  for (const id of Object.keys(log)) {
    const s = currentStep(log, id);
    if (s?.type !== 'talk' || s.target !== npcId) continue;
    const last = log[id].step === QUESTS[id].steps.length - 1;
    const lines = (last ? d.done[id] : d.progress[id]) ?? d.idle;
    return last ? { speaker, lines, completes: id } : { speaker, lines, advances: id };
  }
  const offer = Object.values(QUESTS).find((q) => q.giver === npcId && offerable(log, q.id));
  if (offer) return { speaker, lines: d.offer[offer.id], offer: offer.id, autoAccept: offer.kind === 'main' };
  const running = Object.values(QUESTS).find((q) => q.giver === npcId && log[q.id]?.state === 'active');
  if (running && d.remind[running.id]) return { speaker, lines: d.remind[running.id] };
  return { speaker, lines: d.idle.length ? [d.idle[idleIndex % d.idle.length]] : ['…'] };
}

/**
 * @param {QuestLog} log
 * @param {string} questId
 * @returns {boolean} ob der Auftrag neu angenommen wurde
 */
export function acceptQuest(log, questId) {
  if (!Object.hasOwn(QUESTS, questId) || !offerable(log, questId)) return false;
  log[questId] = { state: 'active', step: 0, progress: 0 };
  return true;
}

/** Passt das Ereignis zum Schritt? */
function matches(step, e) {
  switch (step.type) {
    case 'talk': return e.type === 'talk' && e.npc === step.target;
    case 'reach': return e.type === 'reach' && e.place === step.target;
    case 'kill': return e.type === 'kill' && e.enemyType === step.target;
    case 'collect': return e.type === 'collect' && e.thing === step.target;
    case 'boss': return e.type === 'boss' && e.bossId === step.target;
    default: return false;
  }
}

/**
 * Schreibt ein Ereignis in alle laufenden Aufträge fort.
 * @param {QuestLog} log
 * @param {QuestEvent} event
 * @returns {{ advanced: string[], completed: string[] }} weitergekommene (neuer Schritt) und abgeschlossene Aufträge
 */
export function questEvent(log, event) {
  const advanced = [], completed = [];
  for (const id of Object.keys(log)) {
    const s = currentStep(log, id);
    if (!s || !matches(s, event)) continue;
    const entry = log[id];
    entry.progress++;
    if (entry.progress < (s.count ?? 1)) continue;
    entry.step++; entry.progress = 0;
    if (entry.step >= QUESTS[id].steps.length) { entry.state = 'done'; completed.push(id); } else advanced.push(id);
  }
  return { advanced, completed };
}

/**
 * Verfolgter Auftrag: der gewählte, wenn er läuft; sonst der erste laufende Hauptauftrag, dann Nebenauftrag.
 * @param {QuestLog} log
 * @param {string|null} chosen
 */
export function trackedQuest(log, chosen) {
  if (chosen && log[chosen]?.state === 'active') return chosen;
  const active = Object.values(QUESTS).filter((q) => log[q.id]?.state === 'active');
  return (active.find((q) => q.kind === 'main') ?? active[0])?.id ?? null;
}

/**
 * Ziel des aktuellen Schritts für Stern und Pfeil: Person, Gebiet, Boss, nächster nicht benutzter Fundort oder die
 * erste Gruppe mit passenden Gegnern.
 * @param {QuestLog} log
 * @param {string} questId
 * @param {Record<string, import('../data/maps/index.js').MapDef>} maps
 * @param {string[]} [found] benutzte Fundorte
 * @returns {{ map: string, x: number, z: number } | null}
 */
export function questTarget(log, questId, maps, found = []) {
  const s = currentStep(log, questId);
  if (!s) return null;
  for (const m of Object.values(maps)) {
    if (s.map && s.map !== m.id) continue;
    let hit = null;
    if (s.type === 'talk') hit = m.npcs.find((n) => n.id === s.target);
    else if (s.type === 'reach') hit = m.areas.find((a) => a.id === s.target);
    else if (s.type === 'boss') hit = m.bosses.find((b) => b.id === s.target);
    else if (s.type === 'collect' && s.from === 'spot') hit = m.spots.find((p) => p.kind === s.target && !found.includes(p.id));
    else {
      const types = s.type === 'kill' ? [s.target] : s.from;
      hit = m.packs.find((p) => types.some((t) => Object.hasOwn(p.enemies, t)));
    }
    if (hit) return { map: m.id, x: hit.x, z: hit.z };
  }
  return null;
}
