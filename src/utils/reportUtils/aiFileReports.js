/**
 * AI File Reports Generator (robots.txt and llms.txt)
 *
 * Generates comprehensive quality reports for robots.txt and llms.txt files
 * based on AI agent compatibility analysis.
 */

import { createObjectCsvWriter } from 'csv-writer';
import * as path from 'path';

/**
 * Generate robots.txt quality report
 * @param {Object} results - Analysis results containing robotsTxtAnalysis
 * @param {string} outputDir - Output directory path
 */
export async function generateRobotsTxtReport(results, outputDir) {
  if (!results.robotsTxtAnalysis || results.robotsTxtAnalysis.length === 0) {
    global.auditcore.logger.info('No robots.txt analysis data found, skipping robots.txt report');
    return;
  }

  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'robots_txt_quality.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'exists', title: 'File Exists' },
      { id: 'quality', title: 'Overall Quality' },
      { id: 'score', title: 'Quality Score' },
      { id: 'maxScore', title: 'Max Score' },
      { id: 'hasAIUserAgents', title: 'Has AI User Agents' },
      { id: 'aiUserAgentsFound', title: 'AI User Agents Found' },
      { id: 'hasSitemap', title: 'Has Sitemap' },
      { id: 'sitemapCount', title: 'Sitemap Count' },
      { id: 'hasSensitivePathProtection', title: 'Protects Sensitive Paths' },
      { id: 'protectedPaths', title: 'Protected Paths' },
      { id: 'hasLLMsTxtReference', title: 'References llms.txt' },
      { id: 'hasComments', title: 'Has Comments' },
      { id: 'totalRules', title: 'Total Rules' },
      { id: 'structureQuality', title: 'Structure Quality' },
      { id: 'issues', title: 'Issues' },
      { id: 'recommendations', title: 'Recommendations' },
    ],
  });

  const records = results.robotsTxtAnalysis.map((analysis) => ({
    url: analysis.url,
    exists: analysis.exists,
    quality: analysis.analysis.quality || 'Unknown',
    score: analysis.analysis.score || 0,
    maxScore: analysis.analysis.maxScore || 100,
    hasAIUserAgents: analysis.analysis.details.hasAIUserAgents || false,
    aiUserAgentsFound: (analysis.analysis.details.aiUserAgentsFound || []).join('; '),
    hasSitemap: analysis.analysis.details.hasSitemap || false,
    sitemapCount: analysis.analysis.details.sitemapCount || 0,
    hasSensitivePathProtection: analysis.analysis.details.hasSensitivePathProtection || false,
    protectedPaths: (analysis.analysis.details.protectedPaths || []).join('; '),
    hasLLMsTxtReference: analysis.analysis.details.hasLLMsTxtReference || false,
    hasComments: analysis.analysis.details.hasComments || false,
    totalRules: analysis.analysis.details.totalRules || 0,
    structureQuality: analysis.analysis.details.structureQuality || 'Unknown',
    issues: (analysis.analysis.issues || []).join('; '),
    recommendations: (analysis.analysis.recommendations || []).join('; '),
  }));

  await csvWriter.writeRecords(records);
  global.auditcore.logger.info(`Generated robots.txt quality report: robots_txt_quality.csv (${records.length} files)`);
}

/**
 * Generate llms.txt quality report
 * @param {Object} results - Analysis results containing llmsTxtAnalysis
 * @param {string} outputDir - Output directory path
 */
