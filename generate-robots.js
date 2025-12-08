import { writeFileSync } from 'fs';

function generateRobotsTxt(environment = 'production') {
  console.log();
  
  const baseConfig = {
    userAgent: '*',
    allow: ['/'],
    disallow: [],
    sitemap: 'https://fhavur.vercel.app/sitemap.xml'
  };

  if (environment === 'production') {
    // Production configuration (after build)
    baseConfig.allow.push(
      '/assets/',
      '/pics/',
      '/vid/',
      '/icon/',
      '/*.css$',
      '/*.js$',
      '/*.jpg$',
      '/*.png$',
      '/*.svg$',
      '/*.mp4$',
      '/*.mp3$',
      '/*.webmanifest$'
    );
    
    baseConfig.disallow.push(
      '/src/',
      '/node_modules/',
      '/dist/src/',
      '/login',
      '/logout',
      '/scripts/'
    );
  } else {
    // Development configuration
    baseConfig.allow.push(
      '/public/',
      '/src/',
      '/pics/',
      '/vid/',
      '/icon/',
      '/*.html$',
      '/*.css$',
      '/*.js$',
      '/*.json$',
      '/*.jpg$',
      '/*.png$',
      '/*.svg$',
      '/*.mp4$',
      '/*.mp3$',
      '/*.webmanifest$'
    );
    
    baseConfig.disallow.push(
      '/node_modules/',
      '/.github/',
      '/.vscode/',
      '/dist/',
      '/scripts/',
      '/login.html',
      '/logOut.html',
      '/pwa-prompt.html',
      '/auth_config.json'
    );
  }

  // Generate robots.txt content
  let robotsContent = ;

  // Add allow rules
  baseConfig.allow.forEach(path => {
    if (path !== '/') { // Skip the root allow since it's already implied
      robotsContent += ;
    }
  });

  // Add disallow rules
  baseConfig.disallow.forEach(path => {
    robotsContent += ;
  });

  robotsContent += ;

  // Write to file
  writeFileSync('public/robots.txt', robotsContent);
  
  console.log('✅ robots.txt generated successfully!');
  console.log();
  console.log();
  console.log();
  
  return {
    success: true,
    environment,
    rules: {
      allow: baseConfig.allow.length - 1, // Subtract 1 for root path
      disallow: baseConfig.disallow.length
    }
  };
}

// Only run if called directly
if (import.meta.url === ) {
  const environment = process.argv[2] || 'production';
  generateRobotsTxt(environment);
}

export { generateRobotsTxt }; 
