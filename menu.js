// Ediitá este archivo para cambiar los textos del menu SIN tocar la logica
// del server.js. Es lo unico que vas a necesitar modificar seguido.

module.exports = {
  // Se manda cuando alguien escribe por primera vez, o escribe algo que
  // no es "1", "2" ni "3".
  welcome:
    "¡Hola! 👋 Gracias por escribirle a *Applica*.\n\n" +
    "Elegí una opción respondiendo solo con el número:\n\n" +
    "1️⃣ Información sobre nuestros servicios\n" +
    "2️⃣ Hablar con una persona del equipo\n" +
    "3️⃣ Ver nuestro sitio web",

  // La clave tiene que ser el string exacto que vas a comparar (el numero).
  options: {
    "1":
      "En Applica desarrollamos software a medida. Contanos brevemente " +
      "qué necesitás y te contactamos con más detalle.",
    "2":
      "Perfecto, en breve te contacta alguien del equipo. " +
      "Mientras tanto contanos tu consulta por acá.",
    "3": "Podés visitarnos en https://applica.dev/",
  },
};

// Nota: cualquier mensaje que NO sea exactamente "1", "2" o "3" (incluyendo
// el primer mensaje de alguien nuevo, o si escriben "hola" de nuevo) hace
// que el bot vuelva a mandar el mensaje de "welcome" de arriba con el menu.
// Asi no hace falta un texto de "opcion invalida" aparte.
