import express from "express";
import multer from "multer";
import path from "path";
import basicAuth from "basic-auth";
import dotenv from "dotenv";
import { WebhookClient, EmbedBuilder } from "discord.js"
import { writeFile, readFile } from 'fs'
import sagdb from "sagdb"
import bodyParser from "body-parser";
import { StatusReq } from "./types/ReqBodyStatus";

console.log(process.env.WEBHOOK)
dotenv.config();
const db = new sagdb({ name: 'lastStatus', folder: 'database', minify: false })
const app = express();
const ClientWebhook = new WebhookClient({ url: (process.env.WEBHOOK as unknown as string)})

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
      return('| Desconocido')
  }
}

async function StatusMessage() {
  readFile('messageId.txt', async (err, data) => {
    const EmbedNew = new EmbedBuilder()
      .setTitle('Estado de los Bots')
      .setDescription(`
        PancyBot: ${status(db.get('PancyBot') as number)}
        PancyBot Private: ${status(db.get('PancyBotPrivate') as number)}
        CaliferBot Support: ${status(db.get('CaliferSupport') as number)}
        PancyAPI: | En linea
      `)
      .setColor('Random')
    if(err) {
      const message = await ClientWebhook.send({ embeds: [EmbedNew], avatarURL: 'https://media.discordapp.net/attachments/948241585571762186/1199368430516703343/PancyBotLogo.png?ex=65c249e5&is=65afd4e5&hm=fcbbf967bbe3f41f626022cad971a718dcdae18b1767c0842abc9e1485b44271&=&format=webp&quality=lossless&width=654&height=654'})
      writeFile('messageId.txt', `${message.id}`, err => {
        console.warn('[CRITICAL] No se pudo guardar el id del mensaje')
        console.warn(err)
      })
      return console.log('[INFO] Id guardada')
    } else {
      const messageId = data.toString()
      await ClientWebhook.editMessage(messageId, { embeds: [EmbedNew]})
    }
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

app.get("/api/image/craiyon/:name", (req, res) => {
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

app.post("/api/upload", upload.single("image"), (_, res) => {
  // Los archivos se encuentran en req.files
  res.send("Archivos subidos con éxito");
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/api/botStatus/', (req, res) => {
  const Body = req.body as StatusReq
  if(!Body.status) return res.sendStatus(400)
  if(!Body.bot) return res.sendStatus(400)
  db.set(Body.bot, Body.status)
})

app.listen(1526,async () => {
    console.log("[WEB] Servidor escuchando el puerto 1526")
    db.set('PancyBot', 4)
    db.set('PancyBotPrivate', 4)
    db.set('CaliferSupport', 4)
    await StatusMessage()
    const interval = setInterval(async () => {
      await StatusMessage()
    }, 1000 * 60 * 60 * 5)
})
