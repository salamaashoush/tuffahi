import { BrowserWindow } from 'electron';
import { getDeveloperToken } from './token';

let authWindow: BrowserWindow | null = null;

export function openAuthWindow(mainWindow: BrowserWindow, authUrl: string): void {
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.close();
  }

  const developerToken = getDeveloperToken();

  authWindow = new BrowserWindow({
    width: 600,
    height: 700,
    resizable: true,
    center: true,
    title: 'Sign in with Apple',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const initScript = `
    (function() {
      if (window.__tuffahi_injected) return;
      window.__tuffahi_injected = true;

      console.log('[TUFFAHI AUTH] Injected on: ' + window.location.href);

      var DEVELOPER_TOKEN = '${developerToken}';
      var relayed = false;

      function relayToken(token) {
        if (relayed || !token || token.length < 20) return;
        relayed = true;
        console.log('[TUFFAHI AUTH] RELAYING TOKEN (' + token.length + ' chars)');
        document.title = 'TUFFAHI_TOKEN:' + token;
        setTimeout(function() {
          window.location.href = 'tuffahi-auth://token/' + encodeURIComponent(token);
        }, 300);
      }

      // Pre-populate sessionStorage with parent origin.
      try { sessionStorage.setItem('ac', window.location.origin); } catch(e) {}

      // Mock window.opener with JSON-RPC 2.0 support.
      var openerMock = {
        postMessage: function(data, origin) {
          console.log('[TUFFAHI AUTH] opener.postMessage:', JSON.stringify(data).substring(0, 300));
          if (data && data.jsonrpc === '2.0') {
            if (data.method === 'authorize' && data.params && data.params[0]) {
              var token = data.params[0];
              console.log('[TUFFAHI AUTH] JSON-RPC authorize! Token: ' + token.length + ' chars');
              relayToken(token);
              return;
            }
            if (data.method === 'thirdPartyInfo') {
              console.log('[TUFFAHI AUTH] JSON-RPC thirdPartyInfo request (id: ' + data.id + ')');
              var thirdPartyData = JSON.stringify({
                developerToken: DEVELOPER_TOKEN,
                thirdPartyIconURL: '',
                thirdPartyName: 'Tuffahi',
                thirdPartyToken: DEVELOPER_TOKEN
              });
              var response = {
                jsonrpc: '2.0',
                id: data.id,
                result: thirdPartyData
              };
              console.log('[TUFFAHI AUTH] Sending thirdPartyInfo response');
              window.postMessage(response, '*');
              return;
            }
            console.log('[TUFFAHI AUTH] JSON-RPC method:', data.method);
          }
          if (data && typeof data === 'object' && data.thirdPartyInfo) {
            var t = data.thirdPartyInfo['music-user-token'] || data.thirdPartyInfo['media-user-token'];
            if (t && t.length > 20) relayToken(t);
          }
        },
        location: { href: window.location.origin + '/' },
        closed: false,
        window: window
      };

      try {
        Object.defineProperty(window, 'opener', {
          value: openerMock,
          writable: true,
          configurable: true
        });
      } catch(e) {
        try { window.opener = openerMock; } catch(e2) {}
      }

      console.log('[TUFFAHI AUTH] opener set:', !!window.opener);

      window.addEventListener('message', function(event) {
        if (event.data && event.data.jsonrpc === '2.0' && event.data.result && event.data.result.developerToken) return;

        console.log('[TUFFAHI AUTH] message:', typeof event.data === 'string' ?
          event.data.substring(0, 200) : JSON.stringify(event.data).substring(0, 200));

        if (event.data && event.data.jsonrpc === '2.0') {
          if (event.data.method === 'authorize' && event.data.params) {
            var token = event.data.params[0];
            if (token && token.length > 20) relayToken(token);
          }
          return;
        }
        if (typeof event.data === 'string' && event.data.indexOf('mediakit:updateAuth') !== -1) {
          try {
            var parsed = JSON.parse(event.data);
            var token = parsed && parsed.data && parsed.data.cookies && parsed.data.cookies['media-user-token'];
            if (token && token !== 'null' && token.length > 20) {
              console.log('[TUFFAHI AUTH] updateAuth token (' + token.length + ' chars)');
              relayToken(token);
            }
          } catch(e) {}
          return;
        }
      }, true);

      window.close = function() {
        console.log('[TUFFAHI AUTH] window.close() called, relayed:', relayed);
        if (!relayed) {
          document.title = 'TUFFAHI_AUTH_CLOSE:';
        }
      };
    })();
  `;

  // Inject script on every page load (dom-ready fires before external scripts)
  authWindow.webContents.on('dom-ready', () => {
    authWindow?.webContents.executeJavaScript(initScript).catch(() => {});
  });

  // Watch for title changes carrying the token
  authWindow.on('page-title-updated', (_event, title) => {
    if (title.startsWith('TUFFAHI_TOKEN:')) {
      const rawToken = title.slice('TUFFAHI_TOKEN:'.length);
      if (rawToken.length >= 20) {
        console.log(`[TUFFAHI] page-title-updated: got token (${rawToken.length} chars)`);
        injectTokenIntoMain(mainWindow, rawToken);
        authWindow?.close();
      }
    }
    if (title.startsWith('TUFFAHI_AUTH_CLOSE:')) {
      console.log('[TUFFAHI] Auth window closed without token');
      authWindow?.close();
    }
  });

  // Intercept tuffahi-auth:// navigation
  authWindow.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('tuffahi-auth://')) {
      event.preventDefault();
      const tokenMatch = url.match(/tuffahi-auth:\/\/token\/(.+)/);
      if (tokenMatch) {
        const rawToken = decodeURIComponent(tokenMatch[1]);
        if (rawToken.length > 20) {
          console.log(`[TUFFAHI] will-navigate: got token (${rawToken.length} chars)`);
          injectTokenIntoMain(mainWindow, rawToken);
        }
      }
      authWindow?.close();
    }
  });

  authWindow.on('closed', () => {
    authWindow = null;
  });

  authWindow.loadURL(authUrl);
}

function injectTokenIntoMain(mainWindow: BrowserWindow, rawToken: string): void {
  // Send token to renderer via IPC — the musickit store handles the rest
  console.log('[TUFFAHI] Sending apple-music-token IPC event');
  mainWindow.webContents.send('apple-music-token', rawToken);
}
