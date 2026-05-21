const socket = new WebSocket(`ws://${window.location.host}`)

const qrContainer = document.getElementById("container-qr")
const qrElement = document.getElementById("qr")

const songContainer = document.getElementById("container-song")
const songNameContainer = document.getElementById("song-name")
const songArtistContainer = document.getElementById("song-artist")
const songProgressContainer = document.getElementById("song-progress")
const songImage = document.getElementById("song-image")

const messageContainer = document.getElementById("container-message")
const messageElem = document.getElementById("message")

const resetBtn = document.getElementById("reset")

socket.onmessage = (event) => 
{
  const data = JSON.parse(event.data)
  const typeMessage = data.typeMessage

  switch (typeMessage)
  {
    case "qr":
      showQr(data)
      break
    case "song":
      updateSong(data)
      break
    case "progress":
      updateProgress(data)
      break
    case "message":
      showMessage(data)
      break
    default:
      console.error("Ocurrió un error")
  }
}

function showQr(data)
{
  const url = `http://${window.location.host}/${data.url}`
  const size = qrContainer.clientWidth
  
  qrElement.innerHTML = ""
  new QRCode(qrElement, {text: url, width: size, height: size})
  
  resetContainers(data.typeMessage)
}

function updateSong(data)
{
  songImage.src = data.image
  songNameContainer.textContent = data.song_name
  songArtistContainer.textContent = data.artist
  songProgressContainer.textContent = data.progress
  
  resetContainers(data.typeMessage)
}

function updateProgress(data)
{
  songProgressContainer.textContent = data.progress
  
  resetContainers(data.typeMessage)
}

function showMessage(data)
{
  messageElem.textContent = data.message

  resetContainers(data.typeMessage)
}

function resetContainers(container)
{
  qrContainer.style.display = container == "qr" ? "block" : "none"
  songContainer.style.display = (container == "song" || container == "progress")  ? "block" : "none"
  messageContainer.style.display = container == "message" ? "block" : "none"
}

async function handleResetTokenCredentials()
{
  try
  {
    const response = await fetch('/reset', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok)
    {
      throw new Error('Error al resetear credenciales')
    }

    const data = await response.json()
    console.log(data)
  }
  catch (error)
  {
    console.error(error)
  }
}

resetBtn.addEventListener("click", handleResetTokenCredentials)