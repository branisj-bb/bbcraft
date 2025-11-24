import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Pomocná funkce: načte raw body z requestu
 */
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let event;
  let rawBody;

  try {
    rawBody = await getRawBody(req);
  } catch (err) {
    console.error("❌ Chyba při čtení body:", err);
    return res.status(400).send("Unable to read body");
  }

  const signature = req.headers["stripe-signature"];

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Neplatný podpis webhooku:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Tady už máme ověřený event od Stripe
  console.log("✅ Stripe event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const email = session.customer_details?.email;
    const name = session.customer_details?.name || "zákazník";
    const amountTotal = session.amount_total; // v centech/haléřích
    const currency = session.currency;

    console.log("💰 Úspěšná platba");
    console.log("   Jméno:", name);
    console.log("   E-mail:", email);
    console.log("   Částka:", amountTotal, currency);

    // Tady později:
    // - pošleme e-mail se žádostí o způsob dopravy
    // - případně logneme objednávku do souboru / nějakého storage

    // PŘÍKLAD – skeleton pro e-mail (zatím zakomentovaný):
    /*
    await sendEmailAfterPayment({
      email,
      name,
      amountTotal,
      currency,
    });
    */
  }

  // Stripe chce 2xx odpověď, jinak bude webhook retryovat
  res.status(200).send("OK");
}