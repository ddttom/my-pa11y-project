import { getImageFormat } from './formatUtils.js';

/**
 * Analyze image for optimization
 */
export function analyzeImage(image) {
  const analysis = {
    altScore: 0,
    compressionLevel: 'Unknown',
    optimizationScore: 100,
    recommendations: [],
    format: getImageFormat(image.src),
  };

  if (!image.alt) {
    analysis.altScore = 0;
    analysis.recommendations.push('Add alt text');
    analysis.optimizationScore -= 30;
  } else {
    analysis.altScore = Math.min(100, image.alt.length * 5);
    if (analysis.altScore < 50) {
      analysis.recommendations.push('Improve alt text description');
    }
  }

  if (image.size > 200000) {
    analysis.compressionLevel = 'Low';
    analysis.recommendations.push('Compress image');
    analysis.optimizationScore -= 20;
  } else if (image.size > 100000) {
    analysis.compressionLevel = 'Medium';
    analysis.recommendations.push('Consider further compression');
    analysis.optimizationScore -= 10;
  } else {
    analysis.compressionLevel = 'High';
  }

  if (!image.width || !image.height) {
    analysis.recommendations.push('Add width and height attributes');
    analysis.optimizationScore -= 15;
  }

  if (!image.srcset && (image.width > 800 || image.height > 800)) {
    analysis.recommendations.push('Implement responsive images with srcset');
    analysis.optimizationScore -= 15;
  }

  if (!image.loading) {
    analysis.recommendations.push('Add lazy loading');
    analysis.optimizationScore -= 10;
  }

  return analysis;
}
