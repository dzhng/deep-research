import { SimpleWebSocketServer } from './websocket-server';

const server = new SimpleWebSocketServer({ port: Number(process.env.PORT) || 8080, enableLogging: true });
server.start();

process.on('SIGINT', () => {
  server.stop();
  process.exit(0);
});
