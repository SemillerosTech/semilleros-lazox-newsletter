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

// Helper para resincronizar sequences cuando hay colisión de pkey
const resyncSequence = async (table) => {
  try {
    await sql(
      `SELECT setval(pg_get_serial_sequence('${table}','id'), (SELECT COALESCE(MAX(id),0) FROM ${table}))`,
    );
    console.log(`Sequence resynced for ${table}`);
  } catch (e) {
    console.error(`Failed to resync sequence for ${table}:`, e);
  }
};

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

    let result;
    try {
      const query = `INSERT INTO suscriptores (nombre, correo, telefono, mensaje, origen)
                       VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
      const values = [nombre, correo, telefono, mensaje, origen];
      result = await sql(query, values);
    } catch (dbError) {
      // Auto-recovery para sequence desincronizada (pkey)
      if (dbError.code === "23505" && dbError.constraint === "suscriptores_pkey") {
        console.warn("Sequence desync detected on suscriptores, resyncing...");
        await resyncSequence("suscriptores");
        const query = `INSERT INTO suscriptores (nombre, correo, telefono, mensaje, origen)
                         VALUES ($1, $2, $3, $4, $5) RETURNING *;`;
        const values = [nombre, correo, telefono, mensaje, origen];
        result = await sql(query, values);
      } else {
        throw dbError;
      }
    }

    // Llamar a la función de envío de correo
    await sendNotificationEmail(nombre, correo, telefono, mensaje, origen);

    res.status(201).json(result);
  } catch (error) {
    console.error("Error inserting subscriber:", error);

    if (error.code === "23505" && error.constraint === "suscriptores_correo_key") {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }
    if (error.code === "23505" && error.constraint === "suscriptores_pkey") {
      return res.status(500).json({ error: "Error de secuencia en BD, por favor reintente" });
    }

    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/register/form", async (req, res) => {
  try {
    const { nombre, correo, comoTeDescribes, mensaje, origen } = req.body;

    if (!nombre || !correo || !comoTeDescribes) {
      return res.status(400).json({
        error: "Nombre, correo y ¿Cómo te describes? son requeridos",
      });
    }

    let result;
    try {
      const query = `INSERT INTO form_silee (nombre, correo, telefono, mensaje, origen, como_te_describes)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
      const values = [nombre, correo, null, mensaje, origen ?? null, comoTeDescribes];
      result = await sql(query, values);
    } catch (dbError) {
      if (dbError.code === "23505" && dbError.constraint === "form_silee_pkey") {
        console.warn("Sequence desync detected on form_silee, resyncing...");
        await resyncSequence("form_silee");
        const query = `INSERT INTO form_silee (nombre, correo, telefono, mensaje, origen, como_te_describes)
                       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *;`;
        const values = [nombre, correo, null, mensaje, origen ?? null, comoTeDescribes];
        result = await sql(query, values);
      } else {
        throw dbError;
      }
    }

    await sendNotificationEmail(nombre, correo, null, mensaje, origen ?? "");

    res.status(201).json(result);
  } catch (error) {
    console.error("Error inserting subscriber (form):", error);
    if (error.code === "23505" && error.constraint === "form_silee_pkey") {
      return res.status(500).json({ error: "Error de secuencia en BD, por favor reintente" });
    }
    // Si en el futuro se agrega UNIQUE en correo para form_silee
    if (error.code === "23505") {
      return res.status(409).json({ error: "El correo ya está registrado" });
    }
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Iniciar servidor (solo en local / no-serverless)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Listening to http://localhost:${PORT}`);
  });
}

module.exports = app;
