<?php

namespace App\Http\Controllers;

use App\Services\OdooService;
use Exception;

class ProductController extends Controller
{
    private $odoo;

    public function __construct(OdooService $odoo)
    {
        $this->odoo = $odoo;
    }

    public function index()
    {
        try {
            $products = $this->odoo->getProducts();

            if (empty($products)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'No products found.'
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $products,
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
