export async function loadAssets() {
    const background = await loadImage('/assets/back.png');
    const apples = await Promise.all([
        loadImage('/assets/apple1.png'),
        loadImage('/assets/apple2.png'),
        loadImage('/assets/apple3.png')
    ]);
    const rabbit = await loadImage('/assets/rabbit1.png');
    return { background, apples, rabbit };
}
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = (err) => reject(err);
        img.src = src;
    });
}
//# sourceMappingURL=Assets.js.map