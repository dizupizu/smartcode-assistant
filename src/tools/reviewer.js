const fs = require("fs/promises");
const path = require("path");
const vscode = require("vscode");
const { GoogleGenAI, Type } = require("@google/genai");

/**
 * Utility: ensure all paths stay inside the workspace
 */
function resolveInsideWorkspace(workspaceRoot, relativePath) {
  const fullPath = path.join(workspaceRoot, relativePath);
  if (!fullPath.startsWith(workspaceRoot)) {
    throw new Error("Invalid path (outside workspace)");
  }
  return fullPath;
}

/**
 * -------- TOOL IMPLEMENTATIONS --------
 * Tools are logic-only (no UI). They operate strictly within workspaceRoot.
 */

async function listFilesToolImpl({ directory }, workspaceRoot) {
  const root = resolveInsideWorkspace(workspaceRoot, directory || ".");
  const allowedExt = new Set([".js", ".jsx", ".ts", ".tsx", ".html", ".css"]);
  const skipDirs = ["node_modules", ".git", "dist", "build", "out"];

  const files = [];

  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (skipDirs.includes(e.name)) continue;
        await walk(path.join(dir, e.name));
      } else if (e.isFile()) {
        const ext = path.extname(e.name);
        if (allowedExt.has(ext)) {
          files.push(path.join(dir, e.name));
        }
      }
    }
  }

  await walk(root);
  return { files, count: files.length };
}

async function readFileToolImpl({ file_path }, workspaceRoot) {
  const fullPath = resolveInsideWorkspace(workspaceRoot, file_path);
  const content = await fs.readFile(fullPath, "utf8");
  return {
    filePath: file_path,
    content,
    lines: content.split("\n").length,
    bytes: Buffer.byteLength(content, "utf8")
  };
}

async function writeFileToolImpl({ file_path, content }, workspaceRoot) {
  const fullPath = resolveInsideWorkspace(workspaceRoot, file_path);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, content, "utf8");
  return { success: true, filePath: file_path };
}

/**
 * -------- TOOL DECLARATIONS (Gemini) --------
 */

const listFilesTool = {
  name: "list_files",
  description: "List source files in a directory",
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: {
        type: Type.STRING,
        description: "Relative directory path from workspace root"
      }
    }
  }
};

const readFileTool = {
  name: "read_file",
  description: "Read a file content",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: {
        type: Type.STRING,
        description: "Relative file path from workspace root"
      }
    },
    required: ["file_path"]
  }
};

const writeFileTool = {
  name: "write_file",
  description: "Write corrected content back to a file",
  parameters: {
    type: Type.OBJECT,
    properties: {
      file_path: {
        type: Type.STRING,
        description: "Relative file path from workspace root"
      },
      content: {
        type: Type.STRING,
        description: "Corrected full file content"
      }
    },
    required: ["file_path", "content"]
  }
};

/**
 * -------- MAIN ENTRY --------
 * @param {{
 *  workspacePath: string,
 *  context: vscode.ExtensionContext,
 *  outputChannel: vscode.OutputChannel
 * }} params
 */
async function runReviewer({ workspacePath, context, outputChannel }) {
  if (!workspacePath) {
    throw new Error("workspacePath is required");
  }

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
  const workspaceRoot = workspacePath;

  outputChannel.appendLine("🔍 Starting code review...");
  outputChannel.appendLine(`Workspace: ${workspaceRoot}\n`);

  const history = [
    {
      role: "user",
      parts: [{
        text: `Review and fix source code in this workspace.
Focus on real bugs, security issues, and clear improvements.
Operate only on files returned by tools.`
      }]
    }
  ];

  // Hard safety limits
  const MAX_STEPS = 10;

  for (let step = 0; step < MAX_STEPS; step++) {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: history,
      config: {
        systemInstruction: `
You are an expert code reviewer.

Rules:
- Use list_files → read_file → write_file
- Paths MUST be relative to workspace root
- Fix real issues only
- Do NOT invent files
- When finished, respond with a clear text summary
`,
        tools: [{
          functionDeclarations: [
            listFilesTool,
            readFileTool,
            writeFileTool
          ]
        }]
      }
    });

    if (result.functionCalls?.length) {
      for (const call of result.functionCalls) {
        let response;

        if (call.name === "list_files") {
          response = await listFilesToolImpl(
            call.args || {},
            workspaceRoot
          );
        } else if (call.name === "read_file") {
          response = await readFileToolImpl(
            call.args || {},
            workspaceRoot
          );
        } else if (call.name === "write_file") {
          response = await writeFileToolImpl(
            call.args || {},
            workspaceRoot
          );
          outputChannel.appendLine(
            `✏️ Updated: ${call.args.file_path}`
          );
        } else {
          response = { error: "Unknown tool" };
        }

        history.push({
          role: "model",
          parts: [{ functionCall: call }]
        });

        history.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: call.name,
              response
            }
          }]
        });
      }
    } else {
      // Final summary
      if (result.text) {
        outputChannel.appendLine("\n📄 Review Summary:");
        outputChannel.appendLine(result.text);
      }
      break;
    }
  }

  outputChannel.appendLine("\n✅ Code review completed.");
}

module.exports = {
  runReviewer
};
