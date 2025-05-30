import chalk from 'chalk';

export class VisualArtistEngine {
  constructor() {
    this.platformTypes = {
      dashboard: {
        components: ['skill_tracking', 'portfolio_analytics', 'trend_analysis', 'project_timeline'],
        visualizations: ['radar_chart', 'bar_chart', 'doughnut_chart', 'line_chart'],
        integrations: ['chart.js', 'apexcharts', 'd3.js']
      },
      promptStudio: {
        aiTools: ['midjourney', 'dalle3', 'firefly', 'runway', 'stable_diffusion'],
        features: ['prompt_optimization', 'creative_brief', 'style_transfer', 'concept_generation'],
        outputs: ['optimized_prompt', 'creative_brief', 'technical_specs']
      },
      dataTracking: {
        metrics: ['skill_proficiency', 'tool_mastery', 'project_performance', 'market_trends'],
        storage: ['local_storage', 'supabase', 'firebase', 'mongodb'],
        analytics: ['real_time', 'historical', 'predictive']
      }
    };

    this.templateGenerators = {
      artistryHub: this.generateArtistryHub.bind(this),
      promptWrapper: this.generatePromptWrapper.bind(this),
      visualization: this.generateVisualization.bind(this),
      analytics: this.generateAnalytics.bind(this)
    };

    this.chartConfigs = {
      skillRadar: {
        type: 'radar',
        dimensions: ['Conceptual Thinking', 'Visual Storytelling', 'Technical Execution', 'AI Integration', 'Trend Awareness', 'Cross-Functional'],
        datasets: [{
          label: 'Proficiency',
          backgroundColor: 'rgba(108, 99, 255, 0.2)',
          borderColor: 'rgba(108, 99, 255, 1)'
        }]
      },
      toolMastery: {
        type: 'bar',
        tools: ['Photoshop', 'Illustrator', 'Figma', 'After Effects', 'Midjourney', 'Blender'],
        colors: {
          primary: 'rgba(54, 209, 220, 0.7)',
          secondary: 'rgba(255, 101, 132, 0.7)'
        }
      },
      portfolioDistribution: {
        type: 'doughnut',
        categories: ['Branding', 'Digital', 'Print', 'Motion', 'Experiential'],
        colorScheme: 'vibrant'
      }
    };
  }

  async generatePlatform(parsed) {
    const platformType = this.detectPlatformType(parsed.cleaned);
    const features = this.extractFeatures(parsed.cleaned);
    const styling = this.detectStyling(parsed.cleaned);

    console.log(chalk.magenta(`🎨 Generating Visual Artist ${platformType} platform`));

    const result = {
      type: 'visual_artist_platform',
      platformType: platformType,
      features: features,
      code: await this.generateCode(platformType, features, styling, parsed),
      styles: this.generateStyles(platformType, styling),
      scripts: this.generateScripts(features),
      integrations: this.suggestIntegrations(features),
      deployment: this.generateDeployment(platformType)
    };

    return result;
  }

  detectPlatformType(input) {
    if (input.includes('dashboard') || input.includes('analytics')) return 'dashboard';
    if (input.includes('prompt') || input.includes('ai studio')) return 'promptStudio';
    if (input.includes('tracking') || input.includes('metrics')) return 'dataTracking';
    return 'artistryHub'; // Complete platform
  }

  extractFeatures(input) {
    const features = [];
    
    // Dashboard features
    if (input.includes('skill') || input.includes('proficiency')) features.push('skill_tracking');
    if (input.includes('portfolio')) features.push('portfolio_analytics');
    if (input.includes('trend')) features.push('trend_analysis');
    if (input.includes('timeline') || input.includes('project')) features.push('project_timeline');
    
    // AI features
    if (input.includes('prompt') || input.includes('ai')) features.push('ai_prompt_studio');
    if (input.includes('creative') || input.includes('brief')) features.push('creative_brief');
    
    // Data features
    if (input.includes('chart') || input.includes('visualization')) features.push('data_visualization');
    if (input.includes('real-time') || input.includes('live')) features.push('real_time_updates');

    return features.length > 0 ? features : ['all']; // Default to all features
  }

