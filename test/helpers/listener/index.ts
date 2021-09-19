import { ChildProcess, execSync, fork } from 'child_process';

const listeners: ChildProcess[] = [];
export function resetListeners() {
  const ps = execSync(`ps -ef | grep '/node ./listener.js' | awk '{print $2}'`);
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

export async function createListeners(nb: number): Promise<string[]> {
  resetListeners();
  const array = [...Array(nb).keys()];
  const promises: Promise<string>[] = array.map(async (x) => {
    return new Promise((resolve) => {
      const listener = fork('./listener.js', [`--id=${x}`], {
        cwd: __dirname,
        silent: true,
      });
      listeners.push(listener);
      listener.on('message', (id: string) => resolve(id));
    });
  });
  return Promise.all(promises);
}
