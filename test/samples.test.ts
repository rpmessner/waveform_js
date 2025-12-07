/**
 * Tests for sample management
 * Note: These tests focus on the SampleManager API and validation
 * Actual audio loading is tested in browser integration tests
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { createSampleManager } from '../src/samples/index';
import type { SampleManager } from '../src/types';

describe('SampleManager', () => {
  let manager: SampleManager;

  beforeEach(() => {
    manager = createSampleManager();
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
      expect(() => manager.init(null as unknown as AudioContext)).toThrow('AudioContext is required');
    });
  });

  describe('get and has methods (empty manager)', () => {
    test('get returns null if not found', () => {
      expect(manager.get('missing')).toBeNull();
      expect(manager.get('bd', 99)).toBeNull();
    });

    test('has returns false for missing samples', () => {
      expect(manager.has('missing')).toBe(false);
      expect(manager.has('bd', 99)).toBe(false);
    });
  });

  describe('list and count', () => {
    test('list returns empty array when no samples', () => {
      expect(manager.list()).toEqual([]);
    });

    test('count returns 0 when no samples', () => {
      expect(manager.count()).toBe(0);
    });
  });

  describe('remove and clear', () => {
    test('remove returns false if sample not found', () => {
      expect(manager.remove('missing')).toBe(false);
    });

    test('clear on empty manager is safe', () => {
      manager.clear();
      expect(manager.count()).toBe(0);
      expect(manager.list()).toEqual([]);
    });
  });

  describe('getByPrefix', () => {
    test('returns empty object if no matches', () => {
      const result = manager.getByPrefix('missing');
      expect(result).toEqual({});
    });
  });

  describe('getVariantCount', () => {
    test('returns 0 for non-existent samples', () => {
      expect(manager.getVariantCount('missing')).toBe(0);
    });
  });
});

describe('Sample loader validation', () => {
  test('validates AudioContext requirement', async () => {
    const { loadSample } = await import('../src/samples/loader');
    await expect(loadSample(null as unknown as AudioContext, 'test.wav')).rejects.toThrow('AudioContext is required');
  });

  test('validates URL requirement', async () => {
    const { loadSample } = await import('../src/samples/loader');
    const mockContext = {} as AudioContext;
    await expect(loadSample(mockContext, null as unknown as string)).rejects.toThrow('Valid URL string is required');
    await expect(loadSample(mockContext, '')).rejects.toThrow('Valid URL string is required');
  });

  test('validates samples object for loadSamples', async () => {
    const { loadSamples } = await import('../src/samples/loader');
    const mockContext = {} as AudioContext;
    await expect(loadSamples(mockContext, null as unknown as Record<string, string>)).rejects.toThrow('Samples object is required');
  });

  test('validates manifest URL for loadSampleBank', async () => {
    const { loadSampleBank } = await import('../src/samples/loader');
    const mockContext = {} as AudioContext;
    await expect(loadSampleBank(mockContext, null as unknown as string)).rejects.toThrow('Valid manifest URL is required');
    await expect(loadSampleBank(mockContext, '')).rejects.toThrow('Valid manifest URL is required');
  });
});