export async function generateLlmsTxtReport(results, outputDir) {
  if (!results.llmsTxtAnalysis || results.llmsTxtAnalysis.length === 0) {
    global.auditcore.logger.info('No llms.txt analysis data found, skipping llms.txt report');
    return;
  }

  const csvWriter = createObjectCsvWriter({
    path: path.join(outputDir, 'llms_txt_quality.csv'),
    header: [
      { id: 'url', title: 'URL' },
      { id: 'exists', title: 'File Exists' },
      { id: 'quality', title: 'Overall Quality' },
      { id: 'score', title: 'Quality Score' },
      { id: 'maxScore', title: 'Max Score' },
      { id: 'hasTitle', title: 'Has Title' },
      { id: 'title', title: 'Title' },
      { id: 'hasDescription', title: 'Has Description' },
      { id: 'hasContact', title: 'Has Contact' },
      { id: 'contact', title: 'Contact' },
      { id: 'hasLastUpdated', title: 'Has Last Updated' },
      { id: 'lastUpdated', title: 'Last Updated' },
      { id: 'hasSiteType', title: 'Has Site Type' },
      { id: 'siteType', title: 'Site Type' },
      { id: 'coreElementsPresent', title: 'Core Elements Present' },
      { id: 'coreElementsTotal', title: 'Core Elements Total' },
      { id: 'sectionsPresent', title: 'Sections Present' },
      { id: 'sectionsTotal', title: 'Sections Total' },
      { id: 'wordCount', title: 'Word Count' },
      { id: 'lineCount', title: 'Line Count' },
      { id: 'linkCount', title: 'Link Count' },
      { id: 'headingCount', title: 'Heading Count' },
      { id: 'contentLength', title: 'Content Length Assessment' },
      { id: 'specificityLevel', title: 'Specificity Level' },
      { id: 'hasStructuredContent', title: 'Has Structured Content' },
      { id: 'issues', title: 'Issues' },
      { id: 'recommendations', title: 'Recommendations' },
    ],
  });

  const records = results.llmsTxtAnalysis.map((analysis) => ({
    url: analysis.url,
    exists: analysis.exists,
    quality: analysis.analysis.quality || 'Unknown',
    score: analysis.analysis.score || 0,
    maxScore: analysis.analysis.maxScore || 100,
    hasTitle: analysis.parsed?.hasTitle || false,
    title: analysis.parsed?.title || '',
    hasDescription: analysis.parsed?.hasDescription || false,
    hasContact: analysis.parsed?.hasContact || false,
    contact: analysis.parsed?.contact || '',
    hasLastUpdated: analysis.parsed?.hasLastUpdated || false,
    lastUpdated: analysis.parsed?.lastUpdated || '',
    hasSiteType: analysis.parsed?.hasSiteType || false,
    siteType: analysis.parsed?.siteType || '',
    coreElementsPresent: analysis.analysis.details.coreElementsPresent || 0,
    coreElementsTotal: analysis.analysis.details.coreElementsTotal || 4,
    sectionsPresent: analysis.analysis.details.sectionsPresent || 0,
    sectionsTotal: analysis.analysis.details.sectionsTotal || 6,
    wordCount: analysis.parsed?.wordCount || 0,
    lineCount: analysis.parsed?.lineCount || 0,
    linkCount: analysis.parsed?.links?.length || 0,
    headingCount: analysis.parsed?.headings?.length || 0,
    contentLength: analysis.analysis.details.contentLength || 'Unknown',
    specificityLevel: analysis.analysis.details.specificityLevel || 'Unknown',
    hasStructuredContent: analysis.analysis.details.hasStructuredContent || false,
    issues: (analysis.analysis.issues || []).join('; '),
    recommendations: (analysis.analysis.recommendations || []).join('; '),
  }));

  await csvWriter.writeRecords(records);
  global.auditcore.logger.info(`Generated llms.txt quality report: llms_txt_quality.csv (${records.length} files)`);
}

/**
 * Generate combined AI files summary report (markdown)
 * @param {Object} results - Analysis results
 * @param {string} outputDir - Output directory path
 */
