# System Architecture

## Overview

The system is a Node.js tool for analyzing website SEO and performance metrics. It follows a modular architecture with clear separation of concerns and a single source of truth (results.json).

## Data Flow

1. URL Collection Phase
   - Processes sitemap URLs
   - Validates and normalizes URLs
   - Handles relative/absolute URLs

2. Data Collection Phase
   - Analyzes page content
   - Collects performance metrics
   - Gathers SEO and accessibility data
   - Stores all data in results.json

3. Report Generation Phase
   - Generates reports from results.json
   - Ensures data consistency
   - Validates report accuracy

## Key Components

- **main.js**: Orchestrates the workflow
- **pageAnalyzer.js**: Handles page content analysis
- **metricsUpdater.js**: Updates specific metrics
- **reports.js**: Generates reports from results.json
- **sitemap.js**: Processes sitemap URLs
- **shutdownHandler.js**: Manages graceful shutdown

## Report Generation

The system generates these reports from results.json:

### Core Reports

- SEO Report (seo_report.csv)
- Performance Analysis (performance_analysis.csv)
- SEO Scores (seo_scores.csv)

### Additional Reports

- Accessibility Report (accessibility_report.csv)
- Image Optimization Report (image_optimization.csv)
- Link Analysis Report (link_analysis.csv)
- Content Quality Report (content_quality.csv)
- Security Report (security_report.csv)

## Error Handling

- Comprehensive error logging
- Retry mechanism for failed requests
- Data validation at each phase
- Consistent error object format

## Performance

- Async/await for I/O operations
- Efficient data structures
- Minimal memory usage
- Caching of network requests

## Data Quality

- Single source of truth (results.json)
- No direct data collection during report generation
- Data consistency checks
- Validation of required fields
