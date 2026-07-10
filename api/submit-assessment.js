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

        // 1. Fetch the satellite image from Google securely on the backend
        const googleUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${submission.latitude},${submission.longitude}&zoom=20&size=600x600&maptype=satellite&key=${apiKey}`;
        
        try {
            const imgResponse = await fetch(googleUrl);
            if (imgResponse.ok) {
                const imageBuffer = await imgResponse.arrayBuffer();
                
                // 2. Stream it directly to Vercel Blob
                const blobFilename = `solarbuddy_satellite_${Date.now()}.png`;
                const blob = await put(blobFilename, Buffer.from(imageBuffer), {
                    access: 'public',
                    contentType: 'image/png'
                });
                
                // 3. Attach the secure blob link to our data structure
                submission.photo_url = blob.url;
            }
        } catch (mapErr) {
            console.error("Google Static Map or Blob storage upload failed:", mapErr);
            // Don't crash the whole form if only the photo fails, let it submit what it has
        }

        // 4. Forward the completed payload securely to Make.com
        const makeResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submission)
        });

        if (!makeResponse.ok) {
            throw new Error(`Make.com webhook responded with status: ${makeResponse.status}`);
        }

        // Read the exact response from Make.com (PDF url, message, etc.)
        const responseText = await makeResponse.text();

        // 5. Send Make's response back to the frontend
        return res.status(200).send(responseText);

    } catch (error) {
        console.error('Secure submission workflow failed:', error);
        return res.status(500).json({ error: 'Failed to process your solar report submission.' });
    }
}
