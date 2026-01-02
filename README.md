# Two-Lane Survival Shooter (Vite + TypeScript + Canvas)

マウスだけで遊べる 2 レーンのサバイバルシューターです。左右のレーンを移動しながら弾を撃ち、落ちてくるリンゴを防衛ラインより上で撃ち落とします。積まれたリンゴが 3 つになるとゲームオーバーです。

## セットアップ / 実行
```bash
npm install
npm run dev
```
ターミナルに表示される `http://localhost:5173/` などの URL をブラウザで開いてください。

## ビルド / プレビュー
```bash
npm run build
npm run preview
```

## 操作
- マウス移動：左半分で左レーン、右半分で右レーンに配置
- 左クリック：弾を発射
- 右クリック：ゲームオーバー後の再スタート
- BGM は開始時のクリックで再生、ゲームオーバーで停止します

## ルール概要
- 落下するリンゴに弾が当たるとスコア加算
- 防衛ラインを越えたリンゴは足元にスタックされ、撃てません
- スタックが 3 個になると即ゲームオーバー
- 時間経過でスポーン間隔短縮・落下速度上昇・同時落下数増加

## プロジェクト構成
```
/
├─ public/
│  └─ assets/          # 画像・音源
├─ src/                # TypeScript ゲームコード
├─ index.html
├─ package.json
├─ vite.config.ts
├─ README.md
└─ .gitignore
```

## GitHub Pages について
ビルド成果物は `dist/` に出力されます。GitHub Pages で公開する場合は、`npm run build` の後、`dist` をデプロイしてください（リポジトリ直下に `dist` を配置するか、Pages の設定を `dist` に向けてください）。

