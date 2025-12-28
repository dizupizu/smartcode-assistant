const vscode = require("vscode");

class SidebarProvider {
  /**
   * @param {vscode.Uri} extensionUri
   * @param {vscode.ExtensionContext} context
   */
  constructor(extensionUri, context) {
    this.extensionUri = extensionUri;
    this.context = context;
    this.view = null;
  }

  /**
   * Called by VS Code when the sidebar is resolved
   * @param {vscode.WebviewView} webviewView
   */
  resolveWebviewView(webviewView) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };

    webviewView.webview.html = this.getHtml();

    webviewView.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "saveApiKey":
            await this.saveApiKey(message.apiKey);
            break;

          case "generate":
            vscode.commands.executeCommand(
              "assistant.generate",
              message.prompt
            );
            break;

          case "review":
            vscode.commands.executeCommand(
              "assistant.review"
            );
            break;

          default:
            console.warn("Unknown sidebar command:", message.command);
        }
      }
    );
  }

  // ---------------- API KEY HANDLING ----------------

  async saveApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== "string") {
      vscode.window.showWarningMessage(
        "Please enter a valid API key."
      );
      return;
    }

    try {
      await this.context.secrets.store(
        "SMARTCODE_GEMINI_API_KEY",
        apiKey.trim()
      );

      vscode.window.showInformationMessage(
        "API key saved securely."
      );
    } catch (error) {
      console.error("Failed to save API key:", error);
      vscode.window.showErrorMessage(
        "Failed to save API key."
      );
    }
  }

  // ---------------- WEBVIEW HTML ----------------

  getHtml() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />

<meta
  http-equiv="Content-Security-Policy"
  content="
    default-src 'none';
    style-src 'unsafe-inline';
    script-src 'unsafe-inline';
  "
/>

<style>
  body {
    font-family: var(--vscode-font-family);
    color: var(--vscode-foreground);
    background-color: var(--vscode-editor-background);
    padding: 12px;
  }

  h3 {
    margin-top: 0;
  }

  input, textarea {
    width: 100%;
    box-sizing: border-box;
    padding: 6px;
    margin-bottom: 8px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }

  button {
    width: 100%;
    padding: 6px;
    margin-bottom: 6px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    cursor: pointer;
  }

  button:hover {
    background: var(--vscode-button-hoverBackground);
  }

  .section {
    margin-bottom: 16px;
  }

  .hint {
    font-size: 11px;
    opacity: 0.7;
  }
</style>
</head>

<body>
  <h3>Smart Code Assistant</h3>

  <!-- API KEY -->
  <div class="section">
    <strong>Gemini API Key</strong>
    <input
      id="apiKey"
      type="password"
      placeholder="Enter your API key"
    />
    <button id="saveKey">Save API Key</button>
    <div class="hint">
      Stored securely using VS Code Secret Storage
    </div>
  </div>

  <hr />

  <!-- PROMPT -->
  <div class="section">
    <strong>Prompt</strong>
    <textarea
      id="prompt"
      placeholder="Describe what you want to build or review..."
    ></textarea>

    <button id="generate">
      Generate Code / Project
    </button>

    <button id="review">
      Review Workspace Code
    </button>
  </div>

<script>
  const vscode = acquireVsCodeApi();

  document.getElementById("saveKey").addEventListener("click", () => {
    const apiKey = document.getElementById("apiKey").value;
    vscode.postMessage({
      command: "saveApiKey",
      apiKey
    });
  });

  document.getElementById("generate").addEventListener("click", () => {
    const prompt = document.getElementById("prompt").value;
    vscode.postMessage({
      command: "generate",
      prompt
    });
  });

  document.getElementById("review").addEventListener("click", () => {
    vscode.postMessage({
      command: "review"
    });
  });
</script>
</body>
</html>
`;
  }
}

module.exports = {
  SidebarProvider
};
