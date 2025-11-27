import Stripe from "stripe";


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to send email to customer via Resend
async function sendEmailCustomer({ email, name, amount, currency }) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set, skipping customer email");
    return;
  }

  const formattedAmount = (amount / 100).toFixed(2);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Objednávky <noreply@example.com>",
      to: email,
      subject: "Díky za objednávku, ${name}! 🐌",
      text: `
Ahoj ${name},

moc děkujeme za tvoji objednávku.
Platba ve výši ${formattedAmount} ${currency.toUpperCase()} k nám dorazila v pořádku a my se můžeme pustit do chystání balíčku.

Teď od tebe ještě potřebujeme upřesnit, jak chceš svůj kousek doručit. Prosím, odpověz na tento e-mail a napiš nám, co si vybereš:
	•	Zásilkovna na adresu
→ napiš prosím přesnou adresu
	•	Zásilkovna Z-BOX
→ napiš prosím kód boxu nebo adresu boxu
	•	Osobní převzetí v Praze
→ domluvíme se spolu na místě a čase

Jakmile budeme mít tyhle informace, začneme balit a dáme ti vědět, až se tvůj balíček vydá na cestu.

Díky, že jdeš do toho pomalejšího, poctivého světa s námi.

Honza a Bára
BB Craft
      `.trim(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Customer email send failed:", res.status, body);
  } else {
    console.log("📧 Customer email sent to:", email);
  }
}

// Helper function to send email to owner via Resend
async function sendEmailOwner({ customerEmail, name, amount, currency, product }) {
  if (!process.env.RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not set, skipping owner email");
    return;
  }

  const ownerEmail = process.env.EMAIL_OWNER;
  if (!ownerEmail) {
    console.error("EMAIL_OWNER is not set, skipping owner email");
    return;
  }

  const formattedAmount = (amount / 100).toFixed(2);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Objednávky <noreply@example.com>",
      to: ownerEmail,
      subject: "Nová objednávka",
      text: `
Nová objednávka byla zaplacena:

Jméno: ${name}
E-mail zákazníka: ${customerEmail}
Částka: ${formattedAmount} ${currency.toUpperCase()}
Produkt(y): ${product || "Neuvedeno"}

Detailní informace najdeš ve Stripe.
      `.trim(),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("Owner email send failed:", res.status, body);
  } else {
    console.log("📧 Owner email sent to:", ownerEmail);
  }
}

async function pushOrderToMake({ email, name, amount, currency, product }) {
  const url =
    process.env.MAKE_WEBHOOK_URL;

  if (!url) {
    console.error("MAKE_WEBHOOK_URL není nastavené, přeskočím zápis do Make");
    return;
  }

  // Přepočet času do Europe/Prague a hezký formát pro Sheets
  const nowUtc = new Date();
  const pragueNow = new Date(
    nowUtc.toLocaleString("en-US", { timeZone: "Europe/Prague" })
  );

  const pad = (num) => String(num).padStart(2, "0");

  const createdAtLocal = `${pad(pragueNow.getDate())}.${pad(
    pragueNow.getMonth() + 1
  )}.${pragueNow.getFullYear()} ${pad(pragueNow.getHours())}:${pad(
    pragueNow.getMinutes()
  )}:${pad(pragueNow.getSeconds())}`;

  const payload = {
    email,
    name,
    amount: amount / 100,
    currency: currency.toUpperCase(),
    product,
    createdAt: createdAtLocal,      // lidsky čitelné, lokální (Praha)
    createdAtUtc: nowUtc.toISOString(), // pro případný debug
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("❌ Zápis do Make webhooku selhal:", res.status, body);
    } else {
      console.log("📄 Objednávka pushnutá do Make/Sheetu");
    }
  } catch (err) {
    console.error("❌ Chyba při volání Make webhooku:", err);
  }
}

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

    let productDescription = "Neznámý produkt";
    try {
      const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ["line_items", "line_items.data.price.product"],
      });
      const lineItems = fullSession.line_items?.data || [];
      if (lineItems.length > 0) {
        productDescription = lineItems
          .map(
            (item) =>
              item.description ||
              item.price?.product?.name ||
              "Položka"
          )
          .join(", ");
      }
    } catch (err) {
      console.error("❌ Chyba při načítání produktů ze Stripe:", err);
    }

    console.log("💰 Úspěšná platba");
    console.log("   Jméno:", name);
    console.log("   E-mail:", email);
    console.log("   Částka:", amountTotal, currency);
    console.log("   Produkt(y):", productDescription);

    try {
      if (email) {
        await sendEmailCustomer({
          email,
          name,
          amount: amountTotal,
          currency,
        });
      } else {
        console.error("❌ Chybí email zákazníka, nemůžu poslat potvrzovací email");
      }

      await sendEmailOwner({
        customerEmail: email || "nezadaný",
        name,
        amount: amountTotal,
        currency,
        product: productDescription,
      });

      await pushOrderToMake({
        email,
        name,
        amount: amountTotal,
        currency,
        product: productDescription,
      });
    } catch (err) {
      console.error("❌ Chyba při odesílání emailů:", err);
    }
  }

  // Stripe chce 2xx odpověď, jinak bude webhook retryovat
  res.status(200).send("OK");
}