import Stripe from "stripe";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
// jediný zdroj pravdy o produktech a cenách — stejný jako pro web
const produkty = require("../src/data/produkty.json");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const productsBySlug = new Map(produkty.map((p) => [p.slug, p]));

const MAX_ITEMS = 20;
const MAX_QTY = 9;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PUBLISHABLE_KEY) {
    console.error("❌ Chybí STRIPE_SECRET_KEY nebo STRIPE_PUBLISHABLE_KEY");
    return res.status(500).json({ error: "Server není nakonfigurovaný" });
  }

  const items = req.body?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return res.status(400).json({ error: "Neplatný obsah košíku" });
  }

  const lineItems = [];
  for (const item of items) {
    const product = productsBySlug.get(item?.slug);
    const quantity = item?.quantity;
    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QTY
    ) {
      return res.status(400).json({ error: "Neplatná položka košíku" });
    }
    lineItems.push({
      quantity,
      price_data: {
        currency: "czk",
        unit_amount: product.price * 100,
        product_data: {
          name: `${product.title} (${product.id})`,
        },
      },
    });
  }

  const origin = req.headers.origin || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      locale: "cs",
      line_items: lineItems,
      shipping_address_collection: { allowed_countries: ["CZ", "SK"] },
      custom_fields: [
        {
          key: "doprava",
          label: { type: "custom", custom: "Způsob doručení" },
          type: "dropdown",
          dropdown: {
            options: [
              { label: "Zásilkovna – na adresu", value: "zasilkovnaAdresa" },
              { label: "Zásilkovna – Z-BOX", value: "zasilkovnaZbox" },
              { label: "Osobní převzetí – Praha 1", value: "osobniPraha" },
            ],
          },
        },
        {
          key: "zbox",
          label: { type: "custom", custom: "Kód nebo adresa Z-BOXu" },
          type: "text",
          optional: true,
        },
      ],
      return_url: `${origin}/dekujeme?session_id={CHECKOUT_SESSION_ID}`,
    });

    return res.status(200).json({
      clientSecret: session.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    });
  } catch (err) {
    console.error("❌ Chyba při vytváření checkout session:", err);
    return res.status(500).json({ error: "Platbu se nepodařilo připravit" });
  }
}
