import { expect } from 'chai';
import {
  formatScore,
  countSyllables,
  getImageFormat,
  calculateLinkDepth,
} from '../src/utils/reportUtils/formatUtils.js';

describe('Format Utils', () => {
  describe('formatScore', () => {
    it('should format number to 2 decimal places', () => {
      expect(formatScore(95.1234)).to.equal('95.12');
      expect(formatScore(95)).to.equal('95.00');
    });

    it('should return 0.00 for non-numbers', () => {
      expect(formatScore('invalid')).to.equal('0.00');
      expect(formatScore(null)).to.equal('0.00');
    });
  });

  describe('countSyllables', () => {
    it('should count syllables correctly', () => {
      expect(countSyllables('hello')).to.equal(2);
      expect(countSyllables('world')).to.equal(1);
      expect(countSyllables('accessibility')).to.equal(6);
    });
  });

  describe('getImageFormat', () => {
    it('should detect valid image formats', () => {
      expect(getImageFormat('image.jpg')).to.equal('jpg');
      expect(getImageFormat('image.png')).to.equal('png');
      expect(getImageFormat('image.webp')).to.equal('webp');
    });

    it('should handle query parameters', () => {
      expect(getImageFormat('image.jpg?v=123')).to.equal('jpg');
    });

    it('should return "img unknown" for invalid formats', () => {
      expect(getImageFormat('image.txt')).to.equal('img unknown');
      expect(getImageFormat('')).to.equal('unknown');
    });
  });

  describe('calculateLinkDepth', () => {
    it('should calculate depth correctly', () => {
      expect(calculateLinkDepth('https://example.com/a/b/c')).to.equal(3);
      expect(calculateLinkDepth('https://example.com/')).to.equal(0);
    });

    it('should return 0 for invalid URLs', () => {
      expect(calculateLinkDepth('invalid-url')).to.equal(0);
    });
  });
});
