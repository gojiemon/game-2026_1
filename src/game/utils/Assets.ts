// Simple image loader for background and apples.
export type LoadedAssets = {
  background: HTMLImageElement;
  apples: HTMLImageElement[];
  rabbitLeft: HTMLImageElement;
  rabbitRight: HTMLImageElement;
  rabbitJumpLeft: HTMLImageElement;
  rabbitJumpRight: HTMLImageElement;
  crateState0: HTMLImageElement;
  crateState1: HTMLImageElement;
  crateState2: HTMLImageElement;
  crateState3: HTMLImageElement;
  rewardBird: HTMLImageElement;
};

const withBase = (p: string) => new URL(p, import.meta.env.BASE_URL).toString(); // respect base for dev/Pages

export async function loadAssets(): Promise<LoadedAssets> {
  const background = await loadImage(withBase('assets/back.png'));
  const apples = await Promise.all([
    loadImage(withBase('assets/apple1.png')),
    loadImage(withBase('assets/apple2.png')),
    loadImage(withBase('assets/apple3.png'))
  ]);
  const rabbitLeft = await loadImage(withBase('assets/rabbit1.png'));
  const rabbitRight = await loadImage(withBase('assets/rabbit3.png'));
  const rabbitJumpLeft = await loadImage(withBase('assets/rabbit2.png'));
  const rabbitJumpRight = await loadImage(withBase('assets/rabbit4.png'));
  // crate states (switching images instead of overlays)
  const crateState0 = await loadImage(withBase('assets/crate_state_0.png'));
  const crateState1 = await loadImage(withBase('assets/crate_state_1.png'));
  const crateState2 = await loadImage(withBase('assets/crate_state_2.png'));
  const crateState3 = await loadImage(withBase('assets/crate_state_3.png'));
  // reward bird file has double .png extension on disk; match exact name to avoid 404
  const rewardBird = await loadImage(withBase('assets/reward_bird.png.png'));
  return {
    background,
    apples,
    rabbitLeft,
    rabbitRight,
    rabbitJumpLeft,
    rabbitJumpRight,
    crateState0,
    crateState1,
    crateState2,
    crateState3,
    rewardBird
  };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => {
      console.error('Image failed to load:', src, err); // log failing URL
      reject(err);
    };
    img.src = src;
  });
}
