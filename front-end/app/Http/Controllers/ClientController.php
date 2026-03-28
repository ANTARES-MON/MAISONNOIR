<?php

namespace App\Http\Controllers;

use App\Services\OdooService;
use Illuminate\Http\Request;
use Exception;

class ClientController extends Controller
{
    private $odoo;

    public function __construct(OdooService $odoo)
    {
        $this->odoo = $odoo;
    }

    public function index()
    {
        try {
            $clients = $this->odoo->getClients();

            if (empty($clients)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'No clients found.'
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $clients,
                'message' => 'OK'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
