import { BUILDS, SUITES, VFS_CONFIGS, skipReason } from './configs.js';
import { getCapabilities, runSuite } from './runner.js';

const elements = Object.fromEntries(
  ['build', 'vfs', 'suite', 'run', 'stop', 'summary', 'matrix', 'log'].map(
    (id) => [id, document.getElementById(id)]
  )
);
const params = new URLSearchParams(location.search);
let capabilities;
let rows = [];
let controller;

for (const name of Object.keys(BUILDS))
  elements.build.add(new Option(name, name));
for (const { name } of VFS_CONFIGS) elements.vfs.add(new Option(name, name));
for (const { name } of SUITES) elements.suite.add(new Option(name, name));
elements.build.value = params.get('build') ?? 'asyncify';
for (const key of ['vfs', 'suite'])
  elements[key].value = params.get(key) ?? 'all';

function render() {
  elements.matrix.replaceChildren();
  rows = [];
  for (const vfs of VFS_CONFIGS.filter(
    (entry) => elements.vfs.value === 'all' || entry.name === elements.vfs.value
  )) {
    for (const suite of SUITES.filter(
      (entry) =>
        elements.suite.value === 'all' || entry.name === elements.suite.value
    )) {
      const reason = skipReason(suite, vfs, elements.build.value, capabilities);
      const tr = document.createElement('tr');
      const cells = Array.from({ length: 4 }, () =>
        tr.appendChild(document.createElement('td'))
      );
      cells[0].textContent = vfs.name;
      cells[1].textContent = suite.name;
      cells[2].textContent = reason ?? 'Ready';
      cells[2].dataset.status = reason ? 'skipped' : 'ready';
      const button = cells[3].appendChild(document.createElement('button'));
      button.textContent = 'Run';
      button.disabled = !!reason;
      const row = {
        suite: suite.name,
        vfs: vfs.name,
        build: elements.build.value,
        reason,
        status: cells[2],
        button
      };
      button.onclick = () => run([row]);
      rows.push(row);
      elements.matrix.appendChild(tr);
    }
  }
  elements.summary.textContent = `${rows.filter((row) => !row.reason).length} enabled, ${rows.filter((row) => row.reason).length} skipped.`;
  elements.run.disabled = !rows.some((row) => !row.reason);
}

function log(message) {
  const lines = (elements.log.textContent + message + '\n').split('\n');
  elements.log.textContent = lines.slice(-300).join('\n');
}

async function run(selected) {
  controller = new AbortController();
  for (const element of [
    elements.build,
    elements.vfs,
    elements.suite,
    elements.run,
    ...rows.map((row) => row.button)
  ])
    element.disabled = true;
  elements.stop.disabled = false;
  let passed = 0,
    failed = 0;
  try {
    for (const row of selected.filter((row) => !row.reason)) {
      if (controller.signal.aborted) break;
      row.status.dataset.status = 'running';
      row.status.textContent = 'Running…';
      elements.summary.textContent = `Running ${row.vfs} / ${row.suite} / ${row.build}`;
      try {
        const result = await runSuite({
          ...row,
          capabilities,
          signal: controller.signal,
          onEvent(event) {
            if (event.type === 'log')
              log(`Client ${event.client}: ${event.message}`);
            if (event.type === 'task')
              log(`Client ${event.client}: ${event.name}`);
          }
        });
        row.status.dataset.status = result.status;
        row.status.textContent =
          result.reason ??
          `Passed · ${result.assertions} assertions · ${(result.duration / 1000).toFixed(1)}s`;
        passed += result.status === 'passed' ? 1 : 0;
      } catch (error) {
        row.status.dataset.status = 'failed';
        row.status.textContent = controller.signal.aborted
          ? 'Cancelled'
          : `Failed: ${error.message}`;
        log(error.stack ?? error.message);
        failed++;
      }
    }
  } finally {
    elements.summary.textContent = `${controller.signal.aborted ? 'Stopped. ' : ''}${passed} passed, ${failed} failed.`;
    controller = null;
    for (const element of [elements.build, elements.vfs, elements.suite])
      element.disabled = false;
    for (const row of rows) row.button.disabled = !!row.reason;
    elements.run.disabled = !rows.some((row) => !row.reason);
    elements.stop.disabled = true;
  }
}

elements.run.onclick = () => run(rows);
elements.stop.onclick = () => controller?.abort(new Error('Cancelled by user'));
for (const key of ['build', 'vfs', 'suite']) elements[key].onchange = render;
try {
  capabilities = await getCapabilities();
  render();
} catch (error) {
  elements.summary.textContent = `Cannot initialize browser tests: ${error.message}`;
}
