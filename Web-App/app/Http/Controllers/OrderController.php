<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\OdooService;
use Exception;

class OrderController extends Controller
{
    private $odoo;

    public function __construct(OdooService $odoo)
    {
        $this->odoo = $odoo;
    }

    public function index()
    {
        try {
            $orders = $this->odoo->getOrders();

            if (empty($orders)) {
                return response()->json([
                    'success' => true,
                    'data' => [],
                    'message' => 'No orders found.'
                ]);
            }

            return response()->json([
                'success' => true,
                'data' => $orders,
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

    public function create(Request $request)
    {
        $request->validate([
            'partner_id' => 'required|integer',
            'lines' => 'required|array',
            'lines.*.product_id' => 'required|integer',
            'lines.*.qty' => 'required|numeric'
        ]);

        try {
            $orderId = $this->odoo->createOrder($request->partner_id, $request->lines);

            return response()->json([
                'success' => true,
                'data' => ['order_id' => $orderId],
                'message' => 'Order created successfully'
            ], 201);

        } catch (Exception $e) {
            return response()->json([
                'success' => false,
                'data' => null,
                'message' => "Order creation failed: " . $e->getMessage()
            ], 500);
        }
    }
}
