import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './adapters/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Setup Redis adapter for Socket.io scaling
  const redisUrl = `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || '6379'}`;
  const redisIoAdapter = new RedisIoAdapter(app, redisUrl);

  // Connect to Redis before starting the server
  await redisIoAdapter.connectToRedis();

  app.useWebSocketAdapter(redisIoAdapter);

  const port = process.env.PORT || 4000;
  await app.listen(port);

  console.log(`🚀 API server running on http://localhost:${port}`);
}
void bootstrap();
