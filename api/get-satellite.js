import { put } from '@vercel/blob';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { latitude, longitude } = req.body;

        if (!latitude || !longitude) {
            return res.status(400).json({ error: 'Missing coordinates' });
        }

        // 1. Fetch your secret key safely from Vercel's private backend environment memory
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;

        // 2. Construct the Google Maps Static API endpoint string safely on the server side
        const googleUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=20&size=600x600&maptype=satellite&key=${apiKey}`;

        // 3. Fetch the image bytes directly from Google's server infrastructure
        const googleResponse = await fetch(googleUrl);
        if (!googleResponse.ok) {
            throw new Error(`Google Maps API responded with status: ${googleResponse.status}`);
        }
        
        const imageBuffer = await googleResponse.arrayBuffer();

        // 4. Stream those bytes straight into your Vercel Blob store using Vercel SDK put tools
        const blobFilename = `solarbuddy_satellite_${Date.now()}.png`;
        const blob = await put(blobFilename, Buffer.from(imageBuffer), {
            access: 'public',
            contentType: 'image/png'
        });

        // 5. Hand the clean hosted Vercel Blob URL right back to your frontend layout
        return res.status(200).json({ url: blob.url });

    } catch (error) {
        console.error('Serverless satellite processing failed:', error);
        return res.status(500).json({ error: 'Failed to process property asset.' });
    }
}
