import { execFile } from "child_process";

const OPEN_TERMINAL_SCRIPT = `
on run argv
  set targetDir to item 1 of argv
  tell application "Terminal"
    activate
    do script "cd " & quoted form of targetDir
  end tell
end run
`.trim();

export async function launchMacTerminalAtPath(projectRoot: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    execFile("osascript", ["-e", OPEN_TERMINAL_SCRIPT, projectRoot], (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
