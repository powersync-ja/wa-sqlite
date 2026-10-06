export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Interpret an AST against a connection and a worker/supervisor host. */
export async function runScript(
  nodes,
  connection,
  host,
  state = { result: '' }
) {
  for (const node of nodes) {
    const { command, argument } = node;
    const args = argument.trim().split(/\s+/);
    try {
      switch (command) {
        case 'sql': {
          const output = await connection.execute(argument);
          if (output) state.result += (state.result ? ' ' : '') + output;
          break;
        }
        case 'task':
          await host.task(
            Number(args[0]),
            node.body,
            args[1] ?? `${node.filename}:${node.line}`
          );
          break;
        case 'start':
          await host.start(Number(args[0]));
          break;
        case 'wait':
          await host.wait(
            args[0],
            args[1] === undefined ? undefined : Number(args[1])
          );
          break;
        case 'source':
          await runScript(
            await host.source(argument.trim(), node.filename),
            connection,
            host
          );
          break;
        case 'if':
          await runScript(
            (await connection.truth(argument))
              ? node.body
              : (node.otherwise ?? []),
            connection,
            host,
            state
          );
          break;
        case 'match':
        case 'glob':
        case 'notglob': {
          const matches =
            command === 'match'
              ? state.result === argument
              : await connection.glob(argument, state.result);
          const passed = command === 'notglob' ? !matches : matches;
          host.assert(passed, { ...node, actual: state.result });
          if (!passed)
            throw new Error(`expected [${argument}], got [${state.result}]`);
          state.result = '';
          break;
        }
        case 'testcase':
          host.log(argument);
          state.result = '';
          break;
        case 'reset':
          state.result = '';
          break;
        case 'sleep':
          await sleep(Number(args[0]));
          break;
        case 'finish':
          await host.finish();
          break;
        case 'exit':
          await host.exit(Number(args[0]));
          return;
        case 'output':
          host.log(state.result);
          break;
        case 'print':
          host.log(argument);
          break;
        case 'breakpoint':
          debugger;
          break;
        case 'show-sql-errors':
          connection.showSqlErrors = !['off', 'no', '0', ''].includes(
            argument.trim().toLowerCase()
          );
          break;
        default:
          throw new Error(`unsupported --${command}`);
      }
    } catch (error) {
      throw new Error(`${node.filename}:${node.line}: ${error.message}`, {
        cause: error
      });
    }
  }
}
