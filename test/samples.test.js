/**
 * Tests for sample management
 * Note: These tests focus on the SampleManager API and validation
 * Actual audio loading is tested in browser integration tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SampleManager } from '../src/samples/index.js';

describe('SampleManager', () => {
  let manager;

  beforeEach(() => {
    manager = new SampleManager();
  });

  describe('initialization', () => {
    test('starts with empty sample registry', () => {
      expect(manager.count()).toBe(0);
      expect(manager.list()).toEqual([]);
    });

    test('requires init before loading', async () => {
      await expect(manager.load('test', 'test.wav')).rejects.toThrow('not initialized');
    });

    test('init requires AudioContext', () => {
      expect(() => manager.init(null)).toThrow('AudioContext is required');
    });
  });

  describe('get and has methods', () => {
    beforeEach(() => {
      // Mock samples in registry (bypass actual loading)
      manager.samples = {
        'bd': { duration: 1.0 },
        'bd:0': { duration: 0.5 },
        'bd:1': { duration: 0.6 },
        'bd:2': { duration: 0.7 },
        'sn': { duration: 0.3 }
      };
    });

    test('get returns exact match', () => {
      expect(manager.get('bd')).toEqual({ duration: 1.0 });
      expect(manager.get('sn')).toEqual({ duration: 0.3 });
    });

    test('get with variant number uses name:n format', () => {
      expect(manager.get('bd', 0)).toEqual({ duration: 0.5 });
      expect(manager.get('bd', 1)).toEqual({ duration: 0.6 });
      expect(manager.get('bd', 2)).toEqual({ duration: 0.7 });
    });

    test('get falls back to name:0 if no exact match', () => {
      delete manager.samples['bd'];
      expect(manager.get('bd')).toEqual({ duration: 0.5 });
    });

    test('get returns null if not found', () => {
      expect(manager.get('missing')).toBeNull();
      expect(manager.get('bd', 99)).toBeNull();
    });

    test('has returns true for existing samples', () => {
      expect(manager.has('bd')).toBe(true);
      expect(manager.has('bd', 0)).toBe(true);
      expect(manager.has('bd', 1)).toBe(true);
      expect(manager.has('sn')).toBe(true);
    });

    test('has returns false for missing samples', () => {
      expect(manager.has('missing')).toBe(false);
      expect(manager.has('bd', 99)).toBe(false);
    });
  });

  describe('list and count', () => {
    beforeEach(() => {
      manager.samples = {
        'bd:0': {},
        'bd:1': {},
        'sn': {}
      };
    });

    test('list returns all sample names', () => {
      const names = manager.list();
      expect(names).toContain('bd:0');
      expect(names).toContain('bd:1');
      expect(names).toContain('sn');
      expect(names.length).toBe(3);
    });

    test('count returns number of samples', () => {
      expect(manager.count()).toBe(3);
    });
  });

  describe('remove and clear', () => {
    beforeEach(() => {
      manager.samples = {
        'bd': {},
        'sn': {},
        'hh': {}
      };
    });

    test('remove deletes a sample', () => {
      expect(manager.remove('bd')).toBe(true);
      expect(manager.has('bd')).toBe(false);
      expect(manager.count()).toBe(2);
    });

    test('remove returns false if sample not found', () => {
      expect(manager.remove('missing')).toBe(false);
      expect(manager.count()).toBe(3);
    });

    test('clear removes all samples', () => {
      manager.clear();
      expect(manager.count()).toBe(0);
      expect(manager.list()).toEqual([]);
    });
  });

  describe('getByPrefix', () => {
    beforeEach(() => {
      manager.samples = {
        'bd:0': { duration: 0.5 },
        'bd:1': { duration: 0.6 },
        'bd:2': { duration: 0.7 },
        'sn:0': { duration: 0.3 },
        'sn:1': { duration: 0.4 }
      };
    });

    test('returns all samples with prefix', () => {
      const bdSamples = manager.getByPrefix('bd');
      expect(Object.keys(bdSamples)).toEqual(['bd:0', 'bd:1', 'bd:2']);
    });

    test('returns empty object if no matches', () => {
      const result = manager.getByPrefix('missing');
      expect(result).toEqual({});
    });
  });

  describe('getVariantCount', () => {
    beforeEach(() => {
      manager.samples = {
        'bd:0': {},
        'bd:1': {},
        'bd:2': {},
        'sn:0': {},
        'sn:1': {}
      };
    });

    test('returns correct variant count', () => {
      expect(manager.getVariantCount('bd')).toBe(3);
      expect(manager.getVariantCount('sn')).toBe(2);
    });

    test('returns 0 for non-existent samples', () => {
      expect(manager.getVariantCount('missing')).toBe(0);
    });
  });
});

describe('Sample loader validation', () => {
  test('validates AudioContext requirement', async () => {
    const { loadSample } = await import('../src/samples/loader.js');
    await expect(loadSample(null, 'test.wav')).rejects.toThrow('AudioContext is required');
  });

  test('validates URL requirement', async () => {
    const { loadSample } = await import('../src/samples/loader.js');
    const mockContext = {};
    await expect(loadSample(mockContext, null)).rejects.toThrow('Valid URL string is required');
    await expect(loadSample(mockContext, '')).rejects.toThrow('Valid URL string is required');
  });

  test('validates samples object for loadSamples', async () => {
    const { loadSamples } = await import('../src/samples/loader.js');
    const mockContext = {};
    await expect(loadSamples(mockContext, null)).rejects.toThrow('Samples object is required');
  });

  test('validates manifest URL for loadSampleBank', async () => {
    const { loadSampleBank } = await import('../src/samples/loader.js');
    const mockContext = {};
    await expect(loadSampleBank(mockContext, null)).rejects.toThrow('Valid manifest URL is required');
    await expect(loadSampleBank(mockContext, '')).rejects.toThrow('Valid manifest URL is required');
  });
});
