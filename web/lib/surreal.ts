import { Surreal } from "surrealdb";

let surreal: Surreal | null = null;

export async function getSurrealClient(): Promise<Surreal> {
  if (!surreal) {
    surreal = new Surreal();

    const dbUrl = process.env.SURREAL_DB_URL || "http://127.0.0.1:8000/rpc";

    try {
      await surreal.connect(dbUrl);

      const user = process.env.SURREAL_USER || "root";
      const pass = process.env.SURREAL_PASS || "root";
      const ns = process.env.SURREAL_NS || "test";
      const db = process.env.SURREAL_DB || "test";

      await surreal.signin({
        username: user,
        password: pass,
      });

      await surreal.use({ namespace: ns, database: db });
      console.log("Connected to SurrealDB successfully");
    } catch (error) {
      console.error("Failed to connect to SurrealDB:", error);
      throw error;
    }
  }

  return surreal;
}
