import { Store } from "./store.ts";
import { makeServer } from "./server.ts";
const store = new Store(process.env.DB_PATH || "data/warfare.sqlite");
store.resume();
const app = await makeServer(store);
await app.listen({
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || "127.0.0.1",
});
console.log(
  `Ironfront listening on http://${process.env.HOST || "127.0.0.1"}:${process.env.PORT || 3000}`,
);
const timer = setInterval(() => {
  for (const id of store.ids()) {
    try {
      store.tick(id);
    } catch (error) {
      console.error("Campaign update failed", id, error);
    }
  }
}, 250);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, async () => {
    clearInterval(timer);
    await app.close();
    store.close();
    process.exit(0);
  });
