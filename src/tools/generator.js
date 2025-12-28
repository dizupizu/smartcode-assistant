const fs = require("fs/promises");
const path = require("path");
const vscode = require("vscode");
const { GoogleGenAI } = require("@google/genai");

/**
 * SAFE file writer
 * - Always writes inside workspace
 * - Never executes shell commands
 */
async function writeFileSafe(workspaceRoot, relativePath, content) {
  const fullPath = path.join(workspaceRoot, relativePath);

  // Prevent path traversal
  if (!fullPath.startsWith(workspaceRoot)) {
    throw new Error("Invalid file path");
  }

  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
}

/**
 * Generate website / project using Gemini
 * @param {{
 *  prompt: string,
 *  context: vscode.ExtensionContext,
 *  outputChannel: vscode.OutputChannel
 * }} params
 */
async function generateWebsite({ prompt, context, outputChannel }) {
  if (!prompt) {
    throw new Error("Prompt is required");
  }

  const workspaceFolder =
    vscode.workspace.workspaceFolders?.[0];

  if (!workspaceFolder) {
    vscode.window.showErrorMessage(
      "Please open a workspace folder first."
    );
    return;
  }

  // ---------------- API KEY ----------------

  const apiKey = await context.secrets.get(
    "SMARTCODE_GEMINI_API_KEY"
  );

  if (!apiKey) {
    vscode.window.showErrorMessage(
      "Gemini API key not found. Please set it in the sidebar."
    );
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  const workspaceRoot = workspaceFolder.uri.fsPath;

  outputChannel.appendLine("🔨 Starting code generation...");
  outputChannel.appendLine(`Prompt: ${prompt}\n`);

  const history = [
    {
      role: "user",
      parts: [{ text: prompt }]
    }
  ];

  // Hard safety limit to avoid infinite loops
  const MAX_STEPS = 8;

  for (let step = 0; step < MAX_STEPS; step++) {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: history,
      config: {
        systemInstruction: `
You are an expert project generator.

Rules:
- You MAY create files.
- You MUST NOT execute shell commands.
- You MUST ONLY return JSON tool calls.
- Paths must be relative to the workspace root.

When creating files, return:
{
  "filePath": "relative/path/file.ext",
  "content": "FULL file content"
}

If finished, respond with plain text summary.
`
      }
    });

    // Handle file creation tool calls
    if (response.functionCalls?.length) {
      for (const call of response.functionCalls) {
        const { filePath, content } = call.args || {};

        if (!filePath || typeof content !== "string") {
          continue;
        }

        await writeFileSafe(
          workspaceRoot,
          filePath,
          content
        );

        outputChannel.appendLine(
          `✅ Created: ${filePath}`
        );

        history.push({
          role: "model",
          parts: [{ functionCall: call }]
        });

        history.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: call.name,
              response: { success: true }
            }
          }]
        });
      }
    } else {
      // Final response
      if (response.text) {
        outputChannel.appendLine("\n📄 Summary:");
        outputChannel.appendLine(response.text);
      }
      break;
    }
  }

  outputChannel.appendLine("\n🎉 Code generation completed.");
}

module.exports = {
  generateWebsite
};
