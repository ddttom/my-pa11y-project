/**
 * LLM Suitability Report Generators
 *
 * Generates reports evaluating website suitability for AI agent interaction
 * based on patterns from "The Invisible Users" book
 *
 * CRITICAL: AI agents operate in two modes:
 * 1. SERVED HTML - Static HTML (CLI agents, server agents) - works for ALL agents
 * 2. RENDERED HTML - After JavaScript (browser agents) - works for browser agents only
 *
 * Reports show both states to provide complete picture of AI compatibility
 */

import path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import {
  calculateServedScore,
  calculateRenderedScore,
  generateFeedback
} from '../llmMetrics.js';

/**
 * Generate General LLM Suitability Report
 * Shows both served and rendered scores with essential vs nice-to-have issues
 */
export async function generateGeneralLLMReport(results, outputDir) {
  try {
    global.auditcore.logger.info('Generating general LLM suitability report');

    if (!results.llmMetrics || results.llmMetrics.length === 0) {
      global.auditcore.logger.warn('No LLM metrics found, skipping general LLM report');
      return;
    }

    const csvWriter = createObjectCsvWriter({
      path: path.join(outputDir, 'llm_general_suitability.csv'),
      header: [
        { id: 'url', title: 'URL' },
        { id: 'htmlSource', title: 'HTML Source' },
        { id: 'servedScore', title: 'Served HTML Score (All Agents)' },
        { id: 'renderedScore', title: 'Rendered HTML Score (Browser Agents)' },
        { id: 'hasMain', title: 'Has <main>' },
        { id: 'hasNav', title: 'Has <nav>' },
        { id: 'standardFormFields', title: 'Standard Form Fields %' },
        { id: 'hasSchemaOrg', title: 'Has Schema.org' },
        { id: 'essentialIssuesCount', title: 'Essential Issues' },
        { id: 'niceToHaveIssuesCount', title: 'Nice-to-Have Issues' },
        { id: 'topEssentialIssue', title: 'Top Essential Issue' },
        { id: 'topRecommendation', title: 'Top Recommendation' },
      ],
    });

    const records = results.llmMetrics.map((metrics) => {
      const servedScore = calculateServedScore(metrics);
      const renderedScore = calculateRenderedScore(metrics);
      const feedback = generateFeedback(metrics);

      const standardFieldRatio = metrics.formFields?.metrics?.standardNameRatio || 0;

      return {
        url: metrics.url,
        htmlSource: metrics.htmlSource || 'rendered',
        servedScore,
        renderedScore,
        hasMain: metrics.semanticHTML?.metrics?.hasMain ? 'Yes' : 'No',
        hasNav: metrics.semanticHTML?.metrics?.hasNav ? 'Yes' : 'No',
        standardFormFields: Math.round(standardFieldRatio * 100),
        hasSchemaOrg: metrics.structuredData?.metrics?.hasSchemaOrg ? 'Yes' : 'No',
        essentialIssuesCount: feedback.essentialIssues.length,
        niceToHaveIssuesCount: feedback.niceToHaveIssues.length,
        topEssentialIssue: feedback.essentialIssues[0] || 'None',
        topRecommendation: feedback.recommendations[0] || 'Good practices followed',
      };
    });

    await csvWriter.writeRecords(records);
    global.auditcore.logger.info(`General LLM suitability report generated: ${records.length} pages analyzed`);

    // Generate summary statistics
    const avgServedScore = records.reduce((sum, r) => sum + r.servedScore, 0) / records.length;
    const avgRenderedScore = records.reduce((sum, r) => sum + r.renderedScore, 0) / records.length;
    const totalEssentialIssues = records.reduce((sum, r) => sum + r.essentialIssuesCount, 0);

    global.auditcore.logger.info(
      `LLM Summary: Avg served: ${Math.round(avgServedScore)}, ` +
      `Avg rendered: ${Math.round(avgRenderedScore)}, ` +
      `Total essential issues: ${totalEssentialIssues}`
    );

  } catch (error) {
    global.auditcore.logger.error('Error generating general LLM report:', error);
    throw error;
  }
}

/**
 * Generate Frontend LLM Suitability Report
 * Separates served (form patterns) from rendered (dynamic features)
 */
