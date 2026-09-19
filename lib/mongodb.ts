import { MongoClient, Db } from "mongodb";
import dns from "dns";

// Ensure reliable SRV DNS lookup on Windows environments
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in environments where setting DNS servers is restricted
}

// Direct standard replica-set URI that bypasses DNS SRV lookup on Windows/ISP networks
const DIRECT_ATLAS_URI =
  "mongodb://kabariyaparivar_db_user:TZBX2Xvo8UGQt5L3@ac-x9mlxos-shard-00-00.45r1dny.mongodb.net:27017,ac-x9mlxos-shard-00-01.45r1dny.mongodb.net:27017,ac-x9mlxos-shard-00-02.45r1dny.mongodb.net:27017/kabariyaparivar?ssl=true&replicaSet=atlas-6k086k-shard-0&authSource=admin&retryWrites=true&w=majority";

function resolveMongoUri(): string {
  const envUri = (process.env.MONGODB_URI || "").trim();
  if (!envUri) {
    return DIRECT_ATLAS_URI;
  }
  if (envUri.startsWith("mongodb+srv://") && envUri.includes("kabariyaparivar.45r1dny.mongodb.net")) {
    try {
      const match = envUri.match(/mongodb\+srv:\/\/([^@]+)@/);
      if (match && match[1]) {
        return `mongodb://${match[1]}@ac-x9mlxos-shard-00-00.45r1dny.mongodb.net:27017,ac-x9mlxos-shard-00-01.45r1dny.mongodb.net:27017,ac-x9mlxos-shard-00-02.45r1dny.mongodb.net:27017/kabariyaparivar?ssl=true&replicaSet=atlas-6k086k-shard-0&authSource=admin&retryWrites=true&w=majority`;
      }
    } catch {
      //
    }
    return DIRECT_ATLAS_URI;
  }
  return envUri;
}

const uri = resolveMongoUri();

const options = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000,
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

declare global {
  // eslint-disable-next-line no-var
  var _adminMongoClientPromise: Promise<MongoClient> | undefined;
}

export async function getMongoClient(): Promise<MongoClient> {
  if (process.env.NODE_ENV === "development") {
    if (!global._adminMongoClientPromise) {
      client = new MongoClient(uri, options);
      global._adminMongoClientPromise = client.connect();
    }
    return global._adminMongoClientPromise;
  } else {
    if (!clientPromise) {
      client = new MongoClient(uri, options);
      clientPromise = client.connect();
    }
    return clientPromise;
  }
}

export async function getDb(dbName = "kabariyaparivar"): Promise<Db | null> {
  try {
    const connectedClient = await getMongoClient();
    return connectedClient.db(dbName);
  } catch (error: any) {
    console.warn("[MongoDB] Connection warning:", error.message);
    return null;
  }
}
