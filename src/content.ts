interface StorageUpdateDetail {
  key: string;
  value: string;
}

interface ActiveFlight {
  id: string;
  f: { reg: string; type: string };
  from: Airport;
  dest: Airport;
  log: { t0: Number };
  job?: { photo?: Photo | null; pay?: number };
  plan?: {
    dep?: { ident?: string };
    arr?: { ident?: string };
    cruise?: number;
  };
}

interface Photo {
  name: string;
  lat: number;
  lon: number;
}

interface SaveData {
  active?: ActiveFlight | null;
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

interface CancelOutbox {
  op: 'cancel';
  id?: string;
}

interface Trip {
  reg: string;
  type: string;
  dest: Airport;
  from: Airport;
  t0: Number;
  id: string;
  photo?: Photo;
  depRunway?: string;
  arrRunway?: string;
  cruiseAlt?: number;
  pay?: number;
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
  photo?: Photo;
  depRunway?: string;
  arrRunway?: string;
  cruiseAlt?: number;
  pay?: number;
}

function ensureFont() {
  if (document.getElementById('pocket-pilots-font')) return;
  const link = document.createElement('link');
  link.id = 'pocket-pilots-font';
  link.rel = 'stylesheet';
  link.href =
    'https://fonts.googleapis.com/css2?family=Silkscreen&display=swap';
  document.head.appendChild(link);
}

function showNotification(message: string, bgColor: string = '#333') {
  ensureFont();
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
  notification.style.backgroundColor = 'rgba(3, 8, 28, 0.85)';
  notification.style.setProperty('backdrop-filter', 'blur(8px)');
  notification.style.setProperty('-webkit-backdrop-filter', 'blur(8px)');
  notification.style.border = `1px solid ${bgColor}`;
  notification.style.color = '#fff';
  notification.style.padding = '10px 20px';
  notification.style.borderRadius = '0';
  notification.style.fontFamily = "'Silkscreen', monospace";
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
      if (data.active) {
        const a = data.active;
        trip = {
          reg: a.f.reg,
          type: a.f.type,
          dest: a.dest,
          from: a.from,
          t0: a.log.t0,
          id: a.id,
          photo: a.job?.photo
            ? {
                name: a.job.photo.name,
                lat: a.job.photo.lat,
                lon: a.job.photo.lon,
              }
            : undefined,
          depRunway: a.plan?.dep?.ident,
          arrRunway: a.plan?.arr?.ident,
          cruiseAlt: a.plan?.cruise,
          pay: a.job?.pay,
        };
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

      const cancelOutbox = data.outbox?.find(
        (outItem): outItem is CancelOutbox => outItem.op === 'cancel',
      );

      if (cancelOutbox) {
        console.log('[NotifExtension] Cancel outbox found');
        showNotification('Trip cancellation sent', '#b3261e');
        postCancelToApi(cancelOutbox.id ?? data.active?.id ?? trip?.id);
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
    photo: trip.photo,
    depRunway: trip.depRunway,
    arrRunway: trip.arrRunway,
    cruiseAlt: trip.cruiseAlt,
    pay: trip.pay,
  };

  const result = await chrome.storage.sync.get({
    apiUrl: 'https://pilots-api.nullnoop.dev',
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

async function postCancelToApi(id?: string) {
  const result = await chrome.storage.sync.get({
    apiUrl: 'https://pilots-api.nullnoop.dev',
  });
  const credentials = await chrome.storage.local.get(['pairCode']);
  const pairCode =
    typeof credentials.pairCode === 'string' ? credentials.pairCode.trim() : '';

  if (!pairCode) {
    showNotification('Set your pairing code in extension settings', '#b3261e');
    console.error(
      '[NotifExtension] Cancel webhook not sent: pairing code is missing',
    );
    return;
  }

  const apiUrl = (result.apiUrl as string)
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/webhook\/flight$/i, '');

  fetch(`${apiUrl}/webhook/flight/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Pair-Code': pairCode,
    },
    body: JSON.stringify(id ? { id } : {}),
  })
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || `Server returned HTTP ${res.status}`);
      }
      return data;
    })
    .then((data) => {
      console.log('[NotifExtension] Cancel webhook sent successfully:', data);
    })
    .catch((err: Error) => {
      console.error('[NotifExtension] Cancel webhook failed:', err);
      showNotification(`Trip cancel failed: ${err.message}`, '#b3261e');
    });
}
