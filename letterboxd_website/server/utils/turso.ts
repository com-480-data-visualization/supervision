import { createClient } from "@libsql/client";

// This lives outside the function so it stays "warm" in memory
let client: any = null;

export const useTurso = () => {
    const config = useRuntimeConfig();

    if (!client) {
        client = createClient({
            url: config.tursoDatabaseUrl,
            authToken: config.tursoAuthToken,
        });
    }
    return client;
};