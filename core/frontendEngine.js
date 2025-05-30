import chalk from 'chalk';

export class FrontendEngine {
  constructor() {
    this.frameworks = {
      react: {
        extensions: ['.tsx', '.jsx'],
        dependencies: ['react', 'react-dom'],
        devDependencies: ['@types/react', '@types/react-dom', 'vite']
      },
      vue: {
        extensions: ['.vue'],
        dependencies: ['vue'],
        devDependencies: ['@vitejs/plugin-vue']
      },
      svelte: {
        extensions: ['.svelte'],
        dependencies: ['svelte'],
        devDependencies: ['@sveltejs/kit']
      }
    };

    this.componentTemplates = {
      button: this.generateButton,
      form: this.generateForm,
      modal: this.generateModal,
      card: this.generateCard,
      navbar: this.generateNavbar,
      sidebar: this.generateSidebar,
      table: this.generateTable,
      dashboard: this.generateDashboard
    };

    this.tailwindPatterns = {
      center: 'flex justify-center items-center',
      responsive: 'w-full max-w-md mx-auto',
      button: 'px-4 py-2 rounded-lg font-medium transition-colors',
      card: 'bg-white rounded-lg shadow-md p-6',
      input: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2',
      grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
    };
  }

  async generate(parsed) {
    const framework = this.detectFramework(parsed.cleaned);
    const componentType = this.detectComponentType(parsed.cleaned);
    const styling = this.detectStyling(parsed.cleaned);

    console.log(chalk.cyan(`🎨 Generating ${componentType} with ${framework} + ${styling}`));

    const result = {
      framework: framework,
      componentType: componentType,
      styling: styling,
      code: await this.generateCode(componentType, framework, styling, parsed),
      dependencies: this.getDependencies(framework, styling),
      explanation: this.generateExplanation(componentType, framework, styling),
      followUp: this.generateFollowUp(componentType)
    };

    return result;
  }

  detectFramework(input) {
    if (input.includes('react') || input.includes('tsx') || input.includes('jsx')) {
      return 'react';
    }
    if (input.includes('vue')) {
      return 'vue';
    }
    if (input.includes('svelte')) {
      return 'svelte';
    }
    return 'react'; // Default to React
  }

  detectComponentType(input) {
    const types = ['button', 'form', 'modal', 'card', 'navbar', 'sidebar', 'table', 'dashboard'];
    
    for (const type of types) {
      if (input.includes(type)) {
        return type;
      }
    }

    // Check for synonyms
    if (input.includes('login') || input.includes('signin') || input.includes('auth')) {
      return 'form';
    }
    if (input.includes('navigation') || input.includes('menu')) {
      return 'navbar';
    }
    if (input.includes('popup') || input.includes('dialog')) {
      return 'modal';
    }

    return 'component'; // Generic component
  }

  detectStyling(input) {
    if (input.includes('tailwind') || input.includes('tw')) {
      return 'tailwind';
    }
    if (input.includes('shadcn') || input.includes('ui')) {
      return 'shadcn';
    }
    if (input.includes('styled') || input.includes('css-in-js')) {
      return 'styled-components';
    }
    return 'tailwind'; // Default to Tailwind
  }

  async generateCode(componentType, framework, styling, parsed) {
    const generator = this.componentTemplates[componentType] || this.generateGenericComponent;
    return generator.call(this, framework, styling, parsed);
  }

  generateButton(framework, styling, parsed) {
    const variant = this.extractVariant(parsed.cleaned);
    const color = this.extractColor(parsed.cleaned);

    if (framework === 'react' && styling === 'shadcn') {
      return `import { Button } from "@/components/ui/button";

export function ${this.capitalize(variant)}Button() {
  return (
    <Button variant="${variant}" className="bg-${color}-500 hover:bg-${color}-600">
      Click me
    </Button>
  );
}`;
    }

    if (framework === 'react' && styling === 'tailwind') {
      return `interface ButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Button({ onClick, children, variant = 'primary' }: ButtonProps) {
  const baseClasses = "${this.tailwindPatterns.button}";
  const variantClasses = variant === 'primary' 
    ? "bg-${color}-500 hover:bg-${color}-600 text-white"
    : "bg-gray-200 hover:bg-gray-300 text-gray-800";

  return (
    <button 
      onClick={onClick}
      className={\`\${baseClasses} \${variantClasses}\`}
    >
      {children}
    </button>
  );
}`;
    }

    return this.generateGenericComponent(framework, styling, parsed);
  }

