# applica-whatsapp-bot

Bot chiquito para WhatsApp: cuando alguien te escribe, responde con un menú
principal (1. Inversiones / 2. Administración). Si elige "Inversiones", le
muestra los 3 edificios (Huella Sur, Huella Tower o Huella Bonita) y, elija
el que elija, le pregunta si su interés es para Vivienda o Inversión. Si
elige "Administración" —o ya contestó Vivienda/Inversión—, avisa que un
asesor lo va a contactar y el bot se queda en silencio: a partir de ahí
sigue la charla una persona, hasta que pasen 24hs sin actividad (ahí el bot
vuelve a arrancar desde el menú principal).

Corre sobre la **WhatsApp Cloud API** de Meta (oficial y gratuita para este
caso de uso, porque siempre es el cliente el que escribe primero).

## Cómo está armado

```
applica-whatsapp-bot/
├── server.js       # el servidor: recibe mensajes y decide qué responder
├── menu.js         # los TEXTOS del menú (esto es lo que vas a editar seguido)
├── package.json
├── .env.example    # plantilla de variables de entorno
└── .gitignore
```

Para cambiar lo que dice el bot, editá **menu.js**. No hace falta tocar
`server.js` para eso.

---

## Parte 1 — Probarlo gratis con el número de prueba de Meta (recomendado para arrancar)

Meta te da, sin costo y sin necesitar tu número real todavía, un número de
WhatsApp de prueba para desarrollar. Es la forma más rápida de ver si esto
funciona antes de meterte con la verificación del negocio.