  async generateCode(platformType, features, styling, parsed) {
    if (platformType === 'artistryHub' || features.includes('all')) {
      return this.generateArtistryHub(styling, parsed);
    }

    const components = [];
    
    if (features.includes('skill_tracking')) {
      components.push(this.generateSkillTrackingComponent());
    }
    
    if (features.includes('ai_prompt_studio')) {
      components.push(this.generatePromptWrapper());
    }
    
    if (features.includes('data_visualization')) {
      components.push(this.generateVisualization());
    }

    return this.wrapComponents(components, platformType, styling);
  }

  generateArtistryHub(styling, parsed) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ArtistryHub | Data Tracking & Visualization Platform</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        ${this.generateCoreStyles()}
    </style>
</head>
<body>
    <div class="container">
        ${this.generateHeader()}
        
        <div class="dashboard-grid">
            ${this.generateSkillCard()}
            ${this.generateToolMasteryCard()}
            ${this.generateTimelineCard()}
            ${this.generatePromptWrapper()}
            ${this.generatePortfolioCard()}
            ${this.generateTrendCard()}
        </div>
    </div>
    
    <footer>
        <p>ArtistryHub - Data Tracking & Visualization Platform for Visual Artists | © 2023</p>
    </footer>

    <script>
        ${this.generateCoreScripts()}
    </script>
</body>
</html>`;
  }

  generateCoreStyles() {
    return `:root {
        --primary: #6C63FF;
        --secondary: #FF6584;
        --accent: #36D1DC;
        --dark: #2A2A3C;
        --light: #F8F9FC;
        --success: #4CAF50;
        --warning: #FFC107;
    }
    
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
    
    body {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: var(--light);
        min-height: 100vh;
        overflow-x: hidden;
    }
    
    .container {
        max-width: 1400px;
        margin: 0 auto;
        padding: 20px;
    }
    
