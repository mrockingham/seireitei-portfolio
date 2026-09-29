import { finaleNextPhase } from './finale/timeline'

export type EncounterPhase = 'idle' | 'intro' | 'renji' | 'dragon' | 'shunko' | 'reveal' | 'finish' | 'catch' | 'complete' | 'first-strike' | 'petal-block' | 'sword-bankai' | 'ichigo-bankai' | 'final-strike'
export const isEncounterActive = (phase: EncounterPhase) => phase !== 'idle' && phase !== 'complete'

// Finale beat captions. Timing lives in finale/timeline.ts and is driven by the in-scene clock.
export const finaleSteps: { phase: EncounterPhase; title: string; caption: string }[] = [
  {phase:'intro',title:'Byakuya Kuchiki',caption:'Scatter, Senbonzakura.'},
  {phase:'first-strike',title:'Ichigo Kurosaki',caption:'Getsuga Tenshō · The first strike.'},
  {phase:'petal-block',title:'Byakuya Kuchiki',caption:'A thousand petals gather into a shield.'},
  {phase:'sword-bankai',title:'Senbonzakura Kageyoshi',caption:'Bankai · Blades rise, then scatter into a storm.'},
  {phase:'ichigo-bankai',title:'Tensa Zangetsu',caption:'Bankai · A new form, a new resolve.'},
  {phase:'final-strike',title:'Getsuga Tenshō',caption:'Black and crimson cut through the storm.'},
]
// Spirit Gate beat captions (timing lives in gate/timeline.ts).
export const gateSteps: { phase: EncounterPhase; title: string; caption: string }[] = [
  {phase:'intro',title:'Rukia Kuchiki',caption:'Dance, Sode no Shirayuki. Some no mai, Tsukishiro.'},
  {phase:'renji',title:'Renji Abarai',caption:'Roar, Zabimaru.'},
  {phase:'finish',title:'Getsuga Tenshō',caption:'A path forward.'},
]
// Division barracks beat captions (timing lives in barracks/timeline.ts).
export const barracksSteps: { phase: EncounterPhase; title: string; caption: string }[] = [
  {phase:'intro',title:'Tōshirō Hitsugaya',caption:'Sit upon the frozen heavens, Hyōrinmaru.'},
  {phase:'dragon',title:'Hyōrinmaru',caption:'The ice dragon strikes.'},
  {phase:'finish',title:'Getsuga Tenshō',caption:'Through the ice.'},
]
// Kuchiki garden beat captions (timing lives in garden/timeline.ts).
export const gardenSteps: { phase: EncounterPhase; title: string; caption: string }[] = [
  {phase:'intro',title:'Soi Fon',caption:'Sting all enemies to death, Suzumebachi.'},
  {phase:'shunko',title:'Shunkō',caption:'Kidō wrapped around her back and shoulders.'},
  {phase:'finish',title:'Getsuga Tenshō',caption:'Through the storm.'},
  {phase:'catch',title:'Yoruichi Shihōin',caption:'The Flash Goddess steps in.'},
]
/** The beat after this one when the visitor presses Next (the reveal waits for Continue). */
export function advanceEncounter(stage:number,phase:EncounterPhase):EncounterPhase {
  if(stage===3) return finaleNextPhase(phase)
  if(stage===0) return phase==='intro'?'renji':phase==='renji'?'reveal':'complete'
  if(stage===1) return phase==='intro'?'dragon':phase==='dragon'?'reveal':'complete'
  return phase==='intro'?'shunko':phase==='shunko'?'reveal':'complete'
}
