import test from 'node:test'
import assert from 'node:assert/strict'
import { clientRuntime } from '../src/index.js'

test('client runtime exposes component-level update', () => assert.match(clientRuntime(), /update\(element,props=\{\}\)/))
