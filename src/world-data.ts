import type { Vec3 } from './World'

/**
 * The four encounter locations come first (their index is the encounter stage); side stops follow.
 * label: the marker shown on the map; order: position along the route for the map list;
 * radius: how close counts as having arrived; spawnYaw: the camera direction after quick travel.
 */
export type Place = { name: string; subtitle: string; position: Vec3; spawn: Vec3; radius: number; label: string; order: number; side?: boolean; spawnYaw?: number; mapDot: [number, number] }

export const places: Place[] = [
  { name: 'Spirit gate', subtitle: 'The beginning of your journey', position: [0, .2, 5], spawn: [0, .3, 8], radius: 4.5, label: '01', order: 0, mapDot: [150, 250] },
  { name: 'Division barracks', subtitle: 'Beyond the vermilion doors', position: [28, .6, -11], spawn: [28, .7, -5], radius: 4.5, label: '02', order: 3, mapDot: [300, 220] },
  { name: 'Kuchiki compound', subtitle: 'Across the stream, an open-air encounter', position: [-22, .23, -32], spawn: [-22, .35, -29], radius: 4.5, label: '03', order: 5, mapDot: [70, 135] },
  { name: 'Sōkyoku Hill', subtitle: 'Above the city, the final encounter', position: [-14, 22, -87], spawn: [-14, 22.2, -83], radius: 4.5, label: '04', order: 7, mapDot: [110, 35] },
  { name: 'Training grounds', subtitle: 'Chad, Uryū, and Orihime spar beside the gate', position: [24, 0, 18], spawn: [24, .1, 8.6], radius: 10.5, label: '✦', order: 2, side: true, spawnYaw: Math.PI, mapDot: [272, 276] },
  { name: 'Eleventh Division yard', subtitle: 'Kenpachi and Yachiru watch Ikkaku and Yumichika spar', position: [14, 0, -38], spawn: [14, .1, -30.4], radius: 10, label: '✦', order: 4, side: true, mapDot: [236, 168] },
  { name: 'Twelfth Division lab', subtitle: 'Mayuri’s Research and Development Institute, and your websites', position: [-19.5, 0, 6.5], spawn: [-9.3, .1, 6.5], radius: 12.5, label: '✦', order: 1, side: true, spawnYaw: Math.PI / 2, mapDot: [100, 250] },
  { name: 'Captains’ training arena', subtitle: 'Komamura and Tōsen spar: Tenken, Enma Kōrogi, and Kokujō Tengen Myō’ō', position: [-50, 0, -88], spawn: [-50, .1, -68.5], radius: 21, label: '✦', order: 6, side: true, mapDot: [34, 78] },
]
