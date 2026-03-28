<?php

namespace App\Http\Controllers;

use App\Services\OdooService;
use Exception;

class DashboardController extends Controller
{
    private $odoo;

    public function __construct(OdooService $odoo)
    {
        $this->odoo = $odoo;
    }

    public function stats()
    {
        try {
            $stats = $this->odoo->getDashboardStats();

            return response()->json([
                'success' => true,
                'data' => $stats,
                'message' => 'OK'
            ]);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => 'Failed to fetch dashboard stats: ' . $e->getMessage()
            ], 500);
        }
    }
}
