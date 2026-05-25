// Polyfills required for sockjs-client and @stomp/stompjs in the browser
(window as any).global = window;
(window as any).process = { env: {} };