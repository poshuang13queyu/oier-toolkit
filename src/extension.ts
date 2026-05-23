import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
  console.log('OIer Toolkit is now active!');

  const provider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('oierToolkit.sidebar', provider)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('oier-toolkit.helloWorld', () => {
      vscode.window.showInformationMessage('Hello World from oier_toolkit!');
    })
  );
}

class SidebarProvider implements vscode.WebviewViewProvider {
  constructor(private readonly extensionUri: vscode.Uri) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')
      ],
    };

    webviewView.webview.onDidReceiveMessage((msg) => {
      if (msg.command === 'saveFile') {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri ?? this.extensionUri;
        const testcasesDir = vscode.Uri.joinPath(root, 'testcases');
        if (!fs.existsSync(testcasesDir.fsPath)) {
          fs.mkdirSync(testcasesDir.fsPath, { recursive: true });
        }
        vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.joinPath(testcasesDir, msg.defaultName || 'data.in'),
          filters: { 'Input files': ['in'], 'All files': ['*'] },
        }).then((saveUri) => {
          if (saveUri) {
            fs.writeFileSync(saveUri.fsPath, msg.data, 'utf-8');
            vscode.window.showInformationMessage(`文件已保存: ${saveUri.fsPath}`);
          }
        });
      } else if (msg.command === 'saveAllFiles') {
        const root = vscode.workspace.workspaceFolders?.[0]?.uri ?? this.extensionUri;
        const testcasesDir = vscode.Uri.joinPath(root, 'testcases');
        if (!fs.existsSync(testcasesDir.fsPath)) {
          fs.mkdirSync(testcasesDir.fsPath, { recursive: true });
        }
        const files: string[] = [];
        for (const item of msg.files) {
          const dir = item.folder ? path.join(testcasesDir.fsPath, item.folder) : testcasesDir.fsPath;
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          const filePath = path.join(dir, item.name);
          fs.writeFileSync(filePath, item.data, 'utf-8');
          files.push(filePath);
        }
        // 保存 config.yml
        if (msg.configYml) {
          const configPath = path.join(testcasesDir.fsPath, 'config.yml');
          fs.writeFileSync(configPath, msg.configYml, 'utf-8');
          files.push(configPath);
        }
        // 保存 README.md
        if (msg.readme) {
          const readmePath = path.join(testcasesDir.fsPath, 'README.md');
          fs.writeFileSync(readmePath, msg.readme, 'utf-8');
          files.push(readmePath);
        }
        vscode.window.showInformationMessage(`已保存 ${files.length} 个文件到 testcases/`);
      }
    });

    webviewView.webview.html = this.getWebviewContent(webviewView.webview);
  }

  private getWebviewContent(webview: vscode.Webview): string {
    const htmlPath = vscode.Uri.joinPath(
      this.extensionUri, 'dist', 'webview', 'index.html'
    );
    let html = fs.readFileSync(htmlPath.fsPath, 'utf-8');

    // 将资源路径转换为 webview 可加载的 URI
    html = html.replace(/(src|href)="([^"]*)"/g, (match, attr, src) => {
      if (src.startsWith('http') || src.startsWith('data:')) return match;
      const uri = webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', src)
      );
      return `${attr}="${uri}"`;
    });

    return html;
  }
}

export function deactivate() {}