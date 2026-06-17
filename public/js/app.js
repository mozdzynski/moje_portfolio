document.addEventListener('DOMContentLoaded', () => {
  let categories = [];
  let projects = [];
  let activeCategory = 'all';
  let activeTag = 'all';

  const gridRoot = document.getElementById('projects-grid-root');
  const tabsContainer = document.getElementById('category-tabs-container');
  const tagsContainer = document.getElementById('tags-cloud-container');

  // Load initial portfolio data
  async function loadData() {
    try {
      const response = await fetch('data.json');
      if (!response.ok) throw new Error('Nie udało się pobrać danych portfolio.');
      const data = await response.json();
      
      categories = data.categories || [];
      // Show only published projects on the public page
      projects = (data.projects || []).filter(p => p.status === 'published');
      
      renderCategories();
      renderTags();
      renderProjects();
    } catch (error) {
      console.error(error);
      gridRoot.innerHTML = `
        <div class="empty-state">
          <h3>Wystąpił błąd</h3>
          <p>${error.message}</p>
        </div>
      `;
    }
  }

  // Render Category Filter Buttons
  function renderCategories() {
    // Keep the "Wszystkie" button and append dynamic categories
    const allBtn = document.getElementById('filter-cat-all');
    allBtn.className = activeCategory === 'all' ? 'tab-btn active' : 'tab-btn';
    
    // Clear old dynamic buttons
    tabsContainer.innerHTML = '';
    tabsContainer.appendChild(allBtn);

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = activeCategory == cat.id ? 'tab-btn active' : 'tab-btn';
      btn.dataset.category = cat.id;
      btn.textContent = cat.name;
      btn.id = `filter-cat-${cat.id}`;
      
      btn.addEventListener('click', () => {
        // Toggle active category
        document.querySelectorAll('.category-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeCategory = cat.id;
        renderProjects();
      });

      tabsContainer.appendChild(btn);
    });

    // Add click handler to 'All' button
    allBtn.addEventListener('click', () => {
      document.querySelectorAll('.category-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      activeCategory = 'all';
      renderProjects();
    });
  }

  // Render Technology Tag Cloud
  function renderTags() {
    tagsContainer.innerHTML = '';

    // Collect all unique tech stack names from published projects
    const allTechs = new Set();
    projects.forEach(p => {
      if (Array.isArray(p.tech_stack)) {
        p.tech_stack.forEach(t => allTechs.add(t));
      }
    });

    if (allTechs.size === 0) return;

    // Create 'All tags' button
    const allTagsBtn = document.createElement('button');
    allTagsBtn.className = activeTag === 'all' ? 'tag-btn active' : 'tag-btn';
    allTagsBtn.textContent = 'Wszystkie tagi';
    allTagsBtn.id = 'filter-tag-all';
    allTagsBtn.addEventListener('click', () => {
      document.querySelectorAll('.tag-cloud .tag-btn').forEach(b => b.classList.remove('active'));
      allTagsBtn.classList.add('active');
      activeTag = 'all';
      renderProjects();
    });
    tagsContainer.appendChild(allTagsBtn);

    allTechs.forEach(tech => {
      const btn = document.createElement('button');
      btn.className = activeTag === tech ? 'tag-btn active' : 'tag-btn';
      btn.textContent = tech;
      btn.id = `filter-tag-${tech.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tag-cloud .tag-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeTag = tech;
        renderProjects();
      });

      tagsContainer.appendChild(btn);
    });
  }

  // Render Projects Grid
  function renderProjects() {
    // Filter projects based on active states
    const filteredProjects = projects.filter(p => {
      const matchCategory = activeCategory === 'all' || p.category_id == activeCategory;
      const matchTag = activeTag === 'all' || (Array.isArray(p.tech_stack) && p.tech_stack.includes(activeTag));
      return matchCategory && matchTag;
    });

    gridRoot.innerHTML = '';

    if (filteredProjects.length === 0) {
      gridRoot.innerHTML = `
        <div class="empty-state">
          <h3>Brak projektów</h3>
          <p>Brak opublikowanych projektów pasujących do wybranych kryteriów.</p>
        </div>
      `;
      return;
    }

    filteredProjects.forEach(proj => {
      const card = document.createElement('article');
      card.className = 'project-card';
      card.id = `project-card-${proj.id}`;

      // Find category name
      const categoryObj = categories.find(c => c.id == proj.category_id);
      const categoryName = categoryObj ? categoryObj.name : 'Inne';

      // Build tech badges
      let techBadgesHtml = '';
      if (Array.isArray(proj.tech_stack)) {
        proj.tech_stack.forEach(tech => {
          techBadgesHtml += `<span class="tech-badge">${tech}</span>`;
        });
      }

      // Format clean mailto subject to drive conversion for this specific project
      const escapedTitle = encodeURIComponent(proj.title);
      const mailtoUrl = `mailto:t.mozdzynski@gmail.com?subject=Konsultacja%20projektu:%20${escapedTitle}&body=Dzień%20dobry,%20chciałbym%20skonsultować%20wdrożenie%20projektu%20podobnego%20do%20"${escapedTitle}"...`;

      card.innerHTML = `
        <div class="card-image-wrapper">
          <img src="${proj.thumbnail_url || 'images/placeholder.svg'}" alt="Screenshot - ${proj.title}" onerror="this.onerror=null; this.src='/uploads/screenshots/project_${proj.id}.svg';">
          <span class="card-badge">${categoryName}</span>
        </div>
        <div class="card-content">
          <h3>${proj.title}</h3>
          <p>${proj.description_generated || 'Brak opisu projektu.'}</p>
          <div class="card-tech-stack">
            ${techBadgesHtml}
          </div>
          
          <!-- Conversion contact CTA inside the card footer -->
          <div class="card-footer">
            <a href="${mailtoUrl}" class="btn-secondary" title="Konsultuj ten projekt" id="cta-card-email-${proj.id}">
              <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:inline-block; vertical-align:middle; margin-right:4px;">
                <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a1.5 1.5 0 0 1-1.644 0L1.5 8.67ZM22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z"/>
              </svg>
              Konsultuj
            </a>
            <a href="${proj.url}" target="_blank" rel="noopener noreferrer" class="btn-visit" id="btn-visit-${proj.id}">
              Zobacz Projekt
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display:inline-block; vertical-align:middle; margin-left:4px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"/>
              </svg>
            </a>
          </div>
        </div>
      `;

      gridRoot.appendChild(card);
    });
  }

  loadData();
});