export async function generateFrontendLLMReport(results, outputDir) {
  try {
    global.auditcore.logger.info('Generating frontend LLM suitability report');

    if (!results.llmMetrics || results.llmMetrics.length === 0) {
      global.auditcore.logger.warn('No LLM metrics found, skipping frontend LLM report');
      return;
    }

    const csvWriter = createObjectCsvWriter({
      path: path.join(outputDir, 'llm_frontend_suitability.csv'),
      header: [
        { id: 'url', title: 'URL' },
        { id: 'htmlSource', title: 'HTML Source' },
        // SERVED HTML (works for all agents)
        { id: 'servedScore', title: 'Served Score (All Agents)' },
        { id: 'formCount', title: 'Form Count' },
        { id: 'standardFieldsPercent', title: 'Standard Fields %' },
        { id: 'fieldsWithLabelsPercent', title: 'Fields With Labels %' },
        { id: 'semanticElements', title: 'Semantic Elements Count' },
        // RENDERED HTML (browser agents only)
        { id: 'renderedScore', title: 'Rendered Score (Browser Agents)' },
        { id: 'explicitStateElements', title: 'Explicit State Elements' },
        { id: 'persistentErrors', title: 'Persistent Errors' },
        { id: 'validationStateElements', title: 'Validation State Elements' },
        // ISSUES
        { id: 'criticalIssues', title: 'Essential Issues' },
        { id: 'recommendations', title: 'Key Recommendations' },
      ],
    });

    const records = results.llmMetrics.map((metrics) => {
      const servedScore = calculateServedScore(metrics);
      const renderedScore = calculateRenderedScore(metrics);
      const feedback = generateFeedback(metrics);

      const formMetrics = metrics.formFields?.metrics || {};
      const standardFieldsPercent = formMetrics.totalInputs > 0
        ? Math.round((formMetrics.standardNamedFields / formMetrics.totalInputs) * 100)
        : 100; // No forms = 100%

      const fieldsWithLabelsPercent = formMetrics.totalInputs > 0
        ? Math.round((formMetrics.fieldsWithLabels / formMetrics.totalInputs) * 100)
        : 100;

      const semanticCount = [
        metrics.semanticHTML?.metrics?.hasMain,
        metrics.semanticHTML?.metrics?.hasNav,
        metrics.semanticHTML?.metrics?.hasHeader,
        metrics.semanticHTML?.metrics?.hasFooter,
        metrics.semanticHTML?.metrics?.hasArticle,
        metrics.semanticHTML?.metrics?.hasSection
      ].filter(Boolean).length;

      return {
        url: metrics.url,
        htmlSource: metrics.htmlSource || 'rendered',
        // Served metrics
        servedScore,
        formCount: formMetrics.formCount || 0,
        standardFieldsPercent,
        fieldsWithLabelsPercent,
        semanticElements: semanticCount,
        // Rendered metrics
        renderedScore,
        explicitStateElements: metrics.dataAttributes?.metrics?.totalDataAttributes || 0,
        persistentErrors: metrics.errorHandling?.metrics?.hasPersistentErrors ? 'Yes' : 'No',
        validationStateElements: metrics.dataAttributes?.metrics?.hasValidationState ? 'Yes' : 'No',
        // Issues
        criticalIssues: feedback.essentialIssues.length,
        recommendations: feedback.recommendations.slice(0, 2).join('; ') || 'None',
      };
    });

    await csvWriter.writeRecords(records);
    global.auditcore.logger.info(`Frontend LLM suitability report generated: ${records.length} pages analyzed`);

  } catch (error) {
    global.auditcore.logger.error('Error generating frontend LLM report:', error);
    throw error;
  }
}

/**
 * Generate Backend LLM Suitability Report
 * Focuses on served HTML only (HTTP codes, headers, structured data)
 */
