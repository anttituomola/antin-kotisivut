# Archived Content

This directory contains archived content that is stored in the repository but not published on the public website.

## Structure

### `/website/`
Complete backup of the original full website application that was previously deployed at `apps/website/`.

### `/blog-and-timeline/`
Blog and timeline features that were removed from the public site:
- `blog/` - Blog page templates
- `content-blog/` - Blog post content (MDX files)
- `timeline.astro` - Timeline page
- `Timeline.astro` - Timeline component
- `events.ts` - Timeline events data
- `createPost.js` - Script for creating new blog posts

## Restoration

If you need to restore any of this content, you can copy the relevant files back to the `src/` directory and update the navigation in `src/layouts/Layout.astro`.

