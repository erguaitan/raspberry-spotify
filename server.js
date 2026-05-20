// ---------------------
// -----[CONSTANTES]-----
// ---------------------

// Helpers de inicialización del ORM para Sequelize/MySQL
const { initDb, sequelize } = require('./config/db')

// carga variables de entorno desde .env a process.env
require('dotenv').config({ quiet: true })

// framework web para ruteo y manejo de JSON
const express = require('express')
// servidor HTTP incorporado usado por Express
const http = require('http')

// utilidades del sistema de archivos para persistir caché
const fs = require('fs')
// utilidades de path para construir rutas de archivos de forma segura
const path = require('path')

// crea la instancia de la app Express
const app = express()
// envuelve la app Express en un servidor HTTP de Node
const server = http.createServer(app)

// implementación de WebSocket para actualizaciones en tiempo real
const WebSocket = require('ws')
// crea un servidor WebSocket adjunto al servidor HTTP
const wss = new WebSocket.Server({ server })
// clientes WebSocket conectados
const clientes = new Set()

// parsea automáticamente payloads JSON en el cuerpo
app.use(express.json())
// sirve archivos estáticos desde public/
app.use(express.static('public'))

// port y host del server
const SERVER = require("./constants/server.js")
// tipos para los typeMessage
const TYPE_MSG = require("./constants/type-msg.js")
// rutas para los tipos de QR
const QR_URL = require("./constants/qr-url.js")
// nombres de archivos donde se escribe/lee info
const CACHE_FILES = require("./constants/cache-files.js")

// tiempo en milisegundos para repetir cada tipo de loop
const msIntervaloLoop = Number(process.env.MS_INTERVALO_LOOP) || 1 * 1000 // 1 segundo
const msIntervaloSaveMemory = Number(process.env.MS_INTERVALO_SAVE_MEMORY) || 1 * 60 * 1000 // 1 minuto
const msIntervaloSaveDataBase = Number(process.env.MS_INTERVALO_SAVE_DB) || 1 * 60 * 60 * 1000 // 1 hora


// ---------------------
// -----[VARIABLES]-----
// ---------------------

// credenciales
let existCredentials = false
let credentials = {}

// token
let existToken = false
let tokenInfo = {}

// historial canciones
let history = {}

// ultimo mensaje enviado
let lastData = {}


// ---------------------
// ------[METODOS]------
// ---------------------

// socket
wss.on('connection', (ws) =>
{
  console.log("Cliente conectado")

  clientes.add(ws)
  
  if (Object.keys(lastData).length !== 0 && ws.readyState == WebSocket.OPEN)
  {
    if (lastData.typeMessage == "progress")
    {
      lastData.typeMessage = "song"
    }
    
    lastDataString = JSON.stringify(lastData)
    ws.send(lastDataString)
  }

  if (Object.keys(lastData).length === 0)
  {
    loop()
  }

  ws.on('close', () =>
  {
      console.log("Cliente desconectado")
      clientes.delete(ws)
  })
})

function broadcast(data) 
{
  clientes.forEach(cliente => 
  {
    if (cliente.readyState === WebSocket.OPEN)
    {
      cliente.send(data)
    }
  })
}

// metodos get-post credentials
app.get(`/${QR_URL.UPDATE_CREDENTIALS}`, (req, res) => 
{
  res.sendFile(path.join(__dirname, `public/${QR_URL.UPDATE_CREDENTIALS}`, `${QR_URL.UPDATE_CREDENTIALS}.html`))
})

app.post(`/${QR_URL.UPDATE_CREDENTIALS}`, (req, res) =>
{
  try
  {
    const data = req.body
    
    fs.writeFileSync(CACHE_FILES.CREDENTIALS, JSON.stringify(data, null, 2))
    credentials = data
    existCredentials = true
    
    const clientId = data.client_id 
    const redirectUri = data.redirect_uri
  
    const state = generateRandomString(16)
    const scope = 'user-read-currently-playing user-read-playback-state'
  
    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: scope,
      redirect_uri: redirectUri,
      state: state
    })
  
    const url = `https://accounts.spotify.com/authorize?${params.toString()}`
  
    res.status(200).json({url})
  }
  catch (error)
  {
    console.error(error)
    res.status(500).json()
  }
})

// metodos get-post token
app.get(`/${QR_URL.UPDATE_TOKEN}`, (req, res) => 
{
  res.sendFile(path.join(__dirname, `public/${QR_URL.UPDATE_TOKEN}`, `${QR_URL.UPDATE_TOKEN}.html`))
})

