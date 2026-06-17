import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import { db } from './db.js';
import { scrapeURL } from './scraper.js';
import { generateProjectContent } from './ai.js';
import { captureScreenshot } from './screenshot.js';
import { deployToGitHub } from './git.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// ----------------------------------------------------
// Category API Endpoints
// ----------------------------------------------------
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.getCategories();
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/categories', (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nazwa kategorii jest wymagana.' });
    }
    const category = db.addCategory({ name, description });
    res.status(201).json({ success: true, category });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/api/categories/:id', (req, res) => {
  try {
    const deleted = db.deleteCategory(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Kategoria o podanym ID nie istnieje.' });
    }
    res.json({ success: true, message: 'Kategoria została usunięta.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Project API Endpoints
// ----------------------------------------------------
app.get('/api/projects', (req, res) => {
  try {
    let projects = db.getProjects();
    const { status, category_id } = req.query;

    if (status) {
      projects = projects.filter(p => p.status === status);
    }
    if (category_id) {
      const catIdNum = parseInt(category_id, 10);
      projects = projects.filter(p => p.category_id === catIdNum);
    }

    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const project = db.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Projekt o podanym ID nie istnieje.' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', (req, res) => {
  try {
    const project = db.addProject(req.body);
    res.status(201).json({ success: true, project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  try {
    const project = db.updateProject(req.params.id, req.body);
    if (!project) {
      return res.status(404).json({ error: 'Projekt o podanym ID nie istnieje.' });
    }
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    const deleted = db.deleteProject(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Projekt o podanym ID nie istnieje.' });
    }
    res.json({ success: true, message: 'Projekt został usunięty.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----------------------------------------------------
// Automation Pipeline (Scrape -> AI -> Screenshot)
// ----------------------------------------------------
app.post('/api/projects/analyze', async (req, res) => {
  const { url, category_id } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Adres URL aplikacji jest wymagany.' });
  }

  // Parse URL & validate format
  let cleanUrl = url.trim();
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = 'https://' + cleanUrl;
  }

  try {
    new URL(cleanUrl);
  } catch (e) {
    return res.status(400).json({ error: 'Podany adres URL jest niepoprawny.' });
  }

  console.log(`Rozpoczynam analizę URL: ${cleanUrl}`);

  try {
    // 1. Create a quick placeholder draft in DB to get an ID for the screenshot
    const draftPlaceholder = db.addProject({
      url: cleanUrl,
      title: 'Analizowanie strony...',
      description_generated: 'Trwa pobieranie danych ze strony...',
      category_id: category_id || null,
      status: 'draft'
    });

    const projectId = draftPlaceholder.id;

    // 2. Scrape the URL
    console.log(`[ID: ${projectId}] Scrapowanie strony...`);
    const scrapeResult = await scrapeURL(cleanUrl);

    let title = scrapeResult.title;
    let description = scrapeResult.metaDescription;
    let techStack = ['HTML', 'CSS', 'JS'];
    let tags = ['web'];
    let seoMeta = scrapeResult.metaDescription;

    if (scrapeResult.success) {
      // 3. Generate content via Gemini
      console.log(`[ID: ${projectId}] Generowanie treści przez AI...`);
      const aiResult = await generateProjectContent(scrapeResult);
      
      title = aiResult.title || title;
      description = aiResult.description_generated || description;
      techStack = aiResult.tech_stack || techStack;
      tags = aiResult.tags || tags;
      seoMeta = aiResult.seo_meta_desc || seoMeta;
    }

    // 4. Capture screenshot (uses project ID to write screenshot file name)
    console.log(`[ID: ${projectId}] Generowanie zrzutu ekranu w tle...`);
    const screenshotUrl = await captureScreenshot(cleanUrl, projectId, title, techStack);

    // 5. Update the DB draft with the final compiled data
    const updatedDraft = db.updateProject(projectId, {
      title,
      description_generated: description,
      tech_stack: techStack,
      thumbnail_url: screenshotUrl,
      tags,
      seo_meta_desc: seoMeta,
      status: 'draft'
    });

    console.log(`[ID: ${projectId}] Analiza zakończona. Draft gotowy.`);
    res.json({ success: true, project: updatedDraft });

  } catch (error) {
    console.error('Błąd podczas wykonywania potoku analizy:', error);
    res.status(500).json({ error: `Błąd analizy: ${error.message}` });
  }
});

// ----------------------------------------------------
// Git Deployment Endpoint
// ----------------------------------------------------
app.post('/api/git/deploy', async (req, res) => {
  const { commitMessage } = req.body;
  try {
    const deployResult = await deployToGitHub(commitMessage);
    res.json(deployResult);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ----------------------------------------------------
// Thumbnail Upload Endpoint
// ----------------------------------------------------
app.post('/api/projects/:id/upload-thumbnail', (req, res) => {
  const { id } = req.params;
  const { base64Data } = req.body;

  if (!base64Data) {
    return res.status(400).json({ error: 'Brak danych pliku obrazu.' });
  }

  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Niepoprawny format danych base64.' });
    }

    const mimeType = matches[1];
    const base64String = matches[2];
    const buffer = Buffer.from(base64String, 'base64');

    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('svg')) ext = 'svg';

    const filename = `project_${id}_custom_${Date.now()}.${ext}`;
    const uploadsDir = path.join(__dirname, '../public/uploads/screenshots');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const outputPath = path.join(uploadsDir, filename);
    fs.writeFileSync(outputPath, buffer);

    const relativeUrl = `/uploads/screenshots/${filename}`;

    const updatedProject = db.updateProject(id, { thumbnail_url: relativeUrl });
    if (!updatedProject) {
      return res.status(404).json({ error: 'Projekt o podanym ID nie istnieje.' });
    }

    res.json({ success: true, thumbnail_url: relativeUrl });
  } catch (error) {
    console.error('Błąd podczas zapisywania przesłanego pliku:', error);
    res.status(500).json({ error: `Błąd serwera: ${error.message}` });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Serwer CMS działa na porcie: ${PORT}`);
  console.log(`Otwórz http://localhost:${PORT} aby zobaczyć portfolio`);
  console.log(`Otwórz http://localhost:${PORT}/admin.html aby otworzyć panel CMS`);
  console.log(`====================================================`);
});
