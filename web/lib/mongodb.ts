import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error("Please define MONGODB_URI in your environment variables.");
}

// Cache the client on the Node.js global object so hot-reloads in dev
// and serverless function invocations reuse the same connection pool.
declare global {
  // eslint-disable-next-line no-var
  var _mongoClient: MongoClient | undefined;
}

let client: MongoClient;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClient) {
    global._mongoClient = new MongoClient(MONGODB_URI);
  }
  client = global._mongoClient;
} else {
  client = new MongoClient(MONGODB_URI);
}

export async function getDb(): Promise<Db> {
  await client.connect();
  // The DB name is taken from the Atlas URI path (e.g. .../suicrm?retryWrites=true…)
  // Pass it explicitly as a fallback in case the URI has no path.
  return client.db("suicrm");
}

export interface UserRecord {
  _id?: string;
  suiAddress: string;
  googleSub: string;
  name: string;
  email: string;
  hasOrg: boolean;
  createdAt: Date;
  updatedAt: Date;
}
