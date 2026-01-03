export async function loadAssets() {
    const background = await loadImage('/assets/back.png');
    const apples = await Promise.all([
        loadImage('/assets/apple1.png'),
        loadImage('/assets/apple2.png'),
        loadImage('/assets/apple3.png')
    ]);
    const rabbitLeft = await loadImage('/assets/rabbit1.png');
    const rabbitRight = await loadImage('/assets/rabbit3.png');
    const rabbitJumpLeft = await loadImage('/assets/rabbit2.png');
    const rabbitJumpRight = await loadImage('/assets/rabbit4.png');
    // crate states (switching images instead of overlays)
    const crateState0 = await loadImage('/assets/crate_state_0.png');
    const crateState1 = await loadImage('/assets/crate_state_1.png');
    const crateState2 = await loadImage('/assets/crate_state_2.png');
    const crateState3 = await loadImage('/assets/crate_state_3.png');
    // reward bird file has double .png extension on disk; match exact name to avoid 404
    const rewardBird = await loadImage('/assets/reward_bird.png.png');
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
function loadImage(src) {
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
//# sourceMappingURL=Assets.js.map