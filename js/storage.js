/** บันทึก/โหลดโปรเจกต์ - localStorage autosave + JSON export/import */
const STORAGE_KEY = 'hma_mixdesign_projects_v1';
const AUTOSAVE_KEY = 'hma_mixdesign_autosave_v1';

function listSavedProjects() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveProjectToLibrary(name, projectState) {
  const all = listSavedProjects();
  all[name] = { ...projectState, _savedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function loadProjectFromLibrary(name) {
  const all = listSavedProjects();
  return all[name] || null;
}

function deleteProjectFromLibrary(name) {
  const all = listSavedProjects();
  delete all[name];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

function autosave(projectState) {
  localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(projectState));
}

function loadAutosave() {
  const raw = localStorage.getItem(AUTOSAVE_KEY);
  return raw ? JSON.parse(raw) : null;
}

function exportProjectAsFile(projectState, filename) {
  const blob = new Blob([JSON.stringify(projectState, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `mixdesign-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importProjectFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
