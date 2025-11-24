export default function handler(req, res) {
  console.log("➡️ Stripe webhook hit!", req.method);
  return res.status(200).json({ ok: true });
}