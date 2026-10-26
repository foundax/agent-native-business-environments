import { readFile } from 'node:fs/promises';
import { createBusinessClient } from '../sdk/client.mjs';

const client = createBusinessClient(`http://127.0.0.1:${process.env.BUSINESS_PORT ?? 4317}`);
const [command, argument] = process.argv.slice(2);
try {
  let result;
  switch (command) {
    case 'catalog':
      result = await client.catalog();
      break;
    case 'read':
      result = await client.read(argument);
      break;
    case 'media':
      result = await client.media();
      break;
    case 'view':
      result = await client.campaign(argument);
      break;
    case 'check':
      result = await client.check(argument);
      if (result.issues.length) process.exitCode = 1;
      break;
    case 'apply':
      result = await client.apply(JSON.parse(await readFile(argument, 'utf8')));
      break;
    case 'order':
      result = await client.order(JSON.parse(await readFile(argument, 'utf8')));
      break;
    default:
      throw new Error(
        'Usage: catalog | read <domain> | media | view <campaign> | check <campaign> | apply <json> | order <json>',
      );
  }
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(
    JSON.stringify(
      { code: error.code ?? 'command_failed', message: error.message, details: error.details },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
