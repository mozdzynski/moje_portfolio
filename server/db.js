import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '../public/data.json');
const uploadsDir = path.join(__dirname, '../public/uploads/screenshots');

// Ensure db and uploads directory exist
function initDB() {
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    const defaultData = {
      categories: [
        { id: 4, name: "Aplikacje Webowe", description: "Zaawansowane aplikacje i systemy internetowe", slug: "aplikacje-webowe" },
        { id: 1, name: "Strony i Portale", description: "Nowoczesne witryny i platformy internetowe", slug: "strony-i-portale" },
        { id: 2, name: "Automatyzacje", description: "Systemy automatyzacji i integracje API", slug: "automatyzacje" },
        { id: 3, name: "Narzędzia", description: "Narzędzia analityczne i skrypty biznesowe", slug: "narzedzia" }
      ],
      projects: []
    };
    fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

initDB();

function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading database:", error);
    return { categories: [], projects: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error("Error writing database:", error);
    return false;
  }
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // Replace spaces with -
    .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
    .replace(/\-\-+/g, '-')         // Replace multiple - with single -
    .replace(/^-+/, '')             // Trim - from start
    .replace(/-+$/, '');            // Trim - from end
}

export const db = {
  // Categories CRUD
  getCategories() {
    return readDB().categories;
  },

  addCategory(category) {
    const data = readDB();
    const slug = slugify(category.name);
    
    if (data.categories.some(c => c.slug === slug)) {
      throw new Error(`Kategoria o slugie "${slug}" już istnieje.`);
    }

    const newId = data.categories.reduce((max, c) => Math.max(max, c.id), 0) + 1;
    const newCategory = {
      id: newId,
      name: category.name,
      description: category.description || "",
      slug
    };

    data.categories.push(newCategory);
    writeDB(data);
    return newCategory;
  },

  deleteCategory(id) {
    const data = readDB();
    const idNum = parseInt(id, 10);
    const index = data.categories.findIndex(c => c.id === idNum);
    if (index === -1) return false;

    data.categories.splice(index, 1);
    
    // Set category_id to null for associated projects
    data.projects = data.projects.map(p => {
      if (p.category_id === idNum) {
        return { ...p, category_id: null };
      }
      return p;
    });

    writeDB(data);
    return true;
  },

  // Projects CRUD
  getProjects() {
    return readDB().projects;
  },

  getProject(id) {
    const data = readDB();
    const idNum = parseInt(id, 10);
    return data.projects.find(p => p.id === idNum);
  },

  addProject(project) {
    const data = readDB();
    const newId = data.projects.reduce((max, p) => Math.max(max, p.id), 0) + 1;
    
    const newProject = {
      id: newId,
      url: project.url,
      title: project.title,
      description_generated: project.description_generated || "",
      tech_stack: Array.isArray(project.tech_stack) ? project.tech_stack : [],
      thumbnail_url: project.thumbnail_url || "",
      category_id: project.category_id ? parseInt(project.category_id, 10) : null,
      tags: Array.isArray(project.tags) ? project.tags : [],
      status: project.status || 'draft',
      created_at: new Date().toISOString()
    };

    data.projects.push(newProject);
    writeDB(data);
    return newProject;
  },

  updateProject(id, updatedFields) {
    const data = readDB();
    const idNum = parseInt(id, 10);
    const index = data.projects.findIndex(p => p.id === idNum);
    if (index === -1) return null;

    const existingProject = data.projects[index];
    const updatedProject = {
      ...existingProject,
      ...updatedFields,
      // Ensure key arrays / integers are cast properly
      id: idNum,
      category_id: updatedFields.category_id ? parseInt(updatedFields.category_id, 10) : existingProject.category_id,
      tech_stack: Array.isArray(updatedFields.tech_stack) ? updatedFields.tech_stack : existingProject.tech_stack,
      tags: Array.isArray(updatedFields.tags) ? updatedFields.tags : existingProject.tags
    };

    data.projects[index] = updatedProject;
    writeDB(data);
    return updatedProject;
  },

  deleteProject(id) {
    const data = readDB();
    const idNum = parseInt(id, 10);
    const index = data.projects.findIndex(p => p.id === idNum);
    if (index === -1) return false;

    // Delete thumbnail file if it exists and is local
    const project = data.projects[index];
    if (project.thumbnail_url && project.thumbnail_url.startsWith('/uploads/screenshots/')) {
      const filename = path.basename(project.thumbnail_url);
      const filePath = path.join(uploadsDir, filename);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.error("Error deleting screenshot file:", err);
        }
      }
    }

    data.projects.splice(index, 1);
    writeDB(data);
    return true;
  }
};
