import { createServer } from 'node:http';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync, cpSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import {
  BusinessError,
  applyPlan,
  campaignIssues,
  campaignView,
  placeOrder,
  validateStoredState,
} from './business.mjs';

export const root = dirname(dirname(fileURLToPath(import.meta.url)));
const media = JSON.parse(readFileSync(join(root, 'template/media.json'), 'utf8'));
const catalog = JSON.parse(readFileSync(join(root, 'fixtures/catalog.json'), 'utf8'));

export function createEnvironment(directory) {
  mkdirSync(directory, { recursive: true });
  const statePath = join(directory, 'business.json');
  if (!existsSync(statePath)) cpSync(join(root, 'fixtures/business.json'), statePath);
  if (!existsSync(join(directory, 'site')))
    cpSync(join(root, 'template'), join(directory, 'site'), { recursive: true });
  let state = JSON.parse(readFileSync(statePath, 'utf8'));
  validateStoredState(state);
  function commit(next) {
    writeFileSync(`${statePath}.tmp`, JSON.stringify(next, null, 2));
    renameSync(`${statePath}.tmp`, statePath);
    state = next;
  }
  return {
    directory,
    read: () => structuredClone(state),
    check: (id) => ({ revision: state.revision, issues: campaignIssues(state, id, media) }),
    view: (id) => campaignView(state, id, media),
    apply(plan) {
      const next = applyPlan(state, plan, media);
      commit(next);
      return { revision: state.revision, applied: plan.operations.length };
    },
    order(input) {
      const { next, order } = placeOrder(state, input, media);
      commit(next);
      return { revision: state.revision, order };
    },
  };
}

export function createHost(environment) {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const origin = `http://127.0.0.1:${request.socket.localPort}`;
    const url = new URL(request.url, origin);
    function json(status, body) {
      response.writeHead(status, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify(body));
    }
    try {
      if (request.headers.host !== new URL(origin).host) {
        return json(403, { code: 'host_rejected', message: 'Use the printed loopback address.' });
      }
      if (request.method === 'POST') {
        if (
          request.headers['content-type'] !== 'application/json' ||
          request.headers['x-business-client'] !== 'reference'
        ) {
          return json(403, { code: 'client_required', message: 'Use the SDK or CLI.' });
        }
        if (request.headers.origin && request.headers.origin !== origin) {
          return json(403, { code: 'origin_rejected', message: 'Cross-origin writes are disabled.' });
        }
        const chunks = [];
        let bytes = 0;
        for await (const chunk of request) {
          bytes += chunk.length;
          if (bytes > 65536) return json(413, { code: 'body_too_large', message: 'Limit: 64 KiB.' });
          chunks.push(chunk);
        }
        const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (url.pathname === '/api/plans') return json(200, environment.apply(input));
        if (url.pathname === '/api/orders') return json(201, environment.order(input));
        return json(404, { code: 'not_found', message: 'Unknown operation.' });
      }
      if (request.method !== 'GET')
        return json(405, { code: 'method_not_allowed', message: 'Use GET or POST.' });
      if (url.pathname === '/api/catalog') return json(200, catalog);
      if (url.pathname === '/api/media') return json(200, media);
      if (url.pathname.startsWith('/api/data/')) {
        const domain = url.pathname.slice('/api/data/'.length);
        if (!catalog.some((entry) => entry.domain === domain)) {
          return json(404, { code: 'unknown_domain', message: 'Read /api/catalog for available domains.' });
        }
        const state = environment.read();
        return json(200, { revision: state.revision, shopId: state.shop.id, rows: state[domain] });
      }
      if (url.pathname.startsWith('/api/checks/')) {
        return json(200, environment.check(url.pathname.slice('/api/checks/'.length)));
      }
      if (url.pathname.startsWith('/api/campaigns/')) {
        return json(200, environment.view(url.pathname.slice('/api/campaigns/'.length)));
      }
      const staticFiles = {
        '/': ['index.html', 'text/html'],
        '/app.js': ['app.js', 'text/javascript'],
        '/style.css': ['style.css', 'text/css'],
        '/assets/cup.svg': ['assets/cup.svg', 'image/svg+xml'],
        '/assets/tray.svg': ['assets/tray.svg', 'image/svg+xml'],
      };
      if (url.pathname === '/sdk.mjs') {
        response.writeHead(200, { 'Content-Type': 'text/javascript' });
        return response.end(readFileSync(join(root, 'sdk/client.mjs')));
      }
      const file = staticFiles[url.pathname];
      if (!file) return json(404, { code: 'not_found', message: 'Unknown resource.' });
      response.writeHead(200, { 'Content-Type': `${file[1]}; charset=utf-8` });
      response.end(readFileSync(join(environment.directory, 'site', file[0])));
    } catch (error) {
      const expected =
        error instanceof BusinessError || error.code === 'ERR_ASSERTION' || error instanceof SyntaxError;
      if (!expected) console.error(error);
      json(expected ? 409 : 500, {
        code: error.code ?? (expected ? 'invalid_json' : 'internal_error'),
        message: expected ? error.message : 'Host failure; inspect the server log.',
        details: error.details,
      });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const directory = process.env.BUSINESS_HOME ?? join(root, '.local');
  const environment = createEnvironment(directory);
  const server = createHost(environment);
  const port = Number(process.env.BUSINESS_PORT ?? 4317);
  server.listen(port, '127.0.0.1', () => {
    if (process.argv.includes('--demo')) {
      if (environment.read().revision !== 0) {
        console.error(
          'Demo requires a fresh BUSINESS_HOME. Existing data was preserved. Use npm start to continue it.',
        );
        server.close();
        process.exitCode = 1;
        return;
      }
      const plan = JSON.parse(readFileSync(join(root, 'examples/launch-plan.json'), 'utf8'));
      const draft = structuredClone(plan);
      draft.operations.at(-1).value.shippingPolicyId = 'ie-standard';
      console.log('SCRIPTED walkthrough; no model is called.');
      console.log('1. Create related business records, with an intentionally wrong shipping reference.');
      environment.apply(draft);
      console.log(JSON.stringify(environment.check('quiet-mornings'), null, 2));
      console.log('2. Repair the reference using the current revision.');
      plan.expectedRevision = environment.read().revision;
      environment.apply(plan);
      console.log(JSON.stringify(environment.check('quiet-mornings'), null, 2));
      console.log('3. The ordinary page now reads the joined business view through the SDK.');
    }
    console.log(`Preview: http://127.0.0.1:${port}`);
    console.log(`Editable source: ${join(directory, 'site')}`);
    console.log('Local simulation only. No payment, external model, or publication. Stop with Ctrl+C.');
  });
}
