from api.utils import get_env_variable, get_secret
import requests

def get_access_token() -> str:
    token_url = "https://accounts.spotify.com/api/token"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded"
    }
    client_id = get_env_variable("CLIENT_ID")
    client_secret = get_secret("CLIENT_SECRET")
    data = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret
    }
    response = requests.post(
        token_url, headers=headers, data=data
    )
    if response.status_code == 200:
        json = response.json()
        token = json["access_token"]
        return token
    else:
        raise RuntimeError(f"Could not get access token: Error {response.status_code}")