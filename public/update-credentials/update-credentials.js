const clientIdInput = document.getElementById("client_id")
const clientSecretInput = document.getElementById("client_secret")
const redirectUriInput = document.getElementById("redirect_uri")

async function handleSubmitForm(event) 
{
  event.preventDefault()

  const credentials = {
    client_id: clientIdInput.value,
    client_secret: clientSecretInput.value,
    redirect_uri: redirectUriInput.value
  }

  const response = await fetch('/update-credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  })

  const data = await response.json()

  if (response.status === 200) 
  {
    window.location.href = data.url
  }
}

const form = document.querySelector("form")
form.addEventListener("submit", handleSubmitForm)