app.post(`/${QR_URL.UPDATE_TOKEN}`, async (req, res) => 
{
  try
  {
    const data = req.body
    const urlToken = data.url_token

    const urlParsed = new URL(urlToken)
    const code = urlParsed.searchParams.get("code")
    const state = urlParsed.searchParams.get("state")

    if (state === null)
    {
      res.redirect('/#' + querystring.stringify({error: 'state_mismatch'}))
    } 
    else
    {
      const authHeader = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString("base64")

      const params = new URLSearchParams({
        code: code,
        redirect_uri: credentials.redirect_uri,
        grant_type: 'authorization_code'
      })

      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${authHeader}`
        },
        body: params
      })

      if (!response.ok)
      {
        res.redirect(`http://${SERVER.HOST}:${SERVER.PORT}`)
        console.error(response.status)
        console.error(response.statusText)
      }
      else 
      {
        const data = await response.json()
        tokenInfo = data
        fs.writeFileSync(`${CACHE_FILES.TOKEN}`, JSON.stringify(data, null, 2))
    
        console.log(data)
        res.status(200).json({url: `http://${SERVER.HOST}:${SERVER.PORT}`})
      }
    }
  }
  catch (error) 
  {
    console.error(error)
    res.status(500).json()
  }
})

// metodos loop principal
function loop() 
{
  // check conexión
  // TODO:alb
  
  // check credenciales
  if (!checkCredentials())
  {
    // if (sameQrInLastData(TYPE_MSG.QR, QR_URL.UPDATE_CREDENTIALS)) return

    lastData = {}
    lastData.typeMessage = TYPE_MSG.QR
    lastData.url = QR_URL.UPDATE_CREDENTIALS

    broadcast(JSON.stringify(lastData))
    console.log(lastData)
    return
  }

  // check token
  if (!checkToken())
  {
    // if (sameQrInLastData(TYPE_MSG.QR, QR_URL.UPDATE_TOKEN)) return

    lastData = {}
    lastData.typeMessage = TYPE_MSG.QR
    lastData.url = QR_URL.UPDATE_TOKEN

    broadcast(JSON.stringify(lastData))
    console.log(lastData)
    return
  }

  // TODO:alb
  // generar recap mensual

  // updateSong
  updateSongIfValid()
}

function checkCredentials()
{
  if (existCredentials) return true

  try
  {
    if (fs.existsSync(CACHE_FILES.CREDENTIALS)) 
    {
        const data = fs.readFileSync(CACHE_FILES.CREDENTIALS, 'utf8').trim()
        credentials = data ? JSON.parse(data) : {}
    }
  }
  catch (error)
  {
      console.error(`Error leyendo ${CACHE_FILES.CREDENTIALS}:`, error.message)
      credentials = {}
  }
  
  if (credentials.client_id && credentials.client_secret && credentials.redirect_uri)
  {
    existCredentials = true
  } 

  return existCredentials
}

function checkToken()
{
  if (existToken) return true

  try
  {
    if (fs.existsSync(CACHE_FILES.TOKEN))
    {
      const data = fs.readFileSync(CACHE_FILES.TOKEN, 'utf8').trim()
      tokenInfo = data ? JSON.parse(data) : {}
    }
  }
  catch (error) 
  {
    console.error(`Error leyendo ${CACHE_FILES.TOKEN}:`, error.message)
    tokenInfo = {}
  }
    
  if (tokenInfo.access_token && tokenInfo.refresh_token && tokenInfo.expires_in)
  {
    existToken = true
  }

  return existToken
}

async function updateSongIfValid ()
{
  if (tokenInfo.access_token != null)
  {
    await updateSong()
  }
  else
  {
    console.error("No se cumplen los requisitos para actualizar canción")
  }
}

async function updateSong () 
{
  try
  {
    let data = {}
    const token = tokenInfo.access_token

    const response = await fetch(`https://api.spotify.com/v1/me/player/currently-playing`, 
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )

    if (response.status == 204) 
    {
      console.log("No se está reproduciendo nada")
      data = {[TYPE_MSG.MSG]: "No se está reproduciendo nada"}
    }
    else if (response.status == 401) 
    {
      console.log("El token ha caducado")
      data = {[TYPE_MSG.MSG]: "El token ha caducado"}

      await refreshToken()
    } 
    else if (response.status == 200) 
    {
      const dataResponse = await response.json()
      const item = dataResponse.item

      if (item)
      {
        data.song_name = item.name
        data.artist = item.artists.map(artist => artist.name).join(", ")
        data.duration = formatDuration(item.duration_ms)
        //TODO:alb:valorar cuando una canción no tiene imagen
        data.image = item.album.images[1].url
        data.progress = formatDuration(dataResponse.progress_ms)
        
        if (history[item.id])
        {
          history[item.id].timeListened += msIntervaloLoop
        } 
        else
        {
          let newHistory = {}
          newHistory.id = item.id
          newHistory.song_name = data.song_name
          newHistory.artist = data.artist
          newHistory.image = data.image
          newHistory.timeListened = msIntervaloLoop

          history[item.id] = newHistory
        }
      }
      else
      {
        data = {[TYPE_MSG.MSG]: "No se encontró información de la canción"}
      }

      if (data.message) 
      {
        data.typeMessage = TYPE_MSG.MSG
      }
      else if (data.song_name != lastData.song_name && data.artist != lastData.artist) 
      {
        data.typeMessage = TYPE_MSG.SONG
      }
      else
      {
        data.typeMessage = TYPE_MSG.PROGRESS
      }

      const dataString = JSON.stringify(data) 
      console.log(dataString)
    } 
    else
    {
      console.error(`${response.status} - ${response.statusText}`)
      data = {[TYPE_MSG.MSG]: response.statusText}
    }

    lastData = data
    broadcast(JSON.stringify(lastData))
  } 
  catch (error)
  {
    console.error(error)
  }
}

