// A small, shared hint from the side stops to the follow camera: how far (radians) to tilt the view
// up so something tall stays in frame while the player watches. Written each frame by the stop that
// wants it (only the captains' arena, for Kokujō Tengen Myō'ō); the follow camera eases toward it.
export const cameraAssist = { tilt: 0 }
