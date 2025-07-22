/**
 * Advanced Keyword Categorizer for ATS Resume Checker
 *
 * Provides more sophisticated keyword classification using fuzzy matching
 * and context-aware categorization for better ATS scoring accuracy
 */

import Fuse from 'fuse.js';
import type { ExtractedKeywords, KeywordMatch } from '../types';

/**
 * Enhanced keyword database with fuzzy search support
 */
export class KeywordDatabase {
  private fuseInstances: Map<string, Fuse<string>> = new Map();
  
  constructor() {
    this.initializeFuseInstances();
  }

  private initializeFuseInstances() {
    const fuseOptions = {
      threshold: 0.3, // Lower = more strict matching
      distance: 100,
      includeScore: true,
      minMatchCharLength: 2,
    };

    // Initialize Fuse instances for each category
    Object.entries(ENHANCED_KEYWORD_CATEGORIES).forEach(([category, keywords]) => {
      this.fuseInstances.set(category, new Fuse(keywords, fuseOptions));
    });
  }

  /**
   * Find best matching category for a keyword
   */
  findBestMatch(keyword: string): { category: string; score: number; match: string } | null {
    let bestMatch: { category: string; score: number; match: string } | null = null;

    this.fuseInstances.forEach((fuse, category) => {
      const results = fuse.search(keyword);
      if (results.length > 0 && results[0].score !== undefined) {
        const score = 1 - results[0].score; // Convert to similarity score
        if (!bestMatch || score > bestMatch.score) {
          bestMatch = {
            category,
            score,
            match: results[0].item,
          };
        }
      }
    });

    return bestMatch && bestMatch.score > 0.7 ? bestMatch : null;
  }

  /**
   * Get all matches for a keyword across categories
   */
  getAllMatches(keyword: string): Array<{ category: string; score: number; match: string }> {
    const matches: Array<{ category: string; score: number; match: string }> = [];

    this.fuseInstances.forEach((fuse, category) => {
      const results = fuse.search(keyword);
      results.forEach(result => {
        if (result.score !== undefined && result.score < 0.3) {
          matches.push({
            category,
            score: 1 - result.score,
            match: result.item,
          });
        }
      });
    });

    return matches.sort((a, b) => b.score - a.score);
  }
}

/**
 * Enhanced keyword categories with more comprehensive coverage
 */
