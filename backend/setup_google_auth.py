"""One-time Google OAuth2 setup script.

Run this ONCE locally to get a refresh_token for Google Calendar access:

  python setup_google_auth.py

You need:
  1. A Google Cloud project with the Calendar API enabled
  2. OAuth2 credentials (Desktop App type) downloaded as client_secret.json

Steps:
  1. Go to https://console.cloud.google.com/
  2. Create a project → APIs & Services → Enable "Google Calendar API"
  3. APIs & Services → Credentials → Create OAuth Client → Desktop App
  4. Download the JSON → save as client_secret.json in this folder
  5. Run: python setup_google_auth.py
  6. Follow the browser prompt → allow access
  7. Copy the printed GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
  8. Add these three values to your .env and to Render.com environment variables
"""
import json
import os
import sys

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
SECRET_FILE = os.path.join(os.path.dirname(__file__), "client_secret.json")


def main():
    if not os.path.exists(SECRET_FILE):
        print("ERROR: client_secret.json not found.")
        print("Download your OAuth2 credentials from Google Cloud Console")
        print("and save them as client_secret.json in the backend/ folder.")
        sys.exit(1)

    try:
        from google_auth_oauthlib.flow import InstalledAppFlow
    except ImportError:
        print("ERROR: google-auth-oauthlib not installed.")
        print("Run: pip install google-auth-oauthlib")
        sys.exit(1)

    flow = InstalledAppFlow.from_client_secrets_file(SECRET_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    with open(SECRET_FILE) as f:
        secret_data = json.load(f)

    web_or_installed = secret_data.get("web") or secret_data.get("installed", {})
    client_id     = web_or_installed.get("client_id", creds.client_id)
    client_secret = web_or_installed.get("client_secret", creds.client_secret)

    print("\n" + "=" * 60)
    print("SUCCESS — add these to your .env and Render environment:")
    print("=" * 60)
    print(f"GOOGLE_CLIENT_ID={client_id}")
    print(f"GOOGLE_CLIENT_SECRET={client_secret}")
    print(f"GOOGLE_REFRESH_TOKEN={creds.refresh_token}")
    print("=" * 60)
    print("\nThese tokens give read-only access to your Google Calendar.")
    print("The refresh_token does not expire (unless you revoke it).")


if __name__ == "__main__":
    main()
