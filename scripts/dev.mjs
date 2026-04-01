import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const tasks = [
  {
    name: "api",
    args: ["run", "dev:api"],
  },
  {
    name: "web",
    args: ["run", "dev:web"],
  },
];

const children = tasks.map((task) =>
  spawn(npmCommand, task.args, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  }),
);

const shutdown = (signal) => {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
};

for (const child of children) {
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown("SIGTERM");
      process.exit(code);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
