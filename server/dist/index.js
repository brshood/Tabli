import { createServer } from 'http';
import { connectMongo } from './db/mongo.ts';
import { createApp } from './app.ts';
import { env } from './config/env.ts';
async function main() {
    await connectMongo();
    const app = createApp();
    const server = createServer(app);
    const port = env.PORT;
    server.listen(port, () => {
        // eslint-disable-next-line no-console
        console.log(`API listening on :${port}`);
    });
}
main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Fatal startup error', err);
    process.exit(1);
});
