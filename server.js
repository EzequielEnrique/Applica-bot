// Servidor del bot de WhatsApp para Huella Urbana.
require("dotenv").config();
const express = require("express");
const menu = require("./menu");
const path = require("path");

const app = express();
app.use(express.json());

const {
  WHATSAPP_TOKEN,
  PHONE_NUMBER_ID,
  VERIFY_TOKEN,
  PORT = 3000,
} = process.env;

["WHATSAPP_TOKEN", "PHONE_NUMBER_ID", "VERIFY_TOKEN"].forEach((key) => {
  if (!process.env[key]) {
    console.warn(
      `⚠️  Falta la variable de entorno ${key} (revisa tu archivo .env)`
    );
  }
});

const GRAPH_API_VERSION = "v21.0";

// --- Memoria de conversaciones -------------------------------------------
// Por cada número de cliente guardamos en qué "paso" de la charla está y
// cuándo fue la última vez que le contestamos. Así el bot sabe si tiene que
// mandar el menú principal, el submenú de unidades, o quedarse callado
// porque ya lo está atendiendo una persona.
//
// OJO: esto vive en la memoria del programa (una variable). Si Render
// reinicia el servidor (por ejemplo al "despertar" en el plan free después
// de estar inactivo un rato), esta memoria se borra y todos los clientes
// vuelven a arrancar de cero la próxima vez que escriban. Para el volumen
// que van a tener ahora está bien; si en el futuro esto crece mucho,
// conviene guardar este estado en una base de datos en vez de en memoria.
const conversaciones = new Map();

const HORAS_PARA_REINICIAR = 24;
const MS_PARA_REINICIAR = HORAS_PARA_REINICIAR * 60 * 60 * 1000;

function obtenerEstado(numero) {
  const conv = conversaciones.get(numero);

  if (!conv) {
    return "inicio";
  }

  const pasaronMasDe24hs =
    Date.now() - conv.ultimaActividad > MS_PARA_REINICIAR;

  if (conv.estado === "atendido" && pasaronMasDe24hs) {
    return "inicio";
  }

  return conv.estado;
}

function guardarEstado(numero, estado) {
  conversaciones.set(numero, { estado, ultimaActividad: Date.now() });
}

// Sirve la página de conexión de WhatsApp (conectar.html) que está en la
// raíz del proyecto, para poder abrirla como https://.../conectar.html
app.get("/conectar.html", (req, res) => {
  res.sendFile(path.join(__dirname, "conectar.html"));
});



app.get("/", (req, res) => {
  res.send("Bot de Huella Urbana funcionando ✅");
});

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

app.post("/webhook", async (req, res) => {
  res.sendStatus(200);

  try {
    const entry = req.body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return;
    }

    const from = normalizeArgentineNumber(message.from);
    const estado = obtenerEstado(from);

    // Si ya lo está atendiendo una persona (y todavía no pasaron 24hs),
    // el bot no dice nada más: dejamos que el humano siga la charla solo.
    if (estado === "atendido") {
      console.log(`🤫 ${from} ya está siendo atendido por una persona, el bot no responde.`);
      return;
    }

    const type = message.type;
    const text = type === "text" ? message.text?.body?.trim() : null;

    console.log(`📩 [${estado}] Mensaje de ${from}: "${text ?? "(no es texto)"}"`);

    if (estado === "inicio") {
      await sendWhatsAppMessage(from, menu.welcome);
      guardarEstado(from, "esperando_opcion");
      return;
    }

    
    if (estado === "esperando_opcion") {
      if (text === "1") {
        await sendWhatsAppMessage(from, menu.proyectos);
        guardarEstado(from, "esperando_edificio");
      } else if (text === "2") {
        await sendWhatsAppMessage(from, menu.derivado);
        guardarEstado(from, "atendido");
      } else {
        await sendWhatsAppMessage(from, menu.welcome);
        guardarEstado(from, "esperando_opcion");
      }
      return;
    }

    
    if (estado === "esperando_edificio") {
      if (["1", "2", "3"].includes(text)) {
        await sendWhatsAppMessage(from, menu.tipoConsulta);
        guardarEstado(from, "esperando_tipo");
      } else {
        await sendWhatsAppMessage(from, menu.proyectos);
        guardarEstado(from, "esperando_edificio");
      }
      return;
    }

    
    if (estado === "esperando_tipo") {
      if (text === "1" || text === "2") {
        await sendWhatsAppMessage(from, menu.derivado);
        guardarEstado(from, "atendido");
      } else {
        await sendWhatsAppMessage(from, menu.tipoConsulta);
        guardarEstado(from, "esperando_tipo");
      }
      return;
    }
  } catch (error) {
    console.error("Error procesando el webhook:", error);
  }
});

function normalizeArgentineNumber(number) {
  if (number.startsWith("549")) {
    return "54" + number.slice(3);
  }
  return number;
}

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


module.exports = app;