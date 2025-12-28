const vscode = require("vscode");
const { SidebarProvider } = require("./sidebar");
const { generateWebsite } = require("./tools/generator");
const { runReviewer } = require("./tools/reviewer");


/**
 * This method is called when the extension is activated
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
  // Output channel for debugging & user feedback
  const outputChannel = vscode.window.createOutputChannel(
    "Smart Code Assistant"
  );
  outputChannel.appendLine("Smart Code Assistant activated");
  outputChannel.show(true);

  // ---------------- SIDEBAR REGISTRATION ----------------

  const sidebarProvider = new SidebarProvider(
    context.extensionUri,
    context
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "assistant.sidebar",
      sidebarProvider
    )
  );

  // ---------------- COMMAND: GENERATE ----------------

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "assistant.generate",
      async (prompt) => {
        try {
          if (!prompt || typeof prompt !== "string") {
            vscode.window.showWarningMessage(
              "Please enter a description for code generation."
            );
            return;
          }

          await generateWebsite({
            prompt,
            context,
            outputChannel
          });
        } catch (error) {
          console.error("Generate error:", error);
          vscode.window.showErrorMessage(
            "Failed to generate code. See output for details."
          );
          outputChannel.appendLine(
            `❌ Generate failed: ${error.message}`
          );
        }
      }
    )
  );

  // ---------------- COMMAND: REVIEW ----------------

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "assistant.review",
      async () => {
        try {
          const workspaceFolder =
            vscode.workspace.workspaceFolders?.[0];

          if (!workspaceFolder) {
            vscode.window.showErrorMessage(
              "Please open a workspace folder to run code review."
            );
            return;
          }

          await runReviewer({
            workspacePath: workspaceFolder.uri.fsPath,
            context,
            outputChannel
          });
        } catch (error) {
          console.error("Review error:", error);
          vscode.window.showErrorMessage(
            "Failed to review code. See output for details."
          );
          outputChannel.appendLine(
            `❌ Review failed: ${error.message}`
          );
        }
      }
    )
  );
}

/**
 * This method is called when the extension is deactivated
 */
function deactivate() {
  // Clean shutdown (nothing required yet)
}

module.exports = {
  activate,
  deactivate
};
