<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    | Allows the React web portal (localhost:3000) and ngrok tunnels to call
    | the Laravel API. The mobile app is not affected (it doesn't use CORS).
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        // Add your production domain here, e.g. 'https://app.maisonnoir.ma',
    ],

    'allowed_origins_patterns' => [
        // Allow any ngrok tunnel URL for development
        '#^https://[a-z0-9\-]+\.ngrok[-\w]*\.(?:app|dev|io)$#',
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