export async function generateBackendLLMReport(results, outputDir) {
  try {
    global.auditcore.logger.info('Generating backend LLM suitability report');

    if (!results.llmMetrics || results.llmMetrics.length === 0) {
      global.auditcore.logger.warn('No LLM metrics found, skipping backend LLM report');
      return;
    }

    const csvWriter = createObjectCsvWriter({
      path: path.join(outputDir, 'llm_backend_suitability.csv'),
      header: [
        { id: 'url', title: 'URL' },
        { id: 'backendScore', title: 'Backend Score (0-100)' },
        { id: 'statusCode', title: 'HTTP Status Code' },
        { id: 'statusCodeCorrect', title: 'Status Code Appropriate' },
        { id: 'hasHTTPS', title: 'HTTPS' },
        { id: 'hasHSTS', title: 'HSTS Header' },
        { id: 'hasCSP', title: 'CSP Header' },
        { id: 'hasXFrameOptions', title: 'X-Frame-Options' },
        { id: 'hasSchemaOrg', title: 'Schema.org Structured Data' },
        { id: 'jsonLdCount', title: 'JSON-LD Scripts' },
        { id: 'essentialIssues', title: 'Essential Issues' },
        { id: 'recommendations', title: 'Key Recommendations' },
      ],
    });

    const records = results.llmMetrics.map((metrics) => {
      // Get status code and security metrics
      const statusCode = results.responseCodeMetrics?.[metrics.url]?.code ||
                        results.contentAnalysis?.find(c => c.url === metrics.url)?.statusCode ||
                        200;

      const securityMetrics = results.securityMetrics?.[metrics.url] || {};

      // Calculate backend score (served HTML only)
      let backendScore = 0;

      // HTTP status code (30 points)
      if (statusCode === 200 || statusCode === 201) backendScore += 30;
      else if (statusCode >= 400 && statusCode < 500) backendScore += 15;
      else if (statusCode >= 300 && statusCode < 400) backendScore += 20;

      // Security headers (40 points)
      if (securityMetrics.hasHsts) backendScore += 15;
      if (securityMetrics.hasCSP) backendScore += 15;
      if (securityMetrics.hasXFrameOptions) backendScore += 5;
      if (securityMetrics.hasXContentTypeOptions) backendScore += 5;

      // Structured data (30 points) - ESSENTIAL for agents
      if (metrics.structuredData?.metrics?.hasSchemaOrg) backendScore += 30;

      const essentialIssues = [];
      const recommendations = [];

      // Essential issues
      if (!securityMetrics.hasHsts && securityMetrics.https) {
        recommendations.push('Add Strict-Transport-Security header');
      }
      if (!metrics.structuredData?.metrics?.hasSchemaOrg) {
        essentialIssues.push('No Schema.org structured data');
        recommendations.push('Add JSON-LD with Schema.org vocabulary');
      }
      if (statusCode >= 400) {
        essentialIssues.push(`HTTP ${statusCode} error`);
      }

      return {
        url: metrics.url,
        backendScore: Math.round(backendScore),
        statusCode,
        statusCodeCorrect: (statusCode >= 200 && statusCode < 300) ? 'Yes' : 'No',
        hasHTTPS: securityMetrics.https ? 'Yes' : 'No',
        hasHSTS: securityMetrics.hasHsts ? 'Yes' : 'No',
        hasCSP: securityMetrics.hasCSP ? 'Yes' : 'No',
        hasXFrameOptions: securityMetrics.hasXFrameOptions ? 'Yes' : 'No',
        hasSchemaOrg: metrics.structuredData?.metrics?.hasSchemaOrg ? 'Yes' : 'No',
        jsonLdCount: metrics.structuredData?.metrics?.jsonLdCount || 0,
        essentialIssues: essentialIssues.join('; ') || 'None',
        recommendations: recommendations.join('; ') || 'Good practices followed',
      };
    });

    await csvWriter.writeRecords(records);
    global.auditcore.logger.info(`Backend LLM suitability report generated: ${records.length} pages analyzed`);

    // Log summary
    const avgScore = records.reduce((sum, r) => sum + r.backendScore, 0) / records.length;
    const pagesWithSchemaOrg = records.filter(r => r.hasSchemaOrg === 'Yes').length;
    const pagesWithHTTPS = records.filter(r => r.hasHTTPS === 'Yes').length;

    global.auditcore.logger.info(
      `Backend Summary: Avg score: ${Math.round(avgScore)}, ` +
      `Schema.org: ${pagesWithSchemaOrg}/${records.length}, ` +
      `HTTPS: ${pagesWithHTTPS}/${records.length}`
    );

  } catch (error) {
    global.auditcore.logger.error('Error generating backend LLM report:', error);
    throw error;
  }
}
