import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const execPromise = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '../');

export async function deployToGitHub(commitMessage = 'CMS: Aktualizacja danych portfolio') {
  // Check if .git folder exists
  const gitPath = path.join(rootDir, '.git');
  if (!fs.existsSync(gitPath)) {
    console.warn("Katalog roboczy nie jest zainicjalizowany jako repozytorium Git.");
    return {
      success: false,
      message: "Lokalny folder nie jest repozytorium Git. Dane zostały zapisane lokalnie, ale nie można ich automatycznie wysłać na GitHub/Netlify. Zainicjalizuj Git (git init) i dodaj zdalne repozytorium."
    };
  }

  try {
    // 1. Run git status to see if there are any changes
    const { stdout: statusOut } = await execPromise('git status --porcelain', { cwd: rootDir });
    if (!statusOut.trim()) {
      return {
        success: true,
        message: "Brak zmian do wypchnięcia. Portfolio jest aktualne."
      };
    }

    console.log("Wykryto zmiany. Dodaję pliki do indeksu...");
    // 2. Add files
    await execPromise('git add public/data.json public/uploads/screenshots/', { cwd: rootDir });

    console.log("Tworzę zatwierdzenie (commit)...");
    // 3. Commit
    // Using simple double quotes and escaping for Windows PowerShell/CMD compatibility
    const escapedMessage = commitMessage.replace(/"/g, '\\"');
    await execPromise(`git commit -m "${escapedMessage}"`, { cwd: rootDir });

    console.log("Wysyłam na zdalne repozytorium (git push)...");
    // 4. Push to remote
    // We assume the user has set up the upstream branch (e.g., git push -u origin main)
    // Running plain 'git push' works if upstream is set.
    const { stdout: pushOut, stderr: pushErr } = await execPromise('git push', { cwd: rootDir });
    
    console.log("Wysyłanie zakończone sukcesem.");
    return {
      success: true,
      message: "Dane i zrzuty ekranu zostały pomyślnie wysłane do GitHuba! Netlify rozpoczyna właśnie przebudowę strony.",
      output: pushOut || pushErr
    };
  } catch (error) {
    console.error("Błąd Git podczas wdrażania:", error.message);
    return {
      success: false,
      message: `Błąd Git: ${error.message}. Upewnij się, że masz skonfigurowany dostęp do zdalnego repozytorium (np. ssh/https i ustawionego push upstream).`,
      error: error.message
    };
  }
}
