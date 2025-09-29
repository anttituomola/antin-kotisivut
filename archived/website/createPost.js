import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current directory in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get current date in YYYY-MM-DD format
const today = new Date().toISOString().split('T')[0];

// Create the template content
const template = `---
title: "New Blog Post"
pubDate: ${today}
image: ""
excerpt: ""
author: "Antti Tuomola"
tags: []
draft: true
---

Write your content here...
`;

// Generate a filename based on the date and a default title
const filename = `${today}-new-post.mdx`;
const filepath = join(__dirname, 'src', 'content', 'blog', filename);

// Create the file
writeFileSync(filepath, template);

console.log(`Created new blog post: ${filepath}`);