export const ENHANCED_KEYWORD_CATEGORIES = {
  hardSkills: [
    // Programming Languages
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
    'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'SQL', 'HTML', 'CSS', 'SASS', 'LESS',
    'Dart', 'Elixir', 'Haskell', 'Clojure', 'F#', 'VB.NET', 'Perl', 'Shell', 'Bash',
    
    // Frontend Technologies
    'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js', 'Gatsby', 'Ember.js',
    'jQuery', 'Bootstrap', 'Tailwind CSS', 'Material-UI', 'Ant Design', 'Chakra UI',
    'Styled Components', 'Emotion', 'Redux', 'MobX', 'Vuex', 'Pinia', 'RxJS',
    
    // Backend Technologies
    'Node.js', 'Express.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel',
    'Ruby on Rails', 'ASP.NET', 'Gin', 'Echo', 'Fiber', 'Actix', 'Phoenix',
    
    // Databases
    'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Oracle', 'SQLite',
    'Cassandra', 'DynamoDB', 'Firebase', 'Supabase', 'Neo4j', 'InfluxDB', 'CouchDB',
    
    // Cloud & DevOps
    'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Jenkins', 'GitLab CI',
    'GitHub Actions', 'Terraform', 'Ansible', 'Chef', 'Puppet', 'Vagrant', 'Nginx',
    'Apache', 'Prometheus', 'Grafana', 'ELK Stack', 'Datadog', 'New Relic',
    
    // Mobile Development
    'React Native', 'Flutter', 'iOS Development', 'Android Development', 'Xamarin',
    'Ionic', 'Cordova', 'Unity', 'Unreal Engine',
    
    // Data & AI
    'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Scikit-learn',
    'Pandas', 'NumPy', 'Jupyter', 'Apache Spark', 'Hadoop', 'Kafka', 'Airflow',
    'Data Analysis', 'Data Visualization', 'Business Intelligence', 'ETL',
    
    // Testing
    'Jest', 'Cypress', 'Selenium', 'Playwright', 'JUnit', 'pytest', 'Mocha', 'Chai',
    'Testing Library', 'Enzyme', 'Postman', 'Insomnia', 'SoapUI',
  ],

  softSkills: [
    'Leadership', 'Communication', 'Teamwork', 'Collaboration', 'Problem Solving',
    'Analytical Thinking', 'Creative Thinking', 'Innovation', 'Adaptability', 'Flexibility',
    'Organization', 'Detail Oriented', 'Time Management', 'Multitasking', 'Self Motivated',
    'Proactive', 'Initiative', 'Critical Thinking', 'Decision Making', 'Negotiation',
    'Presentation Skills', 'Public Speaking', 'Mentoring', 'Coaching', 'Training',
    'Customer Service', 'Client Relations', 'Stakeholder Management', 'Conflict Resolution',
    'Emotional Intelligence', 'Empathy', 'Active Listening', 'Interpersonal Skills',
    'Cross-functional Collaboration', 'Remote Work', 'Agile Mindset', 'Growth Mindset',
  ],

  jobTitles: [
    'Software Developer', 'Software Engineer', 'Full Stack Developer', 'Frontend Developer',
    'Backend Developer', 'Mobile Developer', 'DevOps Engineer', 'Site Reliability Engineer',
    'Data Engineer', 'Data Scientist', 'Machine Learning Engineer', 'AI Engineer',
    'Product Manager', 'Project Manager', 'Engineering Manager', 'Technical Lead',
    'Team Lead', 'Senior Developer', 'Junior Developer', 'Principal Engineer',
    'Staff Engineer', 'Architect', 'Solution Architect', 'System Architect',
    'QA Engineer', 'Test Engineer', 'Security Engineer', 'Cloud Engineer',
    'Platform Engineer', 'Infrastructure Engineer', 'Database Administrator',
    'UI/UX Designer', 'Product Designer', 'Technical Writer', 'Scrum Master',
    'Product Owner', 'Business Analyst', 'System Analyst', 'Consultant',
  ],

  certifications: [
    'AWS Certified Solutions Architect', 'AWS Certified Developer', 'AWS Certified SysOps',
    'Azure Fundamentals', 'Azure Developer Associate', 'Azure Solutions Architect',
    'Google Cloud Professional', 'Certified Kubernetes Administrator', 'Docker Certified',
    'CISSP', 'CISM', 'CISA', 'CompTIA Security+', 'CompTIA Network+', 'CompTIA A+',
    'PMP', 'Certified Scrum Master', 'Certified Product Owner', 'SAFe Certified',
    'ITIL Foundation', 'Six Sigma', 'Lean Six Sigma', 'Agile Certified',
    'Oracle Certified', 'Microsoft Certified', 'Salesforce Certified',
    'Google Analytics Certified', 'HubSpot Certified', 'Facebook Blueprint',
  ],

  education: [
    'Bachelor of Science', 'Master of Science', 'PhD', 'Doctorate', 'MBA',
    'Computer Science', 'Software Engineering', 'Information Technology',
    'Data Science', 'Machine Learning', 'Artificial Intelligence', 'Cybersecurity',
    'Information Systems', 'Computer Engineering', 'Electrical Engineering',
    'Business Administration', 'Marketing', 'Finance', 'Accounting', 'Economics',
    'Mathematics', 'Statistics', 'Physics', 'Psychology', 'Design', 'UX Design',
    'Bootcamp', 'Coding Bootcamp', 'Online Course', 'Certification Program',
    'University', 'College', 'Institute', 'Technical School',
  ],

  tools: [
    'Visual Studio Code', 'IntelliJ IDEA', 'Eclipse', 'Xcode', 'Android Studio',
    'Sublime Text', 'Atom', 'Vim', 'Emacs', 'WebStorm', 'PyCharm', 'PhpStorm',
    'Git', 'GitHub', 'GitLab', 'Bitbucket', 'SVN', 'Mercurial',
    'Jira', 'Confluence', 'Trello', 'Asana', 'Monday.com', 'Notion', 'Slack',
    'Microsoft Teams', 'Zoom', 'Discord', 'Figma', 'Sketch', 'Adobe XD',
    'Photoshop', 'Illustrator', 'InDesign', 'Canva', 'Miro', 'Lucidchart',
    'Tableau', 'Power BI', 'Excel', 'Google Sheets', 'Google Analytics',
    'Salesforce', 'HubSpot', 'Mailchimp', 'WordPress', 'Shopify', 'Magento',
  ],
};

/**
 * Advanced keyword categorizer with fuzzy matching
 */
export class AdvancedKeywordCategorizer {
  private database: KeywordDatabase;

  constructor() {
    this.database = new KeywordDatabase();
  }

