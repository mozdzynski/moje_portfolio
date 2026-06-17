import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../public/uploads/screenshots');

export async function captureScreenshot(url, projectId, projectTitle, techStack = []) {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filename = `project_${projectId}.png`;
  const outputPath = path.join(uploadsDir, filename);
  const relativeUrl = `/uploads/screenshots/${filename}`;

  console.log(`Zaczynam generowanie miniatury dla projektu ${projectId}: ${url}`);

  try {
    // Attempt local Puppeteer screenshot
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set 15s timeout
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
    
    // Wait an extra 2 seconds for animations or images to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await page.screenshot({ path: outputPath, type: 'png' });
    await browser.close();
    
    console.log(`Zrzut ekranu zapisany pomyślnie: ${outputPath}`);
    return relativeUrl;
  } catch (error) {
    console.warn(`Błąd Puppeteera dla ${url}: ${error.message}. Generuję grafikę fallback SVG.`);
    
    // If Puppeteer fails, write a beautiful SVG fallback instead
    const svgFilename = `project_${projectId}.svg`;
    const svgPath = path.join(uploadsDir, svgFilename);
    const svgRelativeUrl = `/uploads/screenshots/${svgFilename}`;
    
    const svgContent = generateFallbackSVG(projectTitle, techStack, projectId);
    fs.writeFileSync(svgPath, svgContent, 'utf-8');
    
    console.log(`Grafika SVG zapisana pomyślnie: ${svgPath}`);
    return svgRelativeUrl;
  }
}

function generateFallbackSVG(title, techStack, projectId = 0) {
  // Safe string escapes for XML
  const cleanTitle = (title || 'Projekt').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  
  // Premium dark-mode color themes
  const themes = [
    // 0. Cosmic Purple/Indigo
    { 
      bg1: '#0b1120', bg2: '#0f172a', bg3: '#1e1b4b', 
      accent1: '#10b981', accent2: '#06b6d4', 
      glow1: '#10b981', glow2: '#a855f7', textAccent: '#10b981' 
    },
    // 1. Forest Emerald
    { 
      bg1: '#022c22', bg2: '#064e3b', bg3: '#0f172a', 
      accent1: '#34d399', accent2: '#10b981', 
      glow1: '#059669', glow2: '#06b6d4', textAccent: '#34d399' 
    },
    // 2. Sunset Amber
    { 
      bg1: '#1c1917', bg2: '#292524', bg3: '#451a03', 
      accent1: '#f43f5e', accent2: '#f97316', 
      glow1: '#e11d48', glow2: '#d97706', textAccent: '#fb7185' 
    },
    // 3. Cyberpunk Neon
    { 
      bg1: '#0f051d', bg2: '#18082e', bg3: '#090514', 
      accent1: '#ec4899', accent2: '#8b5cf6', 
      glow1: '#d946ef', glow2: '#6366f1', textAccent: '#f472b6' 
    },
    // 4. Abyss Blue
    { 
      bg1: '#031b29', bg2: '#062d44', bg3: '#0c1020', 
      accent1: '#38bdf8', accent2: '#0284c7', 
      glow1: '#0ea5e9', glow2: '#10b981', textAccent: '#38bdf8' 
    }
  ];

  // Pick a theme based on projectId
  const theme = themes[projectId % themes.length];

  // Randomize glow circle positions & radiuses based on projectId
  const cx1 = 150 + (projectId * 83) % 300;
  const cy1 = 150 + (projectId * 47) % 200;
  const r1 = 180 + (projectId * 29) % 120;

  const cx2 = 850 + (projectId * 61) % 300;
  const cy2 = 400 + (projectId * 37) % 200;
  const r2 = 220 + (projectId * 19) % 120;

  // Render up to 4 tags
  const tagsToRender = (techStack || []).slice(0, 4);
  let tagsMarkup = '';
  let currentX = 100;
  
  tagsToRender.forEach((tech, i) => {
    const textLen = tech.length * 10 + 20; // estimate badge width
    tagsMarkup += `
      <g transform="translate(${currentX}, 470)">
        <rect width="${textLen}" height="35" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1"/>
        <text x="${textLen/2}" y="22" font-family="system-ui, sans-serif" font-size="14" fill="${theme.textAccent}" font-weight="600" text-anchor="middle">${tech}</text>
      </g>
    `;
    currentX += textLen + 15;
  });

  return `<svg width="1280" height="720" viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${theme.bg1};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${theme.bg2};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${theme.bg3};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${theme.accent1};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${theme.accent2};stop-opacity:1" />
    </linearGradient>
    
    <!-- Filters for Glows -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="60" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bgGrad)" />

  <!-- Abstract Decorative Glows -->
  <circle cx="${cx1}" cy="${cy1}" r="${r1}" fill="${theme.glow1}" opacity="0.09" filter="url(#glow)" />
  <circle cx="${cx2}" cy="${cy2}" r="${r2}" fill="${theme.glow2}" opacity="0.07" filter="url(#glow)" />
  <path d="M 0,720 L 1280,720 L 1280,680 Q 960,600 640,680 T 0,700 Z" fill="${theme.glow1}" opacity="0.07" />

  <!-- Code Pattern (Slightly visible) -->
  <g opacity="0.03" font-family="monospace" font-size="12" fill="#fff" transform="translate(850, 80)">
    <text x="0" y="0">const project = {</text>
    <text x="20" y="20">id: "${projectId}",</text>
    <text x="20" y="40">status: "published",</text>
    <text x="20" y="60">techStack: ${JSON.stringify(tagsToRender)},</text>
    <text x="20" y="80">deploy: "Netlify",</text>
    <text x="20" y="100">performance: "100/100"</text>
    <text x="0" y="120">};</text>
    <text x="0" y="150">function build() {</text>
    <text x="20" y="170">console.log("Building...");</text>
    <text x="0" y="190">}</text>
  </g>

  <!-- Content Container -->
  <g transform="translate(100, 220)">
    <!-- Accent Line -->
    <rect x="0" y="0" width="120" height="8" rx="4" fill="url(#accentGrad)" />
    
    <!-- Category / Type -->
    <text x="0" y="40" font-family="system-ui, sans-serif" font-size="18" font-weight="700" fill="${theme.textAccent}" letter-spacing="2">PROTOTYP WEBOWY</text>
    
    <!-- Project Title -->
    <text x="0" y="120" font-family="system-ui, sans-serif" font-size="52" font-weight="800" fill="#ffffff" letter-spacing="-1">${cleanTitle}</text>
    
    <!-- Description Sub-label -->
    <text x="0" y="170" font-family="system-ui, sans-serif" font-size="20" fill="#94a3b8">W pełni zautomatyzowane wdrożenie i analiza portfolio CMS</text>
  </g>
  
  <!-- Tech Stack Badges Title -->
  <text x="100" y="445" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#64748b" letter-spacing="1">STOS TECHNOLOGICZNY</text>
  
  <!-- Rendered Badges -->
  ${tagsMarkup}

  <!-- Watermark / Branding -->
  <g transform="translate(1100, 640)" opacity="0.6">
    <text x="0" y="0" font-family="system-ui, sans-serif" font-size="12" font-weight="600" fill="#64748b" text-anchor="end">Tomasz Możdżyński</text>
    <text x="0" y="16" font-family="system-ui, sans-serif" font-size="10" font-weight="400" fill="#475569" text-anchor="end">System Zautomatyzowanego Portfolio</text>
  </g>

</svg>`;
}