    /* Header Styles */
    header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        margin-bottom: 30px;
    }
    
    .logo {
        display: flex;
        align-items: center;
        gap: 15px;
    }
    
    .logo-icon {
        font-size: 2.5rem;
        color: var(--primary);
    }
    
    .logo h1 {
        font-weight: 700;
        font-size: 1.8rem;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
    }
    
    nav ul {
        display: flex;
        gap: 30px;
        list-style: none;
    }
    
    nav a {
        color: var(--light);
        text-decoration: none;
        font-weight: 500;
        padding: 8px 15px;
        border-radius: 30px;
        transition: all 0.3s ease;
    }
    
    nav a:hover, nav a.active {
        background: rgba(108, 99, 255, 0.2);
        color: var(--primary);
    }
    
    .user-actions {
        display: flex;
        gap: 15px;
        align-items: center;
    }
    
    .btn {
        padding: 10px 20px;
        border-radius: 30px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        display: inline-flex;
        align-items: center;
        gap: 8px;
    }
    
    .btn-primary {
        background: var(--primary);
        color: white;
    }
    
    .btn-outline {
        background: transparent;
        border: 2px solid var(--primary);
        color: var(--primary);
    }
    
    .btn:hover {
        transform: translateY(-3px);
        box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
    }
    
    /* Dashboard Grid */
    .dashboard-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 25px;
        margin-bottom: 40px;
    }
    
    .card {
        background: rgba(42, 42, 60, 0.7);
        border-radius: 20px;
        padding: 25px;
        backdrop-filter: blur(10px);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: transform 0.3s ease;
    }
    
    .card:hover {
        transform: translateY(-5px);
    }
    
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }
    
    .card-title {
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--primary);
    }
    
    .card-icon {
        font-size: 1.8rem;
        color: var(--accent);
    }
    
    /* Charts */
    .chart-container {
        position: relative;
        height: 250px;
        width: 100%;
    }
    
    /* Prompt Wrapper */
    .prompt-wrapper {
        grid-column: span 3;
        background: linear-gradient(135deg, rgba(42, 42, 60, 0.9) 0%, rgba(26, 26, 46, 0.9) 100%);
        border-radius: 20px;
        padding: 30px;
        backdrop-filter: blur(10px);
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
        border: 1px solid rgba(108, 99, 255, 0.3);
    }
    
    .prompt-header {
        text-align: center;
        margin-bottom: 30px;
    }
    
    .prompt-header h2 {
        font-size: 2rem;
        margin-bottom: 10px;
        background: linear-gradient(90deg, var(--primary), var(--accent));
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
    }
    
    .prompt-header p {
        color: rgba(255, 255, 255, 0.7);
        max-width: 700px;
        margin: 0 auto;
    }
    
    /* Tool Selection */
    .tool-selection {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 15px;
        margin-bottom: 30px;
    }
    
    .tool-card {
        background: rgba(42, 42, 60, 0.7);
        border-radius: 15px;
        padding: 15px;
        text-align: center;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 2px solid transparent;
    }
    
    .tool-card:hover {
        transform: translateY(-5px);
        border-color: var(--primary);
    }
    
    .tool-card.active {
        border-color: var(--primary);
        background: rgba(108, 99, 255, 0.2);
    }
    
    .tool-icon {
        font-size: 2rem;
        margin-bottom: 10px;
        color: var(--accent);
    }
    
    /* Responsive */
    @media (max-width: 1100px) {
        .dashboard-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        .prompt-wrapper {
            grid-column: span 2;
        }
    }
    
    @media (max-width: 768px) {
        .dashboard-grid {
            grid-template-columns: 1fr;
        }
        .prompt-wrapper {
            grid-column: span 1;
        }
        nav ul {
            display: none;
        }
    }`;
  }

  generateHeader() {
    return `<header>
        <div class="logo">
            <i class="fas fa-palette logo-icon"></i>
            <h1>ArtistryHub</h1>
        </div>
        <nav>
            <ul>
                <li><a href="#" class="active">Dashboard</a></li>
                <li><a href="#">Projects</a></li>
                <li><a href="#">Analytics</a></li>
                <li><a href="#">Portfolio</a></li>
                <li><a href="#">AI Studio</a></li>
            </ul>
        </nav>
        <div class="user-actions">
            <button class="btn btn-outline">
                <i class="fas fa-sync-alt"></i> Sync Data
            </button>
            <button class="btn btn-primary">
                <i class="fas fa-plus"></i> New Project
            </button>
        </div>
    </header>`;
  }

  generateSkillCard() {
    return `<div class="card">
        <div class="card-header">
            <h3 class="card-title">Skill Proficiency</h3>
            <i class="fas fa-chart-line card-icon"></i>
        </div>
        <div class="chart-container">
            <canvas id="skillChart"></canvas>
        </div>
    </div>`;
  }

  generateToolMasteryCard() {
    return `<div class="card">
        <div class="card-header">
            <h3 class="card-title">Tool Mastery</h3>
            <i class="fas fa-tools card-icon"></i>
        </div>
        <div class="chart-container">
            <canvas id="toolChart"></canvas>
        </div>
    </div>`;
  }

  generateTimelineCard() {
    return `<div class="card">
        <div class="card-header">
            <h3 class="card-title">Project Timeline</h3>
            <i class="fas fa-calendar-alt card-icon"></i>
        </div>
        <div class="chart-container">
            <canvas id="timelineChart"></canvas>
        </div>
    </div>`;
  }

  generatePromptWrapper() {
    return `<div class="prompt-wrapper">
        <div class="prompt-header">
            <h2>Creative AI Prompt Studio</h2>
            <p>Generate compelling visual concepts using AI-powered creative prompts. Refine your artistic vision with precision.</p>
        </div>
        
        <div class="prompt-area">
            <textarea class="prompt-input" placeholder="Describe your creative vision..." style="
                flex: 1;
                background: rgba(26, 26, 46, 0.8);
                border: 2px solid rgba(108, 99, 255, 0.3);
                border-radius: 15px;
                padding: 20px;
                color: white;
                font-size: 1rem;
                min-height: 150px;
                resize: vertical;
                width: 100%;
                margin-bottom: 20px;
            ">A futuristic cityscape at dusk, neon lights reflecting on wet streets, cyberpunk aesthetic, cinematic lighting, highly detailed, 8k resolution</textarea>
        </div>
        
        <div class="tool-selection">
            <div class="tool-card active">
                <i class="fab fa-artstation tool-icon"></i>
                <div>Midjourney</div>
            </div>
            <div class="tool-card">
                <i class="fas fa-robot tool-icon"></i>
                <div>DALL·E 3</div>
            </div>
            <div class="tool-card">
                <i class="fas fa-fire tool-icon"></i>
                <div>Firefly</div>
            </div>
            <div class="tool-card">
                <i class="fas fa-video tool-icon"></i>
                <div>Runway ML</div>
            </div>
            <div class="tool-card">
                <i class="fas fa-brain tool-icon"></i>
                <div>Stable Diffusion</div>
            </div>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px;">
            <button class="btn btn-primary" style="padding: 15px 30px; font-size: 1.1rem;">
                <i class="fas fa-wand-magic-sparkles"></i> Generate Visual Concept
            </button>
        </div>
        
        <div class="output-section" style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
            <div class="output-card" style="background: rgba(26, 26, 46, 0.8); border-radius: 15px; padding: 25px; min-height: 300px;">
                <h3 style="color: var(--primary); margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-lightbulb"></i> Creative Brief
                </h3>
                <div class="ai-output" id="creativeBrief" style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                    padding: 20px;
                    min-height: 200px;
                    font-family: monospace;
                    white-space: pre-wrap;
                    overflow-y: auto;
                    max-height: 250px;
                ">Generating creative brief based on your prompt...</div>
            </div>
            <div class="output-card" style="background: rgba(26, 26, 46, 0.8); border-radius: 15px; padding: 25px; min-height: 300px;">
                <h3 style="color: var(--primary); margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-code"></i> Optimized Prompt
                </h3>
                <div class="ai-output" id="optimizedPrompt" style="
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 10px;
                    padding: 20px;
                    min-height: 200px;
                    font-family: monospace;
                    white-space: pre-wrap;
                    overflow-y: auto;
                    max-height: 250px;
                ">// Futuristic cyberpunk cityscape
