require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { neon } = require("@neondatabase/serverless");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 4242;

app.use(express.json());
app.use(cors());

const sql = neon(`${process.env.DATABASE_URL}`);

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail", // o el servicio que prefieras
  auth: {
    user: process.env.EMAIL_USER, // tu correo
    pass: process.env.EMAIL_PASS, // tu contraseña o aplicación de Gmail
  },
});

// Función para enviar el correo de notificación
const sendNotificationEmail = async (
  nombre,
  correo,
  telefono,
  mensaje,
  origen,
) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: "gerosmex@hotmail.com", // Cambia esto por tu correo o el destinatario
    subject: "Nuevo Registro de Suscriptor",
    text: `¡Nuevo registro!\n\nNombre: ${nombre}\nCorreo: ${correo}\nTeléfono: ${telefono}\nMensaje: ${mensaje}\nOrigen: ${origen}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Correo enviado exitosamente");
  } catch (error) {
    console.error("Error al enviar el correo:", error);
  }
};

// Ruta ping para verificar que el servidor está funcionando
app.get("/ping", async (_, res) => {
  res.json("👍");
});

// Ruta para obtener todos los registros de formulario
app.get("/form", async (_, res) => {
  try {
    const query = `SELECT * FROM form_silee;`;
    const rows = await sql(query);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching components:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Compatibilidad: ruta histórica para listado de suscriptores
app.get("/subscribers", async (_, res) => {
  try {
    const query = `SELECT * FROM suscriptores;`;
    const rows = await sql(query);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching components:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Ruta para registrar un nuevo suscriptor
app.post("/register", async (req, res) => {
  try {
    const { nombre, correo, telefono, mensaje, origen } = req.body;

    if (!nombre || !correo) {
      return res.status(400).json({ error: "Nombre y email son requeridos" });
    }

    const query = `INSERT INTO suscriptores (nombre, correo, telefono, mensaje, origen)  
                     VALUES ($1, $2, $3, $4, $5) RETURNING *;`;

    const values = [nombre, correo, telefono, mensaje, origen];
    const result = await sql(query, values);

    // Llamar a la función de envío de correo
    await sendNotificationEmail(nombre, correo, telefono, mensaje, origen);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error inserting subscriber:", error);

    if (error.code === "23505") {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/register/form", async (req, res) => {
  try {
    const { nombre, correo, comoTeDescribes, mensaje } = req.body;

    if (!nombre || !correo || !comoTeDescribes) {
      return res.status(400).json({
        error: "Nombre, correo y ¿Cómo te describes? son requeridos",
      });
    }

    const query = `INSERT INTO form_silee (nombre, correo, telefono, mensaje, origen, como_te_describes)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;

    const values = [nombre, correo, null, mensaje, null, comoTeDescribes];
    const result = await sql(query, values);

    await sendNotificationEmail(nombre, correo, null, mensaje, comoTeDescribes);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error inserting subscriber (form):", error);

    if (error.code === "23505") {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Listening to http://localhost:${PORT}`);
});
