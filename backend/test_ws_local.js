const WebSocket = require('ws');

const url = 'ws://localhost:5000/api/ws/prices?symbol=XAUUSD';
console.log(`Connecting to ${url}...`);

const ws = new WebSocket(url);

ws.on('open', () => {
  console.log('Connected successfully!');
  ws.close();
});

ws.on('message', (data) => {
  console.log('Received data:', data.toString());
});

ws.on('error', (err) => {
  console.error('WebSocket Error:', err);
});

ws.on('close', (code, reason) => {
  console.log(`WebSocket closed: code=${code}, reason=${reason}`);
});
