const { Plugin, Notice, PluginSettingTab, Setting, setIcon } = require('obsidian');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { shell } = require('electron');

const DEFAULT_SETTINGS = {
  defaultLabel: 'Im Explorer öffnen',
  defaultStyle: 'primary',
  defaultIcon: 'folder-open',
  showPathByDefault: false,
  openMode: 'auto'
};

module.exports = class ExplorerButtonsPlugin extends Plugin {
  async onload() {
    await this.loadSettings();

    this.addSettingTab(new ExplorerButtonsSettingTab(this.app, this));

    this.registerMarkdownCodeBlockProcessor('explorer-button', (source, el, ctx) => {
      this.renderExplorerButton(source, el, ctx);
    });

    this.registerMarkdownCodeBlockProcessor('explorer-buttons', (source, el, ctx) => {
      this.renderExplorerButton(source, el, ctx);
    });

    this.addCommand({
      id: 'open-current-note-folder-in-explorer',
      name: 'Open current note folder in Windows Explorer',
      callback: async () => {
        const activeFile = this.app.workspace.getActiveFile();
        const vaultPath = this.getVaultBasePath();

        if (!activeFile || !vaultPath) {
          new Notice('Kein aktiver Dateikontext gefunden.');
          return;
        }

        const noteFolderPath = path.resolve(vaultPath, activeFile.parent?.path || '');
        await this.openInExplorer(noteFolderPath);
      }
    });
  }

  onunload() {
    // nothing to clean up
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  renderExplorerButton(source, el, ctx) {
    const config = this.parseBlockConfig(source);

    if (!config.path) {
      const errorEl = el.createDiv({ cls: 'explorer-button-error' });
      errorEl.setText('Explorer Buttons: Es fehlt ein "path". Beispiel: path: C:\\Projekte\\MeinOrdner');
      return;
    }

    const label = config.label || this.settings.defaultLabel;
    const style = this.normalizeStyle(config.style || this.settings.defaultStyle);
    const icon = config.icon === 'none' ? '' : (config.icon || this.settings.defaultIcon);
    const tooltip = config.tooltip || config.title || '';
    const showPath = this.parseBoolean(config.showpath, this.settings.showPathByDefault);

    const wrapper = el.createDiv({ cls: 'explorer-button-wrapper' });
    const button = wrapper.createEl('button', {
      cls: `explorer-button explorer-button--${style}`,
      text: ''
    });

    button.setAttribute('type', 'button');

    if (tooltip) {
      button.setAttribute('aria-label', tooltip);
      button.setAttribute('title', tooltip);
    }

    if (icon) {
      const iconSpan = button.createSpan({ cls: 'explorer-button__icon' });
      try {
        setIcon(iconSpan, icon);
      } catch (error) {
        console.warn('[Explorer Buttons] Unknown icon:', icon, error);
      }
    }

    button.createSpan({ text: label });

    if (showPath) {
      wrapper.createDiv({
        cls: 'explorer-button__path',
        text: config.path
      });
    }

    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const resolvedPath = this.resolvePath(config.path, ctx);
        await this.openInExplorer(resolvedPath);
      } catch (error) {
        console.error('[Explorer Buttons]', error);
        new Notice(`Explorer Buttons: ${error.message || 'Pfad konnte nicht geöffnet werden.'}`);
      } finally {
        window.setTimeout(() => {
          button.disabled = false;
        }, 250);
      }
    });
  }

  parseBlockConfig(source) {
    const config = {};
    const looseLines = [];
    const lines = source.split(/\r?\n/);

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line || line.startsWith('#') || line.startsWith('//')) {
        continue;
      }

      const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
      if (match) {
        const key = match[1].toLowerCase();
        const value = this.stripWrappingQuotes(match[2].trim());
        config[key] = value;
      } else {
        looseLines.push(this.stripWrappingQuotes(line));
      }
    }

    if (!config.path && looseLines.length > 0) {
      config.path = looseLines.join('\n').trim();
    }

    return config;
  }

  stripWrappingQuotes(value) {
    if (!value) {
      return value;
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }

    return value;
  }

  parseBoolean(value, fallback) {
    if (typeof value !== 'string' || value.length === 0) {
      return fallback;
    }

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'ja', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'nein', 'off'].includes(normalized)) {
      return false;
    }

    return fallback;
  }

  normalizeStyle(style) {
    const normalized = String(style || '').trim().toLowerCase();
    if (['primary', 'secondary', 'ghost'].includes(normalized)) {
      return normalized;
    }
    return DEFAULT_SETTINGS.defaultStyle;
  }

  getVaultBasePath() {
    return this.app?.vault?.adapter?.getBasePath?.() || '';
  }

  resolvePath(rawPath, ctx) {
    if (!rawPath || !String(rawPath).trim()) {
      throw new Error('Leerer Pfad.');
    }

    const vaultPath = this.getVaultBasePath();
    const sourceFilePath = ctx?.sourcePath || this.app.workspace.getActiveFile()?.path || '';
    const sourceFolderRelative = sourceFilePath ? path.posix.dirname(sourceFilePath) : '';
    const sourceFolderAbsolute = vaultPath
      ? path.resolve(vaultPath, sourceFolderRelative === '.' ? '' : sourceFolderRelative)
      : '';

    let resolved = String(rawPath).trim();

    resolved = this.stripWrappingQuotes(resolved);
    resolved = resolved.replace(/^~(?=$|[\\/])/, os.homedir());
    resolved = resolved.replace(/%([^%]+)%/g, (full, name) => process.env[name] ?? full);

    if (vaultPath) {
      resolved = resolved.replace(/\{\{\s*vault\s*\}\}/gi, vaultPath);
    }

    if (sourceFolderAbsolute) {
      resolved = resolved.replace(/\{\{\s*filedir\s*\}\}/gi, sourceFolderAbsolute);
    }

    if (!path.isAbsolute(resolved)) {
      if (sourceFolderAbsolute) {
        resolved = path.resolve(sourceFolderAbsolute, resolved);
      } else if (vaultPath) {
        resolved = path.resolve(vaultPath, resolved);
      }
    }

    return path.normalize(resolved);
  }

  async openInExplorer(targetPath) {
    if (!targetPath) {
      throw new Error('Pfad konnte nicht aufgelöst werden.');
    }

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Pfad nicht gefunden: ${targetPath}`);
    }

    const stat = fs.statSync(targetPath);
    const shouldPreferExplorer = process.platform === 'win32' && ['auto', 'explorer'].includes(this.settings.openMode);

    if (shouldPreferExplorer) {
      try {
        if (stat.isFile()) {
          const child = spawn('explorer.exe', [`/select,${targetPath}`], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        } else {
          const child = spawn('explorer.exe', [targetPath], {
            detached: true,
            stdio: 'ignore'
          });
          child.unref();
        }
        return;
      } catch (error) {
        if (this.settings.openMode === 'explorer') {
          throw error;
        }
      }
    }

    const openTarget = stat.isFile() ? path.dirname(targetPath) : targetPath;
    const shellError = await shell.openPath(openTarget);
    if (shellError) {
      throw new Error(shellError);
    }
  }
};

class ExplorerButtonsSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getExampleText() {
    const style = this.plugin.normalizeStyle(this.plugin.settings.defaultStyle);
    const icon = (this.plugin.settings.defaultIcon || '').trim() || DEFAULT_SETTINGS.defaultIcon;
    const showPath = this.plugin.settings.showPathByDefault ? 'true' : 'false';
    const label = (this.plugin.settings.defaultLabel || '').trim() || DEFAULT_SETTINGS.defaultLabel;

    return [
      '```explorer-button',
      'path: C:\\Projekte\\MeinProjekt',
      `label: ${label}`,
      `style: ${style}`,
      `showPath: ${showPath}`,
      `icon: ${icon === 'none' ? 'none' : icon}`,
      'tooltip: Öffnet den Ordner im Windows-Explorer',
      '```'
    ].join('\n');
  }

  async copyText(text) {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (error) {
      console.warn('[Explorer Buttons] Clipboard API failed, trying fallback.', error);
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    let success = false;
    try {
      success = document.execCommand('copy');
    } catch (error) {
      console.warn('[Explorer Buttons] execCommand copy failed.', error);
    } finally {
      document.body.removeChild(textarea);
    }

    return success;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Explorer Buttons' });

    containerEl.createEl('p', {
      cls: 'explorer-button-help',
      text: 'Nutze in einer Notiz einen Codeblock mit "explorer-button", um einen klickbaren Button anzuzeigen.'
    });

    new Setting(containerEl)
      .setName('Standard-Buttontext')
      .setDesc('Wird verwendet, wenn im Codeblock kein eigenes Label gesetzt ist.')
      .addText((text) =>
        text
          .setPlaceholder('Im Explorer öffnen')
          .setValue(this.plugin.settings.defaultLabel)
          .onChange(async (value) => {
            this.plugin.settings.defaultLabel = value || DEFAULT_SETTINGS.defaultLabel;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName('Standard-Stil')
      .setDesc('Standarddarstellung für Buttons ohne style-Angabe.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('primary', 'Primary')
          .addOption('secondary', 'Secondary')
          .addOption('ghost', 'Ghost')
          .setValue(this.plugin.settings.defaultStyle)
          .onChange(async (value) => {
            this.plugin.settings.defaultStyle = this.plugin.normalizeStyle(value);
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName('Standard-Icon')
      .setDesc('Obsidian-Iconname, z. B. folder-open oder external-link. none blendet das Icon aus.')
      .addText((text) =>
        text
          .setPlaceholder('folder-open')
          .setValue(this.plugin.settings.defaultIcon)
          .onChange(async (value) => {
            this.plugin.settings.defaultIcon = value.trim() || DEFAULT_SETTINGS.defaultIcon;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName('Pfad standardmäßig anzeigen')
      .setDesc('Zeigt den Pfad unter dem Button an, sofern im Codeblock nichts anderes gesetzt ist.')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showPathByDefault)
          .onChange(async (value) => {
            this.plugin.settings.showPathByDefault = value;
            await this.plugin.saveSettings();
            this.display();
          })
      );

    new Setting(containerEl)
      .setName('Öffnungsmodus')
      .setDesc('Auto nutzt unter Windows bevorzugt explorer.exe. Shell verwendet den System-Öffner.')
      .addDropdown((dropdown) =>
        dropdown
          .addOption('auto', 'Auto')
          .addOption('explorer', 'Immer Explorer')
          .addOption('shell', 'System-Shell')
          .setValue(this.plugin.settings.openMode)
          .onChange(async (value) => {
            this.plugin.settings.openMode = value;
            await this.plugin.saveSettings();
          })
      );

    containerEl.createEl('h3', { text: 'Beispiel zum Kopieren' });

    const exampleText = this.getExampleText();
    const exampleWrapper = containerEl.createDiv({ cls: 'explorer-button-example-wrapper' });
    const exampleArea = exampleWrapper.createEl('textarea', {
      cls: 'explorer-button-example',
      attr: {
        readonly: 'true',
        spellcheck: 'false'
      }
    });

    exampleArea.value = exampleText;
    exampleArea.rows = 8;

    new Setting(containerEl)
      .setName('Beispiel kopieren')
      .setDesc('Du kannst den Text direkt markieren oder mit einem Klick in die Zwischenablage kopieren.')
      .addButton((button) =>
        button
          .setButtonText('Kopieren')
          .setCta()
          .onClick(async () => {
            const success = await this.copyText(exampleArea.value);
            if (success) {
              new Notice('Beispiel in die Zwischenablage kopiert.');
            } else {
              new Notice('Kopieren hat nicht geklappt. Bitte den Text manuell markieren.');
            }
          })
      );
  }
}
