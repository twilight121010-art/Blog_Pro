import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function findWorkspaceRoot(startDirectory: string) {
  let currentDirectory = startDirectory;

  while (true) {
    if (
      existsSync(join(currentDirectory, "package.json")) &&
      existsSync(join(currentDirectory, "apps")) &&
      existsSync(join(currentDirectory, "content"))
    ) {
      return currentDirectory;
    }

    const parentDirectory = dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      throw new Error("Unable to locate workspace root");
    }

    currentDirectory = parentDirectory;
  }
}

const currentDirectory = dirname(fileURLToPath(import.meta.url));
export const workspaceRoot = findWorkspaceRoot(currentDirectory);
export const contentRoot = join(workspaceRoot, "content", "posts");
export const uploadsRoot = join(workspaceRoot, "uploads");
