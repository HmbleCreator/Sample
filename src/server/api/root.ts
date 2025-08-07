import { createTRPCRouter } from './trpc';
import { chatRouter } from './routers/chat';

export const appRouter = createTRPCRouter({
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
