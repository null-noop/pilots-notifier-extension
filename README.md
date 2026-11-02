# Pocket Pilots Flight Notifier Extension

Chrome Manifest V3 extension that reads flight updates from Pocket Pilots and sends them to the notification API. The Android app receives Firebase Cloud Messaging notifications from the API.

## Related Repositories

- [Notification API](https://github.com/null-noop/pilots-notifier-server)
- [Android app](https://github.com/null-noop/pilots-notifier-android)

## Compatibility

Release versions in the `vX.X.0` format are compatible when the API, extension, and Android app share the same version.

## Build

Requires Node.js and npm.

```bash
npm ci
npm run build
```

In Chrome, open `chrome://extensions`, enable Developer mode, and choose **Load unpacked**. Select this repository directory after building; the manifest loads its scripts from `dist/`.

Open the extension's Settings to set the API base URL and pairing code. For local development, use `http://127.0.0.1:8000`; use the pairing code shown by the Android app.

## Local Development

The server repository's [`run-local.sh`](https://github.com/null-noop/pilots-notifier-server/blob/main/run-local.sh) starts the API and Android debug app together. Keep the runner open while testing.
