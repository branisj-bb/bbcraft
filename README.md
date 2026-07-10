# BB Craft — bbcraft.cz

Web malé rodinné dílny BB Craft: ručně vyráběné kožené doplňky, mechária a věnce.

## Stack

- [Astro 5](https://astro.build) — statický web, build do `dist/`
- Tailwind CSS 3 (přes `@astrojs/tailwind`)
- `@astrojs/sitemap` — sitemapa se generuje automaticky při buildu
- Platby: Stripe Payment Links (odkazy v datech produktů)
- `api/stripe-webhook.js` — serverless webhook (Vercel): po zaplacení pošle
  potvrzovací e-mail zákazníkovi i majiteli (Resend) a zapíše objednávku do
  Make/Google Sheets

## Struktura

- `src/data/produkty.json` — produkty (content collection, schéma v `src/content.config.ts`)
- `src/data/categories.ts` — kategorie + SEO texty (navigace, homepage, stránky kategorií)
- `src/assets/` — obrázky optimalizované Astrem (`<Image>`)
- `public/images/` — jen favicon a OG obrázek (musí mít stabilní URL)

## Příkazy

| Příkaz            | Akce                                 |
| :---------------- | :----------------------------------- |
| `npm install`     | instalace závislostí                 |
| `npm run dev`     | dev server na `localhost:4321`       |
| `npm run build`   | produkční build do `./dist/`         |
| `npm run preview` | lokální náhled produkčního buildu    |

## Přidání produktu

1. Přidej fotky (webp) do `src/assets/produkty/<kategorie>/`
2. Přidej záznam do `src/data/produkty.json` — cesty k obrázkům relativně
   (`../assets/produkty/...`), cena jako číslo, `payment` = Stripe Payment Link
3. Build záznam zvaliduje (chybný obrázek nebo kategorie shodí build)

## Webhook — env proměnné

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`,
`EMAIL_OWNER`, `MAKE_WEBHOOK_URL`
