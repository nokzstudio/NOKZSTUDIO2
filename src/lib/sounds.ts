
export const SOUNDS = {
  DELETE: 'https://www.myinstants.com/media/sounds/lo-siento-wilson.mp3',
  SUCCESS: 'https://www.myinstants.com/media/sounds/iphone-apple-store-sound.mp3',
};

export const playSound = (soundUrl: string) => {
  const audio = new Audio(soundUrl);
  audio.play().catch(err => console.error("Error playing sound:", err));
};
