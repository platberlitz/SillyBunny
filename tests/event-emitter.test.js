import { describe, expect, test } from '@jest/globals';
import { EventEmitter } from '../public/lib/eventemitter.js';

/* global globalThis */

describe('EventEmitter', () => {
    beforeEach(() => {
        globalThis.localStorage = {
            getItem: () => null,
        };
    });

    afterEach(() => {
        delete globalThis.localStorage;
    });

    test('runs emitAndWait listeners before subsequent cleanup', () => {
        const emitter = new EventEmitter();
        const calls = [];

        emitter.on('stop', () => {
            calls.push('first');
        });
        emitter.on('stop', () => {
            calls.push('second');
        });

        emitter.emitAndWait('stop');
        calls.push('after');

        expect(calls).toEqual(['first', 'second', 'after']);
    });
});