1. Andá a [developers.facebook.com](https://developers.facebook.com/) e
   iniciá sesión con tu cuenta de Facebook (podés usar una personal, no
   hace falta que sea de la empresa todavía).
2. **Mis apps → Crear app**. Elegí el tipo **"Otro"** y después, cuando te
   pregunte el caso de uso, elegí **"Business"**. Ponele un nombre, por
   ejemplo `Applica Bot`.
3. Dentro de la app, en el menú de la izquierda buscá **WhatsApp → Empezar
   (Getting Started / API Setup)**.
4. Ahí Meta te muestra automáticamente:
   - Un **número de teléfono de prueba** (un número de Meta, no el tuyo).
   - Un **Phone number ID** (un código, no confundir con el número en sí).
   - Un **token de acceso temporal** (dura 24hs, para probar alcanza).
5. En la misma pantalla hay una sección para **agregar un número de
   destinatario de prueba**: agregá tu propio celular (con WhatsApp
   instalado) y confirmá con el código que te llega. Podés agregar hasta 5
   números distintos para probar.
6. Copiá esos datos a tu archivo `.env` (ver paso siguiente).

## Parte 2 — Configurar el proyecto en tu compu

Necesitás tener [Node.js](https://nodejs.org/) instalado (versión 18 o
más nueva). Para chequear: `node -v` en una terminal.

1. Abrí la carpeta del proyecto en VS Code.
2. Copiá `.env.example` como `.env`:
   ```
   cp .env.example .env
   ```
3. Completá `.env` con los datos que copiaste de Meta:
   ```
   WHATSAPP_TOKEN=el_token_temporal_que_te_dio_meta
   PHONE_NUMBER_ID=el_phone_number_id_que_te_dio_meta
   VERIFY_TOKEN=inventá_cualquier_palabra_secreta
   ```
   El `VERIFY_TOKEN` no te lo da Meta, lo inventás vos (por ejemplo
   `applica-verify-2026`). Lo vas a volver a escribir en el paso 6.
4. Instalá las dependencias:
   ```
   npm install
   ```
5. Corré el servidor:
   ```
   npm start
   ```
   Si todo salió bien, en la terminal te va a aparecer:
   `🚀 Server escuchando en el puerto 3000`

## Parte 3 — Exponer tu compu a internet con ngrok (solo para probar)

Meta necesita mandarte los mensajes a una URL pública, y tu `localhost`
no es visible desde afuera. Para probar en desarrollo usamos **ngrok**,
que crea un túnel temporal.

1. Instalá ngrok siguiendo [ngrok.com/download](https://ngrok.com/download)
   (o `npm install -g ngrok` si preferís así) y creá una cuenta gratuita.
2. Con el server corriendo (`npm start`), en OTRA terminal corré:
   ```
   ngrok http 3000
   ```
3. Te va a dar una URL parecida a `https://algo-random.ngrok-free.app`.
   Copiala.

## Parte 4 — Conectar el webhook en Meta

1. Volvé a la consola de Meta for Developers, sección **WhatsApp →
   Configuration (Configuración)**.
2. En "Webhook", hacé click en **Edit / Editar** y completá:
   - **Callback URL**: `https://algo-random.ngrok-free.app/webhook`
     (la URL de ngrok + `/webhook` al final)
   - **Verify token**: el mismo valor que pusiste en `VERIFY_TOKEN` en tu
     `.env`
3. Click en **Verify and Save**. Si todo coincide, en la terminal donde
   corre `npm start` vas a ver el mensaje `✅ Webhook verificado
   correctamente por Meta`.
4. Todavía falta un paso: en esa misma pantalla, buscá la lista de
   "Webhook fields" y activá (suscribite a) el campo **`messages`**. Sin
   esto, Meta no te va a avisar cuando te llegue un mensaje nuevo.

## Parte 5 — ¡Probarlo!

Desde el celular que agregaste como número de prueba en la Parte 1, mandale
un WhatsApp al número de prueba que te dio Meta. Deberías recibir el menú
principal, y:
- Si respondés "1" (Inversiones), te va a mostrar los 3 edificios; elijas
  el que elijas, después te pregunta si es para Vivienda o Inversión.
- Si respondés "2" (Administración) —o ya contestaste Vivienda/Inversión—
  te va a avisar que un asesor te va a contactar, y a partir de ahí el bot
  se queda callado.

En la terminal de `npm start` vas a ver los logs de cada mensaje que entra
y sale, útil para debuggear si algo no contesta.

---

## Parte 6 — Pasar a producción (más adelante)

Cuando ya probaste que funciona y quieras usar el número real de Applica:

1. **Hacé la verificación de negocio en Meta** (gratis) — ya vimos los
   pasos en la conversación anterior.
2. **Activá "coexistencia"** para usar el número real de Huella Digital SRL sin dejar
   de usar la app de WhatsApp Business normal desde el celular.
3. **Generá un token permanente**: el token temporal de la Parte 1 expira
   en 24hs. Para producción necesitás crear un "System User" en el Meta
   Business Manager y generar un token de acceso permanente para él.
4. **Deployá el server** a un hosting gratuito así queda corriendo 24/7 sin
   depender de tu compu (por ejemplo [Render](https://render.com)):
   - Subís este repo a GitHub.
   - En Render: **New → Web Service**, conectás el repo.
   - Build command: `npm install`
   - Start command: `npm start`
   - Agregás las variables de entorno (`WHATSAPP_TOKEN`, `PHONE_NUMBER_ID`,
     `VERIFY_TOKEN`) en la sección "Environment" de Render.
   - Render te da una URL pública fija (algo como
     `https://applica-whatsapp-bot.onrender.com`) — esa es la que
     configurás como Callback URL en Meta en vez de la de ngrok.

---

## Subir esto a GitHub

Desde la carpeta del proyecto:

```
git init
git add .
git commit -m "Bot inicial de WhatsApp para Applica"
```

Después creá un repo vacío en GitHub (sin README, para no pisar el tuyo),
y:

```
git remote add origin https://github.com/TU-USUARIO/applica-whatsapp-bot.git
git branch -M main
git push -u origin main
```

El archivo `.env` con tus claves reales **nunca se sube** (está en
`.gitignore`), así que es seguro tener el repo público si querés.
