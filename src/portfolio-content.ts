// Everything the site says about you, in one place. The text comes from your résumé
// (mikeres2pg.docx) and your current portfolio (mikeres.com); nothing here is invented.
// Empty fields render as visible placeholders so it is obvious what still needs filling in.
export type ContactLink = { label: string; href: string }

/** Chapter one (after the Spirit Gate fight): who you are. */
export const about = {
  name: 'Michael Rockingham',
  role: 'Full-Stack Web Developer',
  location: 'Orlando',
  summary: 'Full-Stack Web Developer with 5+ years of experience creating scalable applications using React, Node.js, SQL/NoSQL, and modern frameworks. Skilled in building REST APIs, authentication systems, and modular, cloud-native architectures. Recognized for problem-solving, adaptability, and delivering high-impact solutions for enterprise clients including Ford Motor Company and Cigna.',
}

export type Highlight = { title: string; text: string; link?: ContactLink }
export type Role = { company: string; title: string; dates: string; tech: string[]; highlights: Highlight[] }

/** Chapter two (after the barracks fight): your roles, most recent first. */
export const experience: Role[] = [
  {
    company: 'Campbell Marketing & Communications', title: 'Full-Stack Developer', dates: 'February 2024 – Present',
    tech: ['React', 'Ionic', 'Laravel/PHP', 'Zustand', 'MapBox', 'AWS', 'Storybook'],
    highlights: [
      { title: 'Ford Mustang Unleashed', text: 'Led development of a multi-platform React/Ionic app enabling car enthusiasts to discover and share events nationwide.' },
      { title: 'Special Vehicle Registry', text: 'Led development for the Ford Special Vehicle Registry.', link: { label: 'specialvehicleregistry.com', href: 'https://specialvehicleregistry.com' } },
      { title: 'Lead Generation Platform', text: 'Designed an offline-first lead capture system with a dedicated iPad app and Laravel backend; managed deployments through the Apple App Store.' },
      { title: 'API & Component Development', text: 'Created REST API routes in Laravel/PHP for auth/CRUD operations and built a reusable component library in Storybook used across multiple Ford web apps.' },
      { title: 'DevOps & Optimization', text: 'Managed deployments via Bitbucket pipelines/AWS and improved code performance and data flow using Zustand state management.' },
    ],
  },
  {
    company: 'Molecular Pathology Laboratory Network', title: 'Full-Stack Developer', dates: 'December 2022 – September 2023',
    tech: ['React', 'Kendo React', 'MySQL', 'Node.js', 'C#.NET', 'Azure'],
    highlights: [
      { title: 'Lab Software Interface', text: 'Developed complex web forms and UI components using React and Redux to record and update laboratory information and medical imagery.' },
      { title: 'Backend Integration', text: 'Engineered and maintained RESTful APIs using C# and ASP.NET (MVC pattern), developing robust controllers and services to streamline CRUD operations and reliable medical equipment interaction.' },
      { title: 'CI/CD & Maintenance', text: 'Managed complete code deployments and bug tracking using Azure DevOps tools, ensuring increased code readability and efficiency.' },
    ],
  },
  {
    company: 'Cigna (Brooksource)', title: 'Front-End Web Developer', dates: 'February 2022 – February 2023',
    tech: ['React', 'Kendo React', 'AWS', 'Node.js', 'Redux'],
    highlights: [
      { title: 'Data Management UI', text: 'Built complex data grid components to track and update drug formula combinations for thousands of records.' },
      { title: 'Role-Based Security', text: 'Implemented comprehensive role-based authorization components using React/Redux to control access throughout the application.' },
      { title: 'Cross-Team Collaboration', text: 'Integrated features across multiple development teams and collaborated with backend engineers to optimize API calls.' },
      { title: 'Deployment', text: 'Maintained and deployed codebases using AWS DevOps tools and GitHub.' },
    ],
  },
  {
    company: 'SevenStar Protected', title: 'Full-Stack Web Developer', dates: 'April 2020 – June 2022',
    tech: ['React', 'Next.js', 'MongoDB', 'Node.js', 'TypeScript'],
    highlights: [
      { title: 'Core Feature Development', text: 'Created a reusable star-rating component and a questionnaire section utilizing localStorage and MongoDB for user data persistence.' },
      { title: 'Backend Development', text: 'Built secure REST API routes with Node/Express and MongoDB, implementing authentication and complex search functions.' },
      { title: 'UI/UX', text: 'Developed responsive, protected routes for Sign In, Registration, and User Profiles.' },
    ],
  },
  {
    company: 'Vive', title: 'Front-End Web Developer (Contract)', dates: 'November 2021 – March 2022',
    tech: ['Angular', 'C#', 'Google Maps API', 'MySQL'],
    highlights: [
      { title: 'Migration & Development', text: 'Upgraded project from AngularJS to Angular 13 and created complex UI grids with server-side pagination.' },
      { title: 'Backend Support', text: 'Developed authenticated routes and functions using Node/Express, C#/.NET, and SQL to manage data across multiple databases.' },
    ],
  },
]

/** Chapter three (after the garden fight): your technical skills, by group. */
export const skills: { group: string; items: string[] }[] = [
  { group: 'Frontend', items: ['React', 'Next.js', 'Vue.js', 'Angular', 'Ionic', 'Redux/Zustand', 'React Query', 'Framer Motion', 'TypeScript'] },
  { group: 'Backend & APIs', items: ['Node.js', 'Express', 'Laravel/PHP', 'C#/.NET', 'GraphQL', 'REST API Development'] },
  { group: 'Databases', items: ['PostgreSQL', 'MySQL', 'MongoDB', 'AppWrite', 'Firebase'] },
  { group: 'Cloud & Tools', items: ['AWS', 'Azure', 'Docker', 'Bitbucket/GitHub CI/CD', 'Jira', 'Storybook'] },
  { group: 'Advanced', items: ['Serverless (AWS Lambda)', 'Microservices', 'JAMstack', 'PWAs', 'WebSockets'] },
]

