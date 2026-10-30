interface StorageUpdateDetail {
  key: string;
  value: string;
}

interface SaveData {
  trip: Trip;
  outbox: Outbox[];
}

interface Outbox {
  op: string;
}

interface TrackOutbox {
  op: 'track';
  trk: Number[];
  end: Number;
}

interface Trip {
  reg: string;
  type: string;
  dest: Airport;
  from: Airport;
  t0: Number;
  id: string;
}

interface Airport {
  code: string;
}

interface NotifRequestBody {
  id: string;
  t0: Number;
  now: Number;
  origin: string;
  dest: string;
  planeType: string;
  trk: Number[];
}

function showNotification(message: string, bgColor: string = '#333') {
  let container = document.getElementById(
    'pocket-pilots-notification-container',
  ) as HTMLDivElement | null;
  if (!container) {
    container = document.createElement('div');
    container.id = 'pocket-pilots-notification-container';
    container.style.position = 'fixed';
    container.style.bottom = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '10px';
    document.body.appendChild(container);
  }

  const notification = document.createElement('div');
  notification.style.backgroundColor = bgColor;
  notification.style.color = '#fff';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '3rem';
  notification.style.fontFamily = 'sans-serif';
  notification.style.fontSize = '14px';
  notification.textContent = message;
  container.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 5000);
}

let trk: null | Number[] = null;
let trip: null | Trip = null;

window.addEventListener('message', async (event) => {
  if (event.data && event.data.type === 'pocketPilotsStorageUpdate') {
    const { key, value } = event.data.detail;

    if (key === 'flash.save.main') {
      const data: SaveData = JSON.parse(value).data;
      if (data.trip) {
        trip = data.trip;
      }

      const trackOutbox = data.outbox?.find(
        (outItem): outItem is TrackOutbox => outItem.op === 'track',
      );
      if (trackOutbox) {
        trk = trackOutbox.trk;
      }

      if (trip && trk) {
        console.log('[NotifExtension] Trip and track acquired');
        showNotification('Trip and track acquired', '#ccaa00');
        postToApi(trip, trk);
        trip = null;
        trk = null;
      }
    }
  }
});

async function postToApi(trip: Trip, trk: Number[]) {
  const body: NotifRequestBody = {
    id: trip.id,
    t0: trip.t0,
    now: Date.now(),
    origin: trip.from.code,
    dest: trip.dest.code,
    planeType: trip.type[0].toUpperCase() + trip.type.substring(1),
    trk,
  };

  const result = await chrome.storage.sync.get({
    apiUrl: 'http://127.0.0.1:8000',
  });
  const credentials = await chrome.storage.local.get(['pairCode']);
  const pairCode =
    typeof credentials.pairCode === 'string' ? credentials.pairCode.trim() : '';

  if (!pairCode) {
    showNotification('Set your pairing code in extension settings', '#b3261e');
    console.error('[NotifExtension] Webhook not sent: pairing code is missing');
    return;
  }

  const apiUrl = (result.apiUrl as string)
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/webhook\/flight$/i, '');

  fetch(`${apiUrl}/webhook/flight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Pair-Code': pairCode,
    },
    body: JSON.stringify(body),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Server returned HTTP ${res.status}`);
      }
      return data;
    })
    .then((data) => {
      console.log('[NotifExtension] Webhook sent successfully:', data);
      showNotification('Trip posted successfully', '#28a745');
    })
    .catch((err: Error) => {
      console.error('[NotifExtension] Webhook failed:', err);
      showNotification(`Trip post failed: ${err.message}`, '#b3261e');
    });
}
