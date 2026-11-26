// links that come from your calendar are only used when they are plain https (the server checks too)
export const https = (u) => (typeof u === 'string' && u.startsWith('https://') ? u : null)

// your Outlook calendar on the web (personal Microsoft account)
export const OUTLOOK_CALENDAR = 'https://outlook.live.com/calendar/'
