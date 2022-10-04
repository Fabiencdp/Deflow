import { ChildProcess, execSync, fork } from 'child_process';

let listeners: ChildProcess[] = [];

/**
 * Remove all listener node
 */
export function killNodes(): void {
  const ps = execSync(`ps -ef | grep 'deflow-node' | awk '{print $2}'`);
  const toKill = ps
    .toString()
    .split('\n')
    .filter((v) => v);

  toKill.forEach((pid) => {
    try {
      process.kill(parseInt(pid));
    } catch (e) {
      // Silent
    }
  });

  listeners.length = 0;
}

/**
 * Create some listener nodes
 * @param nb
 * @param opts
 */
export async function createNodes<T = string>(
  nb: number,
  opts: { file?: string; cwd?: string } = {}
): Promise<T[]> {
  killNodes();

  const file = opts.file || './listener.js';
  const cwd = opts.cwd || __dirname;
  const array = [...Array(nb).keys()];
  const promises: Promise<T>[] = array.map(async (x) => {
    return new Promise((resolve) => {
      const listener = fork(file, [`--id=${x + 1}`, '--deflow-node', '-r', 'ts-node/register'], {
        cwd,
        silent: true,
      });

      listeners.push(listener);
      listener.on('message', (id: T) => resolve(id));
      listener.on('disconnect', () => {
        listeners = listeners.filter((l) => l.pid === listener.pid);
      });
    });
  });
  return Promise.all(promises);
}

export function getNodes(): ChildProcess[] {
  return listeners;
}
