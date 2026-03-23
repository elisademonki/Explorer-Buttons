# Explorer Buttons

Ein Obsidian-Plugin für **Windows**, mit dem du in deinen Notizen klickbare Buttons einfügst, die direkt einen Ordner oder eine Datei im **Windows-Explorer** öffnen.

Das Plugin ist dafür gedacht, aus einem Markdown-Codeblock einen echten Button zu rendern. So kannst du zum Beispiel Projektordner, Export-Verzeichnisse, Download-Ordner oder dateibezogene Pfade direkt aus einer Notiz heraus öffnen.

![[2026-03-23-explorer-button.png]]

---

## Funktionen

- Klickbare Buttons direkt in Obsidian-Notizen
- Öffnet **Ordner** im Windows-Explorer
- Markiert **Dateien** im Explorer
- Unterstützt einfache Platzhalter wie `{{vault}}` und `{{fileDir}}`
- Unterstützt Windows-Umgebungsvariablen wie `%USERPROFILE%`
- Einstellbarer Standardtext, Stil, Icon und Anzeige des Pfads
- Kopierbares Beispiel direkt in den Plugin-Einstellungen

---

## Installation

1. Obsidian schließen.
2. Den Plugin-Ordner `explorer-buttons` nach folgenden Pfad kopieren:

   ```text
   <DEIN-VAULT>\.obsidian\plugins\explorer-buttons\
   ```

3. Sicherstellen, dass sich in diesem Ordner direkt diese Dateien befinden:

   - `manifest.json`
   - `main.js`
   - `styles.css`
   - `versions.json`

4. Obsidian starten.
5. Unter **Einstellungen → Community-Plugins** das Plugin **Explorer Buttons** aktivieren.

---

## Erste Verwendung

Füge in einer Notiz einen Codeblock mit `explorer-button` ein:

```explorer-button
path: C:\Projekte\MeinProjekt
label: Projektordner öffnen
```

In der gerenderten Ansicht erscheint daraus ein klickbarer Button.

---

## Syntax

### Standardform

```explorer-button
path: C:\Projekte\MeinProjekt
label: Projektordner öffnen
style: primary
showPath: true
icon: folder-open
tooltip: Öffnet den Ordner im Windows-Explorer
```

### Kurzform

Wenn du nur den Pfad angeben willst, reicht auch das:

```explorer-button
C:\Projekte\MeinProjekt
```

---

## Unterstützte Felder

### `path`
Pflichtfeld. Der Pfad zu einem Ordner oder zu einer Datei.

Beispiele:

```text
C:\Projekte\MeinProjekt
D:\Exports
C:\Projekte\MeinProjekt\briefing.pdf
```

### `label`
Der Text, der auf dem Button angezeigt wird.

Beispiel:

```text
label: Projektordner öffnen
```

### `style`
Das Aussehen des Buttons.

Unterstützte Werte:

- `primary`
- `secondary`
- `ghost`

Beispiel:

```text
style: primary
```

### `showPath`
Legt fest, ob der Pfad unter dem Button angezeigt wird.

Unterstützte Werte:

- `true`
- `false`

Beispiel:

```text
showPath: true
```

### `icon`
Das Icon vor dem Button-Text. Verwendet Obsidian-Iconnamen.

Beispiele:

```text
icon: folder-open
icon: folder
icon: external-link
icon: file
icon: none
```

### `tooltip`
Ein Hinweistext, der beim Darüberfahren mit der Maus angezeigt wird.

Beispiel:

```text
tooltip: Öffnet den Ordner im Windows-Explorer
```

---

## Platzhalter und Variablen

Das Plugin unterstützt einige praktische Ersetzungen im Pfad.

### `{{vault}}`
Wird durch den absoluten Pfad deines aktuellen Vaults ersetzt.

Beispiel:

```explorer-button
path: {{vault}}\Assets\Exports
label: Exports öffnen
```

### `{{fileDir}}`
Wird durch den Ordner der aktuellen Notiz ersetzt.

Beispiel:

```explorer-button
path: {{fileDir}}
label: Ordner dieser Notiz öffnen
```

