const ALLOWED_ORIGIN = 'http://localhost:5173';

export function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Cache-Control': 'no-store',
        },
    });
}