  generateForm(framework, styling, parsed) {
    const formType = this.extractFormType(parsed.cleaned);

    if (framework === 'react' && styling === 'shadcn') {
      return `import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ${this.capitalize(formType)}Form() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>${this.capitalize(formType)}</CardTitle>
        <CardDescription>Enter your credentials to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="Enter your email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="Enter your password" required />
          </div>
          <Button type="submit" className="w-full">
            ${this.capitalize(formType)}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}`;
    }

    if (framework === 'react' && styling === 'tailwind') {
      return `import { useState } from 'react';

interface FormData {
  email: string;
  password: string;
}

export function ${this.capitalize(formType)}Form() {
  const [formData, setFormData] = useState<FormData>({ email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="${this.tailwindPatterns.card} ${this.tailwindPatterns.responsive}">
      <h2 className="text-2xl font-bold text-center mb-6">${this.capitalize(formType)}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="${this.tailwindPatterns.input} focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="${this.tailwindPatterns.input} focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your password"
            required
          />
        </div>
        <button
          type="submit"
          className="${this.tailwindPatterns.button} w-full bg-blue-500 hover:bg-blue-600 text-white"
        >
          ${this.capitalize(formType)}
        </button>
      </form>
    </div>
  );
}`;
    }

    return this.generateGenericComponent(framework, styling, parsed);
  }

  generateModal(framework, styling, parsed) {
    if (framework === 'react' && styling === 'shadcn') {
      return `import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ModalProps {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({ trigger, title, description, children }: ModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}`;
    }

    return this.generateGenericComponent(framework, styling, parsed);
  }

  generateCard(framework, styling, parsed) {
    if (framework === 'react' && styling === 'tailwind') {
      return `interface CardProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Card({ title, description, children, className = '' }: CardProps) {
  return (
    <div className={\`${this.tailwindPatterns.card} \${className}\`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}`;
    }

    return this.generateGenericComponent(framework, styling, parsed);
  }

  generateDashboard(framework, styling, parsed) {
    if (framework === 'react' && styling === 'tailwind') {
      return `import { useState } from 'react';

interface DashboardProps {
  title: string;
}

export function Dashboard({ title }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'analytics', label: 'Analytics' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            <div className="flex items-center space-x-4">
              <button className="${this.tailwindPatterns.button} bg-blue-500 hover:bg-blue-600 text-white">
                New Project
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={\`py-4 px-1 border-b-2 font-medium text-sm \${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }\`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="${this.tailwindPatterns.grid}">
          {/* Dashboard content goes here */}
          <div className="${this.tailwindPatterns.card}">
            <h3 className="text-lg font-medium mb-4">Active Tab: {activeTab}</h3>
            <p className="text-gray-600">Content for {activeTab} tab</p>
          </div>
        </div>
      </main>
    </div>
  );
}`;
    }

    return this.generateGenericComponent(framework, styling, parsed);
  }

  generateGenericComponent(framework, styling, parsed) {
    return `// Generic ${framework} component with ${styling}
export function Component() {
  return (
    <div className="p-4">
      <h1>Generated Component</h1>
      <p>This is a generic component. Please be more specific about what you need.</p>
    </div>
  );
}`;
  }

  getDependencies(framework, styling) {
    const deps = [...this.frameworks[framework].dependencies];
    const devDeps = [...this.frameworks[framework].devDependencies];

    if (styling === 'tailwind') {
      devDeps.push('tailwindcss', 'postcss', 'autoprefixer');
    } else if (styling === 'shadcn') {
      deps.push('@radix-ui/react-slot', 'class-variance-authority', 'clsx', 'tailwind-merge');
      devDeps.push('tailwindcss', 'postcss', 'autoprefixer');
    } else if (styling === 'styled-components') {
      deps.push('styled-components');
      devDeps.push('@types/styled-components');
    }

    return { dependencies: deps, devDependencies: devDeps };
  }

  generateExplanation(componentType, framework, styling) {
    return `Generated a ${componentType} component using ${framework} with ${styling} styling. 
The component includes TypeScript types, proper accessibility attributes, and responsive design patterns.`;
  }

  generateFollowUp(componentType) {
    const general = ['Add error handling', 'Add loading states', 'Add tests'];
    
    const specific = {
      form: ['Add form validation', 'Add password strength indicator', 'Add forgot password'],
      button: ['Add loading spinner', 'Add different sizes', 'Add icon variants'],
      modal: ['Add animation', 'Add backdrop click handling', 'Add keyboard navigation'],
      dashboard: ['Add data fetching', 'Add charts/graphs', 'Add user permissions']
    };

    return [...general, ...(specific[componentType] || [])];
  }

  // Helper methods
  extractVariant(input) {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'destructive'];
    return variants.find(variant => input.includes(variant)) || 'primary';
  }

  extractColor(input) {
    const colors = ['blue', 'red', 'green', 'yellow', 'purple', 'pink', 'indigo'];
    return colors.find(color => input.includes(color)) || 'blue';
  }

  extractFormType(input) {
    if (input.includes('login') || input.includes('signin')) return 'login';
    if (input.includes('signup') || input.includes('register')) return 'signup';
    if (input.includes('contact')) return 'contact';
    return 'form';
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}