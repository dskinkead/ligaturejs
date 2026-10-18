import { defineComponent, escapeHtml } from '../../src/index.js'

export default defineComponent({
  name: 'project-list',
  version: '1.0.0',
  props: { projects: { required: true, type: 'object' } },
  render({ projects }) { return `<section aria-labelledby="project-heading"><h2 id="project-heading">Projects</h2><form action="/" method="post" data-project-form><label>Name <input name="name" required maxlength="120"></label><label>Description <input name="description" maxlength="500"></label><button>Create project</button></form><ul>${projects.map(project => `<li><a href="/projects/${project.id}">${escapeHtml(project.name)}</a><span> — ${escapeHtml(project.description)}</span></li>`).join('') || '<li>No projects yet.</li>'}</ul></section>` },
  client: `{mount(element){element.addEventListener('submit',async event=>{if(!event.target.matches('[data-project-form]'))return;event.preventDefault();const data=Object.fromEntries(new FormData(event.target));const response=await fetch('/api/projects',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});if(response.ok){event.target.reset();window.location.href='/'}})}}`,
})
