import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import mongoose from 'mongoose';
import { env } from './env.js';

// Create lazy proxies for the database and client since mongoose connects asynchronously
const dbProxy = new Proxy({} as any, {
  get(target, prop, receiver) {
    if (prop === 'then') return undefined;
    const db = mongoose.connection.db;
    if (!db) {
      if (typeof prop === 'string') {
        return (...args: any[]) => {
          if (!mongoose.connection.db) {
            throw new Error(`Database connection not ready yet for ${prop}()`);
          }
          return (mongoose.connection.db as any)[prop](...args);
        };
      }
      return undefined;
    }
    const value = Reflect.get(db, prop, receiver);
    return typeof value === 'function' ? value.bind(db) : value;
  }
});

const clientProxy = new Proxy({} as any, {
  get(target, prop, receiver) {
    if (prop === 'then') return undefined;
    let client: any;
    try {
      client = mongoose.connection.getClient();
    } catch (e) {
      // ignore
    }
    if (!client) {
      if (typeof prop === 'string') {
        return (...args: any[]) => {
          let activeClient: any;
          try {
            activeClient = mongoose.connection.getClient();
          } catch (e) {}
          if (!activeClient) {
            throw new Error(`Database client not ready yet for ${prop}()`);
          }
          return activeClient[prop](...args);
        };
      }
      return undefined;
    }
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

export const auth = betterAuth({
  database: mongodbAdapter(dbProxy, {
    client: clientProxy,
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
    },
  },
  // Ensure session cookies are sent back correctly
  trustedOrigins: [env.FRONTEND_URL],
  advanced: {
    cookiePrefix: 'learnflow',
  }
});