/** The final chapter (after the Sōkyoku Hill finale). */
export const finalChapter = {
  heading: 'Let’s connect',
  /** A closing line in your own words (this one is adapted from the intro on mikeres.com). */
  message: 'I’m a full-stack developer based out of Orlando, looking to build great projects.',
  /** Your phone number is on your résumé but deliberately left off this public site. */
  links: [
    { label: 'Email · mikeydes@gmail.com', href: 'mailto:mikeydes@gmail.com' },
    { label: 'GitHub · mrockingham', href: 'https://github.com/mrockingham' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/michael-rockingham-b86629164/' },
  ] as ContactLink[],
}

/** Chapter names already used by the four encounter reveals. */
export const chapters = ['About Me', 'Experience', 'Skills', 'Let’s connect']

/**
 * Your websites, shown on the screen wall in the Twelfth Division lab (west of the gate).
 * Up to eight show at once; with more, the gallery pages through them.
 *
 * image: a screenshot in public/assets/websites/ (for example 'my-site.png'), ideally 16:9 at
 * 1280×720 or larger. Without one, the screen draws the title and address instead.
 * repo: optional source-code link, shown beside "Visit site".
 *
 * Descriptions come from your résumé, the project list on mikeres.com, or (for the newer sites)
 * what the sites themselves say. Screenshots were taken from the live sites.
 */
export type Website = { title: string; url: string; description: string; image?: string; tags?: string[]; repo?: string }
export const websites: Website[] = [
  {
    title: '2nd & 15', url: 'https://www.2and15.com/', image: '2nd-and-15.jpg',
    description: 'NFL scores, schedules, standings, power rankings, news, historical player stats, and AI-powered weekly predictions.',
  },
  {
    title: 'Mustang Unleashed', url: 'https://mustangunleashed.com/', image: 'mustang-unleashed.jpg',
    description: 'Led development of a multi-platform React/Ionic app enabling car enthusiasts to discover and share events nationwide. Built for Ford at Campbell Marketing & Communications.',
    tags: ['Next.js', 'TypeScript', 'React', 'Ionic', 'Laravel/PHP', 'Zustand', 'MapBox', 'Google Maps', 'AWS', 'OAuth'],
  },
  {
    title: 'Ford Special Vehicle Registry', url: 'https://specialvehicleregistry.com/', image: 'ford-special-vehicle-registry.jpg',
    description: 'Led development for Ford’s official registry for Mustang and Mustang Mach-E owners. Built at Campbell Marketing & Communications.',
  },
  {
    title: 'DevErNote', url: 'https://devernote.com/', image: 'devernote.jpg',
    description: 'An AI-powered app for saving code, practicing lessons, and improving coding skills.',
    tags: ['OAuth', 'TypeScript', 'Chakra UI', 'Node.js', 'PostgreSQL', 'JWT'],
  },
  {
    title: 'Legacy Hub', url: 'https://bwt-hack.vercel.app/', image: 'legacy-hub.jpg',
    description: 'A living family archive: an interactive legacy tree for exploring relatives, their photos, and documents; a private “Roots” AI assistant that answers questions from the family’s own archives; and reunion check-in with RSVPs, dues, and QR codes.',
  },
  {
    title: 'Bridges to Prosperity', url: 'https://labs28-bridges-d-fe.vercel.app/data', image: 'bridges-to-prosperity.jpg',
    description: 'Group project for a non-profit, with a dashboard and data on bridge sites.',
    tags: ['React', 'Context API', 'Okta', 'React-Map-GL', 'Material UI'],
  },
  {
    title: 'Conway’s Game of Life', url: 'https://conway-s-mike-s-game.vercel.app/', image: 'conway-game-of-life.jpg', repo: 'https://github.com/mrockingham/Conway-s-mike-s-Game',
    description: 'Conway’s Game of Life, part of a retro arcade that also has Snake.',
    tags: ['React', 'Framer Motion', 'Material UI'],
  },
  {
    title: 'Dad’s Memory', url: 'https://dadsapp.vercel.app/', image: 'dads-memory.jpg', repo: 'https://github.com/mrockingham/dadsapp',
    description: 'A memorial app for my dad.',
    tags: ['React', 'Firebase', 'Bootstrap', 'Framer Motion'],
  },
]

/**
 * Your own section at the training grounds (where Chad, Uryū, and Orihime spar). It appears as a
 * card when a visitor arrives. Empty fields render as visible placeholders.
 */
export const trainingSection = {
  heading: 'How this site was built',
  /** A paragraph or two in your own words. */
  body: 'The world was modelled in Blender and exported as glTF, then brought to life in the browser with React and Three.js. Every character, power, and effect you see here is generated in code.',
  /** The tools, in groups (shown as tags). */
  tools: [
    { group: 'World and 3D', items: ['Blender', 'Blender Python', 'glTF', 'Three.js'] },
    { group: 'In the browser', items: ['React', 'TypeScript', 'React Three Fiber', 'Drei', 'Rapier physics', 'WebGL shaders'] },
    { group: 'Build and tooling', items: ['Vite', 'oxlint'] },
  ] as { group: string; items: string[] }[],
  /** Optional links, for example { label: 'GitHub', href: 'https://github.com/you' }. */
  links: [] as ContactLink[],
}