  /**
   * Categorize keywords with confidence scores
   */
  categorizeWithConfidence(keywords: string[]): {
    categorized: ExtractedKeywords;
    matches: KeywordMatch[];
    uncategorized: string[];
  } {
    const categorized: ExtractedKeywords = {
      hardSkills: [],
      softSkills: [],
      jobTitles: [],
      certifications: [],
      education: [],
      tools: [],
    };

    const matches: KeywordMatch[] = [];
    const uncategorized: string[] = [];

    keywords.forEach(keyword => {
      const bestMatch = this.database.findBestMatch(keyword);
      
      if (bestMatch) {
        const category = bestMatch.category as keyof ExtractedKeywords;
        categorized[category].push(keyword);
        
        matches.push({
          keyword,
          category,
          found: true,
          variations: [bestMatch.match],
        });
      } else {
        // Try context-based classification
        const inferredCategory = this.inferCategory(keyword);
        if (inferredCategory) {
          categorized[inferredCategory].push(keyword);
          matches.push({
            keyword,
            category: inferredCategory,
            found: true,
            variations: [],
          });
        } else {
          uncategorized.push(keyword);
          matches.push({
            keyword,
            category: 'hardSkills', // Default fallback
            found: false,
          });
        }
      }
    });

    // Remove duplicates and sort
    Object.keys(categorized).forEach(key => {
      const categoryKey = key as keyof ExtractedKeywords;
      categorized[categoryKey] = [...new Set(categorized[categoryKey])].sort();
    });

    return { categorized, matches, uncategorized };
  }

  /**
   * Simple categorization (backward compatibility)
   */
  categorize(keywords: string[]): ExtractedKeywords {
    return this.categorizeWithConfidence(keywords).categorized;
  }

  /**
   * Infer category based on keyword patterns and context
   */
  private inferCategory(keyword: string): keyof ExtractedKeywords | null {
    const lowerKeyword = keyword.toLowerCase();

    // Hard skills patterns
    if (this.isLikelyHardSkill(lowerKeyword)) {
      return 'hardSkills';
    }

    // Soft skills patterns
    if (this.isLikelySoftSkill(lowerKeyword)) {
      return 'softSkills';
    }

    // Job title patterns
    if (this.isLikelyJobTitle(lowerKeyword)) {
      return 'jobTitles';
    }

    // Certification patterns
    if (this.isLikelyCertification(lowerKeyword)) {
      return 'certifications';
    }

    // Education patterns
    if (this.isLikelyEducation(lowerKeyword)) {
      return 'education';
    }

    // Tool patterns
    if (this.isLikelyTool(lowerKeyword)) {
      return 'tools';
    }

    return null;
  }

  private isLikelyHardSkill(keyword: string): boolean {
    const patterns = [
      /\.(js|ts|py|java|cpp|cs|php|rb|go|rs|swift|kt)$/,
      /^(api|sdk|cli|gui|ui|ux|rest|graphql|grpc)$/,
      /\d+(\.\d+)?$/, // Version numbers
      /(framework|library|database|server|client|protocol)$/,
      /(programming|development|coding|scripting)$/,
    ];
    return patterns.some(pattern => pattern.test(keyword));
  }

  private isLikelySoftSkill(keyword: string): boolean {
    const patterns = [
      /(leadership|management|communication|collaboration|teamwork)$/,
      /(creative|innovative|analytical|strategic|critical)$/,
      /(oriented|focused|driven|minded|thinking)$/,
      /(skills|ability|capabilities)$/,
    ];
    return patterns.some(pattern => pattern.test(keyword));
  }

  private isLikelyJobTitle(keyword: string): boolean {
    const patterns = [
      /(developer|engineer|manager|director|lead|senior|junior|principal|staff)$/,
      /(analyst|specialist|coordinator|administrator|consultant)$/,
      /^(head|chief|vp|vice|cto|ceo|cfo)$/,
      /(architect|designer|researcher|scientist|technician)$/,
    ];
    return patterns.some(pattern => pattern.test(keyword));
  }

  private isLikelyCertification(keyword: string): boolean {
    const patterns = [
      /(certified|certification|certificate)$/,
      /^(aws|azure|gcp|google|microsoft|oracle|salesforce)/,
      /(professional|associate|expert|specialist)$/,
    ];
    return patterns.some(pattern => pattern.test(keyword));
  }

  private isLikelyEducation(keyword: string): boolean {
    const patterns = [
      /(degree|diploma|bachelor|master|phd|mba|doctorate)$/,
      /(university|college|institute|school|academy)$/,
      /(science|engineering|technology|studies|arts)$/,
      /(bootcamp|course|training|program)$/,
    ];
    return patterns.some(pattern => pattern.test(keyword));
  }

  private isLikelyTool(keyword: string): boolean {
    const patterns = [
      /(studio|code|ide|editor)$/,
      /^(visual|android|xcode|intellij|eclipse)$/,
      /(software|application|platform|tool)$/,
    ];
    return patterns.some(pattern => pattern.test(keyword));
  }
}

// Export singleton instance
export const keywordCategorizer = new AdvancedKeywordCategorizer();
