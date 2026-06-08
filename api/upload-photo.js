import { put } from '@vercel/blob';

// Use the Node.js runtime (NOT edge) so @vercel/blob works.
// Disable the default body parser so we can read the raw file stream.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Read the raw uploaded file into a buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Filename comes from the query string (?filename=...)
    const filename = req.query.filename || `roof-photo-${Date.now()}.jpg`;

    // Upload to Vercel Blob (token is read automatically from env)
    const blob = await put(filename, buffer, {
      access: 'public',
      addRandomSuffix: true,
    });

    // blob.url is the public URL sent to the webhook as photo_url
    return res.status(200).json({ success: true, url: blob.url });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Upload failed', message: error.message });
  }
}
