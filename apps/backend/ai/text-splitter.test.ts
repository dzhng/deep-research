import assert from 'node:assert';
import { describe, it, beforeEach } from 'node:test';
import { RecursiveCharacterTextSplitter } from './text-splitter';

describe('RecursiveCharacterTextSplitter', () => {
  let splitter: RecursiveCharacterTextSplitter;

  beforeEach(() => {
    splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 50,
      chunkOverlap: 10,
    });
  });

  it('Should correctly split text by separators', () => {
    const text = 'Hello world, this is a test of the recursive text splitter.';

    // Test with initial chunkSize
    assert.deepEqual(
      splitter.splitText(text),
      ['Hello world', 'this is a test of the recursive text splitter']
    );

    // Test with updated chunkSize
    splitter.chunkSize = 100;
    assert.deepEqual(
      splitter.splitText(
        'Hello world, this is a test of the recursive text splitter. If I have a period, it should split along the period.'
      ),
      [
        'Hello world, this is a test of the recursive text splitter',
        'If I have a period, it should split along the period.',
      ]
    );

    // Test with another updated chunkSize
    splitter.chunkSize = 110;
    assert.deepEqual(
      splitter.splitText(
        'Hello world, this is a test of the recursive text splitter. If I have a period, it should split along the period.\nOr, if there is a new line, it should prioritize splitting on new lines instead.'
      ),
      [
        'Hello world, this is a test of the recursive text splitter',
        'If I have a period, it should split along the period.',
        'Or, if there is a new line, it should prioritize splitting on new lines instead.',
      ]
    );
  });

  it('Should handle empty string', () => {
    assert.deepEqual(splitter.splitText(''), []);
  });

  it('Should handle special characters and large texts', () => {
    const largeText = 'A'.repeat(1000);
    splitter.chunkSize = 200;
    assert.deepEqual(
      splitter.splitText(largeText),
      Array(5).fill('A'.repeat(200))
    );

    const specialCharText = 'Hello!@# world$%^ &*( this) is+ a-test';
    assert.deepEqual(
      splitter.splitText(specialCharText),
      ['Hello!@#', 'world$%^', '&*( this)', 'is+', 'a-test']
    );
  });

  it('Should handle chunkSize equal to chunkOverlap', () => {
    splitter.chunkSize = 50;
    splitter.chunkOverlap = 50;
    assert.throws(
      () => splitter.splitText('Invalid configuration'),
      new Error('Cannot have chunkOverlap >= chunkSize')
    );
  });
});
