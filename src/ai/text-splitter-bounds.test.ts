import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RecursiveCharacterTextSplitter } from './text-splitter';

describe('text splitter chunk boundaries', () => {
  it('includes spaces in the chunk size', () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 10,
      chunkOverlap: 0,
    });

    assert.deepEqual(splitter.splitText('aa aa aa aa'), ['aa aa aa', 'aa']);
  });

  it('includes multi-character separators in the chunk size', () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 7,
      chunkOverlap: 0,
    });

    assert.deepEqual(splitter.splitText('aa\n\nbb\n\ncc'), ['aa\n\nbb', 'cc']);
  });

  it('keeps a chunk that exactly fits the size limit', () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 8,
      chunkOverlap: 0,
    });

    assert.deepEqual(splitter.splitText('aa bb cc'), ['aa bb cc']);
  });

  it('counts separators while retaining overlapping text', () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 10,
      chunkOverlap: 3,
    });

    assert.deepEqual(splitter.splitText('aa bb cc dd ee'), [
      'aa bb cc',
      'cc dd ee',
    ]);
  });

  it('removes more overlap when the next split would exceed the limit', () => {
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 10,
      chunkOverlap: 6,
    });

    assert.deepEqual(splitter.splitText('aa bb cc ddddd'), [
      'aa bb cc',
      'cc ddddd',
    ]);
  });
});
