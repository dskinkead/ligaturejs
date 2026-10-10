export function createTaskRepository() {
  const tasks = [{ id: '1', title: 'Review the component manifest', done: false }]
  return {
    all() { return tasks.map(task => ({ ...task })) },
    add(title) { const task = { id: String(Date.now()), title, done: false }; tasks.push(task); return { ...task } },
    setDone(id, done) { const task = tasks.find(item => item.id === id); if (!task) return null; task.done = done; return { ...task } }
  }
}
