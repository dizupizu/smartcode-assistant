# SmartCode Assistant

**Publisher:** Deepti Pandey

SmartCode Assistant is a VS Code extension that helps you **generate code** and **review existing code** using AI, directly inside your editor.  
Your code is never uploaded automatically, and your API key is stored securely using VS Code Secret Storage.

---

## Features

- Generate new code or project files from natural language
- Review and improve existing code in your workspace
- Sidebar-based UI for easy interaction
- Secure API key storage (not visible in UI or source code)
- Works inside your local VS Code workspace

---

## Requirements

Before using this extension, you need:

- Visual Studio Code version **1.90.0 or later**
- A **Google Gemini API key**

---

## Installation

### From VS Code Marketplace

1. Open **VS Code**
2. Go to the **Extensions** view (`Ctrl + Shift + X`)
3. Search for **SmartCode Assistant**
4. Click **Install**

---

## First-Time Setup (Important)

1. Open the **SmartCode Assistant** from the Activity Bar (left sidebar)
2. You will see an input field for an API key
3. Paste your **Google Gemini API key**
4. Click **Save API Key**

The key is stored securely using VS Code Secret Storage and is never shown again unless you enter it.

---

## How to Use

### Generate Code

1. Open a folder or workspace in VS Code
2. Open the **SmartCode Assistant** sidebar
3. In the input box, describe what you want to build  
   Example:
4. Click **Generate Code**
5. Files and folders will be created inside your workspace

---

### Review Code

1. Open a folder or workspace that contains code
2. Open the **SmartCode Assistant** sidebar
3. Enter a short instruction (optional)
4. Click **Review Code**
5. The extension will analyze your project and:
- Detect bugs
- Improve code quality
- Fix common issues (HTML, CSS, JS, TypeScript)
- Show a summary of changes in the output panel

---

## Security & Privacy

- API keys are stored using **VS Code Secret Storage**
- Your code is processed **only when you request it**
- No background uploads or tracking
- No data is shared without your action

---

## Known Limitations

- Currently supports **Google Gemini**
- Large projects may take longer to review
- Internet connection is required for AI features

---

## Support & Feedback

If you find a bug or want to request a feature, please visit:

https://github.com/dizupizu/smartcode-assistant

---

## License

This extension is provided as-is for educational and productivity purposes.
