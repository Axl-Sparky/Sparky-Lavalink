const axios = require('axios');

// Configuration
const LAVALINK_IP = '148.113.25.124';
const LAVALINK_PORT = '7835';
const LAVALINK_PASSWORD = 'sparkyfr';
const TIMEOUT = 10000; // Increased timeout

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
        console.log(`Attempting to connect to: http://${LAVALINK_IP}:${LAVALINK_PORT}/v4/info`);
        
        const response = await axios({
            method: 'GET',
            url: `http://${LAVALINK_IP}:${LAVALINK_PORT}/v4/info`,
            headers: { 
                'Authorization': LAVALINK_PASSWORD,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: TIMEOUT,
            validateStatus: function (status) {
                return status >= 200 && status < 600; // Accept all status codes
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers);
        console.log('Response data type:', typeof response.data);
        
        // Check if response is HTML (error page)
        const responseText = String(response.data);
        if (responseText.includes('<!DOCTYPE') || responseText.includes('<html') || responseText.includes('A server error')) {
            throw new Error('Server returned HTML error page instead of JSON');
        }
        
        // Try to parse JSON
        let data;
        if (typeof response.data === 'string') {
            try {
                data = JSON.parse(response.data);
            } catch (parseError) {
                throw new Error(`Invalid JSON response: ${response.data.substring(0, 100)}...`);
            }
        } else {
            data = response.data;
        }
        
        if (response.status === 200) {
            res.json({
                status: 'online',
                data: data,
                timestamp: new Date().toISOString()
            });
        } else {
            res.json({
                status: 'error',
                message: `HTTP Error ${response.status}: ${response.statusText || 'Unknown error'}`,
                data: data,
                timestamp: new Date().toISOString()
            });
        }
    } catch (error) {
        console.error('Error details:', error.message);
        console.error('Error code:', error.code);
        console.error('Error response:', error.response?.data);
        
        let errorMessage = 'Connection failed';
        let errorDetails = error.message;
        
        if (error.code === 'ECONNREFUSED') {
            errorMessage = 'Connection refused. Server may be down or wrong port.';
            errorDetails = `Port ${LAVALINK_PORT} on ${LAVALINK_IP} is not accepting connections`;
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Server not found. Check the IP address.';
            errorDetails = `Cannot resolve hostname: ${LAVALINK_IP}`;
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timeout. Server is not responding.';
            errorDetails = `Timeout after ${TIMEOUT}ms`;
        } else if (error.code === 'EHOSTUNREACH') {
            errorMessage = 'Host unreachable. Server may be offline.';
            errorDetails = `Cannot reach ${LAVALINK_IP}:${LAVALINK_PORT}`;
        } else if (error.response) {
            errorMessage = `Server responded with status: ${error.response.status}`;
            errorDetails = error.response.data ? 
                `Response: ${JSON.stringify(error.response.data).substring(0, 200)}...` : 
                'No response body';
        } else if (error.message.includes('HTML error page')) {
            errorMessage = 'Server error page detected';
            errorDetails = 'Lavalink server returned an HTML error instead of JSON data';
        } else if (error.message.includes('Invalid JSON')) {
            errorMessage = 'Invalid server response';
            errorDetails = error.message;
        }
        
        res.json({
            status: 'offline',
            message: errorMessage,
            details: errorDetails,
            timestamp: new Date().toISOString(),
            errorCode: error.code
        });
    }
};
