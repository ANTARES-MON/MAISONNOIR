<?php

return [
    'url'      => env('ODOO_URL', 'https://leandra-trichomic-flexibly.ngrok-free.dev'),
    'db'       => env('ODOO_DB', 'maisonnoir'),
    'email'    => env('ODOO_EMAIL', 'api@maisonnoir.ma'),
    'password' => env('ODOO_PASSWORD', ''),
    'api_key'  => env('ODOO_API_KEY', ''),
    'uid'      => (int) env('ODOO_UID', 1),
];
