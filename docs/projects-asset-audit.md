# Projects / Gallery asset audit

The Projects page uses derived WebP files only. Original client files under
`photos/` remain unchanged. The source folder contains architectural product
visualisations, but no verified project names, architects, clients, locations,
completion dates or project-to-product relationships. Consequently, these
images are presented as centralized development studies until approved project
records are published through PostgreSQL.

## Selected assets

| Source file | Optimized public asset |
| --- | --- |
| `photos/drive-download-20260910T214746Z-1-001/ENIGMA_LINE_STONE_MIST.jpg` | `public/assets/projects/hero-enigma-line-stone-mist.webp` |
| `photos/drive-download-20260910T214746Z-1-001/ETERNITY MOCHA + ETERNITY MIST.jpg` | `public/assets/projects/featured-eternity-mocha-mist.webp` |
| `photos/drive-download-20260910T214746Z-1-001/AQUA_STONE_GRAPHITE.jpg` | `public/assets/projects/featured-aqua-stone-graphite.webp` |
| `photos/drive-download-20260910T214746Z-1-001/ARTICA BEIGE.jpg` | `public/assets/projects/study-artica-beige.webp` |
| `photos/drive-download-20260910T214746Z-1-001/COTTO OLIVE PREVIEW.jpg` | `public/assets/projects/study-cotto-olive.webp` |
| `photos/drive-download-20260910T214746Z-1-001/Avenue grey.jpg` | `public/assets/projects/study-avenue-grey.webp` |
| `photos/drive-download-20260910T214746Z-1-001/COTTO RED + AURUM TACO.jpg` | `public/assets/projects/study-cotto-red-aurum.webp` |
| `photos/drive-download-20260910T214746Z-1-001/PLUTONIC TEAL GRANDE +AQUA STONE SILVER.jpg` | `public/assets/projects/study-plutonic-teal.webp` |
| `photos/drive-download-20260910T214746Z-1-001/SUNGLOW YELLOW + HERITAGE FLORAL BASE.jpg` | `public/assets/projects/study-sunglow-heritage.webp` |
| `photos/drive-download-20260910T214746Z-1-001/ARTICA IVORY.jpg` | `public/assets/projects/gallery-artica-ivory.webp` |
| `photos/drive-download-20260910T214746Z-1-001/ARTICA SILVER+GRAPHITE.jpg` | `public/assets/projects/gallery-artica-silver-graphite.webp` |
| `photos/drive-download-20260910T214746Z-1-001/Cotto sand final_.jpg` | `public/assets/projects/gallery-cotto-sand.webp` |
| `photos/drive-download-20260910T214746Z-1-001/EVEREST TAUPE FINAL.jpg` | `public/assets/projects/gallery-everest-taupe.webp` |
| `photos/drive-download-20260910T214746Z-1-001/POLAR GRIS.jpg` | `public/assets/projects/gallery-polar-gris.webp` |
| `photos/drive-download-20260910T214746Z-1-001/FOREST GREEN+YELLOW+HERITAGE SQUARE BASE.jpg` | `public/assets/projects/story-forest-heritage.webp` |
| `photos/drive-download-20260910T214746Z-1-001/POLAR PEARL+CHARCOAL.jpg` | `public/assets/projects/story-polar-pearl-charcoal.webp` |
| `photos/drive-download-20260910T214746Z-1-001/STAR_MOCHA.jpg` | `public/assets/projects/story-star-mocha.webp` |

The reproducible conversion manifest is in
`scripts/optimize-project-assets.mjs`. It rotates according to embedded image
metadata, limits output dimensions, prevents enlargement and exports WebP at
quality 82.

## Deliberately avoided prominent sources

The audit excluded images already referenced by the established public page
content, including:

- `ENIGMA CREMA CAPSUL PUNCH.jpg` - Home hero and Applications residential.
- `CROSS_CUT&VIEN_CUT_BEIGE.jpg` - Home collection imagery.
- `AUSTIN_SILVER.jpg` and `AUSTIN_WHITE.jpg` - Products and Product Detail.
- `MYSTONE GREY.jpg`, `MYSTONE JAIPUR.jpg` and `MYSTONE NERO + GREY.jpg` - Products.
- `TRAVERTINO HONEY+DCEOR.jpg` and `TRAVERTINO ROME + DECOR.jpg` - Products and Home surface studies.
- `FENIX CREMA.jpg` and `FENIX_TAUPE.jpg` - Products and Applications hero.
- `COTTO GOLD PREVIEW.jpg` and `COTTO_GOLD.jpg` - Applications and Products.
- `EVEREST GREY.jpg`, `EVEREST GRPHITE.jpg` and `POLAR SAND+CHARCOAL.jpg` - Applications commercial/office.
- `SERENA GRAPHITE.jpg`, `ILLUSION_BLANCO&ILLUSION_VERDE.jpg`, `MARMI_TRAVERTINE.jpg` and `KANDLA_GREY.jpg` - Applications hospitality, retail and outdoor.
- `STAR_NERO.jpg`, `STAR_GREY.jpg`, `STARS_BIANCO.jpg` and `POLAR CHARCOAL.jpg` - Home, Products or Product Detail.

## Data handoff

When approved records exist, `/projects` reads only published projects with
approved media. Project title, description, category, location and product
associations then come from the existing Prisma models. Empty or unavailable
database state returns the centralized development content in
`src/content/projects.ts`; it does not create database records or publish fake
project metadata.

## Project Detail development gallery

The Project Detail fallback uses six additional architectural visualisations
from the supplied 200x1200 preview folder. None is used by the Projects listing.
They demonstrate the gallery rhythm only; the interface explicitly states that
they are not evidence of one verified project.

| Source file | Optimized public asset |
| --- | --- |
| `photos/200X1200-20260910T201837Z-1-001/200X1200/PREVIEW/01 HARAMAIN.jpg` | `public/assets/projects/detail-haramain-01.webp` |
| `photos/200X1200-20260910T201837Z-1-001/200X1200/PREVIEW/017 HARAMAIN.jpg` | `public/assets/projects/detail-haramain-017.webp` |
| `photos/200X1200-20260910T201837Z-1-001/200X1200/PREVIEW/019 HARAMAIN.jpg` | `public/assets/projects/detail-haramain-019.webp` |
| `photos/200X1200-20260910T201837Z-1-001/200X1200/PREVIEW/020 HARAMAIN.jpg` | `public/assets/projects/detail-haramain-020.webp` |
| `photos/200X1200-20260910T201837Z-1-001/200X1200/PREVIEW/08 HARAMAIN.jpg` | `public/assets/projects/detail-haramain-08.webp` |
| `photos/200X1200-20260910T201837Z-1-001/200X1200/PREVIEW/18001_FINAL.jpg` | `public/assets/projects/detail-18001-final.webp` |

When a published project is available, Project Detail ignores these fallback
frames and renders only approved `ProjectImage` media attached to that record.
