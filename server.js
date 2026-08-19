// Servidor del bot de WhatsApp para Applica.
// Explicacion rapida de que hace este archivo:
//  1) Expone GET /webhook  -> Meta lo usa UNA vez para confirmar que el
//     webhook es tuyo (te manda un "challenge" y vos se lo devolves).
//  2) Expone POST /webhook -> Meta te manda ahi cada mensaje nuevo que
//     te escribe un cliente. Ahi decidimos que responder.
//  3) Tiene una funcion sendWhatsAppMessage() que le pide a la API de
//     Meta que le mande un mensaje de texto a alguien.

require("dotenv").config();
const express = require("express");
const menu = require("./menu");

const app = express();
app.use(express.json());

const {
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  VERIFY_TOKEN,
  PORT = 3000,
} = process.env;

// Chequeo basico: si falta alguna variable de entorno, avisamos apenas
// arranca el server en vez de fallar mas adelante de forma confusa.
["WHATSAPP_TOKEN", "PHONE_NUMBER_ID", "VERIFY_TOKEN"].forEach((key) => {
  if (!process.env[key]) {
    console.warn(
      `⚠️  Falta la variable de entorno ${key} (revisa tu archivo .env)`
    );
  }
});

// Version de la Graph API de Meta. La pueden ir subiendo con el tiempo,
// si en el futuro deja de funcionar, revisa la doc de Meta por una version
// mas nueva y cambiala solo aca.
const GRAPH_API_VERSION = "v21.0";

/**
 * Ruta de salud: sirve para chequear rapido, desde el navegador, que el
 * server esta arriba (util cuando lo tengas deployado en Render).
 */
app.get("/", (req, res) => {
  res.send("Bot de Applica funcionando ✅");
});

/**
 * PASO 1 (una sola vez): Meta llama a esta ruta cuando vos configuras el
 * webhook en la consola de Meta for Developers, para confirmar que el
 * dueño de esta URL sos vos.
 */
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente por Meta");
    return res.status(200).send(challenge);
  }

  console.warn("❌ Verificacion de webhook fallida (revisa el VERIFY_TOKEN)");
  return res.sendStatus(403);
});

/**
 * PASO 2 (todo el tiempo): acá llegan los mensajes reales de WhatsApp.
 */
app.post("/webhook", async (req, res) => {
  // Le respondemos rapido a Meta con 200 para que no reintente el envio.
  // Todo el trabajo real lo hacemos despues, sin bloquear la respuesta.
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    // Meta tambien manda webhooks de otras cosas (ej: confirmaciones de
    // entrega de mensajes). Si no hay un "message" nuevo, no hacemos nada.
    if (!message) {
      return;
    }

    const from = message.from; // numero del cliente que escribio
    const type = message.type;

    if (type !== "text") {
      // Por ahora solo manejamos texto. Si mandan un audio, imagen, etc,
      // le pedimos que escriba una opcion.
      await sendWhatsAppMessage(from, menu.welcome);
      return;
    }

    const text = message.text?.body?.trim();
    console.log(`📩 Mensaje de ${from}: "${text}"`);

    if (text === "1" || text === "2" || text === "3") {
      await sendWhatsAppMessage(from, menu.options[text]);
    } else {
      await sendWhatsAppMessage(from, menu.welcome);
    }
  } catch (error) {
    console.error("Error procesando el webhook:", error);
  }
});

/**
 * Le pide a la Graph API de Meta que mande un mensaje de texto plano.
 * @param {string} to - numero de telefono del destinatario (formato que
 *   te manda Meta en message.from, ya viene listo para usar).
 * @param {string} body - el texto a enviar.
 */
async function sendWhatsAppMessage(to, body) {
  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("❌ Error al enviar mensaje:", JSON.stringify(data));
  } else {
    console.log(`✅ Respuesta enviada a ${to}`);
  }

  return data;
}

app.listen(PORT, () => {
  console.log(`🚀 Server escuchando en el puerto ${PORT}`);
  console.log(`   Ruta del webhook: /webhook`);
});

// Se exporta para poder testear la app sin levantar el puerto (ver test.js).
module.exports = app;