// Time: dusk with neon reflections on wet streets
// Style: cinematic lighting, highly detailed
// Resolution: 8k, aspect ratio 16:9
// Color palette: electric blues, neon pinks, deep purples
// Mood: atmospheric, immersive, high-tech</div>
            </div>
        </div>
    </div>`;
  }

  generatePortfolioCard() {
    return `<div class="card">
        <div class="card-header">
            <h3 class="card-title">Portfolio Performance</h3>
            <i class="fas fa-chart-pie card-icon"></i>
        </div>
        <div class="chart-container">
            <canvas id="portfolioChart"></canvas>
        </div>
    </div>`;
  }

  generateTrendCard() {
    return `<div class="card">
        <div class="card-header">
            <h3 class="card-title">Trend Analysis</h3>
            <i class="fas fa-chart-bar card-icon"></i>
        </div>
        <div class="chart-container">
            <canvas id="trendChart"></canvas>
        </div>
    </div>`;
  }

  generateCoreScripts() {
    return `// Initialize charts when page loads
    document.addEventListener('DOMContentLoaded', function() {
        // Skill Proficiency Radar Chart
        const skillCtx = document.getElementById('skillChart').getContext('2d');
        new Chart(skillCtx, {
            type: 'radar',
            data: {
                labels: ['Conceptual Thinking', 'Visual Storytelling', 'Technical Execution', 'AI Integration', 'Trend Awareness', 'Cross-Functional'],
                datasets: [{
                    label: 'Your Proficiency',
                    data: [9, 8, 7, 9, 8, 8],
                    fill: true,
                    backgroundColor: 'rgba(108, 99, 255, 0.2)',
                    borderColor: 'rgba(108, 99, 255, 1)',
                    pointBackgroundColor: 'rgba(108, 99, 255, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(108, 99, 255, 1)'
                }]
            },
            options: {
                scales: {
                    r: {
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        pointLabels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: {
                                size: 10
                            }
                        },
                        suggestedMin: 0,
                        suggestedMax: 10
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Tool Mastery Bar Chart
        const toolCtx = document.getElementById('toolChart').getContext('2d');
        new Chart(toolCtx, {
            type: 'bar',
            data: {
                labels: ['Photoshop', 'Illustrator', 'Figma', 'After Effects', 'Midjourney', 'Blender'],
                datasets: [{
                    label: 'Proficiency Level',
                    data: [9, 8, 9, 7, 8, 6],
                    backgroundColor: [
                        'rgba(54, 209, 220, 0.7)',
                        'rgba(54, 209, 220, 0.7)',
                        'rgba(54, 209, 220, 0.7)',
                        'rgba(54, 209, 220, 0.7)',
                        'rgba(255, 101, 132, 0.7)',
                        'rgba(54, 209, 220, 0.7)'
                    ],
                    borderColor: [
                        'rgba(54, 209, 220, 1)',
                        'rgba(54, 209, 220, 1)',
                        'rgba(54, 209, 220, 1)',
                        'rgba(54, 209, 220, 1)',
                        'rgba(255, 101, 132, 1)',
                        'rgba(54, 209, 220, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 10,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Portfolio Performance Chart
        const portfolioCtx = document.getElementById('portfolioChart').getContext('2d');
        new Chart(portfolioCtx, {
            type: 'doughnut',
            data: {
                labels: ['Branding', 'Digital', 'Print', 'Motion', 'Experiential'],
                datasets: [{
                    label: 'Portfolio Distribution',
                    data: [25, 30, 15, 20, 10],
                    backgroundColor: [
                        'rgba(108, 99, 255, 0.8)',
                        'rgba(255, 101, 132, 0.8)',
                        'rgba(54, 209, 220, 0.8)',
                        'rgba(76, 175, 80, 0.8)',
                        'rgba(255, 193, 7, 0.8)'
                    ],
                    borderColor: [
                        'rgba(108, 99, 255, 1)',
                        'rgba(255, 101, 132, 1)',
                        'rgba(54, 209, 220, 1)',
                        'rgba(76, 175, 80, 1)',
                        'rgba(255, 193, 7, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            padding: 15
                        }
                    }
                }
            }
        });
        
        // Trend Analysis Chart
        const trendCtx = document.getElementById('trendChart').getContext('2d');
        new Chart(trendCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
                datasets: [
                    {
                        label: 'AI-Generated Art',
                        data: [65, 59, 80, 81, 90, 95, 98],
                        fill: false,
                        borderColor: 'rgba(54, 209, 220, 1)',
                        tension: 0.3,
                        pointRadius: 4
                    },
                    {
                        label: '3D Design',
                        data: [70, 75, 75, 80, 85, 88, 90],
                        fill: false,
                        borderColor: 'rgba(255, 101, 132, 1)',
                        tension: 0.3,
                        pointRadius: 4
                    },
                    {
                        label: 'Motion Design',
                        data: [60, 65, 70, 75, 78, 82, 85],
                        fill: false,
                        borderColor: 'rgba(108, 99, 255, 1)',
                        tension: 0.3,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                scales: {
                    y: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'rgba(255, 255, 255, 0.8)'
                        }
                    }
                }
            }
        });
        
        // Timeline Chart
        const timelineCtx = document.getElementById('timelineChart').getContext('2d');
        new Chart(timelineCtx, {
            type: 'bar',
            data: {
                labels: ['Brand Campaign', 'Product Launch', 'Website Redesign', 'Motion Project', 'AI Exploration'],
                datasets: [{
                    label: 'Project Timeline (weeks)',
                    data: [8, 6, 10, 4, 3],
                    backgroundColor: 'rgba(108, 99, 255, 0.7)',
                    borderColor: 'rgba(108, 99, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)'
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Tool selection interaction
        const toolCards = document.querySelectorAll('.tool-card');
        toolCards.forEach(card => {
            card.addEventListener('click', function() {
                toolCards.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
                
                // Update the prompt based on tool selection
                const toolName = this.querySelector('div').textContent;
                document.querySelector('.prompt-input').placeholder = \`Describe your vision for \${toolName}...\`;
            });
        });
        
        // Generate button functionality
        document.querySelector('.btn-primary').addEventListener('click', function() {
            const prompt = document.querySelector('.prompt-input').value;
            if (prompt.trim() === '') return;
            
            // Show loading state
            const briefOutput = document.getElementById('creativeBrief');
            const promptOutput = document.getElementById('optimizedPrompt');
            
            briefOutput.textContent = "Generating creative brief...";
            promptOutput.textContent = "Optimizing prompt structure...";
            
            // Simulate AI processing
            setTimeout(() => {
                // Generate creative brief
                briefOutput.innerHTML = \`<strong>Creative Brief:</strong>
Project: Cyberpunk Cityscape Visualization
Objective: Create a stunning visual of a futuristic city at dusk
Audience: Tech enthusiasts, sci-fi fans, art collectors
Mood: Atmospheric, immersive, high-tech
Key Elements: Neon lights, wet streets, towering skyscrapers
Color Palette: Electric blues, neon pinks, deep purples
Technical Specs: 8K resolution, 16:9 aspect ratio
Deadline: 1 week\`;

                // Generate optimized prompt
                promptOutput.innerHTML = \`// Futuristic cyberpunk cityscape at dusk
// Neon signs reflecting on rain-slicked streets
// Towering skyscrapers with holographic advertisements
// Cinematic lighting with volumetric fog
// Highly detailed, photorealistic, 8K resolution
// Color scheme: electric blue, neon pink, deep purple
// Style: Blade Runner 2049 meets Ghost in the Shell
// --ar 16:9 --v 5.2\`;
            }, 1500);
        });
    });`;
  }

  generateStyles(platformType, styling) {
    if (styling === 'tailwind') {
      return {
        dependencies: ['tailwindcss', 'postcss', 'autoprefixer'],
        config: this.generateTailwindConfig()
      };
    }
    
    return {
      inline: true,
      styles: this.generateCoreStyles()
    };
  }

  generateTailwindConfig() {
    return `module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        primary: '#6C63FF',
        secondary: '#FF6584',
        accent: '#36D1DC',
        dark: '#2A2A3C',
        light: '#F8F9FC'
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(10px)',
      }
    },
  },
  plugins: [],
}`;
  }

  generateScripts(features) {
    const scripts = [];
    
    if (features.includes('data_visualization') || features.includes('all')) {
      scripts.push({
        src: 'https://cdn.jsdelivr.net/npm/chart.js',
        type: 'chart'
      });
    }
    
    if (features.includes('real_time_updates')) {
      scripts.push({
        src: 'supabase-realtime',
        type: 'realtime'
      });
    }
    
    return scripts;
  }

  suggestIntegrations(features) {
    const integrations = [];
    
    if (features.includes('data_visualization') || features.includes('all')) {
      integrations.push({
        name: 'Chart.js',
        purpose: 'Interactive data visualizations',
        command: 'npm install chart.js'
      });
    }
    
    if (features.includes('ai_prompt_studio') || features.includes('all')) {
      integrations.push({
        name: 'AI Platform APIs',
        purpose: 'Connect to AI image generation services',
        note: 'Use local models for privacy'
      });
    }
    
    if (features.includes('real_time_updates')) {
      integrations.push({
        name: 'Supabase Realtime',
        purpose: 'Real-time data synchronization',
        command: 'npm install @supabase/supabase-js'
      });
    }
    
    return integrations;
  }

  generateDeployment(platformType) {
    return {
      vercel: [
        'npm run build',
        'vercel deploy --prod'
      ],
      netlify: [
        'npm run build',
        'netlify deploy --prod'
      ],
      local: [
        'npm install',
        'npm run dev'
      ]
    };
  }

  detectStyling(input) {
    if (input.includes('tailwind')) return 'tailwind';
    if (input.includes('css')) return 'css';
    if (input.includes('styled')) return 'styled-components';
    return 'inline'; // Default to inline styles
  }

  // Missing methods referenced in templateGenerators
  generateVisualization() {
    return `<div class="visualization-container">
      <canvas id="dataVisualization"></canvas>
      <script>
        // Chart.js visualization code
        const ctx = document.getElementById('dataVisualization').getContext('2d');
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
              label: 'Performance',
              data: [65, 59, 80, 81, 56, 55],
              borderColor: 'rgba(108, 99, 255, 1)',
              tension: 0.4
            }]
          }
        });
      </script>
    </div>`;
  }

  generateAnalytics() {
    return `<div class="analytics-dashboard">
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Total Projects</h3>
          <div class="metric-value">24</div>
        </div>
        <div class="metric-card">
          <h3>Completion Rate</h3>
          <div class="metric-value">89%</div>
        </div>
        <div class="metric-card">
          <h3>Avg. Rating</h3>
          <div class="metric-value">4.8</div>
        </div>
      </div>
    </div>`;
  }

  generateSkillTrackingComponent() {
    return `<div class="skill-tracking">
      <h2>Skill Development</h2>
      <div class="skill-progress">
        ${['Design', 'Development', 'Strategy', 'Communication'].map(skill => `
          <div class="skill-item">
            <label>${skill}</label>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.floor(Math.random() * 100)}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  wrapComponents(components, platformType, styling) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${platformType} Platform</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        ${this.generateCoreStyles()}
    </style>
</head>
<body>
    <div class="container">
        ${components.join('\n')}
    </div>
</body>
</html>`;
  }
}