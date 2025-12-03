const axios = require('axios');

// Configuration
const LAVALINK_IP = '148.113.25.124';
const LAVALINK_PORT = '7835';
const LAVALINK_PASSWORD = 'sparkyfr';
const TIMEOUT = 5000;

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    
    // Handle OPTIONS request for CORS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const response = await axios.get(`http://${LAVALINK_IP}:${LAVALINK_PORT}/v4/info`, {
            headers: { 
                'Authorization': LAVALINK_PASSWORD,
                'Accept': 'application/json'
            },
            timeout: TIMEOUT
        });
        
        if (response.status === 200) {
            res.json({
                status: 'online',
                data: response.data,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                status: 'error',
                message: `HTTP Error ${response.status}: ${response.statusText}`,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        let errorMessage = 'Connection failed';
        
        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused. Server may be down or wrong port.';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Server not found. Check the IP address.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout. Server is not responding.';
        } else if (error.response) {
            errorMessage = `Server responded with error: ${error.response.status}`;
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        res.json({
            status: 'offline',
            message: errorMessage,
            timestamp: new Date().toISOString(),
            errorCode: error.code
        });
    }
};
