import { DatabaseSync } from 'node:sqlite'

export function createProjectRepository(databasePath = ':memory:') {
  const db = new DatabaseSync(databasePath)
  db.exec('PRAGMA foreign_keys = ON')
  db.exec('CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT "")')
  db.exec("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high')))")
  return {
    projects() { return db.prepare('SELECT id, name, description FROM projects ORDER BY id').all() },
    project(id) { return db.prepare('SELECT id, name, description FROM projects WHERE id = ?').get(Number(id)) || null },
    createProject(input) { const result = db.prepare('INSERT INTO projects (name, description) VALUES (?, ?)').run(input.name.trim(), input.description?.trim() || ''); return this.project(result.lastInsertRowid) },
    updateProject(id, input) { const result = db.prepare('UPDATE projects SET name = ?, description = ? WHERE id = ?').run(input.name.trim(), input.description?.trim() || '', Number(id)); return result.changes ? this.project(id) : null },
    removeProject(id) { return db.prepare('DELETE FROM projects WHERE id = ?').run(Number(id)).changes > 0 },
    tasks(projectId) { return db.prepare('SELECT id, project_id, title, done, priority FROM tasks WHERE project_id = ? ORDER BY id').all(Number(projectId)).map(task => ({ ...task, done: Boolean(task.done) })) },
    createTask(projectId, input) { const result = db.prepare('INSERT INTO tasks (project_id, title, priority) VALUES (?, ?, ?)').run(Number(projectId), input.title.trim(), input.priority); return db.prepare('SELECT id, project_id, title, done, priority FROM tasks WHERE id = ?').get(Number(result.lastInsertRowid)) },
    updateTask(id, input) { const result = db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(input.title.trim(), input.done ? 1 : 0, Number(id)); return result.changes ? db.prepare('SELECT id, project_id, title, done FROM tasks WHERE id = ?').get(Number(id)) : null },
    removeTask(id) { return db.prepare('DELETE FROM tasks WHERE id = ?').run(Number(id)).changes > 0 },
    close() { db.close() }
  }
}
