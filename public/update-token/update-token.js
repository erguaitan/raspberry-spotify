const urlTokenInput = document.getElementById("url_token")

async function handleSubmitForm(event)
{
  event.preventDefault()

  const urlToken = {url_token: urlTokenInput.value}

  const response = await fetch('/update-token', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(urlToken)
  })

  const data = await response.json()

  if (response.status === 200)
  {
    window.location.href = data.url
  }
}

const form = document.querySelector("form")
form.addEventListener("submit", handleSubmitForm)