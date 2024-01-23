import express from "express";
import multer from "multer";
import path from "path";
import basicAuth from "basic-auth";
import dotenv from "dotenv";
import { WebhookClient, Message, EmbedBuilder } from "discord.js"
import { writeFile, readFile } from 'fs'
import sagdb from "sagdb"


dotenv.config();
const db = new sagdb({ name: 'lastStatus', folder: 'database', minify: false })
const app = express();
const ClientWebhook = new WebhookClient({ url: process.env.WEBHOOK })

function status(number: number) {
  /**
   * 0 - Estado desconocido
   * 1 - Estado en linea
   * 2 - Estado offline
   * 3 - Estado Mantenimiento
   */
  switch(number) {
    case 1:
      return '| En linea'
    case 2:
      return('| Inactivo')
    case 3:
      return('| Mantenimiento')
    default:
      return('| Desconozido')
  }
}

async function StatusMessage() {
  readFile('messageId.txt', async (err, data) => {

    const EmbedNew = new EmbedBuilder()
      .setTitle('Estado de los Bots')
      .setDescription(`
        PancyBot - TEST
        PancyBot Private - TEST
        CaliferBot Support - TEST
        PancyAPI - ON
      `)
      .setColor('Random')
    if(err) {
      const message = await ClientWebhook.send({ embeds: [EmbedNew] })
      writeFile('messageId.txt', message.id, err => {
        console.warn('[CRITICAL] No se pudo guardar el id del mensaje')
      })
    }
    const messageId = data.toString('utf8')
    await ClientWebhook.editMessage(messageId, { embeds: [EmbedNew]})
  })  
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./src/images/craiyon");
  },
  filename: (req, file, cb) => { 
    cb(null, file.originalname)
  }
})
const upload = multer({ storage });
const users = (process.env.USERS as unknown as string).split(',').reduce((acc, user) => {
    const [username, password] = user.split(':');
    (acc as string[])[username as unknown as number] = (password as any);
    return acc;
  }, {});

app.get("/image/craiyon/:name", (req, res) => {
    try {
        res.sendFile(path.join(__dirname, "images/craiyon", req.params.name));
        console.warn(`[WARN] Se solicito la imagen ${req.params.name}`)
    } catch {
        res.sendStatus(404);
    }
})
  
app.use((req, res, next) => {
  const user = basicAuth(req);
  if (!user || !(users as [])[(user.name as unknown as number)] || user.pass !== (users as [])[(user.name as unknown as number)]) {
    res.set("WWW-Authenticate", 'Basic realm="Access to the API"');
    return res.sendStatus(401);
  }
  next();
});

app.post("/upload", upload.single("image"), (req, res) => {
  // Los archivos se encuentran en req.files
  res.send("Archivos subidos con éxito");
});

app.listen(1526, () => {
    console.log("[WEB] Servidor escuchando el puerto 1526")
})
