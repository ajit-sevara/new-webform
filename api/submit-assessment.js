import { put } from '@vercel/blob';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const submission = req.body;

        if (!submission.latitude || !submission.longitude) {
            return res.status(400).json({ error: 'Missing location coordinates' });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        const webhookUrl = process.env.MAKE_WEBHOOK_URL;

        if (!apiKey || !webhookUrl) {
            console.error("Missing required backend environment variables.");
            return res.status(500).json({ error: 'Server configuration error.' });
        }

        // 1. Fetch the high-res satellite image from Google securely on the backend
        const googleUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${submission.latitude},${submission.longitude}&zoom=20&size=600x600&maptype=satellite&key=${apiKey}`;
        
        try {
            const imgResponse = await fetch(googleUrl);
            if (imgResponse.ok) {
                const imageBuffer = await imgResponse.arrayBuffer();
                
                // 2. Stream those raw bytes directly into your Vercel Blob storage pool
                const blobFilename = `solarbuddy_satellite_${Date.now()}.png`;
                const blob = await put(blobFilename, Buffer.from(imageBuffer), {
                    access: 'public',
                    contentType: 'image/png'
                });
                
                // 3. Attach the permanent Vercel hosted link directly to your data structure
                submission.photo_url = blob.url;
            } else {
                console.error(`Google Maps Static API returned status: ${imgResponse.status}`);
            }
        } catch (mapErr) {
            console.error("Google Static Map or Blob storage upload routine failed:", mapErr);
        }

        // 4. Forward the final complete data payload safely to Make.com
        const makeResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submission)
        });

        if (!makeResponse.ok) {
            throw new Error(`Make.com webhook responded with status: ${makeResponse.status}`);
        }

        const responseText = await makeResponse.text();

        // 5. Pipe Make's structural response bytes safely straight back to your frontend browser window
        return res.status(200).send(responseText);

    } catch (error) {
        console.error('Secure unified submission workflow route failed:', error);
        return res.status(500).json({ error: 'Failed to process your solar report submission.' });
    }
}
