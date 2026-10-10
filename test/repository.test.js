import test from 'node:test'
import assert from 'node:assert/strict'
import { createTaskRepository } from '../example/repository.js'

test('task repository supports CRUD operations', () => {
  const repository = createTaskRepository()
  const added = repository.add('Ship prototype')
  assert.equal(repository.setDone(added.id, true).done, true)
  assert.equal(repository.all().find(task => task.id === added.id).title, 'Ship prototype')
  assert.equal(repository.setDone('missing', true), null)
})
