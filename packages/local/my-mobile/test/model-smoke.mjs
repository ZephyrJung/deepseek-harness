/**
 * Regression tests for the model call wrapper.
 *
 * Background: the planner model is a thinking model, and its reasoning counts
 * against `num_predict`. With a small budget the reasoning can eat the whole
 * allowance and Ollama answers with `done_reason: "length"` plus an EMPTY
 * `content`. That silent truncation aborted the panel's vision loop mid-task,
 * which the user experienced as "it found the app and then stopped".
 *
 * These tests pin the three paths that keep a run alive:
 *   1. plain answer            -> parsed, mode "direct"
 *   2. empty answer, JSON only in the reasoning block -> salvaged
 *   3. empty answer twice      -> thrown error that names the truncation
 */
import assert from 'node:assert/strict'
import { __planner } from '../index.js'

const { chatJson } = __planner
const llm = { baseUrl: 'http://ollama.test', model: 'qwen3.8:27b-mlx', timeoutMs: 5000, think: false }

/** Replace global fetch with a scripted sequence of Ollama replies. */
function stubFetch(replies) {
  const calls = []
  globalThis.fetch = async (_url, init) => {
    const body = JSON.parse(init.body)
    calls.push(body)
    const reply = replies[Math.min(calls.length - 1, replies.length - 1)]
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        message: { content: reply.content, thinking: reply.thinking },
        done_reason: reply.doneReason,
        eval_count: reply.evalCount,
      }),
    }
  }
  return calls
}

/* 1 · direct answer, reasoning off */
let calls = stubFetch([{ content: '{"kind":"tap","fx":0.5,"fy":0.9,"say":"点搜索框"}', thinking: '', doneReason: 'stop', evalCount: 40 }])
let out = await chatJson(llm, { system: 's', user: 'u', images: ['AAAA'], numPredict: 1200 })
assert.equal(out.parsed.kind, 'tap', 'direct answer should parse')
assert.equal(out.mode, 'direct')
assert.equal(calls.length, 1, 'a good answer must not be retried')
assert.equal(calls[0].think, false, 'reasoning is off by default')
assert.equal(calls[0].options.num_predict, 1200, 'num_predict is the caller budget')

/* 2 · truncated answer, JSON salvageable from the reasoning block */
calls = stubFetch([
  { content: '', thinking: '先看屏幕…… {"kind":"swipe","x1":0.5,"y1":0.8,"x2":0.5,"y2":0.3,"say":"上滑"}', doneReason: 'length', evalCount: 400 },
])
out = await chatJson(llm, { system: 's', user: 'u', images: ['AAAA'], numPredict: 400 })
assert.equal(out.mode, 'salvaged', 'JSON inside reasoning should be salvaged')
assert.equal(out.parsed.kind, 'swipe')

/* 3 · truncated twice, with a retry that turns reasoning on */
calls = stubFetch([
  { content: '', thinking: '只有推理，没有结论', doneReason: 'length', evalCount: 400 },
  { content: '', thinking: '还是只有推理', doneReason: 'length', evalCount: 900 },
])
await assert.rejects(
  () => chatJson(llm, { system: 's', user: 'u', numPredict: 600 }),
  (error) => {
    assert.match(error.message, /截断/, 'error should name the truncation')
    assert.match(error.message, /900/, 'error should include the token count it burned')
    return true
  },
  'two empty replies must fail with a diagnostic',
)
assert.equal(calls.length, 2, 'a truncated answer is retried exactly once')
assert.equal(calls[1].think, true, 'the retry enables reasoning')
assert.equal(calls[1].options.num_predict, 3000, 'the retry raises the budget to at least 3000')

/* 4 · explicit per-call reasoning override wins over the config */
calls = stubFetch([{ content: '{"done":true,"say":"已完成"}', thinking: '', doneReason: 'stop', evalCount: 12 }])
out = await chatJson(llm, { system: 's', user: 'u', numPredict: 800, think: true })
assert.equal(calls[0].think, true, 'per-call think override is honoured')
assert.equal(out.parsed.done, true)

console.log('PASS my-mobile model smoke (direct, salvage, retry, think override)')
