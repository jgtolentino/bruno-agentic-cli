# Project Scout: Medallion Architecture with GenAI Integration

This document provides a comprehensive overview of the Project Scout architecture, which leverages a Medallion approach (Bronze, Silver, Gold, Platinum) with integrated GenAI capabilities.

## 📊 Visual Snapshot (QA Reference)

\![Project Scout Architecture](images/AZURE_ARCHITECTURE_PRO.png)

*Click for [full-size diagram](images/AZURE_ARCHITECTURE_PRO.png)*

## 🏗️ Architecture Overview

Project Scout implements a four-layer Medallion architecture:

1. **Bronze Layer** - Raw data capture and ingestion
   - IoT Hub for device data collection
   - Event Hubs for streaming telemetry
   - ADLS Gen2 for initial storage

2. **Silver Layer** - Data cleansing and normalization
   - Databricks for ETL processing
   - Azure Synapse for transformation
   - Schema validation and enrichment

3. **Gold Layer** - Business-ready datasets
   - Aggregations and metrics
   - ML-ready feature tables
   - Business intelligence views

4. **Platinum Layer** - GenAI insights and value creation
   - LLM-powered summarization (Claude/GPT-4/DeepSeek)
   - Contextual insights generation
   - Executive dashboard visualizations

## 🔄 Data Flow

Data flows through the system in the following sequence:

1. Edge devices capture transcripts and signals
2. Bronze layer stores raw, immutable data
3. Silver layer cleanses and normalizes data
4. Gold layer structures data for business use
5. Platinum layer enriches with GenAI insights
6. Dashboards present actionable intelligence

## 🧠 GenAI Integration

The Platinum layer leverages multiple LLMs to generate insights:

- **Claude** (primary) - For nuanced, longer context understanding
- **GPT-4** (secondary) - For technical/domain-specific insights
- **DeepSeek** (fallback) - For specialized technical content

The GenAI integration provides:
- Automated summarization of trends
- Extraction of actionable insights
- Cross-category pattern recognition
- Executive briefing generation

## 📈 Monitoring & Operations

The system includes comprehensive monitoring:
- Azure Monitor for infrastructure metrics
- Custom telemetry for LLM performance
- Usage analytics dashboard
- GenAI quality scoring

## 🛠️ Implementation Resources

- [QA_CHECKLIST_PROJECT_SCOUT.md](QA_CHECKLIST_PROJECT_SCOUT.md) - Complete QA guidelines
- [ICON_FALLBACK_POLICY.md](ICON_FALLBACK_POLICY.md) - Icon substitution standards
- [ARCHITECTURE_ICON_HANDLING.md](ARCHITECTURE_ICON_HANDLING.md) - General icon conventions
- [ARCHITECTURE_DIAGRAM_STYLE_GUIDE.md](ARCHITECTURE_DIAGRAM_STYLE_GUIDE.md) - Diagram style standards
- [ARCHITECTURE_LAYOUT_STANDARDS.md](ARCHITECTURE_LAYOUT_STANDARDS.md) - Layout and connector guidelines

## 📅 Version History

- **v1.0** - Initial Medallion architecture (Bronze/Silver/Gold)
- **v2.0** - Current version with GenAI Platinum layer integration

## Architecture Diagram
## Architecture Diagram
<!-- ARCHITECTURE_DIAGRAM_SECTION -->

<img src="docs/images/AZURE_ARCHITECTURE_PRO.svg" alt="Architecture Diagram" width="800">

*Architecture diagram showing the Project Scout medallion data flow with GenAI integration*

[View full-size diagram](docs/images/AZURE_ARCHITECTURE_PRO.png) | [View SVG](docs/images/AZURE_ARCHITECTURE_PRO.svg)
<img src="docs/images/AZURE_ARCHITECTURE_PRO.svg" alt="Architecture Diagram" width="800">

*Architecture diagram showing the Project Scout medallion data flow with GenAI integration*

[View full-size diagram](docs/images/AZURE_ARCHITECTURE_PRO.png) | [View SVG](docs/images/AZURE_ARCHITECTURE_PRO.svg)