export async function generateAIFilesSummaryReport(results, outputDir) {
  const hasRobotsAnalysis = results.robotsTxtAnalysis && results.robotsTxtAnalysis.length > 0;
  const hasLlmsAnalysis = results.llmsTxtAnalysis && results.llmsTxtAnalysis.length > 0;

  if (!hasRobotsAnalysis && !hasLlmsAnalysis) {
    global.auditcore.logger.info('No AI files analysis data found, skipping AI files summary report');
    return;
  }

  let markdown = '# AI Files Quality Summary\n\n';
  markdown += `**Generated**: ${new Date().toISOString()}\n\n`;
  markdown += '## Overview\n\n';
  markdown += 'This report summarizes the quality analysis of robots.txt and llms.txt files for AI agent compatibility.\n\n';
  markdown += 'These files guide AI agents on how to interact with your website, controlling access and providing structured information.\n\n';

  // robots.txt section
  if (hasRobotsAnalysis) {
    markdown += '---\n\n';
    markdown += '## robots.txt Analysis\n\n';

    const robotsFile = results.robotsTxtAnalysis[0]; // Should only be one file
    markdown += `**URL**: <${robotsFile.url}>\n\n`;
    markdown += `**Exists**: ${robotsFile.exists ? 'Yes' : 'No'}\n\n`;

    if (robotsFile.exists) {
      const { analysis } = robotsFile;
      markdown += `**Quality Score**: ${analysis.score}/${analysis.maxScore} - **${analysis.quality}**\n\n`;

      markdown += '### Quality Breakdown\n\n';
      markdown += `- **AI User Agents Declared**: ${analysis.details.hasAIUserAgents ? 'Yes' : 'No'}\n`;
      if (analysis.details.aiUserAgentsFound && analysis.details.aiUserAgentsFound.length > 0) {
        markdown += `  - Found: ${analysis.details.aiUserAgentsFound.join(', ')}\n`;
      }
      markdown += `- **Sitemap Reference**: ${analysis.details.hasSitemap ? 'Yes' : 'No'}\n`;
      if (analysis.details.sitemapCount > 0) {
        markdown += `  - Count: ${analysis.details.sitemapCount}\n`;
      }
      markdown += `- **Sensitive Path Protection**: ${analysis.details.hasSensitivePathProtection ? 'Yes' : 'No'}\n`;
      if (analysis.details.protectedPaths && analysis.details.protectedPaths.length > 0) {
        markdown += `  - Protected: ${analysis.details.protectedPaths.join(', ')}\n`;
      }
      markdown += `- **References llms.txt**: ${analysis.details.hasLLMsTxtReference ? 'Yes' : 'No'}\n`;
      markdown += `- **Has Comments**: ${analysis.details.hasComments ? 'Yes' : 'No'}\n`;
      markdown += `- **Total Rules**: ${analysis.details.totalRules}\n`;
      markdown += `- **Structure Quality**: ${analysis.details.structureQuality}\n\n`;

      if (analysis.issues && analysis.issues.length > 0) {
        markdown += '### robots.txt Issues\n\n';
        analysis.issues.forEach((issue) => {
          markdown += `- ${issue}\n`;
        });
        markdown += '\n';
      }

      if (analysis.recommendations && analysis.recommendations.length > 0) {
        markdown += '### robots.txt Recommendations\n\n';
        analysis.recommendations.forEach((rec) => {
          markdown += `- ${rec}\n`;
        });
        markdown += '\n';
      }
    } else {
      markdown += '**Status**: File not found or inaccessible\n\n';
      markdown += '**Recommendation**: Create a robots.txt file at your site root to guide AI agent access.\n\n';
    }
  }

  // llms.txt section
  if (hasLlmsAnalysis) {
    markdown += '---\n\n';
    markdown += '## llms.txt Analysis\n\n';

    const llmsFile = results.llmsTxtAnalysis[0]; // Should only be one file
    markdown += `**URL**: <${llmsFile.url}>\n\n`;
    markdown += `**Exists**: ${llmsFile.exists ? 'Yes' : 'No'}\n\n`;

    if (llmsFile.exists) {
      const { analysis, parsed } = llmsFile;
      markdown += `**Quality Score**: ${analysis.score}/${analysis.maxScore} - **${analysis.quality}**\n\n`;

      markdown += '### File Contents\n\n';
      if (parsed.title) markdown += `- **Title**: ${parsed.title}\n`;
      if (parsed.description) markdown += `- **Description**: ${parsed.description}\n`;
      if (parsed.contact) markdown += `- **Contact**: ${parsed.contact}\n`;
      if (parsed.lastUpdated) markdown += `- **Last Updated**: ${parsed.lastUpdated}\n`;
      if (parsed.siteType) markdown += `- **Site Type**: ${parsed.siteType}\n`;
      markdown += '\n';

      markdown += '### Quality Metrics\n\n';
      markdown += `- **Core Elements**: ${analysis.details.coreElementsPresent}/${analysis.details.coreElementsTotal} present\n`;
      markdown += `- **Sections**: ${analysis.details.sectionsPresent}/${analysis.details.sectionsTotal} present\n`;
      markdown += `- **Content Length**: ${analysis.details.contentLength} (${parsed.wordCount} words)\n`;
      markdown += `- **Specificity**: ${analysis.details.specificityLevel}\n`;
      markdown += `- **Links**: ${parsed.links ? parsed.links.length : 0} documentation links\n`;
      markdown += `- **Headings**: ${parsed.headings ? parsed.headings.length : 0} sections\n\n`;

      if (analysis.issues && analysis.issues.length > 0) {
        markdown += '### llms.txt Issues\n\n';
        analysis.issues.forEach((issue) => {
          markdown += `- ${issue}\n`;
        });
        markdown += '\n';
      }

      if (analysis.recommendations && analysis.recommendations.length > 0) {
        markdown += '### llms.txt Recommendations\n\n';
        analysis.recommendations.forEach((rec) => {
          markdown += `- ${rec}\n`;
        });
        markdown += '\n';
      }
    } else {
      markdown += '**Status**: File not found or inaccessible\n\n';
      markdown += '**Recommendation**: Create a comprehensive llms.txt file following the llmstxt.org specification.\n\n';
      markdown += 'See: <https://llmstxt.org/> for guidance.\n\n';
    }
  }

  markdown += '---\n\n';
  markdown += '## Additional Resources\n\n';
  markdown += '- **llms.txt Specification**: <https://llmstxt.org/>\n';
  markdown += '- **The Invisible Users Book**: <https://github.com/tomcranstoun/invisible-users>\n';
  markdown += '- **robots.txt Standard**: <https://www.robotstxt.org/>\n';

  // Write markdown file
  const fs = await import('fs');
  const summaryPath = path.join(outputDir, 'ai_files_summary.md');
  await fs.promises.writeFile(summaryPath, markdown, 'utf8');

  global.auditcore.logger.info('Generated AI files summary report: ai_files_summary.md');
}
