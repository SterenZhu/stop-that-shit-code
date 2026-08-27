'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { defaultContract, parseContractPrompt } = require('../src/contracts.cjs');

test('explicit review directive enables guard by default', () => {
  const result = parseContractPrompt('$stop-that-shit review -- inspect the diff', defaultContract());
  assert.equal(result.contract.mode, 'review');
  assert.equal(result.contract.level, 'guard');
  assert.equal(result.contract.hashPolicy, 'deny');
});

test('hash policy defaults to deny and accepts an explicit override', () => {
  assert.equal(defaultContract().hashPolicy, 'deny');
  const result = parseContractPrompt('$stop-that-shit change hash=allow -- add the required release checksum');
  assert.equal(result.contract.hashPolicy, 'allow');
});

test('hash ask policy requires a separate approval decision', () => {
  const result = parseContractPrompt('$stop-that-shit change hash=ask -- implement the feature');
  assert.equal(result.contract.hashPolicy, 'ask');
});

test('optional lock fields parse from the directive head', () => {
  const result = parseContractPrompt('$stop-that-shit lock change files=src/config.cjs|test/** deps=allow -- implement it');
  assert.deepEqual(result.contract.allowedPaths, ['src/config.cjs', 'test/**']);
  assert.equal(result.contract.dependencyPolicy, 'allow');
});

test('lock level and agent budget are parsed from the directive head', () => {
  const result = parseContractPrompt('$stop-that-shit lock change agents=2 -- implement it');
  assert.equal(result.contract.mode, 'change');
  assert.equal(result.contract.level, 'lock');
  assert.equal(result.contract.agentBudget, 2);
});

test('implicit invocation stays watch-only until mode is confirmed', () => {
  const result = parseContractPrompt('Please avoid overengineering this task.');
  assert.equal(result.contract.mode, 'unconfirmed');
  assert.equal(result.contract.level, 'watch');
  assert.equal(result.applicable, false);
});

test('non-code read-only language does not activate the plugin automatically', () => {
  const result = parseContractPrompt('只回答这个历史问题，不要修改文档。');
  assert.equal(result.contract.mode, 'unconfirmed');
  assert.equal(result.contract.source, 'default');
  assert.equal(result.applicable, false);
});

test('code review language can activate the plugin automatically', () => {
  const result = parseContractPrompt('只审查这个代码 diff，不要修改文件。');
  assert.equal(result.contract.mode, 'review');
  assert.equal(result.contract.level, 'guard');
  assert.equal(result.applicable, true);
});

test('a code-development prompt enables unconfirmed watch context', () => {
  const result = parseContractPrompt('Refactor src/config.js without adding dependencies.');
  assert.equal(result.contract.mode, 'unconfirmed');
  assert.equal(result.contract.source, 'auto-code');
  assert.equal(result.applicable, true);
});

test('explicit fix request updates a prior review contract', () => {
  const prior = { mode: 'review', level: 'guard', agentBudget: 0, agentsUsed: 0 };
  const result = parseContractPrompt('Fix the P1 finding now. Do not change the others.', prior);
  assert.equal(result.contract.mode, 'change');
});

test('negative review language wins over the word fix', () => {
  const prior = { mode: 'change', level: 'guard', agentBudget: 0, agentsUsed: 0 };
  const result = parseContractPrompt("Review only. Don't fix anything.", prior);
  assert.equal(result.contract.mode, 'review');
});

test('off remains off before a mode is confirmed', () => {
  const result = parseContractPrompt('$stop-that-shit off');
  assert.equal(result.contract.level, 'off');
});
