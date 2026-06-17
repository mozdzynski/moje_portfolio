document.addEventListener('DOMContentLoaded', () => {
  let categories = [];
  let projects = [];

  // DOM Elements
  const categoriesList = document.getElementById('categories-list-root');
  const projectsList = document.getElementById('projects-list-root');
  const catSelect = document.getElementById('select-category');
  const urlForm = document.getElementById('url-analyze-form');
  const analyzeBtn = document.getElementById('btn-submit-analyze');
  const inputUrl = document.getElementById('input-url');
  
  // Stepper Elements
  const stepper = document.getElementById('analysis-stepper');
  const stepScrape = document.getElementById('step-scrape');
  const stepAi = document.getElementById('step-ai');
  const stepScreenshot = document.getElementById('step-screenshot');
  const stepComplete = document.getElementById('step-complete');

  // Draft Form Elements
  const draftPanel = document.getElementById('panel-draft-review');
  const draftForm = document.getElementById('draft-review-form');
  const draftId = document.getElementById('draft-id');
  const draftUrl = document.getElementById('draft-url');
  const draftTitle = document.getElementById('draft-title');
  const draftCategory = document.getElementById('draft-category');
  const draftDesc = document.getElementById('draft-description');
  const draftTech = document.getElementById('draft-tech-stack');
  const draftTags = document.getElementById('draft-tags');
  const draftImgFrame = document.getElementById('draft-img-frame');
  const draftThumbPath = document.getElementById('draft-thumbnail-path');
  const draftThumbFile = document.getElementById('draft-thumbnail-file');
  const btnDiscard = document.getElementById('btn-discard-draft');

  // Category Form Elements
  const catForm = document.getElementById('category-add-form');
  const catNameInput = document.getElementById('input-cat-name');
  const catDescInput = document.getElementById('input-cat-desc');

  // Git Form Elements
  const gitForm = document.getElementById('git-deploy-form');
  const gitCommitInput = document.getElementById('input-commit-msg');
  const gitBtn = document.getElementById('btn-git-push');
  const gitTerminal = document.getElementById('git-logs-terminal');

  // ----------------------------------------------------
  // Initial Loader
  // ----------------------------------------------------
  async function init() {
    await loadCategories();
    await loadProjects();
  }

  // ----------------------------------------------------
  // Load and Render Categories
  // ----------------------------------------------------
  async function loadCategories() {
    try {
      const res = await fetch('/api/categories');
      if (!res.ok) throw new Error('Nie udało się wczytać kategorii.');
      categories = await res.json();
      
      renderCategoryDropdowns();
      renderCategoriesList();
    } catch (err) {
      alert(`Błąd: ${err.message}`);
    }
  }

  function renderCategoryDropdowns() {
    // Populate dropdowns
    const optionsHtml = categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('');
    
    catSelect.innerHTML = `<option value="">-- Wybierz kategorię --</option>` + optionsHtml;
    draftCategory.innerHTML = optionsHtml;
  }

  function renderCategoriesList() {
    categoriesList.innerHTML = '';
    
    if (categories.length === 0) {
      categoriesList.innerHTML = '<li class="admin-list-item" style="color:var(--text-dark);">Brak zdefiniowanych kategorii.</li>';
      return;
    }

    categories.forEach(cat => {
      // Count projects in this category
      const projectCount = projects.filter(p => p.category_id == cat.id).length;

      const li = document.createElement('li');
      li.className = 'admin-list-item';
      li.innerHTML = `
        <div class="item-details">
          <h4>${cat.name}</h4>
          <p>Slug: ${cat.slug} | Projekty: ${projectCount}</p>
        </div>
        <button class="btn-danger" style="padding:0.25rem 0.6rem; font-size:0.75rem;" id="btn-delete-cat-${cat.id}">Usuń</button>
      `;

      // Event listener for category delete
      li.querySelector('button').addEventListener('click', async () => {
        if (confirm(`Czy na pewno chcesz usunąć kategorię "${cat.name}"? Projekty w tej kategorii nie zostaną usunięte, ale ich kategoria zostanie wyczyszczona.`)) {
          try {
            const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Nie udało się usunąć kategorii.');
            await loadCategories();
            await loadProjects();
          } catch (err) {
            alert(`Błąd: ${err.message}`);
          }
        }
      });

      categoriesList.appendChild(li);
    });
  }

  // ----------------------------------------------------
  // Load and Render Projects
  // ----------------------------------------------------
  async function loadProjects() {
    try {
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Nie udało się wczytać projektów.');
      projects = await res.json();
      
      renderProjectsList();
      renderCategoriesList(); // Re-render categories to update project count badges
    } catch (err) {
      alert(`Błąd: ${err.message}`);
    }
  }

  function renderProjectsList() {
    projectsList.innerHTML = '';
    
    if (projects.length === 0) {
      projectsList.innerHTML = '<li class="admin-list-item" style="color:var(--text-dark);">Brak projektów w bazie.</li>';
      return;
    }

    // Render list ordered by newest
    const sortedProjects = [...projects].reverse();

    sortedProjects.forEach(proj => {
      const categoryObj = categories.find(c => c.id == proj.category_id);
      const categoryName = categoryObj ? categoryObj.name : 'Bez kategorii';

      const li = document.createElement('li');
      li.className = 'admin-list-item';
      li.id = `admin-proj-item-${proj.id}`;
      li.innerHTML = `
        <div class="item-details">
          <h4>${proj.title} <span class="status-badge ${proj.status}">${proj.status}</span></h4>
          <p>${categoryName} | ${proj.url}</p>
        </div>
        <div style="display:flex; gap: 0.5rem;">
          <button class="btn-secondary" style="padding:0.25rem 0.6rem; font-size:0.75rem;" id="btn-edit-proj-${proj.id}">Edytuj</button>
          <button class="btn-danger" style="padding:0.25rem 0.6rem; font-size:0.75rem;" id="btn-delete-proj-${proj.id}">Usuń</button>
        </div>
      `;

      // Event listener for edit project
      li.querySelector('.btn-secondary').addEventListener('click', () => {
        showDraftReview(proj);
      });

      // Event listener for delete project
      li.querySelector('.btn-danger').addEventListener('click', async () => {
        if (confirm(`Czy na pewno chcesz usunąć projekt "${proj.title}"?`)) {
          try {
            const res = await fetch(`/api/projects/${proj.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Nie udało się usunąć projektu.');
            
            // If we are currently editing this project in the draft panel, hide it
            if (draftId.value == proj.id) {
              draftPanel.style.display = 'none';
            }

            await loadProjects();
          } catch (err) {
            alert(`Błąd: ${err.message}`);
          }
        }
      });

      projectsList.appendChild(li);
    });
  }

  // ----------------------------------------------------
  // Add Category Handler
  // ----------------------------------------------------
  catForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = catNameInput.value.trim();
    const description = catDescInput.value.trim();

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się stworzyć kategorii.');

      catNameInput.value = '';
      catDescInput.value = '';
      await loadCategories();
    } catch (err) {
      alert(`Błąd: ${err.message}`);
    }
  });

  // ----------------------------------------------------
  // URL Analysis & Stepper Orchestrator
  // ----------------------------------------------------
  urlForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = inputUrl.value.trim();
    const category_id = catSelect.value;

    if (!url) return;

    // Reset Stepper CSS states & Show Stepper
    stepper.style.display = 'block';
    resetStepper();
    
    // Disable inputs
    analyzeBtn.disabled = true;
    inputUrl.disabled = true;
    catSelect.disabled = true;

    // Hide draft preview while analyzing new url
    draftPanel.style.display = 'none';

    // Step 1: Scrape starts
    setStepState(stepScrape, 'active');

    // Simulate timeline states to look gorgeous
    const aiTimer = setTimeout(() => {
      setStepState(stepScrape, 'completed');
      setStepState(stepAi, 'active');
    }, 2000);

    const ssTimer = setTimeout(() => {
      setStepState(stepAi, 'completed');
      setStepState(stepScreenshot, 'active');
    }, 4500);

    try {
      const res = await fetch('/api/projects/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, category_id })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Wystąpił błąd podczas analizy URL.');

      // Clear timers and complete all steps
      clearTimeout(aiTimer);
      clearTimeout(ssTimer);
      
      setStepState(stepScrape, 'completed');
      setStepState(stepAi, 'completed');
      setStepState(stepScreenshot, 'completed');
      setStepState(stepComplete, 'active');

      setTimeout(() => {
        setStepState(stepComplete, 'completed');
      }, 1000);

      // Load draft into workspace
      showDraftReview(data.project);
      
      // Update projects list immediately so it shows up
      await loadProjects();
      
      // Auto-focus on commit message pre-fill
      gitCommitInput.value = `CMS: Dodano projekt "${data.project.title}"`;
      
      // Scroll to workspace
      draftPanel.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      clearTimeout(aiTimer);
      clearTimeout(ssTimer);
      alert(`Błąd: ${err.message}`);
      resetStepper();
      stepper.style.display = 'none';
    } finally {
      analyzeBtn.disabled = false;
      inputUrl.disabled = false;
      catSelect.disabled = false;
      inputUrl.value = '';
      catSelect.value = '';
    }
  });

  function resetStepper() {
    const steps = [stepScrape, stepAi, stepScreenshot, stepComplete];
    steps.forEach(s => {
      s.className = 'step';
    });
  }

  function setStepState(stepNode, state) {
    // state can be 'active' or 'completed'
    stepNode.className = `step ${state}`;
  }

  // ----------------------------------------------------
  // Draft Preview & Editing
  // ----------------------------------------------------
  function showDraftReview(project) {
    draftPanel.style.display = 'block';
    
    // Fill values
    draftId.value = project.id;
    draftUrl.value = project.url;
    draftTitle.value = project.title;
    draftCategory.value = project.category_id || "";
    draftDesc.value = project.description_generated;
    draftTech.value = (project.tech_stack || []).join(', ');
    draftTags.value = (project.tags || []).join(', ');
    draftThumbPath.value = project.thumbnail_url || "";
    
    // Update badge status
    const statusBadge = document.getElementById('draft-badge-status');
    statusBadge.textContent = project.status;
    statusBadge.className = `status-badge ${project.status}`;

    // Render image preview
    if (project.thumbnail_url) {
      draftImgFrame.innerHTML = `<img src="${project.thumbnail_url}" alt="Screenshot Preview" onerror="this.onerror=null; this.src='/uploads/screenshots/project_${project.id}.svg?t=${Date.now()}';">`;
    } else {
      draftImgFrame.innerHTML = `<span class="no-img">Brak miniatury</span>`;
    }
  }

  // Handle custom thumbnail upload
  draftThumbFile.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const id = draftId.value;
    if (!id) {
      alert("Najpierw musisz zaimportować lub wybrać projekt.");
      draftThumbFile.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      
      draftImgFrame.innerHTML = `<div class="spinner"></div><p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.5rem;">Przesyłanie...</p>`;
      
      try {
        const response = await fetch(`/api/projects/${id}/upload-thumbnail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64Data })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Błąd wgrywania pliku.');
        
        draftThumbPath.value = data.thumbnail_url;
        draftImgFrame.innerHTML = `<img src="${data.thumbnail_url}?t=${Date.now()}" alt="Custom Thumbnail Preview">`;
        draftThumbFile.value = '';
      } catch (err) {
        alert(`Błąd: ${err.message}`);
        if (draftThumbPath.value) {
          draftImgFrame.innerHTML = `<img src="${draftThumbPath.value}" alt="Screenshot Preview">`;
        } else {
          draftImgFrame.innerHTML = `<span class="no-img">Brak miniatury</span>`;
        }
        draftThumbFile.value = '';
      }
    };
    reader.readAsDataURL(file);
  });

  // Submit Draft to DB (Publish)
  draftForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = draftId.value;
    const title = draftTitle.value.trim();
    const category_id = draftCategory.value;
    const description_generated = draftDesc.value.trim();
    const thumbnail_url = draftThumbPath.value.trim();
    
    // Convert tech stack and tags back to arrays
    const tech_stack = draftTech.value.split(',').map(s => s.trim()).filter(Boolean);
    const tags = draftTags.value.split(',').map(s => s.trim()).filter(Boolean);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category_id,
          description_generated,
          tech_stack,
          tags,
          thumbnail_url,
          status: 'published' // Publish it!
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Nie udało się zaktualizować projektu.');

      alert(`Projekt "${title}" został pomyślnie zaktualizowany i opublikowany!`);
      
      // Update lists
      await loadProjects();
      
      // Pre-fill Git deployment details
      gitCommitInput.value = `CMS: Dodano projekt "${title}"`;
      
      // Hide review panel
      draftPanel.style.display = 'none';
      stepper.style.display = 'none';

      // Scroll to Git sync control
      document.getElementById('panel-deploy-control').scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
      alert(`Błąd: ${err.message}`);
    }
  });

  // Discard draft
  btnDiscard.addEventListener('click', async () => {
    const id = draftId.value;
    const title = draftTitle.value;

    if (confirm(`Czy chcesz całkowicie odrzucić i usunąć ten draft: "${title}"?`)) {
      try {
        const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Nie udało się usunąć draftu.');

        draftPanel.style.display = 'none';
        stepper.style.display = 'none';
        await loadProjects();
      } catch (err) {
        alert(`Błąd: ${err.message}`);
      }
    }
  });

  // ----------------------------------------------------
  // Git Deployment / Sync
  // ----------------------------------------------------
  gitForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const commitMessage = gitCommitInput.value.trim();

    // Reset terminal logs
    gitTerminal.style.display = 'block';
    gitTerminal.innerHTML = '> git add .\n> git commit -m "' + commitMessage + '"\n> git push\n\nSynchronizowanie... Czekaj na zakończenie operacji...';
    
    // Disable deploy button
    gitBtn.disabled = true;

    try {
      const res = await fetch('/api/git/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commitMessage })
      });

      const data = await res.json();

      if (data.success) {
        gitTerminal.innerHTML = `> Git operacja zakończona sukcesem!\n\n${data.message}\n\nLog terminala:\n${data.output || ''}`;
        gitTerminal.style.color = '#34d399'; // green text
        alert('Synchronizacja ukończona! Repozytorium zostało wypchnięte do GitHub. Netlify zaktualizuje stronę w ciągu kilku sekund.');
      } else {
        gitTerminal.innerHTML = `> Błąd synchronizacji Git:\n\n${data.message}\n\nBłąd:\n${data.error || ''}`;
        gitTerminal.style.color = '#f87171'; // red text
        alert('Synchronizacja Git nie powiodła się. Sprawdź terminal logów pod przyciskiem w celu zidentyfikowania problemu.');
      }
    } catch (err) {
      gitTerminal.innerHTML = `> Błąd krytyczny sieci:\n\n${err.message}`;
      gitTerminal.style.color = '#f87171';
      alert(`Wystąpił błąd sieciowy: ${err.message}`);
    } finally {
      gitBtn.disabled = false;
    }
  });

  init();
});
