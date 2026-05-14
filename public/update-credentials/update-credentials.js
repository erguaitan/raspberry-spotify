const CLIENT_ID = "a835f2a1b857481994914a105154f234"
const CLIENT_SECRET = "4ac707b29af74d4b8c14661706c7e22c"
const REDIRECT_URI = "http://127.0.0.1:8080/callback"

const clientIdInput = document.getElementById("client_id")
const clientSecretInput = document.getElementById("client_secret")
const redirectUriInput = document.getElementById("redirect_uri")


function fillForm() {
  clientIdInput.value = CLIENT_ID
  clientSecretInput.value = CLIENT_SECRET
  redirectUriInput.value = REDIRECT_URI
}

async function handleSubmitForm(event) {
  event.preventDefault()

  const credentials = {
    client_id: clientIdInput.value,
    client_secret: clientSecretInput.value,
    redirect_uri: redirectUriInput.value
  };

  const response = await fetch('/update-credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(credentials)
  });

  const data = await response.json();

  if (response.status === 200) {
    window.location.href = data.url;
  }

}


fillForm()

const form = document.querySelector("form")
form.addEventListener("submit", handleSubmitForm)