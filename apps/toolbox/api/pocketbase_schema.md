# Pocketbase Schema for Essay Reader

## Essays Collection

Create a new collection named `essays` with the following fields:

| Field | Type | Required | Options |
|-------|------|----------|---------|
| id | ID | Auto-generated | Primary key |
| title | Text | No | Default empty |
| content | Text | Yes | - |
| status | Text | Yes | Default "pending" |
| audio_file_id | Text | No | Default empty |
| created | Date | Auto-generated | - |
| updated | Date | Auto-generated | - |

## Setup Instructions

1. Open your Pocketbase Admin UI (typically at http://127.0.0.1:8090/_/)
2. Navigate to Collections
3. Click "New Collection"
4. Name it "essays"
5. Add the fields as described in the table above
6. Set appropriate permissions: 
   - Allow API access only to authenticated users
   - Admin can do all operations
7. Save the collection

## API Endpoints

Once set up, the collection will be accessible through these PocketBase API endpoints:

- **Create essay**: POST `/api/collections/essays/records`
- **Get all essays**: GET `/api/collections/essays/records`
- **Get essay by ID**: GET `/api/collections/essays/records/{id}`
- **Update essay**: PATCH `/api/collections/essays/records/{id}`
- **Delete essay**: DELETE `/api/collections/essays/records/{id}`

However, in this application, these endpoints are accessed through the Express.js API proxy for additional security and processing. 