import { createClient } from "@libsql/client";

let client: any = null;

export const useDb = () => {
  if (!client) {
    client = createClient({ url: "file:./data/local.db" });
  }
  return client;
};