async function refreshToken()
{
  try
  {
    console.log("refreshToken in")
    
    let refresh_token = tokenInfo.refresh_token

    const authHeader = Buffer.from(`${credentials.client_id}:${credentials.client_secret}`).toString("base64")  
    const payload = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${authHeader}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
        client_id: credentials.client_id
      }),
    }
    
    const response = await fetch("https://accounts.spotify.com/api/token", payload)
    const data = await response.json()
    
    if (data.refresh_token)
    {
      refresh_token = data.refresh_token
    }
    
    if (!fs.existsSync(CACHE_FILES.TOKEN))
    {
      fs.writeFileSync(CACHE_FILES.TOKEN, JSON.stringify({}))
    }
    const newTokenInfo = fs.readFileSync(CACHE_FILES.TOKEN, 'utf8').trim()
    tokenInfo = newTokenInfo ? JSON.parse(newTokenInfo) : {}
    tokenInfo.access_token = data.access_token
    tokenInfo.refresh_token = refresh_token
    tokenInfo.expires_at = data.expires_in
    
    fs.writeFileSync(`${CACHE_FILES.TOKEN}`, JSON.stringify(tokenInfo, null, 2))
    
    console.log("Token refrescado")
  }
  catch (error)
  {
    console.error(error)
  }
}

// metodos cargar-guardar historial
function loadHistoryMemory()
{
  try
  {
    if (!fs.existsSync(CACHE_FILES.HISTORY))
    {
      fs.writeFileSync(CACHE_FILES.HISTORY, JSON.stringify({}))
    }
    
    const data = fs.readFileSync(CACHE_FILES.HISTORY, 'utf8').trim()
    history = data ? JSON.parse(data) : {}
  }
  catch (error)
  {
    console.error(error)
  }
}

function saveHistoryMemory()
{
  try
  {
    fs.writeFileSync(CACHE_FILES.HISTORY, JSON.stringify(history, null, 2))
  }
  catch (error)
  {
    console.error(error)
  }
}

function saveHistoryDataBase()
{
  try
  {
    saveHistoryMemory()
    const data = fs.readFileSync(CACHE_FILES.HISTORY, 'utf8').trim()
    historyToSave = data ? JSON.parse(data) : {}

    if (historyToSave == {}) return

    // resetear el archivo del historial
    fs.writeFileSync(CACHE_FILES.HISTORY, JSON.stringify({}))
    history = {}
    
    // TODO:alb:guardar historial en base de datos usando historyToSave
  }
  catch (error)
  {
    console.error(error)
  }
}

// utils
function sameQrInLastData(typeMsg, url)
{
  if (lastData.typeMessage === typeMsg) 
  {
    if (lastData.url === url) 
    {
      return true
    }
  }
  
  return false
}

function generateRandomString(length)
{
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""

  for (let i = 0; i < length; i++) 
  {
    const randomIndex = Math.floor(Math.random() * chars.length)
    result += chars[randomIndex]
  }

  return result
}

function formatDuration (ms) 
{
  const minutes = Math.floor(ms/60000)
  const seconds = Math.floor((ms%60000)/1000)

  const minutesFormat = minutes.toString().padStart(2, '0')
  const secondsFormat = seconds.toString().padStart(2, '0')

  return `${minutesFormat}:${secondsFormat}`
}

// server
const startServer = async () => 
{
  try
  {
    await initDb()

    server.listen(SERVER.PORT, SERVER.HOST, () => {console.log(`Servidor en http://127.0.0.1:${SERVER.PORT}`)})

    loadHistoryMemory()
    setInterval(saveHistoryMemory, msIntervaloSaveMemory)
    
    saveHistoryDataBase()
    setInterval(saveHistoryDataBase, msIntervaloSaveDataBase)
    
    loop()
    setInterval(loop, msIntervaloLoop)
  } 
  catch (error) 
  {
    console.error("Error al inicializar el servidor:", error)
  }
}

startServer()