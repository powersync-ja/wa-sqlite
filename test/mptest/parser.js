// mptest directives are SQL line comments outside SQL strings/block comments.
// SQL is executed at directive boundaries, including statements without a ';'.
const COMMANDS = new Set([
  'sleep',
  'exit',
  'testcase',
  'finish',
  'reset',
  'match',
  'glob',
  'notglob',
  'output',
  'source',
  'print',
  'if',
  'else',
  'endif',
  'start',
  'wait',
  'task',
  'end',
  'breakpoint',
  'show-sql-errors'
]);

export function parseScript(text, filename = '<script>') {
  const tokens = [];
  let begin = 0,
    line = 1,
    beginLine = 1;
  for (let i = 0; i < text.length;) {
    const start = i;
    if (text.startsWith('/*', i)) {
      const end = text.indexOf('*/', i + 2);
      if (end < 0) throw new Error(`${filename}:${line}: unterminated comment`);
      i = end + 2;
    } else if (["'", '"', '`', '['].includes(text[i])) {
      const quote = text[i] === '[' ? ']' : text[i];
      i++;
      while (i < text.length) {
        if (text[i++] === quote) {
          if (quote !== ']' && text[i] === quote) {
            i++;
            continue;
          }
          break;
        }
      }
    } else if (text.startsWith('--', i)) {
      const end = text.indexOf('\n', i);
      i = end < 0 ? text.length : end + 1;
      const match = /^--([a-zA-Z][\w-]*)(?:[ \t]+(.*?))?[\r\n]*$/.exec(
        text.slice(start, i)
      );
      if (match) {
        if (!COMMANDS.has(match[1]))
          throw new Error(`${filename}:${line}: unknown command --${match[1]}`);
        if (start > begin)
          tokens.push({
            command: 'sql',
            argument: text.slice(begin, start),
            filename,
            line: beginLine
          });
        tokens.push({
          command: match[1],
          argument: match[2] ?? '',
          filename,
          line
        });
        begin = i;
        beginLine = line + (end < 0 ? 0 : 1);
      }
    } else {
      i++;
    }
    line += (text.slice(start, i).match(/\n/g) ?? []).length;
  }
  if (begin < text.length)
    tokens.push({
      command: 'sql',
      argument: text.slice(begin),
      filename,
      line: beginLine
    });

  let position = 0;
  function block(stops = []) {
    const nodes = [];
    while (
      position < tokens.length &&
      !stops.includes(tokens[position].command)
    ) {
      const node = tokens[position++];
      if (node.command === 'task') {
        node.body = block(['end']);
        if (tokens[position++]?.command !== 'end')
          throw new Error(`${filename}:${node.line}: missing --end`);
      } else if (node.command === 'if') {
        node.body = block(['else', 'endif']);
        if (tokens[position]?.command === 'else') {
          position++;
          node.otherwise = block(['endif']);
        }
        // Upstream config01 deliberately uses an --if that extends to EOF.
        if (tokens[position]?.command === 'endif') position++;
      } else if (['end', 'else', 'endif'].includes(node.command)) {
        throw new Error(
          `${filename}:${node.line}: unexpected --${node.command}`
        );
      }
      nodes.push(node);
    }
    return nodes;
  }
  return block();
}

// sqlite3_exec/mptest use SQLite's textual column representation. In particular,
// a REAL such as avg(length(b)) must remain "1500.0", rather than JS's "1500".
export function formatTerm(value) {
  if (value === null) return 'nil';
  return value.length && !/\s/.test(value)
    ? value
    : `'${value.replaceAll("'", "''")}'`;
}