### `%USERPROFILE%` und andere Umgebungsvariablen
Windows-Umgebungsvariablen werden automatisch aufgelöst.

Beispiel:

```explorer-button
path: %USERPROFILE%\Desktop
label: Desktop öffnen
```

### `~`
Wird als Benutzerverzeichnis interpretiert.

Beispiel:

```explorer-button
path: ~\Downloads
label: Downloads öffnen
```

---

## Beispiele

### Projektordner öffnen

```explorer-button
path: D:\FILES\SCRIPTS\PROJEKTE\YT-VIDEOS\BILINGUAL\_GUTENBERG-GET-CHAPTER-TEXT
label: Projektordner öffnen
style: primary
showPath: true
icon: folder-open
tooltip: Öffnet den Ordner im Windows-Explorer
```

### Desktop öffnen

```explorer-button
path: %USERPROFILE%\Desktop
label: Desktop öffnen
style: secondary
icon: folder
```

### Downloads öffnen

```explorer-button
path: %USERPROFILE%\Downloads
label: Downloads öffnen
style: ghost
icon: folder-open
```

### Ordner der aktuellen Notiz öffnen

```explorer-button
path: {{fileDir}}
label: Ordner dieser Notiz öffnen
style: primary
```

### Datei im Explorer markieren

```explorer-button
path: C:\Projekte\MeinProjekt\briefing.pdf
label: PDF im Explorer zeigen
icon: file
```

---

## Plugin-Einstellungen

### Standard-Buttontext
Wird verwendet, wenn im Codeblock kein eigenes `label:` gesetzt ist.

### Standard-Stil
Wird verwendet, wenn im Codeblock kein `style:` angegeben ist.

### Standard-Icon
Wird verwendet, wenn im Codeblock kein `icon:` gesetzt ist.

### Pfad standardmäßig anzeigen
Legt fest, ob der Pfad automatisch unter dem Button eingeblendet wird, wenn `showPath:` nicht explizit gesetzt wurde.

### Öffnungsmodus
Bestimmt, wie der Pfad geöffnet wird.

- `Auto`: Nutzt unter Windows bevorzugt den Explorer
- `Explorer`: Erzwingt `explorer.exe`
- `Shell`: Nutzt den allgemeinen System-Öffner

---

## Verhalten

- **Ordnerpfade** werden direkt geöffnet.
- **Dateipfade** werden im Windows-Explorer markiert.
- **Nicht existierende Pfade** zeigen eine Fehlermeldung in Obsidian.
- Das Plugin ist für **Obsidian Desktop unter Windows** gedacht.

---

## Wichtig

Der Codeblock muss exakt so beginnen:

```text
```explorer-button
```

Nicht so:

```text
```explorer-plugin
```

Der Block wird nur in der gerenderten Ansicht als Button angezeigt, also in der Leseansicht oder in Live Preview.

---

## Fehlerbehebung

### Der Button erscheint nicht
Prüfe Folgendes:

- Ist das Plugin aktiviert?
- Heißt der Block wirklich `explorer-button`?
- Ist die Notiz in Live Preview oder Leseansicht?
- Liegt der Plugin-Ordner direkt unter `.obsidian/plugins/explorer-buttons/`?

### Beim Klick passiert nichts
Prüfe Folgendes:

- Existiert der Pfad wirklich?
- Verwendest du Obsidian Desktop unter Windows?
- Ist der Pfad korrekt geschrieben?
- Hilft ein Wechsel des Öffnungsmodus in den Plugin-Einstellungen?

### Die Datei soll markiert statt geöffnet werden
Gib einfach den Pfad zu einer existierenden Datei an. Das Plugin versucht dann, sie im Explorer zu markieren.

---

## Kompatibilität

- Betriebssystem: **Windows**
- Obsidian: Desktop-Version
- Kein Build-Schritt nötig, da das Plugin direkt über `main.js` geladen wird

---

## Version

### 1.1.0

- Kopierbares Beispiel in den Plugin-Einstellungen
- Kopieren-Button für das Beispiel
- Beispiel aktualisiert sich anhand der Standardwerte in den Einstellungen

---

## Lizenz

Zur freien Nutzung innerhalb deines Vaults oder Projekts.
