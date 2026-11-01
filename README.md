# Infer — sec4si

Project website: **https://infer.sec4.si/**

This static starter matches the sec4.si visual style and is ready for project code to be moved in later.

## Local development

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4177/. Edit `public/`; `npm run build` copies the site into `dist/`. The starter has no third-party JavaScript dependencies. Fonts are self-hosted with their license notices in `public/licenses/`.

## Publishing

- [Deploy GitHub Pages](https://github.com/sec4si/infer/actions/workflows/pages.yml) runs on pushes to `main` and manual dispatch.
- The workflow runs `npm ci` and `npm run build`, then publishes `dist/`.
- [Pages settings](https://github.com/sec4si/infer/settings/pages) use GitHub Actions and custom domain `infer.sec4.si`.
- Cloudflare DNS-only CNAME: `infer` → `sec4si.github.io`.

When moving in the real project, preserve **`npm ci` + `npm run build` → `dist/`** or update the workflow artifact path. Keep the repository's Pages custom domain configured. GitHub Pages serves static output; deploy any future backend separately.

Navigation connects this site to [sec4.si](https://sec4.si/), [Benchmark](https://benchmark.sec4.si/), [Lens](https://lens.sec4.si/), and this repository. No private research data or proprietary Pro component source is included.
